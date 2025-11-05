/**
 * Example: Programmatic Usage of Bridge Server
 * 
 * This example shows how to use the Bridge Server programmatically
 * in your Node.js application.
 */

const { startBridgeServer } = require('@midscene/bridge-server-standalone');

async function main() {
  console.log('Starting Bridge Server programmatically...\n');

  try {
    const server = await startBridgeServer({
      port: 3766,
      closeConflictServer: true,
      onConnect: () => {
        console.log('🎉 Client connected!');
      },
      onDisconnect: (reason) => {
        console.log('👋 Client disconnected:', reason);
      }
    });

    console.log('Server is running. Press Ctrl+C to stop.\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

main();


