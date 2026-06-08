"""
wa.py — WhatsApp proxy routes.
Proxies /messages from the WA bridge so the frontend never calls port 3001 directly.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
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
    """Get QR code for WA authentication (JSON)."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(f"{WA_BRIDGE}/qr")
            return r.json()
    except Exception:
        return {"connected": False, "qr": None}


@router.get("/qr-page", response_class=HTMLResponse, include_in_schema=False)
async def get_wa_qr_page():
    """
    Visual QR code page — open in browser to scan with WhatsApp.
    No auth required (needed for initial device linking).
    URL: /api/v1/wa/qr-page
    """
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(f"{WA_BRIDGE}/qr")
            data = r.json()
    except Exception:
        data = {"connected": False, "qr": None}

    if data.get("connected"):
        return HTMLResponse("""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WhatsApp — Connected</title>
<style>body{font-family:sans-serif;text-align:center;padding:60px;background:#f0fdf4}
h1{color:#16a34a}p{color:#374151}</style></head>
<body>
  <h1>✅ WhatsApp Connected!</h1>
  <p>The bridge is active and listening for your messages in Saved Messages.</p>
  <p><small>You can close this tab.</small></p>
</body></html>""")

    qr = data.get("qr") or ""

    if not qr:
        return HTMLResponse("""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WhatsApp — Starting</title>
<style>body{font-family:sans-serif;text-align:center;padding:60px}
h1{color:#374151}p{color:#6b7280}</style></head>
<body>
  <h1>⏳ WhatsApp bridge starting...</h1>
  <p>The browser is launching. This page refreshes automatically.</p>
  <script>setTimeout(()=>location.reload(), 4000)</script>
</body></html>""")

    # Render QR code using qrcode.js from CDN
    return HTMLResponse(f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WhatsApp — Scan QR</title>
<style>
  body{{font-family:sans-serif;text-align:center;padding:40px;background:#fff}}
  h1{{color:#128C7E;margin-bottom:8px}}
  #qr{{border:6px solid #25D366;border-radius:12px;display:inline-block;
       padding:12px;margin:20px auto;background:#fff}}
  p{{color:#555}}small{{color:#999}}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
</head>
<body>
  <h1>📱 Scan with WhatsApp</h1>
  <p>Open WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong></p>
  <div id="qr"></div>
  <p><small>QR refreshes every 15 seconds. Page auto-reloads.</small></p>
  <script>
    new QRCode(document.getElementById('qr'), {{
      text: {repr(qr)},
      width: 280, height: 280,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    }});
    setTimeout(() => location.reload(), 15000);
  </script>
</body></html>""")
