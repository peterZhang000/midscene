import { ExtensionBridgePageBrowserSide } from '@midscene/web/bridge-mode-browser';
import { BridgeConfigManager } from './bridgeConfig';

export type BridgeStatus =
  | 'listening'
  | 'connected'
  | 'disconnected'
  | 'closed';

export class BridgeConnector {
  private activeBridgePage: ExtensionBridgePageBrowserSide | null = null;
  private status: BridgeStatus = 'closed';
  private connectRetryInterval = 300;

  constructor(
    private onMessage: (
      message: string,
      type: 'log' | 'status',
    ) => void = () => {},
    private onStatusChange: (status: BridgeStatus) => void = () => {},
  ) {}

  private setStatus(status: BridgeStatus) {
    this.status = status;
    this.onStatusChange(status);
  }

  async connect(): Promise<void> {
    if (this.status === 'listening' || this.status === 'connected') {
      return;
    }

    this.setStatus('listening');

    const connectLoop = async () => {
      while (true) {
        if (this.status === 'connected') {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (this.status === 'closed') {
          break;
        }

        if (this.status !== 'listening' && this.status !== 'disconnected') {
          throw new Error(`unexpected status: ${this.status}`);
        }

        let activeBridgePage: ExtensionBridgePageBrowserSide | null = null;
        try {
          // Load configured port
          const bridgePort = BridgeConfigManager.loadPort();
          console.log(`🔧 Starting Bridge on port ${bridgePort}`);

          activeBridgePage = new ExtensionBridgePageBrowserSide(
            () => {
              if (this.status !== 'closed') {
                this.setStatus('disconnected');
                this.activeBridgePage = null;
              }
            },
            this.onMessage,
            true, // forceSameTabNavigation
            bridgePort, // Use configured port
          );

          await activeBridgePage.connect();
          this.activeBridgePage = activeBridgePage;
          this.setStatus('connected');

          // Log success with port info
          this.onMessage(
            `Bridge started successfully on port ${bridgePort}`,
            'status',
          );
        } catch (e) {
          this.activeBridgePage?.destroy();
          this.activeBridgePage = null;

          // Enhanced error handling for port conflicts
          const errorMessage = e instanceof Error ? e.message : String(e);

          // Check for EADDRINUSE (port conflict)
          if (
            errorMessage.includes('EADDRINUSE') ||
            errorMessage.includes('address already in use')
          ) {
            const currentPort = BridgeConfigManager.loadPort();
            const suggestions =
              BridgeConfigManager.suggestAlternativePorts(currentPort);

            this.onMessage(
              `❌ Port ${currentPort} is already in use. Try: ${suggestions.slice(0, 3).join(', ')}`,
              'log',
            );
          } else {
            console.warn('failed to setup connection', e);
          }

          await new Promise((resolve) =>
            setTimeout(resolve, this.connectRetryInterval),
          );
        }
      }
    };

    connectLoop();
  }

  async disconnect(): Promise<void> {
    if (this.status === 'closed') {
      console.warn('Cannot stop connection if not connected');
      return;
    }

    if (this.activeBridgePage) {
      await this.activeBridgePage.destroy();
      this.activeBridgePage = null;
    }

    this.setStatus('closed');
  }

  getStatus(): BridgeStatus {
    return this.status;
  }
}
