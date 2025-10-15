/**
 * Memory Transport
 * In-memory transport for HTTP session to MCP Server communication
 */

import { EventEmitter } from 'events';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

/**
 * Memory-based transport that allows direct message passing
 * Used for HTTP sessions to communicate with their dedicated MCP Server
 */
export class MemoryTransport extends EventEmitter implements Transport {
  private started = false;
  private closed = false;
  private pendingRequests = new Map<string | number, {
    resolve: (message: JSONRPCMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  // Transport interface callbacks
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: any }) => void;
  sessionId?: string;

  constructor() {
    super();
    console.error('🔧 MemoryTransport created');
  }

  /**
   * Start the transport
   */
  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Transport already started');
    }
    this.started = true;
    console.error('✅ MemoryTransport started');
  }

  /**
   * Send a message through the transport (from MCP Server to HTTP client)
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed');
    }

    console.error(`📤 MemoryTransport sending message: id=${message.id}, method=${(message as any).method || 'response'}`);

    // If this is a response to a request, resolve the pending promise
    if ('id' in message && message.id !== undefined && message.id !== null) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        pending.resolve(message);
        return;
      }
    }

    // Otherwise, it's a notification - emit it for SSE connections
    console.error(`📢 MemoryTransport: Notification message sent: ${JSON.stringify(message).substring(0, 100)}`);
    this.emit('response', message);
  }

  /**
   * Receive a message from HTTP client and forward to MCP Server
   */
  async processRequest(message: JSONRPCMessage, timeout: number = 300000): Promise<JSONRPCMessage | null> {
    if (this.closed) {
      throw new Error('Transport is closed');
    }

    if (!this.started) {
      throw new Error('Transport not started');
    }

    const requestId = (message as any).id;
    const method = (message as any).method;
    console.error(`📥 MemoryTransport processing request: id=${requestId}, method=${method}`);

    // Check if this is a notification (no id field or id is null)
    if (requestId === null || requestId === undefined) {
      console.error(`📢 MemoryTransport processing notification: method=${method}`);
      
      // Forward the notification to the MCP Server via onmessage callback
      if (this.onmessage) {
        console.error(`🔔 MemoryTransport calling onmessage callback for notification method=${method}`);
        // Use setImmediate to ensure the event loop processes this asynchronously
        setImmediate(() => {
          this.onmessage!(message);
        });
      } else {
        throw new Error('No onmessage callback registered');
      }
      
      // Notifications don't expect a response
      return null;
    }

    // This is a request - create a promise to wait for the response
    const responsePromise = new Promise<JSONRPCMessage>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });
    });

    // Call the onmessage callback to send message to MCP Server
    if (this.onmessage) {
      console.error(`🔔 MemoryTransport calling onmessage callback for request id=${requestId}`);
      // Use setImmediate to ensure the event loop processes this asynchronously
      setImmediate(() => {
        this.onmessage!(message);
      });
    } else {
      throw new Error('No onmessage callback registered');
    }

    // Wait for the response
    return responsePromise;
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    console.error('🔒 MemoryTransport closing');

    this.closed = true;
    this.started = false;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Transport closed'));
    }
    this.pendingRequests.clear();

    // Remove all event listeners
    this.removeAllListeners();

    // Call onclose callback if set
    if (this.onclose) {
      this.onclose();
    }
  }

  /**
   * Check if transport is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
}