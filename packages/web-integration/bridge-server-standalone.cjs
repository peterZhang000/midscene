#!/usr/bin/env node

/**
 * Standalone Bridge Server for Midscene
 * 
 * This script starts a Bridge Server that listens for connections from
 * Chrome Extension and communicates with MCP clients.
 */

// Dynamically import BridgeServer based on script location
const path = require('path');
const fs = require('fs');

// Find Midscene installation
function findMidsceneInstallation() {
  const possiblePaths = [
    // If script is in Midscene directory
    path.join(__dirname, 'dist/lib/bridge-mode/io-server.js'),
    // If Midscene is in a known location
    '/Users/peter/Documents/automation-test/midscene/packages/web-integration/dist/lib/bridge-mode/io-server.js',
    // User home directory
    path.join(process.env.HOME, 'midscene/packages/web-integration/dist/lib/bridge-mode/io-server.js'),
    // npm global
    '/usr/local/lib/node_modules/@midscene/web-integration/dist/lib/bridge-mode/io-server.js',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    'Cannot find Midscene installation. Please ensure @midscene/web-integration is installed.\n' +
    'Or set MIDSCENE_PATH environment variable to point to the Midscene packages/web-integration directory.'
  );
}

const midscenePath = process.env.MIDSCENE_IO_SERVER_PATH || findMidsceneInstallation();
const { BridgeServer } = require(midscenePath);

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
  console.log('');

  try {
    // Create Bridge Server instance
    // BridgeServer constructor: (port, onConnect, onDisconnect, closeConflictServer)
    // Note: BridgeServer does NOT support host parameter, always binds to 0.0.0.0
    // We only pass port, other parameters are optional callbacks
    const server = new BridgeServer(config.port);

    // Start listening
    await server.listen({
      timeout: false // No timeout, run indefinitely
    });

    console.log(`✅ Bridge Server listening on 0.0.0.0:${config.port}`);
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

