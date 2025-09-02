#!/bin/bash
set -e

echo "📦 Starting build process..."

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Build React app
echo "⚡ Building React application..."
npm run build:webpack

# Copy dist files to server directory
echo "📂 Copying dist files to server..."
mkdir -p server/dist
cp -r dist/* server/dist/

echo "✅ Build completed successfully!"
echo "📁 Files in server/dist:"
ls -la server/dist/
