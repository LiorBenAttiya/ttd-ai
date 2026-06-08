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


def _start_wa_bridge() -> None:
    """Start the Node.js WhatsApp bridge in the background.

    Runs npm install on first deploy (persisted to /home/wa-bridge/ across
    restarts), then spawns the bridge process. Designed to be called from a
    daemon thread so it never blocks FastAPI startup.
    """
    wa_src = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "wa-bridge")
    if not os.path.exists(wa_src):
        log.info("wa-bridge not found — skipping")
        return

    wa_home = "/home/wa-bridge"
    os.makedirs(wa_home, exist_ok=True)
    os.makedirs("/home/LogFiles", exist_ok=True)

    log_path = "/home/LogFiles/wa-bridge.log"
    pkg_src = os.path.join(wa_src, "package.json")
    pkg_dst = os.path.join(wa_home, "package.json")
    installed_flag = os.path.join(wa_home, ".installed")

    # Only reinstall when package.json changes
    needs_install = not os.path.exists(installed_flag)
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
            subprocess.run(
                ["npm", "install", "--production"],
                cwd=wa_home, stdout=lf, stderr=lf, check=False,
            )
            open(installed_flag, "w").close()
            lf.write("[wa-bridge] npm install complete\n")
        else:
            lf.write("[wa-bridge] npm packages cached — skipping install\n")
        lf.flush()

    # Symlink node_modules into source dir
    nm_link = os.path.join(wa_src, "node_modules")
    nm_target = os.path.join(wa_home, "node_modules")
    if os.path.islink(nm_link):
        os.unlink(nm_link)
    if os.path.exists(nm_target):
        os.symlink(nm_target, nm_link)

    # Launch bridge process
    env = {**os.environ, "PORT": os.getenv("WA_PORT", "3001")}
    with open(log_path, "a") as lf:
        lf.write(f"[wa-bridge] Starting on port {env['PORT']}...\n")
    subprocess.Popen(
        ["node", "index.js"],
        cwd=wa_src,
        env=env,
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
