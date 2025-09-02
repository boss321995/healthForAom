#!/bin/bash

# Build Script for Render Deployment
# สคริปต์สำหรับ build และ deploy บน Render

echo "🚀 Health Management API - Build Script"
echo "======================================"

# Check Node.js version
echo "📋 Checking Node.js version..."
node --version
npm --version

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Verify critical files exist
echo "🔍 Verifying files..."
if [ ! -f "index.js" ]; then
    echo "❌ index.js not found!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

# Check environment variables
echo "🔧 Checking environment variables..."
if [ -z "$DB_HOST" ]; then
    echo "⚠️  Warning: DB_HOST not set"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  Warning: JWT_SECRET not set"
fi

# Run basic syntax check
echo "🧪 Running syntax check..."
node -c index.js
if [ $? -ne 0 ]; then
    echo "❌ Syntax error in index.js!"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "🎯 Ready for deployment"
