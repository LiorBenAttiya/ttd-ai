import logging
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("TTD AI API starting — env=%s", settings.APP_ENV)
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
