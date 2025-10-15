/**
 * Session Manager
 * Manages MCP client sessions for HTTP transport
 */

import type { TransportConfig } from '../config/transport-config.js';

export type SessionState = 'initializing' | 'active' | 'closing' | 'closed';

export interface MCPSession {
  id: string;
  clientInfo: {
    userAgent?: string;
    ip: string;
    connectedAt: Date;
  };
  state: SessionState;
  lastActivity: Date;
  metadata: Record<string, any>;
}

export class SessionManager {
  private sessions = new Map<string, MCPSession>();
  private config: TransportConfig['http']['session'];
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: TransportConfig['http']['session']) {
    this.config = config;
    this.startCleanupTimer();
  }

  /**
   * Create a new session
   */
  createSession(
    sessionId: string,
    clientInfo?: Partial<MCPSession['clientInfo']>
  ): MCPSession {
    // Check concurrent session limit
    if (this.sessions.size >= this.config.maxConcurrent) {
      throw new Error(
        `Maximum concurrent sessions reached (${this.config.maxConcurrent})`
      );
    }

    const session: MCPSession = {
      id: sessionId,
      clientInfo: {
        ip: clientInfo?.ip || 'unknown',
        userAgent: clientInfo?.userAgent,
        connectedAt: new Date(),
      },
      state: 'initializing',
      lastActivity: new Date(),
      metadata: {},
    };

    this.sessions.set(sessionId, session);
    console.error(
      `✅ Session created: ${sessionId} (${this.sessions.size}/${this.config.maxConcurrent})`
    );

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): MCPSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session state
   */
  updateSessionState(sessionId: string, state: SessionState): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = state;
      session.lastActivity = new Date();
      console.error(`🔄 Session ${sessionId} state updated: ${state}`);
    }
  }

  /**
   * Update session activity timestamp
   */
  touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Set session metadata
   */
  setSessionMetadata(
    sessionId: string,
    key: string,
    value: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata[key] = value;
    }
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId: string, key: string): any {
    const session = this.sessions.get(sessionId);
    return session?.metadata[key];
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.state = 'closed';
    this.sessions.delete(sessionId);
    console.error(
      `❌ Session closed: ${sessionId} (${this.sessions.size}/${this.config.maxConcurrent})`
    );

    return true;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): MCPSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Check if a session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
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
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      
      if (inactiveTime > this.config.ttl) {
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      console.error(
        `🧹 Cleaning up ${expiredSessions.length} expired session(s)`
      );
      
      for (const sessionId of expiredSessions) {
        this.closeSession(sessionId);
      }
    }
  }

  /**
   * Stop cleanup timer and close all sessions
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    const sessionIds = Array.from(this.sessions.keys());
    console.error(`🛑 Closing ${sessionIds.length} active session(s)`);
    
    for (const sessionId of sessionIds) {
      this.closeSession(sessionId);
    }
  }

  /**
   * Get session statistics
   */
  getStats(): {
    total: number;
    active: number;
    initializing: number;
    closing: number;
    maxConcurrent: number;
  } {
    const sessions = this.getAllSessions();
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.state === 'active').length,
      initializing: sessions.filter(s => s.state === 'initializing').length,
      closing: sessions.filter(s => s.state === 'closing').length,
      maxConcurrent: this.config.maxConcurrent,
    };
  }
}

