# 🔧 启动脚本已更新

## ✅ 更新内容

`start-http-server.sh` 启动脚本已针对新的多客户端架构进行了优化。

### 🔄 主要变化

#### 简化配置
移除了不再需要的配置项：
- ~~`MIDSCENE_MCP_HTTP_HOST`~~ (固定为 localhost)
- ~~`MIDSCENE_MCP_SESSION_MANAGEMENT`~~ (自动启用)
- ~~`MIDSCENE_MCP_JSON_RESPONSE`~~ (使用 SSE)
- ~~`MIDSCENE_MCP_CORS_ORIGIN`~~ (固定为 *)
- ~~`MIDSCENE_MCP_RATE_LIMIT_*`~~ (暂不需要)

#### 保留核心配置
- ✅ `MIDSCENE_MCP_TRANSPORT="http"`
- ✅ `MIDSCENE_MCP_HTTP_PORT="3000"`
- ✅ `MIDSCENE_MCP_ANDROID_MODE="true"`
- ✅ AI 相关配置 (OPENAI_*, MIDSCENE_*)

#### 新增功能
- 🔍 **自动构建检查**: 如果 `dist/index.js` 不存在，自动运行构建
- 📊 **详细启动信息**: 显示服务器端点和配置
- 🏷️ **多客户端标识**: 明确标注支持多客户端

### 📋 更新后的启动脚本

```bash
#!/bin/bash

# Midscene MCP HTTP Server 启动脚本
# 用于 Cursor HTTP MCP 连接 (支持多客户端)

echo "🚀 启动 Midscene MCP HTTP Server for Cursor..."

# 核心传输配置
export MIDSCENE_MCP_TRANSPORT="http"
export MIDSCENE_MCP_HTTP_PORT="3000"
export MIDSCENE_MCP_ANDROID_MODE="true"

# AI 配置
export OPENAI_BASE_URL="http://47.236.39.80:11434/v1"
export OPENAI_API_KEY="ollama"
export MIDSCENE_MODEL_NAME="ui-tars-7b-dpo"
export MIDSCENE_USE_VLM_UI_TARS="1.0"
export MIDSCENE_PROMPT_STYLE="target-driven"
export OPENAI_STREAM="true"

# 调试配置 (可选)
# export DEBUG="midscene:ai:profile:stats"

echo "📋 配置信息:"
echo "   🌐 HTTP 端口: $MIDSCENE_MCP_HTTP_PORT"
echo "   📱 Android 模式: $MIDSCENE_MCP_ANDROID_MODE"
echo "   🤖 AI 模型: $MIDSCENE_MODEL_NAME"
echo "   🔧 传输模式: $MIDSCENE_MCP_TRANSPORT (多客户端支持)"
echo ""

# 检查构建文件
if [ ! -f "dist/index.js" ]; then
    echo "⚠️  dist/index.js 不存在，正在构建..."
    npm run build
fi

# 启动服务器
echo "🔧 启动多客户端 HTTP MCP 服务器..."
echo "📍 服务器将监听: http://localhost:$MIDSCENE_MCP_HTTP_PORT"
echo "📊 健康检查: http://localhost:$MIDSCENE_MCP_HTTP_PORT/health"
echo "📋 会话管理: http://localhost:$MIDSCENE_MCP_HTTP_PORT/sessions"
echo ""

cd "$(dirname "$0")"
node dist/index.js
```

### 🚀 使用方法

#### 启动服务器
```bash
cd /Users/peter/Documents/web3/react/midscene/packages/mcp
./start-http-server.sh
```

#### 预期输出
```
🚀 启动 Midscene MCP HTTP Server for Cursor...
📋 配置信息:
   🌐 HTTP 端口: 3000
   📱 Android 模式: true
   🤖 AI 模型: ui-tars-7b-dpo
   🔧 传输模式: http (多客户端支持)

🔧 启动多客户端 HTTP MCP 服务器...
📍 服务器将监听: http://localhost:3000
📊 健康检查: http://localhost:3000/health
📋 会话管理: http://localhost:3000/sessions

🔧 Starting Midscene MCP Server in http mode
🚀 Midscene MCP HTTP Server listening on http://0.0.0.0:3000
📊 Health check available at http://0.0.0.0:3000/health
✅ Midscene MCP Server started successfully
```

### 🔧 自定义配置

如果需要修改配置，可以在脚本中调整环境变量：

```bash
# 修改端口
export MIDSCENE_MCP_HTTP_PORT="3001"

# 禁用 Android 模式
export MIDSCENE_MCP_ANDROID_MODE="false"

# 启用调试
export DEBUG="midscene:*"

# 使用不同的 AI 模型
export MIDSCENE_MODEL_NAME="gpt-4-vision-preview"
```

### ✅ 验证

启动后可以通过以下方式验证：

1. **健康检查**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **服务器信息**:
   ```bash
   curl http://localhost:3000/
   ```

3. **会话状态**:
   ```bash
   curl http://localhost:3000/sessions
   ```

### 🎯 与 Cursor 集成

启动脚本更新后，您的 Cursor 配置保持不变：

```json
{
  "mcpServers": {
    "midscene-local-http": {
      "url": "http://localhost:3000/mcp",
      "env": {
        "OPENAI_BASE_URL": "http://47.236.39.80:11434/v1",
        "OPENAI_API_KEY": "ollama",
        "MIDSCENE_MODEL_NAME": "ui-tars-7b-dpo",
        "MIDSCENE_USE_VLM_UI_TARS": "1.0",
        "MIDSCENE_PROMPT_STYLE": "target-driven",
        "OPENAI_STREAM": "true"
      }
    }
  }
}
```

## 🎉 总结

启动脚本已优化为更简洁、更智能的版本，专门适配新的多客户端 HTTP 架构。现在您可以更轻松地启动和管理 Midscene MCP 服务器！
