import { Agent, type AgentOpt } from '@midscene/core/agent';
import { assert } from '@midscene/shared/utils';
import { commonWebActionsForWebPage } from '../web-page';
import type { KeyboardAction, MouseAction } from '../web-page';
import {
  type BridgeConnectTabOptions,
  BridgeEvent,
  BridgePageType,
  DefaultBridgeServerPort,
  KeyboardEvent,
  MouseEvent,
} from './common';
import { BridgeServer } from './io-server';
import { BridgeRemoteClient } from './io-client';
import type { ExtensionBridgePageBrowserSide } from './page-browser-side';

interface ChromeExtensionPageCliSide extends ExtensionBridgePageBrowserSide {
  showStatusMessage: (message: string) => Promise<void>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Options for getting Bridge page
 */
export interface GetBridgePageOptions {
  timeout?: number | false;
  closeConflictServer?: boolean;
  bridgeUrl?: string;  // Remote Bridge WebSocket URL
  port?: number;       // Local Bridge port (for backward compatibility)
}

// actually, this is a proxy to the page in browser side
export const getBridgePageInCliSide = (
  options?: GetBridgePageOptions,
): ChromeExtensionPageCliSide => {
  let server: BridgeServer | BridgeRemoteClient;
  let bridgeUrl: string;
  let isRemoteMode = false;
  
  // Determine bridge mode and URL
  if (options?.bridgeUrl) {
    // Remote mode: connect to provided bridgeUrl
    bridgeUrl = options.bridgeUrl;
    isRemoteMode = true;
    console.log(`🌐 [getBridgePageInCliSide] Using REMOTE bridge: ${bridgeUrl}`);
    
    // Create BridgeRemoteClient to connect to remote Bridge
    server = new BridgeRemoteClient(bridgeUrl);
    
    // Connect to remote Bridge (async, but we'll handle it in proxy)
    (async () => {
      try {
        await server.connect({
          timeout: options?.timeout,
        });
        console.log(`✅ [getBridgePageInCliSide] Connected to REMOTE bridge: ${bridgeUrl}`);
      } catch (error) {
        console.error(`❌ [getBridgePageInCliSide] Failed to connect to REMOTE bridge:`, error);
        throw error;
      }
    })();
  } else {
    // Local mode: create local BridgeServer
    const port = options?.port || DefaultBridgeServerPort;
    bridgeUrl = `ws://localhost:${port}`;
    console.log(`🏠 [getBridgePageInCliSide] Using LOCAL bridge: ${bridgeUrl}`);
    
    server = new BridgeServer(
      port,
      undefined,
      undefined,
      options?.closeConflictServer,
    );
    server.listen({
      timeout: options?.timeout,
    });
  }
  
  const bridgeCaller = (method: string) => {
    return async (...args: any[]) => {
      if (!server) {
        throw new Error('Bridge not initialized');
      }
      const response = await server.call(method, args);
      return response;
    };
  };
  const page = {
    showStatusMessage: async (message: string) => {
      if (!server) {
        throw new Error('Bridge not initialized');
      }
      await server.call(BridgeEvent.UpdateAgentStatus, [message]);
    },
  };

  const proxyPage = new Proxy(page, {
    get(target, prop, receiver) {
      assert(typeof prop === 'string', 'prop must be a string');

      if (prop === 'toJSON') {
        return () => {
          return {
            interfaceType: BridgePageType,
          };
        };
      }

      if (prop === 'getContext') {
        return undefined;
      }

      if (prop === 'interfaceType') {
        return BridgePageType;
      }

      if (prop === 'actionSpace') {
        return () => commonWebActionsForWebPage(proxyPage);
      }

      if (Object.keys(page).includes(prop)) {
        return page[prop as keyof typeof page];
      }

      if (prop === 'mouse') {
        const mouse: MouseAction = {
          click: bridgeCaller(MouseEvent.Click),
          wheel: bridgeCaller(MouseEvent.Wheel),
          move: bridgeCaller(MouseEvent.Move),
          drag: bridgeCaller(MouseEvent.Drag),
        };
        return mouse;
      }

      if (prop === 'keyboard') {
        const keyboard: KeyboardAction = {
          type: bridgeCaller(KeyboardEvent.Type),
          press: bridgeCaller(KeyboardEvent.Press),
        };
        return keyboard;
      }

      if (prop === 'destroy') {
        return async (...args: any[]) => {
          try {
            const caller = bridgeCaller('destroy');
            await caller(...args);
          } catch (e) {
            // console.error('error calling destroy', e);
          }
          // Only close server in local mode
          if (server) {
            return server.close();
          }
        };
      }

      return bridgeCaller(prop);
    },
  }) as ChromeExtensionPageCliSide;

  return proxyPage;
};

/**
 * Options for AgentOverChromeBridge constructor
 */
export interface ChromeBridgeOptions extends AgentOpt {
  closeNewTabsAfterDisconnect?: boolean;
  serverListeningTimeout?: number | false;
  closeConflictServer?: boolean;
  
