#!/bin/bash
# Vercel build script for Voice Journal

set -e

echo "🔧 Installing dependencies..."
npm install

echo "🏗️ Building project..."
npm run build

echo "✅ Build completed successfully!"