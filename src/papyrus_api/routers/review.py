"""复习功能API路由。"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from papyrus.core import cards as card_core
from papyrus.core.cards import CardDict, NextDueResult
from papyrus_api.deps import get_data_file
from papyrus.paths import DATABASE_FILE
from papyrus.data.progress import record_card_reviewed

router = APIRouter(prefix="/review", tags=["review"])


class RateCardIn(BaseModel):
    grade: Literal[1, 2, 3] = Field(..., description="1=忘记, 2=模糊, 3=秒杀")


class NextDueEmptyResponse(BaseModel):
    success: bool
    card: None = None
    due_count: int
    total_count: int


class NextDueResponse(BaseModel):
    success: bool
    card: CardDict
    due_count: int
    total_count: int


class RateCardResponse(BaseModel):
    success: bool
    card: CardDict
    interval_days: float
    ef: float
    next: NextDueResult | None


@router.get("/next", response_model=NextDueResponse | NextDueEmptyResponse)
def get_next_due() -> NextDueResponse | NextDueEmptyResponse:
    """获取下一张待复习的卡片。
    
    如果没有到期的卡片，返回空卡片和统计信息。
    """
    data_file = get_data_file()
    res = card_core.get_next_due(data_file)
    if res is None:
        cards = card_core.list_cards(data_file)
        return NextDueEmptyResponse(
            success=True,
            card=None,
            due_count=0,
            total_count=len(cards),
        )

    return NextDueResponse(success=True, **res)


@router.post("/{card_id}/rate", response_model=RateCardResponse)
def rate_card(card_id: str, payload: RateCardIn) -> RateCardResponse:
    """对复习卡片进行评分。
    
    Args:
        card_id: 卡片ID
        payload.grade: 1=忘记, 2=模糊, 3=秒杀
    """
    data_file = get_data_file()
    res = card_core.rate_card(data_file, card_id, int(payload.grade))
    if res is None:
        raise HTTPException(status_code=404, detail="card not found")

    # 记录学习进度
    record_card_reviewed(DATABASE_FILE)

    # also return the next due snapshot for convenience
    nxt = card_core.get_next_due(data_file)
    return RateCardResponse(success=True, **res, next=nxt)
