# MCP HTTP Transport 使用指南

**版本**: 1.0.0  
**更新日期**: 2025-10-15

## 📖 目录

1. [快速开始](#快速开始)
2. [环境变量配置](#环境变量配置)
3. [HTTP 端点详解](#http-端点详解)
4. [使用示例](#使用示例)
5. [故障排除](#故障排除)
6. [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /Users/peter/Documents/automation-test/midscene/packages/mcp
pnpm install
```

### 2. 构建项目

```bash
pnpm run build
```

### 3. 启动 HTTP 模式

```bash
./start-http-server.sh
```

预期输出：
```
🚀 启动 Midscene MCP HTTP Server...
📋 配置信息:
   🌐 HTTP 端口: 3000
   🏠 HTTP 主机: 0.0.0.0
   🔧 传输模式: http
   🔒 CORS 源: *
   👥 最大会话: 50
   ⏱️  会话超时: 1800000 ms

🔧 启动 HTTP MCP 服务器...
📍 服务器将监听: http://0.0.0.0:3000
📊 健康检查: http://localhost:3000/health
📋 会话管理: http://localhost:3000/sessions

🚀 Midscene MCP HTTP Server listening on http://0.0.0.0:3000
✅ Midscene MCP Server started successfully
```

### 4. 验证服务器

```bash
# 健康检查
curl http://localhost:3000/health

# 服务器信息
curl http://localhost:3000/
```

---

## ⚙️ 环境变量配置

### 核心配置

#### `MIDSCENE_MCP_TRANSPORT`
- **类型**: `stdio` | `http` | `auto`
- **默认值**: `stdio`
- **说明**: 传输模式选择
- **示例**:
  ```bash
  export MIDSCENE_MCP_TRANSPORT="http"
  ```

#### `MIDSCENE_MCP_HTTP_PORT`
- **类型**: `number` (1-65535)
- **默认值**: `3000`
- **说明**: HTTP 服务器监听端口
- **示例**:
  ```bash
  export MIDSCENE_MCP_HTTP_PORT="8080"
  ```

#### `MIDSCENE_MCP_HTTP_HOST`
- **类型**: `string`
- **默认值**: `0.0.0.0`
- **说明**: HTTP 服务器绑定地址
- **示例**:
  ```bash
  export MIDSCENE_MCP_HTTP_HOST="127.0.0.1"  # 仅本地访问
  ```

### CORS 配置

#### `MIDSCENE_MCP_CORS_ORIGIN`
- **类型**: `string` | `string[]` (逗号分隔)
- **默认值**: `*`
- **说明**: CORS 允许的源
- **示例**:
  ```bash
  # 单个源
  export MIDSCENE_MCP_CORS_ORIGIN="https://example.com"
  
  # 多个源
  export MIDSCENE_MCP_CORS_ORIGIN="https://example.com,https://app.example.com"
  
  # 所有源
  export MIDSCENE_MCP_CORS_ORIGIN="*"
  ```

#### `MIDSCENE_MCP_CORS_CREDENTIALS`
- **类型**: `boolean`
- **默认值**: `false`
- **说明**: 是否允许携带凭证
- **示例**:
  ```bash
  export MIDSCENE_MCP_CORS_CREDENTIALS="true"
  ```

### 会话管理配置

#### `MIDSCENE_MCP_SESSION_TTL`
- **类型**: `number` (毫秒)
- **默认值**: `1800000` (30 分钟)
- **说明**: 会话超时时间
- **示例**:
  ```bash
  export MIDSCENE_MCP_SESSION_TTL="3600000"  # 1 小时
  ```

#### `MIDSCENE_MCP_MAX_SESSIONS`
- **类型**: `number`
- **默认值**: `50`
- **说明**: 最大并发会话数
- **示例**:
  ```bash
  export MIDSCENE_MCP_MAX_SESSIONS="100"
  ```

### 安全配置

#### `MIDSCENE_MCP_RATE_WINDOW`
- **类型**: `number` (毫秒)
- **默认值**: `60000` (1 分钟)
- **说明**: 速率限制时间窗口
- **示例**:
  ```bash
  export MIDSCENE_MCP_RATE_WINDOW="300000"  # 5 分钟
  ```

#### `MIDSCENE_MCP_RATE_MAX`
- **类型**: `number`
- **默认值**: `100`
- **说明**: 时间窗口内最大请求数
- **示例**:
  ```bash
  export MIDSCENE_MCP_RATE_MAX="200"
  ```

#### `MIDSCENE_MCP_API_KEY`
- **类型**: `string`
- **默认值**: 无
- **说明**: API 密钥认证（可选）
- **示例**:
  ```bash
  export MIDSCENE_MCP_API_KEY="your-secret-api-key-here"
  ```

### 配置示例

#### 开发环境
```bash
export MIDSCENE_MCP_TRANSPORT="http"
export MIDSCENE_MCP_HTTP_PORT="3000"
export MIDSCENE_MCP_HTTP_HOST="127.0.0.1"
export MIDSCENE_MCP_CORS_ORIGIN="*"
export MIDSCENE_MCP_MAX_SESSIONS="10"
```

#### 生产环境
```bash
export MIDSCENE_MCP_TRANSPORT="http"
export MIDSCENE_MCP_HTTP_PORT="8080"
export MIDSCENE_MCP_HTTP_HOST="0.0.0.0"
export MIDSCENE_MCP_CORS_ORIGIN="https://your-domain.com"
export MIDSCENE_MCP_CORS_CREDENTIALS="true"
export MIDSCENE_MCP_SESSION_TTL="3600000"
export MIDSCENE_MCP_MAX_SESSIONS="100"
export MIDSCENE_MCP_RATE_MAX="200"
export MIDSCENE_MCP_API_KEY="production-api-key"
```

---

## 🌐 HTTP 端点详解

### 1. MCP JSON-RPC 端点

#### `POST /mcp`

主 MCP 协议端点，接收 JSON-RPC 2.0 请求。

**请求头**:
- `Content-Type`: `application/json`
- `Accept`: `application/json, text/event-stream`
- `mcp-session-id`: (可选) 会话 ID
- `Authorization`: (可选) `Bearer <api-key>`

**请求体**:
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

**响应**:
- SSE 流式响应 (默认)
- JSON 响应 (如果客户端不支持 SSE)

**示例**:
```bash
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
```

#### `GET /mcp`

建立 SSE 流式连接，用于接收服务器推送的通知。

**请求头**:
- `mcp-session-id`: 会话 ID

**响应**:
- `Content-Type`: `text/event-stream`

---

### 2. 健康检查端点

#### `GET /health`

返回服务器健康状态和运行指标。

**响应**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-15T09:21:00.000Z",
  "version": "0.30.2",
  "transport": "http",
  "uptime": 123456,
  "activeSessions": 5,
  "totalSessions": 5,
  "maxSessions": 50,
  "memoryUsage": {
    "heapUsed": "45MB",
    "heapTotal": "67MB",
    "rss": "89MB"
  }
}
```

**示例**:
```bash
curl http://localhost:3000/health | jq
```

---

### 3. 服务器信息端点

#### `GET /`

返回服务器基本信息和可用端点。

**响应**:
```json
{
  "name": "Midscene MCP Server",
  "version": "0.30.2",
  "transport": "http",
  "endpoints": {
    "mcp": "/mcp",
    "health": "/health",
    "sessions": "/sessions"
  },
  "documentation": "https://midscenejs.com/mcp.html"
}
```

**示例**:
```bash
curl http://localhost:3000/ | jq
```

---

### 4. 会话管理端点

#### `GET /sessions`

列出所有活动会话。

**响应**:
```json
{
  "sessions": [
    {
      "id": "abc-123-def-456",
      "state": "active",
      "connectedAt": "2025-10-15T09:00:00.000Z",
      "lastActivity": "2025-10-15T09:20:00.000Z",
      "ip": "127.0.0.1",
      "userAgent": "curl/7.64.1"
    }
  ],
  "total": 1,
  "active": 1,
  "maxConcurrent": 50
}
```

**示例**:
```bash
curl http://localhost:3000/sessions | jq
```

#### `DELETE /sessions/:id`

关闭指定的会话。

**参数**:
- `id`: 会话 ID

**响应**:
```json
{
  "success": true,
  "message": "Session abc-123-def-456 closed"
}
```

**示例**:
```bash
curl -X DELETE http://localhost:3000/sessions/abc-123-def-456
```

---

## 💡 使用示例

### Node.js 客户端

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

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (this.sessionId) {
        options.headers['mcp-session-id'] = this.sessionId;
      }

      const req = http.request(options, (res) => {
        // 提取会话 ID
        if (res.headers['mcp-session-id']) {
          this.sessionId = res.headers['mcp-session-id'];
        }

        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(jsonrpcRequest));
      req.end();
    });
  }

  async initialize() {
    const response = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'node-client',
        version: '1.0.0'
      }
    });
    
    return response.result;
  }

  async listTools() {
    const response = await this.request('tools/list', {});
    return response.result;
  }

  async callTool(name, args) {
    const response = await this.request('tools/call', {
      name: name,
      arguments: args
    });
    return response.result;
  }
}

