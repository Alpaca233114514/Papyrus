"""卡片管理API路由。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from papyrus.core import cards as card_core
from papyrus.core.cards import CardDict
from papyrus_api.deps import get_data_file, pick_card_text

router = APIRouter(prefix="/cards", tags=["cards"])


class CreateCardIn(BaseModel):
    q: str | None = None
    a: str | None = None
    question: str | None = None
    answer: str | None = None


class CardsListResponse(BaseModel):
    success: bool
    cards: list[CardDict]
    count: int


class CreateCardResponse(BaseModel):
    success: bool
    card: CardDict


class DeleteCardResponse(BaseModel):
    success: bool


class ImportTxtIn(BaseModel):
    content: str


class ImportTxtResponse(BaseModel):
    success: bool
    count: int


@router.get("", response_model=CardsListResponse)
def list_cards() -> CardsListResponse:
    """获取所有卡片列表。"""
    data_file = get_data_file()
    cards = card_core.list_cards(data_file)
    return CardsListResponse(success=True, cards=cards, count=len(cards))


@router.post("", response_model=CreateCardResponse)
def create_card(payload: CreateCardIn) -> CreateCardResponse:
    """创建新卡片。"""
    q = pick_card_text(payload.q, payload.question)
    a = pick_card_text(payload.a, payload.answer)

    data_file = get_data_file()
    try:
        card = card_core.create_card(data_file, q=q, a=a)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CreateCardResponse(success=True, card=card)


@router.delete("/{card_id}", response_model=DeleteCardResponse)
def delete_card(card_id: str) -> DeleteCardResponse:
    """删除指定卡片。"""
    data_file = get_data_file()
    ok = card_core.delete_card(data_file, card_id)
    if not ok:
        raise HTTPException(status_code=404, detail="card not found")
    return DeleteCardResponse(success=True)


@router.post("/import/txt", response_model=ImportTxtResponse)
def import_txt(payload: ImportTxtIn) -> ImportTxtResponse:
    """从文本导入卡片（格式：问题===答案）。"""
    data_file = get_data_file()
    count = card_core.import_from_txt(data_file, payload.content)
    if count == 0:
        raise HTTPException(status_code=400, detail="未找到有效卡片，请确认格式为：题目===答案")
    return ImportTxtResponse(success=True, count=count)
