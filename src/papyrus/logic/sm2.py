"""SM-2 spaced repetition algorithm helpers."""

from __future__ import annotations

import time
from typing import Any, Dict, Tuple


def apply_sm2(card: Dict[str, Any], grade: int, *, now: float = None) -> Tuple[float, float]:
    """Apply SM-2 update to `card` in-place.

    Args:
        card: Card dict, will be updated.
        grade: 1=forget, 2=fuzzy, 3=perfect.
        now: Optional override timestamp.

    Returns:
        (interval_days, ef)
    """

    if now is None:
        now = time.time()

    ef = float(card.get("ef", 2.5))
    repetitions = int(card.get("repetitions", 0))

    quality_map = {1: 1, 2: 3, 3: 5}
    quality = quality_map[int(grade)]

    if quality >= 3:
        if repetitions == 0:
            interval_days = 1.0
        elif repetitions == 1:
            interval_days = 6.0
        else:
            interval_days = (float(card.get("interval", 86400)) / 86400.0) * ef
        repetitions += 1
    else:
        repetitions = 0
        interval_days = 1.0

    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ef = max(1.3, ef)

    interval_seconds = interval_days * 86400.0
    card["next_review"] = now + interval_seconds
    card["interval"] = interval_seconds
    card["ef"] = round(ef, 2)
    card["repetitions"] = repetitions

    return interval_days, ef
