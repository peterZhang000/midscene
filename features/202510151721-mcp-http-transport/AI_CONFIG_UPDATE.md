# AI 配置和超时支持更新

**更新时间**: 2025-10-15  
**版本**: 1.1.0

## 📋 更新概述

根据用户需求，为 HTTP Transport 添加了以下配置支持：

1. ✅ **请求超时配置** (`MCP_SERVER_REQUEST_TIMEOUT`)
2. ✅ **服务器超时配置** (`MCP_SERVER_TIMEOUT`)
3. ✅ **OpenRouter AI 配置** (Qwen3-VL 模型)
4. ✅ **启动脚本更新** (包含所有新配置)

## 🔧 新增环境变量

### 超时配置

#### `MCP_SERVER_REQUEST_TIMEOUT`
- **类型**: `number` (毫秒)
- **默认值**: `800000` (800 秒 = 13.3 分钟)
- **说明**: HTTP 请求超时时间，适用于长时间运行的 AI 操作
- **用途**: 设置单个 HTTP 请求的最大执行时间
- **示例**:
  ```bash
  export MCP_SERVER_REQUEST_TIMEOUT="800000"  # 13.3 分钟
  ```

#### `MCP_SERVER_TIMEOUT`
- **类型**: `number` (毫秒)
- **默认值**: `0` (禁用)
- **说明**: HTTP 服务器超时时间，0 表示不限制
- **用途**: 设置服务器级别的超时
- **示例**:
  ```bash
  export MCP_SERVER_TIMEOUT="900000"  # 15 分钟
  # 或
  export MCP_SERVER_TIMEOUT="0"  # 禁用超时
  ```

### AI 配置 (OpenRouter + Qwen3-VL)

#### `OPENAI_BASE_URL`
- **类型**: `string`
- **默认值**: `https://openrouter.ai/api/v1`
- **说明**: OpenRouter API 端点
- **示例**:
  ```bash
  export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
  ```

#### `OPENAI_API_KEY`
- **类型**: `string`
- **默认值**: (用户提供的密钥)
- **说明**: OpenRouter API 密钥
- **安全提示**: ⚠️ 不要在公共代码中暴露真实密钥
- **示例**:
  ```bash
  export OPENAI_API_KEY="sk-or-v1-your-api-key-here"
  ```

#### `MIDSCENE_MODEL_NAME`
- **类型**: `string`
- **默认值**: `qwen/qwen3-vl-235b-a22b-thinking`
- **说明**: 使用的 AI 模型名称
- **支持的模型**: OpenRouter 上的任何兼容模型
- **示例**:
  ```bash
  export MIDSCENE_MODEL_NAME="qwen/qwen3-vl-235b-a22b-thinking"
  ```

#### `MIDSCENE_USE_QWEN3_VL`
- **类型**: `number` (0 或 1)
- **默认值**: `1`
- **说明**: 启用 Qwen3-VL 模型支持
- **示例**:
  ```bash
  export MIDSCENE_USE_QWEN3_VL="1"  # 启用
  ```

## 📝 代码更改

### 1. 配置管理器 (`src/config/transport-config.ts`)

#### 更新的类型定义
```typescript
export interface TransportConfig {
  mode: TransportMode;
  http: {
    // ... 其他配置
    timeout: {
      request: number; // 请求超时 (毫秒)
      server: number;  // 服务器超时 (毫秒)
    };
  };
}
```

#### 新增的配置加载
```typescript
timeout: {
  request: parseInt(process.env.MCP_SERVER_REQUEST_TIMEOUT || '300000', 10),
  server: parseInt(process.env.MCP_SERVER_TIMEOUT || '0', 10),
}
```

#### 新增的验证逻辑
```typescript
if (config.http.timeout.request < 0) {
  throw new Error(`Invalid request timeout: ${config.http.timeout.request}. Must be at least 0`);
}

if (config.http.timeout.server < 0) {
  throw new Error(`Invalid server timeout: ${config.http.timeout.server}. Must be at least 0`);
}
```

### 2. HTTP 服务器 (`src/transport/http-server.ts`)

#### 超时应用逻辑
```typescript
// 在服务器启动时应用超时配置
if (this.config.timeout.server > 0) {
  this.server.timeout = this.config.timeout.server;
  console.error(`⏱️  Server timeout set to ${this.config.timeout.server}ms`);
}

if (this.config.timeout.request > 0) {
  this.server.requestTimeout = this.config.timeout.request;
  console.error(`⏱️  Request timeout set to ${this.config.timeout.request}ms`);
}
```

### 3. 启动脚本 (`start-http-server.sh`)

#### 完整的配置示例
```bash
# 超时配置
export MCP_SERVER_REQUEST_TIMEOUT="${MCP_SERVER_REQUEST_TIMEOUT:-800000}"
export MCP_SERVER_TIMEOUT="${MCP_SERVER_TIMEOUT:-0}"

# AI 配置 (OpenRouter with Qwen3-VL)
export OPENAI_BASE_URL="${OPENAI_BASE_URL:-https://openrouter.ai/api/v1}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-sk-or-v1-...}"
export MIDSCENE_MODEL_NAME="${MIDSCENE_MODEL_NAME:-qwen/qwen3-vl-235b-a22b-thinking}"
export MIDSCENE_USE_QWEN3_VL="${MIDSCENE_USE_QWEN3_VL:-1}"
```

## 🚀 使用方法

