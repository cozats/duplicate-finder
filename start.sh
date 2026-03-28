#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# --- Backend setup ---
if [ ! -d "$BACKEND/.venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv "$BACKEND/.venv"
fi

echo "Installing backend dependencies..."
"$BACKEND/.venv/bin/pip" install -q -r "$BACKEND/requirements.txt"

# --- Frontend setup ---
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND" && npm install)
fi

# --- Start servers ---
echo "Starting backend on http://localhost:8000 ..."
(cd "$BACKEND" && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173 ..."
(cd "$FRONTEND" && npx vite --host 127.0.0.1 --port 5173) &
FRONTEND_PID=$!

sleep 2
open "http://localhost:5173"

echo ""
echo "Duplicate Finder is running. Press Ctrl+C to stop."
wait
