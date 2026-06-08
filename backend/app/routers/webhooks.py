import hashlib, hmac, logging
from fastapi import APIRouter, Request, Response, Query, HTTPException
from app.core.config import settings

router = APIRouter(prefix="/webhook", tags=["webhooks"])
log = logging.getLogger(__name__)


# ── WhatsApp Cloud API ────────────────────────────────────────
@router.get("/whatsapp")
async def whatsapp_verify(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
):
    """Meta webhook verification handshake."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WA_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/whatsapp")
async def whatsapp_inbound(request: Request):
    """
    Receives all inbound WhatsApp events.
    Verifies HMAC-SHA256 signature before processing.
    Dispatches to AI Processing Layer (L2).
    """
    body = await request.body()

    # HMAC verification
    signature = request.headers.get("X-Hub-Signature-256", "")
    expected  = "sha256=" + hmac.new(
        settings.WA_ACCESS_TOKEN.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    log.info("WA webhook received: %s", payload.get("object"))

    # TODO: dispatch to L2 processor in Stage 9
    return {"status": "received"}


# ── Microsoft Graph ───────────────────────────────────────────
@router.post("/outlook")
async def outlook_change_notification(request: Request):
    """
    Receives MS Graph change notifications (mail flag changes).
    Validates subscription token then dispatches to task creation flow.
    """
    # Graph validation challenge on subscription setup
    validation_token = request.query_params.get("validationToken")
    if validation_token:
        return Response(content=validation_token, media_type="text/plain")

    payload = await request.json()
    log.info("Outlook webhook received: %s entries", len(payload.get("value", [])))

    # TODO: dispatch to Outlook task creation flow in Stage 10
    return {"status": "received"}
