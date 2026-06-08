"""
voice.py — Whisper transcription + task creation from audio file.
Called by the WhatsApp bridge when a voice note is received.
"""
import io, logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.security import get_current_user
from app.db.database import get_db
from app.services import task_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/voice", tags=["voice"])
log = logging.getLogger(__name__)


@router.post("/transcribe-and-create")
async def transcribe_and_create(
    audio: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    1. Receive audio file (ogg/mp3/wav)
    2. Transcribe with Whisper
    3. Create a task from the transcript
    4. Return the created task
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # Read audio bytes
    audio_bytes = await audio.read()
    audio_file  = io.BytesIO(audio_bytes)
    audio_file.name = audio.filename or "voice.ogg"

    # Transcribe
    try:
        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=None,   # auto-detect Hebrew + English
        )
        text = transcript.text.strip()
        log.info("Whisper transcript: %s", text[:100])
    except Exception as e:
        log.error("Whisper error: %s", e)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    if not text:
        raise HTTPException(status_code=400, detail="Empty transcript")

    # Create task from transcript
    task = await task_service.create_task(
        db,
        description=text,
        priority=3,
        source="whatsapp_voice",
    )

    return task


@router.post("/transcribe-only")
async def transcribe_only(
    audio: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
):
    """Just transcribe without creating a task. Returns {text: '...'}"""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    audio_bytes = await audio.read()
    audio_file  = io.BytesIO(audio_bytes)
    audio_file.name = audio.filename or "voice.ogg"

    transcript = await client.audio.transcriptions.create(
        model="whisper-1", file=audio_file, language=None,
    )
    return {"text": transcript.text.strip()}
