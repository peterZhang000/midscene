import { assert } from '@midscene/shared/utils';
import { io as ClientIO, type Socket as ClientSocket } from 'socket.io-client';
import {
  type BridgeCallRequest,
  type BridgeCallResponse,
  type BridgeConnectedEventPayload,
  BridgeEvent,
  type BridgeCall,
  BridgeCallTimeout,
} from './common';

declare const __VERSION__: string;

// ws client, this is where the request is processed (Chrome Extension side)
export class BridgeClient {
  private socket: ClientSocket | null = null;
  public serverVersion: string | null = null;
  constructor(
    public endpoint: string,
    public onBridgeCall: (method: string, args: any[]) => Promise<any>,
    public onDisconnect?: () => void,
  ) {}

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = ClientIO(this.endpoint, {
        reconnection: false,
        query: {
          version: __VERSION__,
        },
      });

      const timeout = setTimeout(() => {
        try {
          this.socket?.offAny();
          this.socket?.close();
        } catch (e) {
          console.warn('got error when offing socket', e);
        }
        this.socket = null;
        reject(new Error('failed to connect to bridge server after timeout'));
      }, 1 * 1000);

      // on disconnect
      this.socket.on('disconnect', (reason: string) => {
        this.socket = null;
        this.onDisconnect?.();
      });

      this.socket.on('connect_error', (e: any) => {
        console.error('bridge-connect-error', e);
        reject(new Error(e || 'bridge connect error'));
      });

      this.socket.on(
        BridgeEvent.Connected,
        (payload: BridgeConnectedEventPayload) => {
          clearTimeout(timeout);
          this.serverVersion = payload?.version || 'unknown';
          resolve(this.socket);
        },
      );
      this.socket.on(BridgeEvent.Refused, (e: any) => {
        console.error('bridge-refused', e);
        try {
          this.socket?.disconnect();
        } catch (e) {
          // console.warn('got error when disconnecting socket', e);
        }
        reject(new Error(e || 'bridge refused'));
      });
      this.socket.on(BridgeEvent.Call, (call: BridgeCallRequest) => {
        const id = call.id;
        assert(typeof id !== 'undefined', 'call id is required');
        (async () => {
          let response: any;
          try {
            response = await this.onBridgeCall(call.method, call.args);
          } catch (e: any) {
            const errorContent = `Error from bridge client when calling, method: ${call.method}, args: ${call.args}, error: ${e?.message || e}\n${e?.stack || ''}`;
            console.error(errorContent);
            return this.socket?.emit(BridgeEvent.CallResponse, {
              id,
              error: errorContent,
            } as BridgeCallResponse);
          }
          this.socket?.emit(BridgeEvent.CallResponse, {
            id,
            response,
          } as BridgeCallResponse);
        })();
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

/**
 * BridgeRemoteClient - Connects to a REMOTE Bridge Server
 * 
 * This class allows the MCP Server to connect to a Bridge Server
 * that is managed by BigTestAgent, enabling Bridge reuse across
 * multiple test executions.
 */
export class BridgeRemoteClient {
  private callId = 0;
  private socket: ClientSocket | null = null;
  public calls: Record<string, BridgeCall> = {};

  private connectionLost = false;
  private connectionLostReason = '';
  private connectTimeout: NodeJS.Timeout | null = null;
  
  // Server version received from handshake
  public serverVersion: string = '';

  constructor(
    public bridgeUrl: string,
    public onConnect?: () => void,
    public onDisconnect?: (reason: string) => void,
  ) {}

  /**
   * Connect to remote Bridge Server
   */
  async connect(
    opts: {
      timeout?: number | false;
    } = {},
  ): Promise<void> {
    const { timeout = 30000 } = opts;

    return new Promise((resolve, reject) => {
      console.log(`🌐 Connecting to remote Bridge: ${this.bridgeUrl}`);

      this.connectTimeout = timeout
        ? setTimeout(() => {
            reject(
              new Error(
                `Failed to connect to Bridge after ${timeout}ms: ${this.bridgeUrl}`,
              ),
            );
          }, timeout)
        : null;

      this.socket = ClientIO(this.bridgeUrl, {
        query: {
          version: __VERSION__,
          client_type: 'mcp_server',
        },
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log(`✅ Connected to remote Bridge: ${this.bridgeUrl}`);
        this.connectionLost = false;
        this.connectionLostReason = '';
        
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }

        if (this.onConnect) {
          this.onConnect();
        }

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.log(`❌ Connection error: ${error.message}`);
        reject(new Error(`Failed to connect to Bridge: ${error.message}`));
      });

      this.socket.on(BridgeEvent.CallResponse, (params: BridgeCallResponse) => {
        const id = params.id;
        const response = params.response;
        const error = params.error;

        this.triggerCallResponseCallback(id, error, response);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log(`⚠️ Bridge disconnected: ${reason}`);
        this.connectionLost = true;
        this.connectionLostReason = reason;

        if (this.onDisconnect) {
          this.onDisconnect(reason);
        }
      });

      this.socket.on(BridgeEvent.Connected, (payload) => {
        this.serverVersion = payload.version || '';
        console.log(
          `Bridge handshake completed, server version: ${payload.version}`,
        );
      });
    });
  }

  private async triggerCallResponseCallback(
    id: string | number,
    error: Error | null,
    response: any,
  ) {
    const call = this.calls[id];
    if (!call) {
      throw new Error(`call ${id} not found`);
    }
    call.error = error || undefined;
    call.response = response;
    call.responseTime = Date.now();

    call.callback(call.error, response);
  }

  private async emitCall(id: string) {
    const call = this.calls[id];
    if (!call) {
      throw new Error(`call ${id} not found`);
    }

    if (this.connectionLost) {
      const message = `Connection lost, reason: ${this.connectionLostReason}`;
      call.callback(new Error(message), null);
      return;
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit(BridgeEvent.Call, {
        id,
        method: call.method,
        args: call.args,
      });
      call.callTime = Date.now();
    } else {
      call.callback(new Error('Socket not connected'), null);
    }
  }

  /**
   * Call a method on the remote Bridge
   * Same interface as BridgeServer.call()
   */
  async call<T = any>(
    method: string,
    args: any[],
    timeout = BridgeCallTimeout,
  ): Promise<T> {
    const id = `${this.callId++}`;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.log(`bridge call timeout, id=${id}, method=${method}, args=`, args);
        this.calls[id].error = new Error(
          `Bridge call timeout after ${timeout}ms: ${method}`,
        );
        reject(this.calls[id].error);
      }, timeout);

      this.calls[id] = {
        id,
        method,
        args,
        response: undefined,
        createTime: Date.now(),
        callTime: 0,
        responseTime: 0,
        callback: (error: Error | undefined, response: any) => {
          clearTimeout(timeoutId);
          delete this.calls[id];
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        },
      };

      if (this.socket && this.socket.connected) {
        this.emitCall(id);
      } else {
        reject(new Error('Socket not connected to Bridge'));
      }
    });
  }

  /**
   * Close the connection to remote Bridge
   */
  async close(): Promise<void> {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    if (this.socket) {
      console.log('Closing connection to remote Bridge');
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Disconnect from remote Bridge (alias for close())
   */
  disconnect(): void {
    this.close();
  }

  /**
   * Check if connected to remote Bridge
   */
  get connected(): boolean {
    return !!(this.socket && this.socket.connected);
  }
}
