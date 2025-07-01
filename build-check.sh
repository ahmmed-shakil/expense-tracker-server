#!/bin/bash

echo "🔧 Starting build verification..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

echo "✅ package.json found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "🔨 Building TypeScript..."
npx tsc

# Check if dist/index.js was created
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found!"
    echo "📁 Contents of current directory:"
    ls -la
    echo "📁 Contents of dist directory (if exists):"
    ls -la dist/ 2>/dev/null || echo "dist/ directory does not exist"
    exit 1
fi

echo "✅ Build successful - dist/index.js created"
echo "📁 Contents of dist directory:"
ls -la dist/

echo "🚀 Build verification complete!"
