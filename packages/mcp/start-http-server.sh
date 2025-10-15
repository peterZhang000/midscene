#!/bin/bash

# Midscene MCP HTTP Server 启动脚本
# 用于启动 HTTP 传输模式的 MCP 服务器

echo "🚀 启动 Midscene MCP HTTP Server..."

# 核心传输配置
export MIDSCENE_MCP_TRANSPORT="http"
export MIDSCENE_MCP_HTTP_PORT="${MIDSCENE_MCP_HTTP_PORT:-3000}"
export MIDSCENE_MCP_HTTP_HOST="${MIDSCENE_MCP_HTTP_HOST:-0.0.0.0}"

# CORS 配置
export MIDSCENE_MCP_CORS_ORIGIN="${MIDSCENE_MCP_CORS_ORIGIN:-*}"
export MIDSCENE_MCP_CORS_CREDENTIALS="${MIDSCENE_MCP_CORS_CREDENTIALS:-false}"

# 会话管理配置
export MIDSCENE_MCP_SESSION_TTL="${MIDSCENE_MCP_SESSION_TTL:-1800000}"  # 30 minutes
export MIDSCENE_MCP_MAX_SESSIONS="${MIDSCENE_MCP_MAX_SESSIONS:-50}"

# 速率限制配置
export MIDSCENE_MCP_RATE_WINDOW="${MIDSCENE_MCP_RATE_WINDOW:-60000}"  # 1 minute
export MIDSCENE_MCP_RATE_MAX="${MIDSCENE_MCP_RATE_MAX:-100}"

# 超时配置
export MCP_SERVER_REQUEST_TIMEOUT="${MCP_SERVER_REQUEST_TIMEOUT:-800000}"  # 800 seconds (13.3 minutes)
export MCP_SERVER_TIMEOUT="${MCP_SERVER_TIMEOUT:-0}"  # 0 = no timeout

# AI 配置 (OpenRouter with Qwen3-VL)
export OPENAI_BASE_URL="${OPENAI_BASE_URL:-https://openrouter.ai/api/v1}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-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}"
export MIDSCENE_MODEL_NAME="${MIDSCENE_MODEL_NAME:-qwen/qwen3-vl-235b-a22b-thinking}"
export MIDSCENE_USE_QWEN3_VL="${MIDSCENE_USE_QWEN3_VL:-1}"

# 其他 AI 配置示例 (可选)
# export MIDSCENE_PROMPT_STYLE="target-driven"
# export OPENAI_STREAM="true"

# Android 模式 (可选)
# export MIDSCENE_MCP_ANDROID_MODE="true"

# 调试配置 (可选)
# export DEBUG="midscene:*"

echo "📋 配置信息:"
echo "   🌐 HTTP 端口: $MIDSCENE_MCP_HTTP_PORT"
echo "   🏠 HTTP 主机: $MIDSCENE_MCP_HTTP_HOST"
echo "   🔧 传输模式: $MIDSCENE_MCP_TRANSPORT"
echo "   🔒 CORS 源: $MIDSCENE_MCP_CORS_ORIGIN"
echo "   👥 最大会话: $MIDSCENE_MCP_MAX_SESSIONS"
echo "   ⏱️  会话超时: $MIDSCENE_MCP_SESSION_TTL ms"
echo "   ⏱️  请求超时: $MCP_SERVER_REQUEST_TIMEOUT ms"
echo "   🤖 AI 模型: $MIDSCENE_MODEL_NAME"
echo "   🔑 API 端点: $OPENAI_BASE_URL"
echo ""

# 检查构建文件
if [ ! -f "dist/index.js" ]; then
    echo "⚠️  dist/index.js 不存在，正在构建..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败"
        exit 1
    fi
fi

# 启动服务器
echo "🔧 启动 HTTP MCP 服务器..."
echo "📍 服务器将监听: http://$MIDSCENE_MCP_HTTP_HOST:$MIDSCENE_MCP_HTTP_PORT"
echo "📊 健康检查: http://localhost:$MIDSCENE_MCP_HTTP_PORT/health"
echo "📋 会话管理: http://localhost:$MIDSCENE_MCP_HTTP_PORT/sessions"
echo ""

cd "$(dirname "$0")"
node dist/index.js

