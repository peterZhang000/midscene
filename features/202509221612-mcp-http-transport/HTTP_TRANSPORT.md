# Midscene MCP HTTP Transport

This document explains how to use the HTTP transport feature in Midscene MCP server.

## Overview

Midscene MCP now supports both stdio and HTTP transport modes:

- **stdio** (default): Traditional stdin/stdout communication for local development
- **http**: HTTP-based transport for web clients, cloud deployment, and multi-client scenarios
- **auto**: Automatically detects the best transport mode based on environment

## Quick Start

### Starting HTTP Server

```bash
# Set environment variable and start server
export MIDSCENE_MCP_TRANSPORT=http
export MIDSCENE_MCP_HTTP_PORT=3000
node dist/index.js
```

Or use the convenience script:

```bash
# Start in HTTP mode
./start-local-mcp.sh http
```

### Testing the Server

Once started, you can access:

- **Main MCP endpoint**: `POST http://localhost:3000/mcp`
- **Health check**: `GET http://localhost:3000/health`
- **Server info**: `GET http://localhost:3000/`
- **Session management**: `GET http://localhost:3000/sessions`

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MIDSCENE_MCP_TRANSPORT` | `stdio` | Transport mode: `stdio`, `http`, or `auto` |
| `MIDSCENE_MCP_HTTP_PORT` | `3000` | HTTP server port |
| `MIDSCENE_MCP_HTTP_HOST` | `0.0.0.0` | HTTP server bind address |
| `MIDSCENE_MCP_CORS_ORIGIN` | `*` | CORS allowed origins |
| `MIDSCENE_MCP_CORS_CREDENTIALS` | `false` | Enable CORS credentials |
| `MIDSCENE_MCP_SESSION_TTL` | `1800000` | Session timeout (30 minutes) |
| `MIDSCENE_MCP_MAX_SESSIONS` | `50` | Maximum concurrent sessions |
| `MIDSCENE_MCP_RATE_WINDOW` | `60000` | Rate limit window (1 minute) |
| `MIDSCENE_MCP_RATE_MAX` | `100` | Max requests per window |
| `MIDSCENE_MCP_API_KEY` | - | Optional API key for authentication |

### Example Configuration

```bash
# Production HTTP setup
export MIDSCENE_MCP_TRANSPORT=http
export MIDSCENE_MCP_HTTP_PORT=8080
export MIDSCENE_MCP_HTTP_HOST=0.0.0.0
export MIDSCENE_MCP_CORS_ORIGIN=https://your-domain.com
export MIDSCENE_MCP_MAX_SESSIONS=100
export MIDSCENE_MCP_API_KEY=your-secret-key
```

## Client Usage

### JavaScript/Node.js Client

```javascript
const http = require('http');

class MCPHttpClient {
  constructor(host = 'localhost', port = 3000) {
    this.host = host;
    this.port = port;
    this.sessionId = null;
    this.requestId = 1;
  }

  async request(method, params = {}) {
    const jsonrpcRequest = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: this.requestId++
    };

    const options = {
      hostname: this.host,
      port: this.port,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    };

    if (this.sessionId) {
      options.headers['mcp-session-id'] = this.sessionId;
    }

    // ... implementation details
  }

  async initialize() {
    const response = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'my-client',
        version: '1.0.0'
      }
    });
    
    return response.result;
  }
}
```

### cURL Examples

```bash
# Health check
curl http://localhost:3000/health

# Initialize MCP connection
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "curl-client", "version": "1.0.0"}
    },
    "id": 1
  }'

# List available tools (after initialization, with session ID)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

## Features

### Session Management

- **Automatic session creation**: Sessions are created automatically during initialization
- **Session persistence**: Sessions remain active for the configured TTL
- **Concurrent sessions**: Support for multiple simultaneous client connections
- **Session cleanup**: Automatic cleanup of expired sessions

### Security

- **CORS support**: Configurable cross-origin resource sharing
- **Rate limiting**: Configurable request rate limits
- **API key authentication**: Optional API key-based authentication
- **Input validation**: JSON-RPC message validation
- **Security headers**: Standard security headers included

### Monitoring

