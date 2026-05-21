#!/data/data/com.termux/files/usr/bin/bash
# Auto-deploy script for event-platform-console
# Triggered by GitHub webhook → C server → this script
# Just git pull (no build, static files)

set -e

REPO_DIR="$HOME/projects/event-platform-console"
LOG="$HOME/deploy-console.log"

echo "[$(date)] === CONSOLE DEPLOY START ===" >> "$LOG"

cd "$REPO_DIR"

git fetch origin >> "$LOG" 2>&1
git reset --hard origin/main >> "$LOG" 2>&1
COMMIT=$(git rev-parse --short HEAD)

echo "[$(date)] === DEPLOY DONE ($COMMIT) ===" >> "$LOG"
