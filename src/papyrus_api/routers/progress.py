"""学习进度 API - 连续天数、每日目标."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from papyrus.paths import DATABASE_FILE
from papyrus.data.progress import (
    get_streak_info,
    get_progress_history,
    StreakInfo,
)

router = APIRouter(tags=["progress"])


class StreakResponse(BaseModel):
    """连续学习信息响应."""
    success: bool
    current_streak: int  # 当前连续天数
    longest_streak: int  # 最长连续天数
    total_days: int  # 总学习天数
    today_completed: bool  # 今日是否完成目标
    today_cards: int  # 今日已复习卡片数
    daily_target: int  # 每日目标卡片数
    progress_percent: int  # 今日进度百分比 (0-100)


class DailyProgressItem(BaseModel):
    """单日进度."""
    date: str
    cards_reviewed: int
    cards_created: int
    notes_created: int
    study_minutes: int
    target_completed: bool


class ProgressHistoryResponse(BaseModel):
    """学习历史响应."""
    success: bool
    history: list[DailyProgressItem]
    days: int


@router.get("/progress/streak", response_model=StreakResponse)
def get_streak() -> StreakResponse:
    """获取连续学习天数和今日进度.
    
    用于首页显示："已连续精进 X 天 | 今日目标已完成 Y%"
    """
    info = get_streak_info(DATABASE_FILE)
    
    # 计算进度百分比
    progress_percent = min(
        100,
        int(info.today_cards / info.daily_target * 100)
    ) if info.daily_target > 0 else 0
    
    return StreakResponse(
        success=True,
        current_streak=info.current_streak,
        longest_streak=info.longest_streak,
        total_days=info.total_days,
        today_completed=info.today_completed,
        today_cards=info.today_cards,
        daily_target=info.daily_target,
        progress_percent=progress_percent,
    )


@router.get("/progress/history", response_model=ProgressHistoryResponse)
def get_history(days: int = 30) -> ProgressHistoryResponse:
    """获取最近N天的学习历史.
    
    Args:
        days: 返回多少天的数据（默认30天）
    """
    history = get_progress_history(DATABASE_FILE, days)
    
    return ProgressHistoryResponse(
        success=True,
        history=[
            DailyProgressItem(
                date=h.date,
                cards_reviewed=h.cards_reviewed,
                cards_created=h.cards_created,
                notes_created=h.notes_created,
                study_minutes=h.study_minutes,
                target_completed=h.target_completed,
            )
            for h in history
        ],
        days=len(history),
    )
