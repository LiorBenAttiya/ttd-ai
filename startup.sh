#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# TTD AI — Azure App Service startup script
# Deploy layout in /home/site/wwwroot/:
#   app/            ← FastAPI (from backend/)
#   requirements.txt
#   wa-bridge/      ← Node.js WA bridge
#   startup.sh      ← this file
# ═══════════════════════════════════════════════════════════════

echo "[startup] ════════════════════════════════════════"
echo "[startup] TTD AI multi-service startup"
echo "[startup] ════════════════════════════════════════"

# ── Activate Python virtual environment (Oryx creates /antenv) ─
if [ -f "/antenv/bin/activate" ]; then
  echo "[startup] Activating /antenv Python environment"
  source /antenv/bin/activate
else
  echo "[startup] No venv found — using system Python"
fi

WA_SRC="/home/site/wwwroot/wa-bridge"
WA_HOME="/home/wa-bridge"
WA_PORT="${WA_PORT:-3001}"
export PUPPETEER_CACHE_DIR="${PUPPETEER_CACHE_DIR:-/home/puppeteer-cache}"

# ── WhatsApp Bridge (Node.js) ──────────────────────────────────
if [ -d "$WA_SRC" ]; then
  mkdir -p "$WA_HOME"

  # Cache node_modules to /home/ — persists across restarts.
  # Only reinstalls when package.json actually changes.
  if [ ! -f "$WA_HOME/.installed" ] || \
     ! diff -q "$WA_SRC/package.json" "$WA_HOME/package.json" >/dev/null 2>&1; then
    echo "[startup] Installing wa-bridge npm packages (first run — takes ~2 min)..."
    cp "$WA_SRC/package.json" "$WA_HOME/"
    cp "$WA_SRC/package-lock.json" "$WA_HOME/" 2>/dev/null || true
    cd "$WA_HOME"
    npm install --production 2>&1 | tail -10
    touch "$WA_HOME/.installed"
    echo "[startup] ✅ npm install complete"
  else
    echo "[startup] ✅ npm packages cached — skipping install"
  fi

  # Symlink node_modules into source directory
  ln -sfn "$WA_HOME/node_modules" "$WA_SRC/node_modules"

  # Start wa-bridge in background, log to /home/LogFiles/
  mkdir -p /home/LogFiles
  echo "[startup] Starting WhatsApp bridge on port $WA_PORT..."
  cd "$WA_SRC"
  PORT="$WA_PORT" node index.js >> /home/LogFiles/wa-bridge.log 2>&1 &
  echo "[startup] ✅ WhatsApp bridge started (PID $!)"
else
  echo "[startup] ⚠️  wa-bridge not found — skipping"
fi

# ── FastAPI Backend (foreground — keeps container alive) ───────
# Working directory is /home/site/wwwroot/ where app/ lives
echo "[startup] Starting FastAPI on port 8000..."
cd /home/site/wwwroot
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
