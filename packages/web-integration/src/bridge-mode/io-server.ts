import { sleep } from '@midscene/core/utils';
import { logMsg } from '@midscene/shared/utils';
import { Server, type Socket as ServerSocket } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';

import {
  type BridgeCall,
  type BridgeCallResponse,
  BridgeCallTimeout,
  type BridgeConnectedEventPayload,
  BridgeErrorCodeNoClientConnected,
  BridgeEvent,
  BridgeSignalKill,
  DefaultBridgeServerPort,
} from './common';

declare const __VERSION__: string;

export const killRunningServer = async (port?: number) => {
  try {
    const client = ClientIO(
      `ws://localhost:${port || DefaultBridgeServerPort}`,
      {
        query: {
          [BridgeSignalKill]: 1,
        },
      },
    );
    await sleep(100);
    await client.close();
  } catch (e) {
    // console.error('failed to kill port', e);
  }
};

// ws server, this is where the request is sent
export class BridgeServer {
  private callId = 0;
  private io: Server | null = null;
  private socket: ServerSocket | null = null;  // Chrome extension socket
  private mcpSocket: ServerSocket | null = null;  // 🔧 FIX: MCP Server socket
  private listeningTimeoutId: NodeJS.Timeout | null = null;
  private listeningTimerFlag = false;
  private connectionTipTimer: NodeJS.Timeout | null = null;
  public calls: Record<string, BridgeCall> = {};

  private connectionLost = false;
  private connectionLostReason = '';

  constructor(
    public port: number,
    public onConnect?: () => void,
    public onDisconnect?: (reason: string) => void,
    public closeConflictServer?: boolean,
  ) {}

