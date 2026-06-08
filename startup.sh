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

# ── WhatsApp Bridge — entire setup in background subshell ─────
# npm install for Puppeteer/Chromium takes ~5 min on first run.
# Running it in background lets uvicorn start within Azure's 230s timeout.
if [ -d "$WA_SRC" ]; then
  mkdir -p /home/LogFiles
  (
    mkdir -p "$WA_HOME"

    # Install node_modules only when package.json changes
    if [ ! -f "$WA_HOME/.installed" ] || \
       ! diff -q "$WA_SRC/package.json" "$WA_HOME/package.json" >/dev/null 2>&1; then
      echo "[wa-bridge] Installing npm packages (first run — ~5 min)..." >> /home/LogFiles/wa-bridge.log
      cp "$WA_SRC/package.json" "$WA_HOME/"
      cp "$WA_SRC/package-lock.json" "$WA_HOME/" 2>/dev/null || true
      cd "$WA_HOME"
      npm install --production >> /home/LogFiles/wa-bridge.log 2>&1
      touch "$WA_HOME/.installed"
      echo "[wa-bridge] npm install complete" >> /home/LogFiles/wa-bridge.log
    else
      echo "[wa-bridge] npm packages cached — skipping install" >> /home/LogFiles/wa-bridge.log
    fi

    ln -sfn "$WA_HOME/node_modules" "$WA_SRC/node_modules"

    echo "[wa-bridge] Starting on port $WA_PORT..." >> /home/LogFiles/wa-bridge.log
    cd "$WA_SRC"
    PORT="$WA_PORT" node index.js >> /home/LogFiles/wa-bridge.log 2>&1
  ) &
  echo "[startup] WhatsApp bridge setup started in background (PID $!)"
else
  echo "[startup] ⚠️  wa-bridge not found — skipping"
fi

# ── FastAPI Backend (foreground — keeps container alive) ───────
# Working directory is /home/site/wwwroot/ where app/ lives
echo "[startup] Starting FastAPI on port 8000..."
cd /home/site/wwwroot
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
