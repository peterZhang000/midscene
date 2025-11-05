#!/usr/bin/env node

/**
 * CLI entry point for Midscene Bridge Server
 */

import { startBridgeServer } from './index';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: 3766,
    host: '0.0.0.0',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
      config.port = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--host' || args[i] === '-H') {
      config.host = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: midscene-bridge [options]

Options:
  --port, -p <port>    Port to listen on (default: 3766)
  --host, -H <host>    Host to bind to (default: 0.0.0.0)
  --help, -h           Show this help message

Example:
  midscene-bridge
  midscene-bridge --port 3767
  midscene-bridge --port 3766 --host 0.0.0.0
  midscene-bridge --host localhost --port 3767
      `);
      process.exit(0);
    }
  }

  return config;
}

async function main() {
  const config = parseArgs();

  try {
    const server = await startBridgeServer({
      port: config.port,
      host: config.host,
      closeConflictServer: true,
    });

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('\n🛑 Shutting down Bridge Server...');
      server.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Failed to start Bridge Server:', (error as Error).message);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


