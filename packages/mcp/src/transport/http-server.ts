/**
 * HTTP Server Wrapper
 * Wraps StreamableHTTPServerTransport with Express.js server
 */

import cors from 'cors';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import type { Server as HttpServer } from 'http';
import type { TransportConfig } from '../config/transport-config.js';
import { SessionManager } from './session-manager.js';
import { MCPSessionManager } from './mcp-session-manager.js';
import type { JSONRPCMessage, JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';

declare const __VERSION__: string;

export class MCPHttpServer {
  private app: express.Application;
  private server?: HttpServer;
  private sessionManager: SessionManager;
  private mcpSessionManager: MCPSessionManager;
  private config: TransportConfig['http'];
  private startTime: Date;

  constructor(config: TransportConfig['http']) {
    this.config = config;
    this.sessionManager = new SessionManager(config.session);
    this.mcpSessionManager = new MCPSessionManager(config.session.ttl);
    this.startTime = new Date();
    this.app = express();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(
      cors({
        origin: this.config.cors.origin,
        credentials: this.config.cors.credentials,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type', 
          'Accept', 
          'mcp-session-id', 
          'Authorization',
          'x-bridge-url',      // Remote Bridge WebSocket URL
          'x-user-id',         // User identifier (for logging)
          'x-session-id',      // Custom session identifier
        ],
      })
    );

    // Rate limiting
    if (this.config.security.rateLimit) {
      const limiter = rateLimit({
        windowMs: this.config.security.rateLimit.windowMs,
        max: this.config.security.rateLimit.max,
        message: {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Too many requests, please try again later',
          },
          id: null,
        },
        standardHeaders: true,
        legacyHeaders: false,
      });
      
      this.app.use('/mcp', limiter);
    }

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.text({ type: 'text/*' }));

    // Request logging
    this.app.use(this.requestLogger.bind(this));

    // API key authentication (if configured)
    if (this.config.security.apiKey) {
      this.app.use('/mcp', this.apiKeyAuth.bind(this));
    }
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Main MCP endpoint
    this.app.all('/mcp', this.handleMCPRequest.bind(this));

    // Health check endpoint
    this.app.get('/health', this.handleHealthCheck.bind(this));

    // Server information endpoint
    this.app.get('/', this.handleServerInfo.bind(this));

    // Session management endpoints
    this.app.get('/sessions', this.handleListSessions.bind(this));
    this.app.delete('/sessions/:id', this.handleCloseSession.bind(this));

    // 404 handler
    this.app.use(this.handle404.bind(this));

    // Error handler
    this.app.use(this.handleError.bind(this));
  }

  /**
   * Request logger middleware
   */
  private requestLogger(req: Request, res: Response, next: () => void): void {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.error(
        `📊 ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      );
    });
    
    next();
  }

  /**
   * API key authentication middleware
   */
  private apiKeyAuth(req: Request, res: Response, next: () => void): void {
    const apiKey = req.headers.authorization?.replace('Bearer ', '') || 
                   req.query.apiKey as string;
    
    if (apiKey !== this.config.security.apiKey) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Invalid API key',
        },
        id: null,
      });
      return;
    }
    
    next();
  }

  /**
   * Handle MCP JSON-RPC requests
   */
  private async handleMCPRequest(req: Request, res: Response): Promise<void> {
    try {
      // Extract custom headers for multi-user bridge support
      const bridgeUrl = req.headers['x-bridge-url'] as string | undefined;
      const userId = req.headers['x-user-id'] as string | undefined;
      const customSessionId = req.headers['x-session-id'] as string | undefined;
      
      // Log bridge configuration if provided
      if (bridgeUrl) {
        console.error(`[MCP HTTP Server] X-Bridge-URL: ${bridgeUrl}`);
        if (userId) {
          console.error(`[MCP HTTP Server] X-User-ID: ${userId}`);
        }
        if (customSessionId) {
          console.error(`[MCP HTTP Server] X-Session-ID: ${customSessionId}`);
        }
      }
      
      // Extract or create session ID
      let sessionId = req.headers['mcp-session-id'] as string | undefined;
      
      if (!sessionId) {
        // Create new session
        sessionId = customSessionId || this.generateSessionId();
        const clientInfo = {
          ip: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'],
        };
        this.sessionManager.createSession(sessionId, clientInfo);
        
        // Send session ID in response header
        res.setHeader('mcp-session-id', sessionId);
      } else {
        // Update existing session activity
        if (this.sessionManager.hasSession(sessionId)) {
          this.sessionManager.touchSession(sessionId);
        } else {
          // Session expired or invalid, create new one
          const clientInfo = {
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'],
          };
          this.sessionManager.createSession(sessionId, clientInfo);
        }
      }

      // Handle GET request for SSE (Server-Sent Events)
      if (req.method === 'GET') {
        await this.handleSSEConnection(req, res, sessionId, bridgeUrl);
        return;
      }

      // Handle POST request for JSON-RPC
      if (req.method === 'POST') {
        await this.handleJSONRPCRequest(req, res, sessionId, bridgeUrl);
        return;
      }

      res.status(405).json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method Not Allowed',
        },
        id: null,
      });
    } catch (error) {
      console.error('❌ Error handling MCP request:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
            data: error instanceof Error ? error.message : String(error),
          },
          id: null,
        });
      }
    }
  }

  /**
   * Handle SSE connection for notifications
   */
  private async handleSSEConnection(
    req: Request,
    res: Response,
    sessionId: string,
    bridgeUrl?: string
  ): Promise<void> {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send initial comment to establish connection
    res.write(': connected\n\n');

    // Get or create MCP session (with optional bridgeUrl)
    const mcpSession = await this.mcpSessionManager.getOrCreateSession(sessionId, bridgeUrl);

    // Listen for responses from the MCP server
    const responseHandler = (message: JSONRPCMessage) => {
      try {
        res.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        console.error('❌ Error sending SSE message:', error);
      }
    };

    mcpSession.transport.on('response', responseHandler);

    // Handle client disconnect
    req.on('close', () => {
      mcpSession.transport.off('response', responseHandler);
      console.error(`📡 SSE connection closed for session: ${sessionId}`);
    });
  }

  /**
   * Handle JSON-RPC POST request
   */
  private async handleJSONRPCRequest(
    req: Request,
    res: Response,
    sessionId: string,
    bridgeUrl?: string
  ): Promise<void> {
    const jsonRpcRequest: JSONRPCRequest = req.body;

    if (!jsonRpcRequest || typeof jsonRpcRequest.method !== 'string') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: null,
      });
    }

    try {
      // Get or create MCP session (with optional bridgeUrl)
      const mcpSession = await this.mcpSessionManager.getOrCreateSession(sessionId, bridgeUrl);

      // Process the request through the memory transport
      // This will emit 'message' to the MCP server and wait for the response
      const timeout = this.config.timeout.request || 300000;
      const response = await mcpSession.transport.processRequest(jsonRpcRequest, timeout);

      // Send response back to client
      // For notifications, response will be null, so we send 204 No Content
      if (response === null) {
        res.status(204).send();
      } else {
        res.json(response);
      }
    } catch (error) {
      console.error('❌ Error processing JSON-RPC request:', error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
            data: error instanceof Error ? error.message : String(error),
          },
          id: jsonRpcRequest.id || null,
        });
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle health check requests
   */
  private handleHealthCheck(req: Request, res: Response): void {
    const uptime = Date.now() - this.startTime.getTime();
    const memoryUsage = process.memoryUsage();
    const sessionStats = this.sessionManager.getStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'unknown',
      transport: 'http',
      uptime,
      activeSessions: sessionStats.active,
      totalSessions: sessionStats.total,
      maxSessions: sessionStats.maxConcurrent,
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      },
    });
  }

  /**
   * Handle server information requests
   */
  private handleServerInfo(req: Request, res: Response): void {
    res.json({
      name: 'Midscene MCP Server',
      version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'unknown',
      transport: 'http',
      endpoints: {
        mcp: '/mcp',
        health: '/health',
        sessions: '/sessions',
      },
      documentation: 'https://midscenejs.com/mcp.html',
    });
  }

  /**
   * Handle list sessions requests
   */
  private handleListSessions(req: Request, res: Response): void {
    const sessions = this.sessionManager.getAllSessions();
    const stats = this.sessionManager.getStats();

    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        state: s.state,
        connectedAt: s.clientInfo.connectedAt,
        lastActivity: s.lastActivity,
        ip: s.clientInfo.ip,
        userAgent: s.clientInfo.userAgent,
      })),
      total: stats.total,
      active: stats.active,
      maxConcurrent: stats.maxConcurrent,
    });
  }

  /**
   * Handle close session requests
   */
  private handleCloseSession(req: Request, res: Response): void {
    const sessionId = req.params.id;
    
    if (!sessionId) {
      res.status(400).json({
        error: 'Session ID is required',
      });
      return;
    }

    const closed = this.sessionManager.closeSession(sessionId);
    
    if (closed) {
      res.json({
        success: true,
        message: `Session ${sessionId} closed`,
      });
    } else {
      res.status(404).json({
        error: `Session ${sessionId} not found`,
      });
    }
  }

  /**
   * Handle 404 errors
   */
  private handle404(req: Request, res: Response): void {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      availableEndpoints: ['/mcp', '/health', '/', '/sessions'],
    });
  }

  /**
   * Handle errors
   */
  private handleError(
    error: Error,
    req: Request,
    res: Response,
    next: () => void
  ): void {
    console.error('❌ Express error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error.message,
        },
        id: null,
      });
    }
  }

  /**
   * Start HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(
          this.config.port,
          this.config.host,
          () => {
            console.error(
              `🚀 Midscene MCP HTTP Server listening on http://${this.config.host}:${this.config.port}`
            );
            console.error(
              `📊 Health check available at http://${this.config.host}:${this.config.port}/health`
            );
            console.error(
              `📋 Session management at http://${this.config.host}:${this.config.port}/sessions`
            );
            resolve();
          }
        );

        // Set server timeout if configured
        if (this.config.timeout.server > 0) {
          this.server.timeout = this.config.timeout.server;
          console.error(`⏱️  Server timeout set to ${this.config.timeout.server}ms`);
        }

        // Set request timeout
        if (this.config.timeout.request > 0) {
          this.server.requestTimeout = this.config.timeout.request;
          console.error(`⏱️  Request timeout set to ${this.config.timeout.request}ms`);
        }

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            console.error(
              `❌ Port ${this.config.port} is already in use. Please set MIDSCENE_MCP_HTTP_PORT to a different port.`
            );
          } else {
            console.error('❌ Server error:', error);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop HTTP server and cleanup
   */
  async stop(): Promise<void> {
    console.error('🛑 Stopping Midscene MCP HTTP Server...');
    
    // Close all MCP sessions
    await this.mcpSessionManager.destroy();
    
    // Close all HTTP sessions
    this.sessionManager.destroy();

    // Close HTTP server
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server!.close((error) => {
          if (error) {
            console.error('❌ Error closing server:', error);
            reject(error);
          } else {
            console.error('✅ HTTP Server stopped');
            resolve();
          }
        });
      });
    }
  }

  /**
   * Get session manager instance
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}

