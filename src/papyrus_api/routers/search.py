"""搜索功能API路由。"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from papyrus.core import cards as card_core
from papyrus.core.cards import CardDict
from papyrus.data.notes_storage import load_notes, Note
from papyrus.paths import NOTES_FILE
from papyrus_api.deps import get_data_file

router = APIRouter(prefix="/search", tags=["search"])


class SearchResultItem(BaseModel):
    id: str
    type: Literal["note", "card"]
    title: str
    preview: str
    folder: str = ""
    tags: list[str] = []
    matched_field: str
    updated_at: float = 0


class SearchResponse(BaseModel):
    success: bool
    query: str
    results: list[SearchResultItem]
    total: int
    notes_count: int
    cards_count: int


def _search_notes(notes: list[Note], query: str) -> list[SearchResultItem]:
    """Search notes by title, content, or tags."""
    results: list[SearchResultItem] = []
    query_lower = query.lower()

    for note in notes:
        matched_field = ""

        # Check title
        if query_lower in note.title.lower():
            matched_field = "title"
        # Check content
        elif query_lower in note.content.lower():
            matched_field = "content"
        # Check tags
        elif any(query_lower in tag.lower() for tag in note.tags):
            matched_field = "tags"

        if matched_field:
            results.append(SearchResultItem(
                id=note.id,
                type="note",
                title=note.title,
                preview=note.preview,
                folder=note.folder,
                tags=note.tags,
                matched_field=matched_field,
                updated_at=note.updated_at,
            ))

    return results


def _search_cards(cards: list[CardDict], query: str) -> list[SearchResultItem]:
    """Search cards by question or answer."""
    results: list[SearchResultItem] = []
    query_lower = query.lower()

    for card in cards:
        matched_field = ""

        # Check question
        if query_lower in card.get("q", "").lower():
            matched_field = "question"
        # Check answer
        elif query_lower in card.get("a", "").lower():
            matched_field = "answer"

        if matched_field:
            title = card.get("q", "")[:50]
            if len(card.get("q", "")) > 50:
                title += "..."

            results.append(SearchResultItem(
                id=card.get("id", ""),
                type="card",
                title=title,
                preview=card.get("a", "")[:100],
                folder="复习卡片",
                tags=[],
                matched_field=matched_field,
            ))

    return results


@router.get("", response_model=SearchResponse)
def search_all(query: str = "") -> SearchResponse:
    """搜索笔记和卡片。
    
    Query parameters:
        query: 搜索关键词
    """
    if not query or not query.strip():
        return SearchResponse(
            success=True,
            query="",
            results=[],
            total=0,
            notes_count=0,
            cards_count=0,
        )

    data_file = get_data_file()

    # Search notes
    notes = load_notes(NOTES_FILE)
    note_results = _search_notes(notes, query.strip())

    # Search cards
    cards = card_core.list_cards(data_file)
    card_results = _search_cards(cards, query.strip())

    # Combine results, notes first
    all_results = note_results + card_results

    return SearchResponse(
        success=True,
        query=query.strip(),
        results=all_results,
        total=len(all_results),
        notes_count=len(note_results),
        cards_count=len(card_results),
    )
