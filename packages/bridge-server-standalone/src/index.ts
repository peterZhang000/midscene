/**
 * Standalone Bridge Server for Midscene
 * 
 * This module provides a standalone bridge server that connects
 * Chrome Extension with MCP clients.
 */

import { BridgeServer } from './server';
import { DefaultBridgeServerPort } from './common';

// Re-export everything from server and common
export * from './server';
export * from './common';

// Main server function
export async function startBridgeServer(options: {
  port?: number;
  host?: string;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  closeConflictServer?: boolean;
}) {
  const port = options.port || DefaultBridgeServerPort;
  const host = options.host || '0.0.0.0';
  
  console.log('🚀 Starting Midscene Bridge Server...');
  console.log(`   Port: ${port}`);
  console.log(`   Host: ${host}`);
  console.log('');

  const server = new BridgeServer(
    port,
    options.onConnect,
    options.onDisconnect,
    options.closeConflictServer ?? true,
    host
  );

  await server.listen({
    timeout: false // No timeout, run indefinitely
  });

  console.log(`✅ Bridge Server listening on ${host}:${port}`);
  console.log('   Waiting for Chrome Extension to connect...');
  console.log('');
  console.log('Press Ctrl+C to stop the server');

  return server;
}

