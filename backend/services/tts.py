"""
Smart Warehouse — Text-to-Speech Service
==========================================
Cross-platform TTS alerts:
  - Windows: PowerShell System.Speech (native audio)
  - Linux/Docker: Console logging with [TTS-ALERT] prefix
    (visible in `docker compose logs`)
Includes cooldown to prevent audio/log overlap.
"""

import sys
import time
import subprocess

from config import TTS_COOLDOWN_SECONDS

_last_tts_time = 0.0
_platform = sys.platform


def speak_async(text: str):
    """Fire-and-forget TTS alert with cooldown protection."""
    global _last_tts_time
    now = time.time()
    if now - _last_tts_time < TTS_COOLDOWN_SECONDS:
        return  # Skip if cooldown hasn't elapsed

    _last_tts_time = now

    if _platform == "win32":
        # Windows: Native speech synthesis via PowerShell
        try:
            safe_text = text.replace("'", "''")
            subprocess.Popen(
                f'powershell -Command "Add-Type -AssemblyName System.Speech; '
                f"(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{safe_text}');\"",
                shell=True
            )
        except Exception:
            print(f"[TTS-ALERT] {text}")
    else:
        # Linux/macOS/Docker: Log to console (visible in docker compose logs)
        print(f"[TTS-ALERT] 🔊 {text}")

