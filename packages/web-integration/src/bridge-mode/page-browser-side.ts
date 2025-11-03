import { assert } from '@midscene/shared/utils';
import ChromeExtensionProxyPage from '../chrome-extension/page';
import type {
  ChromePageDestroyOptions,
  KeyboardAction,
  MouseAction,
} from '../web-page';
import {
  type BridgeConnectTabOptions,
  BridgeEvent,
  DefaultBridgeServerPort,
  KeyboardEvent,
  MouseEvent,
} from './common';
import { BridgeClient } from './io-client';

declare const __VERSION__: string;

export class ExtensionBridgePageBrowserSide extends ChromeExtensionProxyPage {
  public bridgeClient: BridgeClient | null = null;

  private destroyOptions?: ChromePageDestroyOptions;

  private newlyCreatedTabIds: number[] = [];

  constructor(
    public onDisconnect: () => void = () => {},
    public onLogMessage: (
      message: string,
      type: 'log' | 'status',
    ) => void = () => {},
    forceSameTabNavigation = true,
    public bridgePort: number = DefaultBridgeServerPort,
  ) {
    super(forceSameTabNavigation);
  }

  private async setupBridgeClient() {
    this.bridgeClient = new BridgeClient(
      `ws://localhost:${this.bridgePort}`,
      async (method, args: any[]) => {
        console.log('bridge call from cli side', method, args);
        if (method === BridgeEvent.ConnectNewTabWithUrl) {
          return this.connectNewTabWithUrl.apply(
            this,
            args as unknown as [string],
          );
        }

        if (method === BridgeEvent.GetBrowserTabList) {
          return this.getBrowserTabList.apply(this, args as any);
        }

        if (method === BridgeEvent.SetActiveTabId) {
          return this.setActiveTabId.apply(this, args as any);
        }

        if (method === BridgeEvent.ConnectCurrentTab) {
          return this.connectCurrentTab.apply(this, args as any);
        }

        if (method === BridgeEvent.UpdateAgentStatus) {
          return this.onLogMessage(args[0] as string, 'status');
        }

        const tabId = await this.getActiveTabId();
        if (!tabId || tabId === 0) {
          throw new Error('no tab is connected');
        }

        // this.onLogMessage(`calling method: ${method}`);

        if (method.startsWith(MouseEvent.PREFIX)) {
          const actionName = method.split('.')[1] as keyof MouseAction;
          if (actionName === 'drag') {
            return this.mouse[actionName].apply(this.mouse, args as any);
          }
          return this.mouse[actionName].apply(this.mouse, args as any);
        }

        if (method.startsWith(KeyboardEvent.PREFIX)) {
          const actionName = method.split('.')[1] as keyof KeyboardAction;
          if (actionName === 'press') {
            return this.keyboard[actionName].apply(this.keyboard, args as any);
          }
          return this.keyboard[actionName].apply(this.keyboard, args as any);
        }

        if (!this[method as keyof ChromeExtensionProxyPage]) {
          console.warn('method not found', method);
          return undefined;
        }

        try {
          // @ts-expect-error
          const result = await this[method as keyof ChromeExtensionProxyPage](
            ...args,
          );
          return result;
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          console.error('error calling method', method, args, e);
          this.onLogMessage(
            `Error calling method: ${method}, ${errorMessage}`,
            'log',
          );
          throw new Error(errorMessage, { cause: e });
        }
      },
      // on disconnect
      () => {
        return this.destroy();
      },
    );
    await this.bridgeClient.connect();
    this.onLogMessage(
      `Bridge connected, cli-side version v${this.bridgeClient.serverVersion}, browser-side version v${__VERSION__}`,
      'log',
    );
  }

  public async connect() {
    return await this.setupBridgeClient();
  }

