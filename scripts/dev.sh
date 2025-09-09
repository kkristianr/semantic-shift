#!/bin/bash

# Development script for Diachronic Data Visualization Tool
# This script starts both frontend and backend services

set -e

echo "Starting Diachronic Data Visualization Tool..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.11+"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo "Please add ~/.cargo/bin to your PATH or restart your terminal"
    echo "Then run this script again"
    exit 1
fi

echo "Setting up project with uv..."
./setup-uv.sh
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
pnpm install
cd ..

# Start both services
echo "Starting services..."
echo "Frontend will be available at: http://localhost:5173"
echo "Backend will be available at: http://localhost:8000"
echo "API Documentation will be available at: http://localhost:8000/docs"
echo ""

# Start backend in background
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
pnpm dev

# Cleanup on exit
trap "echo 'Stopping services...'; kill $BACKEND_PID; exit" INT TERM 