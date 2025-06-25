#!/bin/bash

# Production deployment script for Visual SQL Query Builder

set -e

echo "🚀 Starting deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

# Push database schema
echo "🗄️  Setting up database..."
npm run db:push

# Start the application
echo "🌟 Starting production server..."
npm start