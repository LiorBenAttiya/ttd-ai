import logging
import os
import shutil
import subprocess
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import tasks, dashboard, approvals, meetings, mailboxes, contacts, reports, webhooks, auth, voice, search, wa
from app.routers import email_router
from app.routers import ai_router
from app.routers import report_router

logging.basicConfig(level=settings.LOG_LEVEL)
log = logging.getLogger(__name__)


def _get_node_bin() -> tuple[str, str] | None:
    """Return (node, npm) absolute paths, downloading Node.js 20 LTS if needed.

    Installs to /home/nodejs/ which is persisted across restarts on Azure App
    Service, so the ~50 MB download only happens once per instance lifecycle.
    """
    node_home = "/home/nodejs"
    node_bin = os.path.join(node_home, "bin", "node")
    npm_bin  = os.path.join(node_home, "bin", "npm")

    if os.path.exists(node_bin) and os.path.exists(npm_bin):
        log.info("Node.js found at %s", node_bin)
        return node_bin, npm_bin

    log.info("Node.js not in /home/nodejs — downloading Node 20 LTS (~50 MB)...")
    os.makedirs(node_home, exist_ok=True)
    url = "https://nodejs.org/dist/v20.19.0/node-v20.19.0-linux-x64.tar.xz"
    result = subprocess.run(
        ["bash", "-c", f"curl -fsSL '{url}' | tar -xJ -C '{node_home}' --strip-components=1"],
        check=False,
    )
    if result.returncode != 0 or not os.path.exists(node_bin):
        log.error("Failed to download/install Node.js (exit %s)", result.returncode)
        return None

    log.info("Node.js 20 installed to %s", node_home)
    return node_bin, npm_bin


def _ensure_chromium(node_bin: str, wa_src: str, node_env: dict) -> bool:
    """Download Chromium once to /home/puppeteer-cache/ if not already present.

    Uses @puppeteer/browsers (bundled with puppeteer in node_modules).
    Returns True when Chromium is confirmed present.
    """
    import glob as _glob

    cache_dir = "/home/puppeteer-cache"
    os.makedirs(cache_dir, exist_ok=True)

    hits = _glob.glob(os.path.join(cache_dir, "chrome", "linux-*", "*", "chrome"))
    if hits:
        log.info("Chromium cached at %s", hits[0])
        return True

    log.info("Chromium not found — downloading to %s (~120 MB, ~2 min first run)...", cache_dir)

    dl_script = (
        "import { install } from '@puppeteer/browsers';\n"
        "const cacheDir = process.env.PUPPETEER_CACHE_DIR;\n"
        "install({ browser: 'chrome', cacheDir })\n"
        "  .then(r => { console.log('[chromium] ready:', r.executablePath); })\n"
        "  .catch(e => { console.error('[chromium] FAILED:', e.message); process.exit(1); });\n"
    )
    script_path = os.path.join(wa_src, "_dl_chromium.mjs")
    try:
        with open(script_path, "w") as f:
            f.write(dl_script)
        result = subprocess.run(
            [node_bin, script_path],
            cwd=wa_src,
            env={**node_env, "PUPPETEER_CACHE_DIR": cache_dir},
            check=False,
            timeout=600,
        )
        if result.returncode == 0:
            log.info("Chromium download complete")
            return True
        log.error("Chromium download failed (exit %s)", result.returncode)
        return False
    finally:
        try:
            os.unlink(script_path)
        except OSError:
            pass