// 使用示例
(async () => {
  const client = new MCPHttpClient();
  
  // 初始化
  const initResult = await client.initialize();
  console.log('Initialized:', initResult);
  
  // 列出工具
  const tools = await client.listTools();
  console.log('Available tools:', tools);
  
  // 调用工具
  const result = await client.callTool('midscene_navigate', {
    url: 'https://google.com'
  });
  console.log('Tool result:', result);
})();
```

### Python 客户端

```python
import requests
import json

class MCPHttpClient:
    def __init__(self, host='localhost', port=3000):
        self.base_url = f'http://{host}:{port}'
        self.session_id = None
        self.request_id = 1
        self.session = requests.Session()
    
    def request(self, method, params=None):
        if params is None:
            params = {}
        
        jsonrpc_request = {
            'jsonrpc': '2.0',
            'method': method,
            'params': params,
            'id': self.request_id
        }
        self.request_id += 1
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        if self.session_id:
            headers['mcp-session-id'] = self.session_id
        
        response = self.session.post(
            f'{self.base_url}/mcp',
            json=jsonrpc_request,
            headers=headers
        )
        
        # 提取会话 ID
        if 'mcp-session-id' in response.headers:
            self.session_id = response.headers['mcp-session-id']
        
        return response.json()
    
    def initialize(self):
        return self.request('initialize', {
            'protocolVersion': '2024-11-05',
            'capabilities': {},
            'clientInfo': {
                'name': 'python-client',
                'version': '1.0.0'
            }
        })
    
    def list_tools(self):
        return self.request('tools/list', {})
    
    def call_tool(self, name, args):
        return self.request('tools/call', {
            'name': name,
            'arguments': args
        })

