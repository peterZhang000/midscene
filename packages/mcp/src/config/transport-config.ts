/**
 * Transport Configuration Manager
 * Handles loading and validation of MCP transport configuration from environment variables
 */

export type TransportMode = 'stdio' | 'http' | 'auto';

export interface TransportConfig {
  mode: TransportMode;
  http: {
    port: number;
    host: string;
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
    session: {
      ttl: number; // milliseconds
      maxConcurrent: number;
    };
    security: {
      rateLimit: {
        windowMs: number;
        max: number;
      };
      apiKey?: string;
    };
    timeout: {
      request: number; // milliseconds
      server: number; // milliseconds
    };
  };
}

export class TransportConfigManager {
  /**
   * Load configuration from environment variables
   */
  static load(): TransportConfig {
    const mode = (process.env.MIDSCENE_MCP_TRANSPORT as TransportMode) || 'stdio';
    
    const config: TransportConfig = {
      mode,
      http: {
        port: parseInt(process.env.MIDSCENE_MCP_HTTP_PORT || '3000', 10),
        host: process.env.MIDSCENE_MCP_HTTP_HOST || '0.0.0.0',
        cors: {
          origin: this.parseCorsOrigin(process.env.MIDSCENE_MCP_CORS_ORIGIN || '*'),
          credentials: process.env.MIDSCENE_MCP_CORS_CREDENTIALS === 'true',
        },
        session: {
          ttl: parseInt(process.env.MIDSCENE_MCP_SESSION_TTL || '1800000', 10), // 30 minutes default
          maxConcurrent: parseInt(process.env.MIDSCENE_MCP_MAX_SESSIONS || '50', 10),
        },
        security: {
          rateLimit: {
            windowMs: parseInt(process.env.MIDSCENE_MCP_RATE_WINDOW || '60000', 10), // 1 minute default
            max: parseInt(process.env.MIDSCENE_MCP_RATE_MAX || '100', 10),
          },
          apiKey: process.env.MIDSCENE_MCP_API_KEY,
        },
        timeout: {
          request: parseInt(process.env.MCP_SERVER_REQUEST_TIMEOUT || '300000', 10), // 5 minutes default
          server: parseInt(process.env.MCP_SERVER_TIMEOUT || '0', 10), // 0 = no timeout
        },
      },
    };

    this.validate(config);
    return config;
  }

  /**
   * Parse CORS origin configuration
   * Supports single origin or comma-separated multiple origins
   */
  private static parseCorsOrigin(origin: string): string | string[] {
    if (origin === '*') {
      return '*';
    }
    
    if (origin.includes(',')) {
      return origin.split(',').map(o => o.trim());
    }
    
    return origin;
  }

  /**
   * Validate configuration values
   */
  static validate(config: TransportConfig): void {
    // Validate transport mode
    const validModes: TransportMode[] = ['stdio', 'http', 'auto'];
    if (!validModes.includes(config.mode)) {
      throw new Error(`Invalid transport mode: ${config.mode}. Must be one of: ${validModes.join(', ')}`);
    }

    // Validate HTTP configuration
    if (config.http.port < 1 || config.http.port > 65535) {
      throw new Error(`Invalid HTTP port: ${config.http.port}. Must be between 1 and 65535`);
    }

    if (config.http.session.maxConcurrent < 1) {
      throw new Error(`Invalid maxConcurrent: ${config.http.session.maxConcurrent}. Must be at least 1`);
    }

    if (config.http.session.ttl < 60000) {
      throw new Error(`Invalid session TTL: ${config.http.session.ttl}. Must be at least 60000ms (1 minute)`);
    }

    if (config.http.security.rateLimit.windowMs < 1000) {
      throw new Error(`Invalid rate limit window: ${config.http.security.rateLimit.windowMs}. Must be at least 1000ms`);
    }

    if (config.http.security.rateLimit.max < 1) {
      throw new Error(`Invalid rate limit max: ${config.http.security.rateLimit.max}. Must be at least 1`);
    }

    if (config.http.timeout.request < 0) {
      throw new Error(`Invalid request timeout: ${config.http.timeout.request}. Must be at least 0`);
    }

    if (config.http.timeout.server < 0) {
      throw new Error(`Invalid server timeout: ${config.http.timeout.server}. Must be at least 0`);
    }
  }

  /**
   * Auto-detect best transport mode based on environment
   */
  static detectTransportMode(): TransportMode {
    // Check if running in containerized environment
    if (process.env.KUBERNETES_SERVICE_HOST || process.env.DOCKER_CONTAINER) {
      console.error('🔍 Auto-detected containerized environment, using HTTP transport');
      return 'http';
    }

    // Check if stdio is available
    if (!process.stdin.isTTY && process.stdin.readable) {
      console.error('🔍 Auto-detected stdio availability, using stdio transport');
      return 'stdio';
    }

    // Default to HTTP for better compatibility
    console.error('🔍 Auto-detection defaulting to HTTP transport');
    return 'http';
  }

  /**
   * Log current configuration (for debugging)
   */
  static logConfig(config: TransportConfig): void {
    console.error('📋 MCP Transport Configuration:');
    console.error(`   Mode: ${config.mode}`);
    
    if (config.mode === 'http' || config.mode === 'auto') {
      console.error(`   HTTP Port: ${config.http.port}`);
      console.error(`   HTTP Host: ${config.http.host}`);
      console.error(`   CORS Origin: ${JSON.stringify(config.http.cors.origin)}`);
      console.error(`   Max Sessions: ${config.http.session.maxConcurrent}`);
      console.error(`   Session TTL: ${config.http.session.ttl}ms`);
      console.error(`   Rate Limit: ${config.http.security.rateLimit.max} requests per ${config.http.security.rateLimit.windowMs}ms`);
      console.error(`   Request Timeout: ${config.http.timeout.request}ms`);
      console.error(`   Server Timeout: ${config.http.timeout.server === 0 ? 'disabled' : config.http.timeout.server + 'ms'}`);
      console.error(`   API Key: ${config.http.security.apiKey ? '***configured***' : 'not set'}`);
    }
  }
}

