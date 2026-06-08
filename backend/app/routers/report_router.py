"""
report_router.py — Daily Intelligence Report endpoints + APScheduler

Endpoints:
  POST /report/trigger   — manual trigger (returns report status)
  GET  /report/status    — scheduler status (next run time, last run)

Scheduler:
  Runs generate_and_send_report() every day at 07:00 Asia/Jerusalem
"""
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import APIRouter, BackgroundTasks

from app.services.report_service import generate_and_send_report

log = logging.getLogger(__name__)

router = APIRouter(prefix="/report", tags=["report"])

# ── scheduler (module-level singleton) ────────────────────────────────────────
_scheduler: AsyncIOScheduler | None = None
_last_run:  dict | None = None


def _get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="Asia/Jerusalem")
        _scheduler.add_job(
            _scheduled_job,
            trigger=CronTrigger(hour=7, minute=0, timezone="Asia/Jerusalem"),
            id="daily_report",
            name="Daily Intelligence Report",
            replace_existing=True,
            misfire_grace_time=300,   # 5-minute grace window
        )
        _scheduler.start()
        log.info("[Report] APScheduler started — daily report at 07:00 Asia/Jerusalem")
    return _scheduler


async def _scheduled_job():
    global _last_run
    log.info("[Report] Scheduled job firing …")
    try:
        result = await generate_and_send_report()
        _last_run = {**result, "triggered_by": "scheduler"}
        log.info("[Report] Scheduled job done: %s", result)
    except Exception as exc:
        log.error("[Report] Scheduled job failed: %s", exc)
        _last_run = {"ok": False, "error": str(exc), "triggered_by": "scheduler",
                     "generated_at": datetime.now(tz=timezone.utc).isoformat()}


# ── start scheduler on import ─────────────────────────────────────────────────
_get_scheduler()


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/trigger")
async def trigger_report(background_tasks: BackgroundTasks):
    """
    Manually trigger the Daily Intelligence Report.
    Runs in the background so the HTTP response returns immediately.
    """
    log.info("[Report] Manual trigger received")

    async def _run():
        global _last_run
        try:
            result = await generate_and_send_report()
            _last_run = {**result, "triggered_by": "manual"}
        except Exception as exc:
            log.error("[Report] Manual run failed: %s", exc)
            _last_run = {"ok": False, "error": str(exc), "triggered_by": "manual",
                         "generated_at": datetime.now(tz=timezone.utc).isoformat()}

    background_tasks.add_task(_run)
    return {"ok": True, "message": "Report generation started — check WhatsApp in ~15 seconds"}


@router.get("/status")
async def report_status():
    """Return scheduler status and last run result."""
    sched = _get_scheduler()
    job   = sched.get_job("daily_report")
    next_run = job.next_run_time.isoformat() if job and job.next_run_time else None

    return {
        "scheduler_running": sched.running,
        "next_run_israel":   next_run,
        "last_run":          _last_run,
    }
