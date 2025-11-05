# @midscene/bridge-server-standalone

Standalone Bridge Server for Midscene - connects Chrome Extension with MCP clients.

## Installation

```bash
# Using npm
npm install -g @midscene/bridge-server-standalone

# Using pnpm
pnpm add -g @midscene/bridge-server-standalone

# Using yarn
yarn global add @midscene/bridge-server-standalone
```

## Usage

### As a CLI Command

After installation, you can run the bridge server directly:

```bash
# Start with default port (3766)
midscene-bridge

# Start with custom port
midscene-bridge --port 3767

# Show help
midscene-bridge --help
```

### Programmatic Usage

You can also use it in your Node.js code:

```typescript
import { startBridgeServer } from '@midscene/bridge-server-standalone';

// Start server
const server = await startBridgeServer({
  port: 3766,
  closeConflictServer: true,
  onConnect: () => {
    console.log('Client connected!');
  },
  onDisconnect: (reason) => {
    console.log('Client disconnected:', reason);
  }
});

// Later, close the server
server.close();
```

### Using BridgeServer Class Directly

```typescript
import { BridgeServer } from '@midscene/bridge-server-standalone';

const server = new BridgeServer(3766);
await server.listen({ timeout: false });

// Handle shutdown
process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
```

## Options

- `--port, -p <port>` - Port to listen on (default: 3766)
- `--help, -h` - Show help message

## API

### `startBridgeServer(options)`

Starts a new bridge server instance.

**Options:**
- `port?: number` - Port to listen on (default: 3766)
- `closeConflictServer?: boolean` - Kill existing server on the same port (default: true)
- `onConnect?: () => void` - Callback when client connects
- `onDisconnect?: (reason: string) => void` - Callback when client disconnects

**Returns:** Promise<BridgeServer>

### `BridgeServer`

The underlying server class.

**Constructor:**
```typescript
new BridgeServer(
  port: number,
  onConnect?: () => void,
  onDisconnect?: (reason: string) => void,
  closeConflictServer?: boolean
)
```

**Methods:**
- `listen(opts?: { timeout?: number | false }): Promise<void>` - Start listening
- `close(): void` - Close the server

## Architecture

The Bridge Server acts as a WebSocket server that:
1. Accepts connections from the Midscene Chrome Extension
2. Receives and forwards automation commands from MCP clients
3. Returns execution results back to clients

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│  MCP Client │ ◄─────► │ Bridge Server│ ◄─────► │ Chrome Extension│
└─────────────┘         └──────────────┘         └─────────────────┘
                              (This)                    (Browser)
```

## Troubleshooting

### Port Already in Use

If you get an error that the port is already in use, you can:

1. Use a different port: `midscene-bridge --port 3767`
2. Kill the existing process using the port
3. Use the `closeConflictServer` option (enabled by default in CLI)

### Connection Issues

Make sure:
1. The bridge server is running before starting the Chrome Extension
2. The Chrome Extension is configured with the correct server URL
3. No firewall is blocking the connection
4. The port is not occupied by another service

## License

MIT

## Related Projects

- [Midscene](https://midscenejs.com/) - AI-powered browser automation
- [@midscene/web](https://www.npmjs.com/package/@midscene/web) - Core web automation library
- [@midscene/mcp](https://www.npmjs.com/package/@midscene/mcp) - MCP server implementation