  async listen(
    opts: {
      timeout?: number | false;
    } = {},
  ): Promise<void> {
    const { timeout = 30000 } = opts;

    if (this.closeConflictServer) {
      await killRunningServer(this.port);
    }

    return new Promise((resolve, reject) => {
      if (this.listeningTimerFlag) {
        return reject(new Error('already listening'));
      }
      this.listeningTimerFlag = true;

      this.listeningTimeoutId = timeout
        ? setTimeout(() => {
            reject(
              new Error(
                `no extension connected after ${timeout}ms (${BridgeErrorCodeNoClientConnected})`,
              ),
            );
          }, timeout)
        : null;

      this.connectionTipTimer =
        !timeout || timeout > 3000
          ? setTimeout(() => {
              logMsg('waiting for bridge to connect...');
            }, 2000)
          : null;
      this.io = new Server(this.port, {
        maxHttpBufferSize: 100 * 1024 * 1024, // 100MB
      });

      // Listen for the native HTTP server 'listening' event
      this.io.httpServer.once('listening', () => {
        resolve();
      });

      this.io.httpServer.once('error', (err: Error) => {
        reject(new Error(`Bridge Listening Error: ${err.message}`));
      });

      this.io.use((socket, next) => {
        // 🔧 FIX: Allow MCP Server to connect even if Chrome extension is connected
        const clientType = socket.handshake.query.client_type;
        
        if (this.socket && clientType !== 'mcp_server') {
          // Only reject non-MCP clients when already connected
          next(new Error('server already connected by another client'));
        } else {
          next();
        }
      });

      this.io.on('connection', (socket) => {
        // check the connection url
        const url = socket.handshake.url;
        if (url.includes(BridgeSignalKill)) {
          console.warn('kill signal received, closing bridge server');
          return this.close();
        }

        this.connectionLost = false;
        this.connectionLostReason = '';
        this.listeningTimeoutId && clearTimeout(this.listeningTimeoutId);
        this.listeningTimeoutId = null;
        this.connectionTipTimer && clearTimeout(this.connectionTipTimer);
        this.connectionTipTimer = null;
        
        // 🔧 FIX: Allow MCP Server to connect even if Chrome extension is connected
        const clientType = socket.handshake.query.client_type;
        
        if (this.socket && clientType !== 'mcp_server') {
          // Only reject non-MCP clients when already connected
          socket.emit(BridgeEvent.Refused);
          socket.disconnect();

          return reject(
            new Error('server already connected by another client'),
          );
        }

        try {
          // 🔧 FIX: Distinguish between Chrome extension and MCP Server
          const clientType = socket.handshake.query.client_type;
          const isMcpClient = clientType === 'mcp_server';
          
          if (isMcpClient) {
            logMsg('MCP Server client connected');
            this.mcpSocket = socket;
          } else {
            logMsg('Chrome extension client connected');
            this.socket = socket;
          }

          const clientVersion = socket.handshake.query.version;
          logMsg(
            `Bridge connected (${isMcpClient ? 'MCP Server' : 'Chrome Extension'}), cli-side version v${__VERSION__}, browser-side version v${clientVersion}`,
          );

          socket.on(BridgeEvent.CallResponse, (params: BridgeCallResponse) => {
            const id = params.id;
            const response = params.response;
            const error = params.error;

            // 🔧 FIX: If this response is for a local call, trigger callback
            // Otherwise, forward the response to MCP Server
            const call = this.calls[id];
            if (call) {
              // This is a local call (initiated by BridgeServer.call())
              this.triggerCallResponseCallback(id, error, response);
            } else if (this.mcpSocket && this.mcpSocket.connected) {
              // This is a remote call from MCP Server, forward the response back
              logMsg(`Forwarding response to MCP Server: id=${id}`);
              this.mcpSocket.emit(BridgeEvent.CallResponse, params);
            } else {
              logMsg(`Warning: Received response for unknown call id=${id}`);
            }
          });

          // 🔧 FIX: Listen for Call events from MCP Server and forward to Chrome Extension
          if (isMcpClient) {
            socket.on(BridgeEvent.Call, (params: { id: string; method: string; args: any[] }) => {
              logMsg(`Received call from MCP Server: ${params.method} (id: ${params.id})`);
              
              // Forward the call to Chrome Extension
              if (this.socket && this.socket.connected) {
                this.socket.emit(BridgeEvent.Call, params);
                logMsg(`Forwarded call to Chrome Extension: ${params.method} (id: ${params.id})`);
              } else {
                // Chrome Extension not connected, send error response back to MCP Server
                logMsg(`Chrome Extension not connected, cannot forward call: ${params.method}`);
                socket.emit(BridgeEvent.CallResponse, {
                  id: params.id,
                  error: new Error('Chrome Extension not connected'),
                  response: null,
                });
              }
            });
          }

          socket.on('disconnect', (reason: string) => {
            // 🔧 FIX: Only close server if Chrome extension disconnects
            const clientType = socket.handshake.query.client_type;
            const isMcpClient = clientType === 'mcp_server';
            
            if (isMcpClient) {
              logMsg('MCP Server client disconnected');
              this.mcpSocket = null;
              // Don't close the server, Chrome extension might still be connected
            } else {
              logMsg('Chrome extension client disconnected');
              this.socket = null;
              this.connectionLost = true;
              this.connectionLostReason = reason;

              try {
                this.io?.close();
              } catch (e) {
                // ignore
              }

              // flush all pending calls as error
              for (const id in this.calls) {
                const call = this.calls[id];

                if (!call.responseTime) {
                  const errorMessage = this.connectionLostErrorMsg();
                  this.triggerCallResponseCallback(
                    id,
                    new Error(errorMessage),
                    null,
                  );
                }
              }

              this.onDisconnect?.(reason);
            }
          });

          setTimeout(() => {
            this.onConnect?.();

            const payload = {
              version: __VERSION__,
            } as BridgeConnectedEventPayload;
            socket.emit(BridgeEvent.Connected, payload);
            Promise.resolve().then(() => {
              for (const id in this.calls) {
                if (this.calls[id].callTime === 0) {
                  this.emitCall(id);
                }
              }
            });
          }, 0);
        } catch (e) {
          console.error('failed to handle connection event', e);
          reject(e);
        }
      });

      this.io.on('close', () => {
        this.close();
      });
    });
  }

  private connectionLostErrorMsg = () => {
    return `Connection lost, reason: ${this.connectionLostReason}`;
  };

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

    if (this.socket) {
      this.socket.emit(BridgeEvent.Call, {
        id,
        method: call.method,
        args: call.args,
      });
      call.callTime = Date.now();
    }
  }

  async call<T = any>(
    method: string,
    args: any[],
    timeout = BridgeCallTimeout,
  ): Promise<T> {
    const id = `${this.callId++}`;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        logMsg(`bridge call timeout, id=${id}, method=${method}, args=`, args);
        this.calls[id].error = new Error(
          `Bridge call timeout after ${timeout}ms: ${method}`,
        );
        reject(this.calls[id].error);
      }, timeout);

      this.calls[id] = {
        id,
        method,
        args,
        response: null,
        createTime: Date.now(),
        callTime: 0,
        responseTime: 0,
        callback: (error: Error | undefined, response: any) => {
          clearTimeout(timeoutId);
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        },
      };

      this.emitCall(id);
    });
  }

  // do NOT restart after close
  async close() {
    this.listeningTimeoutId && clearTimeout(this.listeningTimeoutId);
    this.connectionTipTimer && clearTimeout(this.connectionTipTimer);
    const closeProcess = this.io?.close();
    this.io = null;

    return closeProcess;
  }
}