def _start_wa_bridge() -> None:
    """Start the Node.js WhatsApp bridge in the background.

    Two modes depending on what the deployment contains:
      A) node_modules bundled in deployment package (CI pre-install):
         skip npm install entirely, ensure Chromium cached, then spawn.
      B) Legacy fallback — install to /home/wa-bridge/ on first run.

    Always runs in a daemon thread so FastAPI startup is never blocked.
    """
    wa_src = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "wa-bridge")
    if not os.path.exists(wa_src):
        log.info("wa-bridge not found — skipping")
        return

    bins = _get_node_bin()
    if bins is None:
        log.error("wa-bridge skipped — could not obtain Node.js")
        return
    node_bin, npm_bin = bins

    os.makedirs("/home/wa-bridge", exist_ok=True)
    os.makedirs("/home/LogFiles", exist_ok=True)
    os.makedirs("/home/puppeteer-cache", exist_ok=True)

    log_path = "/home/LogFiles/wa-bridge.log"

    node_env = {
        **os.environ,
        "PORT":                os.getenv("WA_PORT", "3001"),
        "PUPPETEER_CACHE_DIR": "/home/puppeteer-cache",
        "SESSION_PATH":        "/home/wa-bridge/.wwebjs_auth",
    }

    # ── Mode A: node_modules bundled in deployment (real dir, not symlink) ──
    nm_in_src = os.path.join(wa_src, "node_modules")
    bundled   = os.path.isdir(nm_in_src) and not os.path.islink(nm_in_src)

    if bundled:
        log.info("wa-bridge: node_modules bundled — skipping npm install")
        with open(log_path, "a") as lf:
            lf.write("[wa-bridge] node_modules bundled — skipping npm install\n")
            lf.flush()
        # One-time Chromium download (~2 min, then cached in /home/puppeteer-cache/)
        _ensure_chromium(node_bin, wa_src, node_env)

    # ── Mode B: legacy — install to /home/wa-bridge/ ────────────────────────
    else:
        wa_home        = "/home/wa-bridge"
        pkg_src        = os.path.join(wa_src, "package.json")
        pkg_dst        = os.path.join(wa_home, "package.json")
        installed_flag = os.path.join(wa_home, ".installed")
        nm_target      = os.path.join(wa_home, "node_modules")

        needs_install = (
            not os.path.exists(installed_flag)
            or not os.path.exists(nm_target)
        )
        if not needs_install and os.path.exists(pkg_dst):
            try:
                needs_install = open(pkg_src).read() != open(pkg_dst).read()
            except OSError:
                needs_install = True

        with open(log_path, "a") as lf:
            if needs_install:
                lf.write("[wa-bridge] Running npm install (first run ~5 min)...\n")
                lf.flush()
                shutil.copy(pkg_src, pkg_dst)
                try:
                    shutil.copy(os.path.join(wa_src, "package-lock.json"), wa_home)
                except OSError:
                    pass
                result = subprocess.run(
                    [npm_bin, "install", "--production"],
                    cwd=wa_home, stdout=lf, stderr=lf, check=False, env=node_env,
                )
                if result.returncode == 0:
                    open(installed_flag, "w").close()
                    lf.write("[wa-bridge] npm install complete\n")
                else:
                    lf.write(f"[wa-bridge] npm install FAILED (exit {result.returncode}) — retrying next restart\n")
                    lf.flush()
                    return
            else:
                lf.write("[wa-bridge] npm packages cached — skipping install\n")
            lf.flush()

        # Symlink /home/wa-bridge/node_modules → wa_src/node_modules
        nm_link = os.path.join(wa_src, "node_modules")
        if os.path.islink(nm_link):
            os.unlink(nm_link)
        if os.path.exists(nm_target) and not os.path.exists(nm_link):
            os.symlink(nm_target, nm_link)

    # ── Launch bridge process ────────────────────────────────────────────────
    with open(log_path, "a") as lf:
        lf.write(f"[wa-bridge] Starting on port {node_env['PORT']}...\n")
    subprocess.Popen(
        [node_bin, "index.js"],
        cwd=wa_src,
        env=node_env,
        stdout=open(log_path, "a"),
        stderr=subprocess.STDOUT,
    )
    log.info("wa-bridge started")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("TTD AI API starting — env=%s", settings.APP_ENV)
    # Start wa-bridge in a daemon thread — never blocks FastAPI startup
    threading.Thread(target=_start_wa_bridge, daemon=True, name="wa-bridge").start()
    yield
    log.info("TTD AI API shutting down")


app = FastAPI(
    title="TTD AI API",
    description="Personal & Business AI Task Tracker — WhatsApp-first, Outlook-integrated, SAP-connected",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(tasks.router,                prefix=API_PREFIX)
app.include_router(dashboard.router,            prefix=API_PREFIX)
app.include_router(approvals.router,            prefix=API_PREFIX)
app.include_router(meetings.router,             prefix=API_PREFIX)
app.include_router(mailboxes.router,            prefix=API_PREFIX)
app.include_router(contacts.company_router,     prefix=API_PREFIX)
app.include_router(contacts.contact_router,     prefix=API_PREFIX)
app.include_router(reports.router,              prefix=API_PREFIX)
app.include_router(webhooks.router,             prefix=API_PREFIX)
app.include_router(auth.router,                 prefix=API_PREFIX)
app.include_router(voice.router,                prefix=API_PREFIX)
app.include_router(search.router,               prefix=API_PREFIX)
app.include_router(wa.router,                   prefix=API_PREFIX)
app.include_router(email_router.router,         prefix=API_PREFIX)
app.include_router(ai_router.router,            prefix=API_PREFIX)
app.include_router(report_router.router,        prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "app": "TTD AI", "version": "1.0.0", "env": settings.APP_ENV}


@app.get("/", tags=["system"])
async def root():
    return {"message": "TTD AI API — see /docs for endpoints"}
