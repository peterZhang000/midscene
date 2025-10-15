#!/usr/bin/env node
import { setIsMcp } from '@midscene/shared/utils';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SetLevelRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MidsceneManager } from './midscene.js';
import { PROMPTS } from './prompts.js';
import { handleListResources, handleReadResource } from './resources.js';
import { tools } from './tools.js';
import { TransportRouter } from './transport/router.js';

declare const __VERSION__: string;

setIsMcp(true);

// Store references for cleanup
let httpServer: any = undefined;
let stdioServer: McpServer | undefined = undefined;
let stdioMidsceneManager: MidsceneManager | undefined = undefined;

async function runServer() {
  // Create transport using router
  const router = new TransportRouter();
  const { transport, httpServer: http, mode } = await router.createTransport();

  if (mode === 'http') {
    // HTTP mode: server instances are managed by MCPHttpServer
    httpServer = http;
    console.error('✅ Midscene MCP Server started successfully (HTTP mode)');
  } else {
    // Stdio mode: create and configure a single server instance
    const server = new McpServer({
      name: '@midscene/mcp',
      version: __VERSION__,
      description:
        'Midscene MCP Server: Control the browser using natural language commands for navigation, clicking, input, hovering, and achieving goals. Also supports screenshots and JavaScript execution.',
    });

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

    const midsceneManager = new MidsceneManager(server);

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

    // Connect to transport
    await server.connect(transport!);

    // Store references for cleanup
    stdioServer = server;
    stdioMidsceneManager = midsceneManager;

    console.error('✅ Midscene MCP Server started successfully (stdio mode)');
  }
}

// Graceful shutdown handler
async function shutdown(signal: string) {
  console.error(`\n${signal} received, shutting down gracefully...`);

  try {
    // Close stdio MCP server if running
    if (stdioServer) {
      stdioServer.close();
    }

    // Close stdio browser if running
    if (stdioMidsceneManager) {
      await stdioMidsceneManager.closeBrowser();
    }

    // Stop HTTP server if running
    if (httpServer) {
      await httpServer.stop();
    }

    console.error('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle stdio close (for backward compatibility)
process.stdin.on('close', () => {
  console.error('Stdin closed, shutting down...');
  shutdown('STDIN_CLOSE').catch(console.error);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  shutdown('UNCAUGHT_EXCEPTION').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION').catch(() => process.exit(1));
});

// Start server
runServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
