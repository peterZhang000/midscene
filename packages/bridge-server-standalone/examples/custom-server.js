/**
 * Example: Custom Bridge Server
 * 
 * This example shows how to create a custom bridge server
 * with advanced configurations.
 */

const { BridgeServer } = require('@midscene/bridge-server-standalone');

async function main() {
  console.log('Creating custom Bridge Server...\n');

  const port = process.env.PORT || 3766;
  const server = new BridgeServer(
    port,
    () => {
      console.log('✅ Chrome Extension connected');
      console.log('   Ready to receive commands\n');
    },
    (reason) => {
      console.log('❌ Chrome Extension disconnected');
      console.log(`   Reason: ${reason}\n`);
    },
    true // Close conflicting servers
  );

  try {
    // Start listening
    await server.listen({
      timeout: false // No timeout
    });

    console.log(`✅ Bridge Server listening on port ${port}`);
    console.log('   Waiting for Chrome Extension to connect...\n');

    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      server.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down...');
      server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

main();


