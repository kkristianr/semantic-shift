#!/bin/bash

# Stop any running backend (uvicorn) and frontend (vite) processes
echo "Stopping backend and frontend..."

# Kill uvicorn (backend)
pkill -f "uvicorn main:app" 2>/dev/null && echo "Stopped backend (uvicorn)" || echo "No backend process found"

#kill everything on port 8000
lsof -i :8000 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null && echo "Killed processes on port 8000" || echo "No processes found on port 8000"



# Kill vite (frontend)
pkill -f "vite" 2>/dev/null && echo "Stopped frontend (vite)" || echo "No frontend process found"

sleep 2
