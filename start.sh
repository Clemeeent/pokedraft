#!/usr/bin/env bash
# One command to install, test and launch the game locally: ./start.sh
set -e
cd "$(dirname "$0")"
echo "▶ Installing dependencies…"
npm install
echo "▶ Running tests…"
npm test
echo "▶ Starting the game on http://localhost:3000 (Ctrl+C to stop)"
npm run dev
