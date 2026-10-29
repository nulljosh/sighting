# Sighting launch film

21 seconds in the Joshua Tree film style: one glowing horizon, every shot of the live app seen through the same disc, a three-beat line, then the name and mark. Rendered with the opus-ad skill (`arcad.py`).

Rebuild: `cap.py` captures the live screens, `derive.py` cuts low-set shots, `mkspec2.py` writes `spec.json`, then `uv run -q --with pillow --with numpy python ~/.claude/skills/opus-ad/arcad.py spec.json` and lower the audio 5.5 dB (`ffmpeg -c:v copy -af volume=-5.5dB`). Fonts are static instances of the system SF font, made locally and not committed.