  public async connectNewTabWithUrl(
    url: string,
    options: BridgeConnectTabOptions = {
      forceSameTabNavigation: true,
    },
  ) {
    const tab = await chrome.tabs.create({ url });
    const tabId = tab.id;
    assert(tabId, 'failed to get tabId after creating a new tab');

    // new tab
    this.onLogMessage(`Creating new tab: ${url}`, 'log');
    this.newlyCreatedTabIds.push(tabId);

    if (options?.forceSameTabNavigation) {
      this.forceSameTabNavigation = true;
    }

    await this.setActiveTabId(tabId);
  }

  public async connectCurrentTab(
    options: BridgeConnectTabOptions = {
      forceSameTabNavigation: true,
    },
  ) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    assert(tabId, 'failed to get tabId');

    this.onLogMessage(`Connected to current tab: ${tabs[0]?.url}`, 'log');

    if (options?.forceSameTabNavigation) {
      this.forceSameTabNavigation = true;
    }

    await this.setActiveTabId(tabId);
  }

  public async setDestroyOptions(options: ChromePageDestroyOptions) {
    this.destroyOptions = options;
  }

  /**
   * 🔄 Persistent Mode: Cleanup test state without disconnecting bridge
   * 
   * This method:
   * - Closes newly created tabs (if destroyOptions.closeTab is true)
   * - Resets the newlyCreatedTabIds array
   * - Calls parent class destroy (cleanup DOM state)
   * - Resets destroyOptions
   * - Reconnects to the current active tab (critical for multi-tab scenarios)
   * - KEEPS the bridgeClient connection alive
   */
  async cleanup() {
    // Close newly created tabs
    if (this.destroyOptions?.closeTab && this.newlyCreatedTabIds.length > 0) {
      this.onLogMessage('🔄 Cleanup: Closing all newly created tabs...', 'log');
      for (const tabId of this.newlyCreatedTabIds) {
        try {
          await chrome.tabs.remove(tabId);
        } catch (e) {
          console.warn(`Failed to close tab ${tabId}:`, e);
        }
      }
      this.newlyCreatedTabIds = [];
    }

    // Call parent cleanup (DOM state reset)
    await super.destroy();

    // 🔧 CRITICAL FIX: Reconnect to current active tab
    // This is essential when navigate() creates a new tab - we need to switch our connection
    try {
      this.onLogMessage('🔄 Cleanup: Reconnecting to current active tab...', 'log');
      await this.connectCurrentTab({ forceSameTabNavigation: true });
      console.log('✅ Successfully reconnected to current active tab');
    } catch (e) {
      console.warn('⚠️ Failed to reconnect to current tab during cleanup:', e);
      // Don't throw - this is not critical enough to fail the cleanup
    }

    // 🔧 CRITICAL FIX: Verify Bridge connection health after cleanup
    try {
      if (this.bridgeClient) {
        // Check if bridge connection is still alive
        const isConnected = (this.bridgeClient as any).connected;
        if (!isConnected) {
          this.onLogMessage('⚠️ Cleanup: Bridge connection lost, attempting reconnection...', 'log');
          // Reconnect to bridge
          await this.setupBridgeClient();
          console.log('✅ Bridge reconnected successfully after cleanup');
        } else {
          console.log('✅ Bridge connection healthy after cleanup');
        }
      }
    } catch (e) {
      console.error('❌ Failed to verify/restore bridge connection during cleanup:', e);
      // Try to reconnect anyway
      try {
        await this.setupBridgeClient();
        console.log('✅ Bridge reconnected successfully after error');
      } catch (reconnectError) {
        console.error('❌ Failed to reconnect bridge after cleanup error:', reconnectError);
        // This is serious - the next test will likely fail
      }
    }

    // Reset destroy options
    this.destroyOptions = undefined;

    console.log('✅ Cleanup completed (bridge connection maintained)');
    // NOTE: bridgeClient stays connected for next test
  }

  /**
   * Full destroy: Cleanup state + disconnect bridge
   */
  async destroy() {
    // First cleanup state
    await this.cleanup();

    // Then disconnect bridge
    if (this.bridgeClient) {
      this.onLogMessage('🗑️ Destroy: Disconnecting bridge client...', 'log');
      this.bridgeClient.disconnect();
      this.bridgeClient = null;
      this.onDisconnect();
    }
  }
}
