from __future__ import annotations

from pathlib import Path
import os

# NOTE: This module centralizes all filesystem paths used by the app.
# It intentionally mirrors the constants previously defined in src/Papyrus.py

# Project root (…/Papyrus)
BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = str(BASE_DIR / "data")
BACKUP_DIR = str(BASE_DIR / "backup")
ASSETS_DIR = str(BASE_DIR / "assets")
LOG_DIR = str(BASE_DIR / "logs")

# Ensure directories exist
for directory in [DATA_DIR, BACKUP_DIR, ASSETS_DIR, LOG_DIR]:
    os.makedirs(directory, exist_ok=True)

DATA_FILE = str(Path(DATA_DIR) / "Papyrusdata.json")
BACKUP_FILE = str(Path(BACKUP_DIR) / "Papyrusdata.json.bak")
SCROLLS_FILE = str(Path(DATA_DIR) / "scrolls.json")
