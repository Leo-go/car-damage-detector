#!/usr/bin/env bash
# Local demo: start backend + frontend
set -euo pipefail
cd "$(dirname "$0")/.."

source ~/.nvm/nvm.sh 2>/dev/null || true

# Backend
if [[ ! -x backend/.venv/bin/uvicorn ]]; then
  echo "Creating backend venv..."
  cd backend
  if command -v uv >/dev/null 2>&1; then
    uv venv .venv
    source .venv/bin/activate
    uv pip install fastapi==0.109.0 uvicorn==0.27.0 opencv-python-headless==4.9.0.80 \
      pillow==10.2.0 python-multipart==0.0.6 pydantic-settings==2.1.0 \
      python-dotenv==1.0.1 numpy==1.26.4
  else
    python3 -m venv .venv
    source .venv/bin/activate
    pip install fastapi==0.109.0 uvicorn==0.27.0 opencv-python-headless==4.9.0.80 \
      pillow==10.2.0 python-multipart==0.0.6 pydantic-settings==2.1.0 \
      python-dotenv==1.0.1 numpy==1.26.4
  fi
  cd ..
fi

if [[ ! -d frontend/node_modules ]]; then
  echo "Installing frontend deps..."
  (cd frontend && npm install)
fi

cp -n backend/.env.example backend/.env 2>/dev/null || true
cp -n frontend/.env.example frontend/.env 2>/dev/null || true

echo "Starting backend on :8000 ..."
(
  cd backend
  source .venv/bin/activate
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) &
BACK_PID=$!

echo "Starting frontend on :5173 ..."
(
  source ~/.nvm/nvm.sh 2>/dev/null || true
  cd frontend
  npm run dev -- --host 0.0.0.0 --port 5173
) &
FRONT_PID=$!

cleanup() {
  kill $BACK_PID $FRONT_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "UI:      http://localhost:5173"
echo "API:     http://localhost:8000"
echo "Docs:    http://localhost:8000/docs"
echo "Health:  http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop both."
wait
