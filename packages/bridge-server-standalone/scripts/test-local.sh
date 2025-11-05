#!/bin/bash

# Test Script for Bridge Server Standalone
# This script builds and links the package for local testing

set -e

echo "🧪 Testing Bridge Server Standalone Locally..."
echo ""

# Navigate to package directory
cd "$(dirname "$0")/.."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo ""

# Build the package
echo "🔨 Building package..."
pnpm build
echo ""

# Link the package
echo "🔗 Linking package globally..."
npm link
echo ""

echo "✅ Package linked successfully!"
echo ""
echo "You can now test the command:"
echo "  midscene-bridge"
echo "  midscene-bridge --port 3767"
echo ""
echo "To unlink later:"
echo "  npm unlink -g @midscene/bridge-server-standalone"
echo ""