# 使用示例
if __name__ == '__main__':
    client = MCPHttpClient()
    
    # 初始化
    init_result = client.initialize()
    print('Initialized:', init_result)
    
    # 列出工具
    tools = client.list_tools()
    print('Available tools:', tools)
    
    # 调用工具
    result = client.call_tool('midscene_navigate', {
        'url': 'https://google.com'
    })
    print('Tool result:', result)
```

---

## 🔧 故障排除

### 问题 1: 端口已被占用

**错误信息**:
```
❌ Port 3000 is already in use. Please set MIDSCENE_MCP_HTTP_PORT to a different port.
```

**解决方案**:
```bash
# 使用不同的端口
export MIDSCENE_MCP_HTTP_PORT="3001"
./start-http-server.sh
```

---

### 问题 2: CORS 错误

**错误信息**:
```
Access to fetch at 'http://localhost:3000/mcp' from origin 'http://localhost:8080' 
has been blocked by CORS policy
```

**解决方案**:
```bash
# 允许特定源
export MIDSCENE_MCP_CORS_ORIGIN="http://localhost:8080"
./start-http-server.sh

# 或允许所有源（仅开发环境）
export MIDSCENE_MCP_CORS_ORIGIN="*"
```

---

### 问题 3: 会话超时

**错误信息**:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Session not found"
  },
  "id": null
}
```

**解决方案**:
```bash
# 增加会话超时时间
export MIDSCENE_MCP_SESSION_TTL="3600000"  # 1 小时

# 或重新初始化连接
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize",...}'
```

---

### 问题 4: 速率限制

**错误信息**:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Too many requests, please try again later"
  },
  "id": null
}
```

**解决方案**:
```bash
# 增加速率限制
export MIDSCENE_MCP_RATE_MAX="200"
./start-http-server.sh

# 或减少请求频率
```

---

### 问题 5: API 密钥认证失败

**错误信息**:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Invalid API key"
  },
  "id": null
}
```

**解决方案**:
```bash
# 在请求中包含 API 密钥
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '...'

# 或作为查询参数
curl -X POST "http://localhost:3000/mcp?apiKey=your-api-key" \
  -H "Content-Type: application/json" \
  -d '...'
```

---

## 🎯 最佳实践

### 1. 会话管理

✅ **推荐**:
- 保持会话活跃，定期发送心跳请求
- 使用会话 ID 进行后续请求
- 在应用关闭时主动关闭会话

❌ **避免**:
- 为每个请求创建新会话
- 不保存会话 ID
- 让会话无限期存活

### 2. 错误处理

✅ **推荐**:
```javascript
try {
  const result = await client.request('tools/call', params);
  // 处理结果
} catch (error) {
  if (error.code === -32001) {
    // 会话过期，重新初始化
    await client.initialize();
    return client.request('tools/call', params);
  }
  throw error;
}
```

### 3. 性能优化

✅ **推荐**:
- 使用 HTTP keep-alive
- 复用会话
- 批量请求（如果支持）
- 使用 SSE 流式响应

### 4. 安全性

✅ **推荐**:
- 生产环境使用 HTTPS（通过反向代理）
- 设置严格的 CORS 策略
- 使用 API 密钥认证
- 定期轮换 API 密钥
- 监控异常请求

❌ **避免**:
- 在客户端代码中硬编码 API 密钥
- 使用 `CORS_ORIGIN="*"` 在生产环境
- 忽略速率限制错误

### 5. 监控

✅ **推荐**:
```bash
# 定期检查健康状态
*/5 * * * * curl -f http://localhost:3000/health || alert

# 监控会话数量
curl http://localhost:3000/sessions | jq '.total'

# 查看日志
tail -f /var/log/midscene-mcp.log
```

---

## 📚 相关文档

- [设计文档](./design.md)
- [完成总结](./completion-summary.md)
- [AI 使用日志](../../ai-implementation/202510151721-mcp-http-transport/ai-usage-log.md)
- [决策理由](../../ai-implementation/202510151721-mcp-http-transport/decision-rationale.md)
- [Midscene 官方文档](https://midscenejs.com)
- [MCP 协议规范](https://github.com/modelcontextprotocol/specification)

---

**文档版本**: 1.0.0  
**最后更新**: 2025-10-15  
**维护者**: Midscene Team

