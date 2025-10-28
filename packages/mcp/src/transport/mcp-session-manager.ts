/**
 * MCP Session Manager
 * Manages MCP Server instances for each HTTP session
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SetLevelRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MidsceneManager } from '../midscene.js';
import { PROMPTS } from '../prompts.js';
import { handleListResources, handleReadResource } from '../resources.js';
import { tools } from '../tools.js';
import { MemoryTransport } from './memory-transport.js';

declare const __VERSION__: string;

interface MCPSessionInstance {
  server: McpServer;
  transport: MemoryTransport;
  midsceneManager: MidsceneManager;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Manages MCP Server instances for HTTP sessions
 * Each session gets its own MCP Server instance for proper isolation
 */
export class MCPSessionManager {
  private sessions = new Map<string, MCPSessionInstance>();
  private cleanupInterval?: NodeJS.Timeout;
  private sessionTTL: number;

  constructor(sessionTTL: number = 1800000) {
    this.sessionTTL = sessionTTL;
    this.startCleanupTimer();
  }

  /**
   * Get or create an MCP Server instance for a session
   * @param sessionId - Unique session identifier
   * @param bridgeUrl - Optional remote Bridge WebSocket URL (e.g., ws://192.168.1.100:3766)
   */
  async getOrCreateSession(sessionId: string, bridgeUrl?: string): Promise<MCPSessionInstance> {
    let session = this.sessions.get(sessionId);

    if (session) {
      // Update last activity
      session.lastActivity = new Date();
      return session;
    }

    // Create new MCP Server instance for this session
    console.error(`📦 Creating new MCP Server instance for session: ${sessionId}`);
    if (bridgeUrl) {
      console.error(`🌐 Session will use REMOTE bridge: ${bridgeUrl}`);
    } else {
      console.error(`🏠 Session will use LOCAL bridge (default)`);
    }

    const server = new McpServer({
      name: '@midscene/mcp',
      version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'unknown',
      description:
        'Midscene MCP Server: Control the browser using natural language commands for navigation, clicking, input, hovering, and achieving goals. Also supports screenshots and JavaScript execution.',
    });

    // Register the playwright example tool
    server.tool(
      tools.midscene_playwright_example.name,
      tools.midscene_playwright_example.description,
      {},
      async () => {
        return {
          content: [
            {
              type: 'text',
              text: PROMPTS.PLAYWRIGHT_CODE_EXAMPLE,
            },
          ],
          isError: false,
        };
      },
    );

    // Create Midscene manager for this session (with optional bridgeUrl)
    const midsceneManager = new MidsceneManager(server, { bridgeUrl });

    // Create memory transport for this session
    const transport = new MemoryTransport();

    // Register capabilities BEFORE connecting
    server.server.registerCapabilities({
      resources: {},
      logging: {},
    });

    // Register resource handlers
    server.server.setRequestHandler(
      ListResourcesRequestSchema,
      handleListResources,
    );
    server.server.setRequestHandler(
      ReadResourceRequestSchema,
      handleReadResource,
    );

    // Register logging handler
    server.server.setRequestHandler(SetLevelRequestSchema, async () => {
      return {};
    });

    // Connect the server to the transport (this will call transport.start())
    await server.connect(transport);

    // Store the session
    session = {
      server,
      transport,
      midsceneManager,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);

    console.error(`✅ MCP Server instance created for session: ${sessionId} (${this.sessions.size} active sessions)`);

    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): MCPSessionInstance | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  /**
   * Close a session and cleanup resources
   */
  async closeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    console.error(`🗑️  Closing MCP Server instance for session: ${sessionId}`);

    try {
      // Close Midscene manager
      await session.midsceneManager.closeBrowser();

      // Close MCP server
      session.server.close();

      // Close transport
      await session.transport.close();

      // Remove from map
      this.sessions.delete(sessionId);

      console.error(`✅ Session closed: ${sessionId} (${this.sessions.size} active sessions)`);

      return true;
    } catch (error) {
      console.error(`❌ Error closing session ${sessionId}:`, error);
      // Still remove from map even if cleanup failed
      this.sessions.delete(sessionId);
      return false;
    }
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);

    // Don't keep the process alive just for this timer
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();

      if (inactiveTime > this.sessionTTL) {
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      console.error(
        `🧹 Cleaning up ${expiredSessions.length} expired MCP session(s)`
      );

      for (const sessionId of expiredSessions) {
        await this.closeSession(sessionId);
      }
    }
  }

  /**
   * Cleanup all sessions and stop
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    const sessionIds = Array.from(this.sessions.keys());
    console.error(`🛑 Closing ${sessionIds.length} active MCP session(s)`);

    for (const sessionId of sessionIds) {
      await this.closeSession(sessionId);
    }
  }
}

