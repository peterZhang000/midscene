/**
 * Standalone Bridge Server for Midscene
 *
 * This module provides a standalone bridge server that connects
 * Chrome Extension with MCP clients.
 */
import { BridgeServer } from './server';
export * from './server';
export * from './common';
export declare function startBridgeServer(options: {
    port?: number;
    host?: string;
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    closeConflictServer?: boolean;
}): Promise<BridgeServer>;
