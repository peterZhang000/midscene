#!/bin/bash

# Midscene MCP Stdio Server 启动脚本
# 用于启动传统 stdio 传输模式的 MCP 服务器

echo "🚀 启动 Midscene MCP Stdio Server..."

# 核心传输配置
export MIDSCENE_MCP_TRANSPORT="stdio"

# AI 配置 (可选，根据需要设置)
# export OPENAI_BASE_URL="http://47.236.39.80:11434/v1"
# export OPENAI_API_KEY="ollama"
# export MIDSCENE_MODEL_NAME="ui-tars-7b-dpo"
# export MIDSCENE_USE_VLM_UI_TARS="1.0"
# export MIDSCENE_PROMPT_STYLE="target-driven"
# export OPENAI_STREAM="true"

# Android 模式 (可选)
# export MIDSCENE_MCP_ANDROID_MODE="true"

# 调试配置 (可选)
# export DEBUG="midscene:*"

echo "📋 配置信息:"
echo "   🔧 传输模式: $MIDSCENE_MCP_TRANSPORT (stdin/stdout)"
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
echo "🔧 启动 Stdio MCP 服务器..."
echo ""

cd "$(dirname "$0")"
node dist/index.js

