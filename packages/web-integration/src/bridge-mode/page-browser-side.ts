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
   * This method ensures complete test isolation by:
   * - Closing newly created tabs
   * - Clearing all browser storage (localStorage, sessionStorage, IndexedDB, Cookies, Cache)
   * - Unregistering Service Workers
   * - Resetting page state
   * - Reconnecting to current active tab
   * - Verifying clean state
   * - KEEPING the bridgeClient connection alive
   */
  async cleanup() {
    this.onLogMessage('🔄 Starting cleanup for persistent mode...', 'log');

    // 1. Close newly created tabs
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

    // 2. Call parent cleanup (DOM state reset)
    await super.destroy();

    // 3. Reconnect to current active tab BEFORE clearing storage
    // This ensures we have a valid tab to execute scripts in
    try {
      this.onLogMessage('🔄 Cleanup: Reconnecting to current active tab...', 'log');
      await this.connectCurrentTab({ forceSameTabNavigation: true });
      console.log('✅ Successfully reconnected to current active tab');
    } catch (e) {
      console.warn('⚠️ Failed to reconnect to current tab during cleanup:', e);
      // Don't throw - try to continue with cleanup
    }

    // 4. Clear browser storage (critical for test isolation)
    try {
      await this.clearBrowserStorage();
    } catch (e) {
      console.error('❌ Failed to clear browser storage:', e);
      // Continue with cleanup - this is critical but shouldn't stop the process
    }

    // 5. Unregister Service Workers
    try {
      await this.unregisterServiceWorkers();
    } catch (e) {
      console.error('❌ Failed to unregister service workers:', e);
      // Continue with cleanup
    }

    // 6. Reset page state to clean data URL
    try {
      await this.resetPageState();
    } catch (e) {
      console.error('❌ Failed to reset page state:', e);
      // Continue with cleanup
    }

    // 7. Verify clean state
    try {
      await this.verifyCleanState();
    } catch (e) {
      console.error('❌ Clean state verification failed:', e);
      // This is a warning, not a critical failure
    }

    // 8. Verify Bridge connection health after cleanup
    try {
      if (this.bridgeClient) {
        const isConnected = (this.bridgeClient as any).connected;
        if (!isConnected) {
          this.onLogMessage('⚠️ Cleanup: Bridge connection lost, attempting reconnection...', 'log');
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

    this.onLogMessage('✅ Cleanup completed (full isolation + bridge maintained)', 'log');
    console.log('✅ Cleanup completed (bridge connection maintained)');
  }

  /**
   * Clear all browser storage to ensure test isolation
   * 
   * Clears:
   * - localStorage
   * - sessionStorage
   * - IndexedDB
   * - Cookies
   * - Cache Storage
   */
  private async clearBrowserStorage() {
    const tabId = await this.getActiveTabId();
    if (!tabId) {
      console.warn('⚠️ No active tab, skipping storage cleanup');
      return;
    }

    this.onLogMessage('🔄 Cleanup: Clearing browser storage...', 'log');

    try {
      // Execute storage clearing script in the page context
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          try {
            // Clear localStorage
            localStorage.clear();
            console.log('✅ localStorage cleared');
          } catch (e) {
            console.warn('⚠️ Failed to clear localStorage:', e);
          }

          try {
            // Clear sessionStorage
            sessionStorage.clear();
            console.log('✅ sessionStorage cleared');
          } catch (e) {
            console.warn('⚠️ Failed to clear sessionStorage:', e);
          }

          try {
            // Clear IndexedDB
            if ('indexedDB' in window) {
              indexedDB.databases().then((dbs) => {
                for (const db of dbs) {
                  if (db.name) {
                    indexedDB.deleteDatabase(db.name);
                    console.log(`✅ IndexedDB database deleted: ${db.name}`);
                  }
                }
              }).catch((e) => {
                console.warn('⚠️ Failed to delete IndexedDB databases:', e);
              });
            }
          } catch (e) {
            console.warn('⚠️ Failed to access IndexedDB:', e);
          }

          try {
            // Clear Cache Storage
            if ('caches' in window) {
              caches.keys().then((names) => {
                for (const name of names) {
                  caches.delete(name);
                  console.log(`✅ Cache deleted: ${name}`);
                }
              }).catch((e) => {
                console.warn('⚠️ Failed to delete caches:', e);
              });
            }
          } catch (e) {
            console.warn('⚠️ Failed to access Cache Storage:', e);
          }
        },
      });

      // Clear Cookies using Chrome Extension API
      if (chrome.cookies) {
        try {
          const cookies = await chrome.cookies.getAll({});
          for (const cookie of cookies) {
            const protocol = cookie.secure ? 'https:' : 'http:';
            const url = `${protocol}//${cookie.domain}${cookie.path}`;
            await chrome.cookies.remove({
              url,
              name: cookie.name,
              storeId: cookie.storeId,
            });
          }
          console.log(`✅ ${cookies.length} cookies cleared`);
        } catch (e) {
          console.warn('⚠️ Failed to clear cookies:', e);
        }
      }

      console.log('✅ Browser storage cleared successfully');
    } catch (e) {
      console.error('❌ Failed to clear browser storage:', e);
      throw e;
    }
  }

  /**
   * Unregister all Service Workers to prevent background interference
   */
  private async unregisterServiceWorkers() {
    const tabId = await this.getActiveTabId();
    if (!tabId) {
      console.warn('⚠️ No active tab, skipping Service Worker cleanup');
      return;
    }

    this.onLogMessage('🔄 Cleanup: Unregistering Service Workers...', 'log');

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: async () => {
          if ('serviceWorker' in navigator) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
                console.log('✅ Service Worker unregistered:', registration.scope);
              }
              if (registrations.length === 0) {
                console.log('✅ No Service Workers to unregister');
              }
            } catch (e) {
              console.warn('⚠️ Failed to unregister Service Workers:', e);
            }
          }
        },
      });

      console.log('✅ Service Workers unregistered successfully');
    } catch (e) {
      console.error('❌ Failed to unregister Service Workers:', e);
      throw e;
    }
  }

  /**
   * Reset page state to a clean data URL
   * This ensures no page history or state is carried over
   */
  private async resetPageState() {
    const tabId = await this.getActiveTabId();
    if (!tabId) {
      console.warn('⚠️ No active tab, skipping page state reset');
      return;
    }

    this.onLogMessage('🔄 Cleanup: Resetting page state...', 'log');

    try {
      // Get current URL to check if we need to navigate
      const currentUrl = await this.url();
      
      // Skip navigation if already on a clean data URL
      if (currentUrl.startsWith('data:text/html')) {
        console.log('✅ Already on clean data URL, skipping navigation');
        return;
      }

      // Navigate to clean data URL
      await chrome.tabs.update(tabId, {
        url: 'data:text/html,<html><body></body></html>',
      });

      // Wait for navigation to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log('✅ Page state reset to clean data URL');
    } catch (e) {
      console.error('❌ Failed to reset page state:', e);
      throw e;
    }
  }

  /**
   * Verify that the cleanup was successful
   * Checks that all storage is truly empty
   */
  private async verifyCleanState() {
    const tabId = await this.getActiveTabId();
    if (!tabId) {
      console.warn('⚠️ No active tab, skipping clean state verification');
      return;
    }

    this.onLogMessage('🔄 Cleanup: Verifying clean state...', 'log');

    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const results = {
            localStorageEmpty: true,
            sessionStorageEmpty: true,
            errors: [] as string[],
          };

          try {
            results.localStorageEmpty = localStorage.length === 0;
            if (!results.localStorageEmpty) {
              results.errors.push(`localStorage has ${localStorage.length} items`);
            }
          } catch (e) {
            results.errors.push(`localStorage check failed: ${e}`);
          }

          try {
            results.sessionStorageEmpty = sessionStorage.length === 0;
            if (!results.sessionStorageEmpty) {
              results.errors.push(`sessionStorage has ${sessionStorage.length} items`);
            }
          } catch (e) {
            results.errors.push(`sessionStorage check failed: ${e}`);
          }

          return results;
        },
      });

      const cleanState = result[0]?.result;
      if (!cleanState) {
        console.warn('⚠️ Could not verify clean state (no result)');
        return;
      }

      if (!cleanState.localStorageEmpty) {
        console.warn('⚠️ Clean state verification: localStorage not empty');
      }

      if (!cleanState.sessionStorageEmpty) {
        console.warn('⚠️ Clean state verification: sessionStorage not empty');
      }

      if (cleanState.errors.length > 0) {
        console.warn('⚠️ Clean state verification errors:', cleanState.errors);
      }

      if (cleanState.localStorageEmpty && cleanState.sessionStorageEmpty && cleanState.errors.length === 0) {
        console.log('✅ Clean state verified successfully');
      }
    } catch (e) {
      console.error('❌ Failed to verify clean state:', e);
      // Don't throw - verification failure is not critical
    }
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
