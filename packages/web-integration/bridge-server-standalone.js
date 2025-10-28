#!/usr/bin/env node

/**
 * Standalone Bridge Server for Midscene
 * 
 * This script starts a Bridge Server that listens for connections from
 * Chrome Extension and communicates with MCP clients.
 */

const { BridgeServer } = require('./dist/lib/bridge-mode/io-server.js');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: 3766,
    host: '0.0.0.0'
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
      config.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--host' || args[i] === '-h') {
      config.host = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage: node bridge-server-standalone.js [options]

Options:
  --port, -p <port>    Port to listen on (default: 3766)
  --host, -h <host>    Host to bind to (default: 0.0.0.0)
  --help               Show this help message

Example:
  node bridge-server-standalone.js --port 3766
  node bridge-server-standalone.js --port 3767 --host localhost
      `);
      process.exit(0);
    }
  }

  return config;
}

async function main() {
  const config = parseArgs();

  console.log('🚀 Starting Midscene Bridge Server...');
  console.log(`   Port: ${config.port}`);
  console.log(`   Host: ${config.host}`);
  console.log('');

  try {
    // Create Bridge Server instance
    const server = new BridgeServer(config.port, config.host);

    // Start listening
    await server.listen({
      timeout: false // No timeout, run indefinitely
    });

    console.log(`✅ Bridge Server listening on ${config.host}:${config.port}`);
    console.log('   Waiting for Chrome Extension to connect...');
    console.log('');
    console.log('Press Ctrl+C to stop the server');

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Bridge Server...');
      server.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down Bridge Server...');
      server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start Bridge Server:', error.message);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