  /**
   * Custom Bridge WebSocket URL for remote connection.
   * If provided, AgentOverChromeBridge will connect to this URL
   * instead of starting a local BridgeServer.
   * 
   * @example
   * { bridgeUrl: 'ws://192.168.1.100:3766' }
   */
  bridgeUrl?: string;
  
  /**
   * Port for local BridgeServer (ignored if bridgeUrl is provided).
   * @deprecated Use bridgeUrl for remote connections
   */
  port?: number;
}

export class AgentOverChromeBridge extends Agent<ChromeExtensionPageCliSide> {
  private destroyAfterDisconnectFlag?: boolean;

  constructor(opts?: ChromeBridgeOptions) {
    // Create bridge page with appropriate options
    const bridgePageOptions: GetBridgePageOptions = {
      timeout: opts?.serverListeningTimeout,
      closeConflictServer: opts?.closeConflictServer,
      bridgeUrl: opts?.bridgeUrl,
      port: opts?.port,
    };
    
    const page = getBridgePageInCliSide(bridgePageOptions);
    const originalOnTaskStartTip = opts?.onTaskStartTip;
    super(
      page,
      Object.assign(opts || {}, {
        onTaskStartTip: (tip: string) => {
          this.page.showStatusMessage(tip);
          if (originalOnTaskStartTip) {
            originalOnTaskStartTip?.call(this, tip);
          }
        },
      }),
    );
    this.destroyAfterDisconnectFlag = opts?.closeNewTabsAfterDisconnect;
  }

  async setDestroyOptionsAfterConnect() {
    if (this.destroyAfterDisconnectFlag) {
      this.page.setDestroyOptions({
        closeTab: true,
      });
    }
  }

  async connectNewTabWithUrl(url: string, options?: BridgeConnectTabOptions) {
    await this.page.connectNewTabWithUrl(url, options);
    await sleep(500);
    await this.setDestroyOptionsAfterConnect();
  }

  async getBrowserTabList() {
    return await this.page.getBrowserTabList();
  }

  async setActiveTabId(tabId: string) {
    return await this.page.setActiveTabId(Number.parseInt(tabId));
  }

  async connectCurrentTab(options?: BridgeConnectTabOptions) {
    await this.page.connectCurrentTab(options);
    await sleep(500);
    await this.setDestroyOptionsAfterConnect();
  }

  async aiAction(prompt: string, options?: any) {
    if (options) {
      console.warn(
        'the `options` parameter of aiAction is not supported in cli side',
      );
    }
    return await super.aiAction(prompt);
  }

  async destroy(closeNewTabsAfterDisconnect?: boolean) {
    if (typeof closeNewTabsAfterDisconnect === 'boolean') {
      await this.page.setDestroyOptions({
        closeTab: closeNewTabsAfterDisconnect,
      });
    }
    await super.destroy();
  }
}
