"""
wa.py — WhatsApp proxy routes.
Proxies /messages from the WA bridge so the frontend never calls port 3001 directly.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user
import httpx, os

router = APIRouter(prefix="/wa", tags=["whatsapp"])

WA_BRIDGE = os.getenv("WA_BRIDGE_URL", "http://localhost:3001")


@router.get("/messages")
async def get_wa_messages(
    limit: int = Query(50, le=100),
    _user: dict = Depends(get_current_user),
):
    """Proxy to WA bridge /messages endpoint (self-chat only)."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{WA_BRIDGE}/messages", params={"limit": limit})
            return r.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail={"error": "WA bridge offline", "status": "offline"})
    except Exception as e:
        raise HTTPException(status_code=503, detail={"error": str(e), "status": "error"})


@router.get("/status")
async def get_wa_status(_user: dict = Depends(get_current_user)):
    """Check WA bridge health."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(f"{WA_BRIDGE}/health")
            return r.json()
    except httpx.ConnectError:
        return {"status": "offline"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.get("/qr")
async def get_wa_qr(_user: dict = Depends(get_current_user)):
    """Get QR code for WA authentication."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(f"{WA_BRIDGE}/qr")
            return r.json()
    except Exception:
        return {"connected": False, "qr": None}