### 方式 1: 使用默认配置启动

```bash
cd /Users/peter/Documents/automation-test/midscene/packages/mcp
./start-http-server.sh
```

启动脚本会自动使用以下默认配置：
- 请求超时: 800 秒
- AI 端点: OpenRouter
- AI 模型: Qwen3-VL

### 方式 2: 自定义配置启动

```bash
# 设置自定义超时
export MCP_SERVER_REQUEST_TIMEOUT="1200000"  # 20 分钟

# 使用不同的 API 密钥
export OPENAI_API_KEY="your-custom-api-key"

# 启动服务器
./start-http-server.sh
```

### 方式 3: 临时覆盖配置

```bash
MCP_SERVER_REQUEST_TIMEOUT=600000 \
MIDSCENE_MODEL_NAME="qwen/qwen3-vl-72b" \
./start-http-server.sh
```

## 📊 配置验证

启动服务器时，会显示完整的配置信息：

```
📋 配置信息:
   🌐 HTTP 端口: 3000
   🏠 HTTP 主机: 0.0.0.0
   🔧 传输模式: http
   🔒 CORS 源: *
   👥 最大会话: 50
   ⏱️  会话超时: 1800000 ms
   ⏱️  请求超时: 800000 ms
   🤖 AI 模型: qwen/qwen3-vl-235b-a22b-thinking
   🔑 API 端点: https://openrouter.ai/api/v1

🔧 Starting Midscene MCP Server in http mode
📋 MCP Transport Configuration:
   Mode: http
   HTTP Port: 3000
   HTTP Host: 0.0.0.0
   CORS Origin: "*"
   Max Sessions: 50
   Session TTL: 1800000ms
   Rate Limit: 100 requests per 60000ms
   Request Timeout: 800000ms
   Server Timeout: disabled
   API Key: not set

🚀 Midscene MCP HTTP Server listening on http://0.0.0.0:3000
⏱️  Request timeout set to 800000ms
```

## ⚠️ 重要说明

### 1. 超时配置建议

- **短任务** (< 1 分钟): 使用默认的 5 分钟超时
  ```bash
  export MCP_SERVER_REQUEST_TIMEOUT="300000"
  ```

- **AI 视觉任务** (1-15 分钟): 使用 800 秒超时
  ```bash
  export MCP_SERVER_REQUEST_TIMEOUT="800000"
  ```

- **长时间任务** (> 15 分钟): 增加超时或禁用
  ```bash
  export MCP_SERVER_REQUEST_TIMEOUT="1800000"  # 30 分钟
  # 或
  export MCP_SERVER_TIMEOUT="0"  # 禁用服务器超时
  ```

### 2. API 密钥安全

⚠️ **不要在代码中硬编码 API 密钥！**

推荐做法：
```bash
# 1. 使用环境变量文件 (不要提交到 git)
echo 'export OPENAI_API_KEY="sk-or-v1-..."' > .env.local
source .env.local

# 2. 或使用密钥管理工具
export OPENAI_API_KEY=$(vault read -field=api_key secret/openrouter)

# 3. 启动服务器
./start-http-server.sh
```

### 3. 超时与会话 TTL 的区别

| 配置 | 用途 | 默认值 | 说明 |
|------|------|--------|------|
| `MCP_SERVER_REQUEST_TIMEOUT` | 单个请求超时 | 800 秒 | 单个 HTTP 请求的最大执行时间 |
| `MCP_SERVER_TIMEOUT` | 服务器超时 | 0 (禁用) | 服务器级别的超时限制 |
| `MIDSCENE_MCP_SESSION_TTL` | 会话超时 | 30 分钟 | 会话不活跃后的过期时间 |

### 4. 性能考虑

- **Qwen3-VL 模型**: 大型视觉语言模型，响应时间较长
- **建议超时**: 800-1200 秒
- **并发限制**: 根据 OpenRouter 配额调整 `MIDSCENE_MCP_MAX_SESSIONS`

## 🧪 测试验证

### 1. 验证超时配置

```bash
# 启动服务器
./start-http-server.sh

# 检查配置日志
# 应该看到: "Request timeout set to 800000ms"
```

### 2. 验证 AI 配置

```bash
# 测试 AI 端点连接
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }'
```

### 3. 验证长时间请求

```bash
# 执行一个 AI 视觉任务（需要较长时间）
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "midscene_aiAssert",
      "arguments": {
        "assertion": "页面显示登录表单"
      }
    },
    "id": 2
  }'
```

## 📚 相关文档

- [完成总结](./completion-summary.md)
- [使用指南](./USAGE_GUIDE.md)
- [设计文档](./design.md)
- [OpenRouter 文档](https://openrouter.ai/docs)
- [Qwen3-VL 模型](https://openrouter.ai/models/qwen/qwen3-vl-235b-a22b-thinking)

## 🔄 版本历史

### v1.1.0 (2025-10-15)
- ✅ 添加请求超时配置支持
- ✅ 添加服务器超时配置支持
- ✅ 集成 OpenRouter AI 配置
- ✅ 支持 Qwen3-VL 模型
- ✅ 更新启动脚本

### v1.0.0 (2025-10-15)
- ✅ 初始 HTTP Transport 实现
- ✅ 会话管理
- ✅ CORS 和速率限制
- ✅ 健康检查端点

---

**维护者**: Midscene Team  
**最后更新**: 2025-10-15