- **Health endpoint**: `/health` provides server status and metrics
- **Session endpoint**: `/sessions` lists active sessions
- **Request logging**: All requests are logged with timing information
- **Graceful shutdown**: Proper cleanup of resources on shutdown

## Transport Modes

### stdio Mode (Default)

```bash
# Traditional mode - communicates via stdin/stdout
export MIDSCENE_MCP_TRANSPORT=stdio
node dist/index.js
```

### HTTP Mode

```bash
# HTTP server mode - listens on configured port
export MIDSCENE_MCP_TRANSPORT=http
export MIDSCENE_MCP_HTTP_PORT=3000
node dist/index.js
```

### Auto Mode

```bash
# Automatically detects best transport based on environment
export MIDSCENE_MCP_TRANSPORT=auto
node dist/index.js
```

Auto mode detection logic:
1. If in containerized environment (Docker/Kubernetes) → HTTP
2. If stdio is not available → HTTP
3. Otherwise → stdio (for backward compatibility)

## Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY ../../packages/mcp/dist ./dist/

# Configure HTTP transport
ENV MIDSCENE_MCP_TRANSPORT=http
ENV MIDSCENE_MCP_HTTP_PORT=3000
ENV MIDSCENE_MCP_HTTP_HOST=0.0.0.0

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   Solution: Change the port using `MIDSCENE_MCP_HTTP_PORT`

2. **CORS errors in browser**
   ```
   Access to fetch at 'http://localhost:3000/mcp' from origin 'http://localhost:8080' has been blocked by CORS policy
   ```
   Solution: Set `MIDSCENE_MCP_CORS_ORIGIN=http://localhost:8080`

3. **Session timeout**
   ```
   {"jsonrpc":"2.0","error":{"code":-32001,"message":"Session not found"},"id":null}
   ```
   Solution: Re-initialize the connection or increase `MIDSCENE_MCP_SESSION_TTL`

4. **Rate limiting**
   ```
   {"jsonrpc":"2.0","error":{"code":-32000,"message":"Too many requests"},"id":null}
   ```
   Solution: Reduce request frequency or increase `MIDSCENE_MCP_RATE_MAX`

### Debugging

Enable debug logging:

```bash
export DEBUG=midscene:*
export MIDSCENE_MCP_TRANSPORT=http
node dist/index.js
```

Check server health:

```bash
curl http://localhost:3000/health | jq
```

List active sessions:

```bash
curl http://localhost:3000/sessions | jq
```

## Migration from stdio

### For Existing Clients

1. **No changes required**: stdio mode remains the default
2. **Gradual migration**: Use `auto` mode for seamless transition
3. **Explicit HTTP**: Set `MIDSCENE_MCP_TRANSPORT=http` when ready

### Configuration Migration

```bash
# Old way (stdio only)
node dist/index.js

# New way (HTTP)
export MIDSCENE_MCP_TRANSPORT=http
export MIDSCENE_MCP_HTTP_PORT=3000
node dist/index.js
```

## Performance

### Benchmarks

- **Concurrent sessions**: Supports 50+ simultaneous sessions
- **Request latency**: <100ms for typical operations
- **Memory usage**: ~10MB per active session
- **Throughput**: 100+ requests/second per session

### Optimization Tips

1. **Session reuse**: Keep sessions alive for multiple requests
2. **Connection pooling**: Use HTTP keep-alive for better performance
3. **Caching**: Enable browser caching for static resources
4. **Load balancing**: Use multiple server instances for high load

## API Reference

### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/mcp` | Main MCP JSON-RPC endpoint |
| `GET` | `/mcp` | SSE stream for notifications |
| `GET` | `/health` | Health check and metrics |
| `GET` | `/` | Server information |
| `GET` | `/sessions` | List active sessions |
| `DELETE` | `/sessions/:id` | Close specific session |

### JSON-RPC Methods

All standard MCP methods are supported:

- `initialize` - Initialize MCP connection
- `tools/list` - List available tools
- `tools/call` - Call a specific tool
- `resources/list` - List available resources
- `resources/read` - Read a specific resource

For detailed API documentation, see: https://midscenejs.com/mcp.html
