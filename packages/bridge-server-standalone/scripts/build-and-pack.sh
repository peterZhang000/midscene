#!/bin/bash

# Build and Pack Script for Bridge Server Standalone
# This script builds the package and creates a tarball for distribution

set -e

echo "🚀 Building Bridge Server Standalone..."
echo ""

# Navigate to package directory
cd "$(dirname "$0")/.."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  # For new packages, we need to allow lockfile updates
  pnpm install --no-frozen-lockfile
  echo ""
fi

# Build the package
echo "🔨 Building package..."
pnpm build
echo ""

# Create tarball
echo "📦 Creating tarball..."
npm pack
echo ""

# Show the result
TARBALL=$(ls -t *.tgz | head -1)
echo "✅ Package created successfully!"
echo ""
echo "📦 Tarball: $TARBALL"
echo "📁 Location: $(pwd)/$TARBALL"
echo ""
echo "To install globally:"
echo "  npm install -g ./$TARBALL"
echo ""
echo "To test locally:"
echo "  npm link"
echo "  midscene-bridge"
echo ""


