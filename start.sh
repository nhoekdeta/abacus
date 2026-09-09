#!/usr/bin/env bash
# Start Peanick & Ponita Playground on http://localhost:8777 (macOS / Linux / Git Bash)
cd "$(dirname "$0")" || exit 1

PORT=8777
URL="http://localhost:$PORT"

if command -v python3 >/dev/null 2>&1; then PY=python3
elif command -v python  >/dev/null 2>&1; then PY=python
else echo "Python not found. Install it from python.org and try again."; exit 1
fi

echo "Peanick & Ponita Playground -> $URL   (Ctrl+C to stop)"

# open the browser shortly after the server comes up
( sleep 2
  if   command -v open      >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open  >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v start     >/dev/null 2>&1; then start "$URL"
  fi ) &

exec "$PY" -m http.server "$PORT"
