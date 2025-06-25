#!/bin/bash

# Local PostgreSQL setup script for Visual SQL Query Builder

set -e

echo "Setting up local PostgreSQL environment..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install PostgreSQL first:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "  Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Check if PostgreSQL service is running
if ! pg_isready -q; then
    echo "Starting PostgreSQL service..."
    # macOS with brew
    if command -v brew &> /dev/null; then
        brew services start postgresql
    # Linux systemd
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql
    else
        echo "Please start PostgreSQL service manually"
        exit 1
    fi
fi

# Create database and user
echo "Creating database and user..."
sudo -u postgres psql -c "CREATE DATABASE querybuilder;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE querybuilder TO postgres;"

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from template"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Push database schema
echo "Setting up database schema..."
npm run db:push

# Start development server
echo "Starting development server..."
npm run dev