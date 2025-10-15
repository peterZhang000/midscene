/**
 * Transport Router
 * Routes between stdio and HTTP transport based on configuration
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  TransportConfigManager,
  type TransportConfig,
} from '../config/transport-config.js';
import { MCPHttpServer } from './http-server.js';

export interface TransportResult {
  transport?: Transport;
  httpServer?: MCPHttpServer;
  mode: 'stdio' | 'http';
}

export class TransportRouter {
  private config: TransportConfig;

  constructor(config?: TransportConfig) {
    this.config = config || TransportConfigManager.load();
  }

  /**
   * Create appropriate transport based on configuration
   */
  async createTransport(): Promise<TransportResult> {
    let mode = this.config.mode;

    // Auto-detect transport mode if set to 'auto'
    if (mode === 'auto') {
      mode = TransportConfigManager.detectTransportMode();
      this.config.mode = mode;
    }

    console.error(`🔧 Starting Midscene MCP Server in ${mode} mode`);

    switch (mode) {
      case 'stdio':
        return this.createStdioTransport();
      case 'http':
        return await this.createHttpTransport();
      default:
        throw new Error(`Unsupported transport mode: ${mode}`);
    }
  }

  /**
   * Create stdio transport
   */
  private createStdioTransport(): TransportResult {
    console.error('📡 Using stdio transport (stdin/stdout)');
    const transport = new StdioServerTransport();
    
    return {
      transport,
      mode: 'stdio',
    };
  }

  /**
   * Create HTTP transport with server
   */
  private async createHttpTransport(): Promise<TransportResult> {
    console.error('🌐 Using HTTP transport');
    TransportConfigManager.logConfig(this.config);

    // Create HTTP server (manages its own MCP server instances per session)
    const httpServer = new MCPHttpServer(this.config.http);

    // Start HTTP server
    await httpServer.start();

    return {
      httpServer,
      mode: 'http',
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): TransportConfig {
    return this.config;
  }
}

