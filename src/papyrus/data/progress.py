"""学习进度追踪 - 连续天数、每日目标等."""
from __future__ import annotations

import sqlite3
import time
from dataclasses import dataclass
from typing import Protocol


class LoggerProtocol(Protocol):
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


@dataclass
class DailyProgress:
    """每日学习进度."""
    date: str  # YYYY-MM-DD
    cards_reviewed: int
    cards_created: int
    notes_created: int
    study_minutes: int
    target_completed: bool


@dataclass
class StreakInfo:
    """连续学习信息."""
    current_streak: int  # 当前连续天数
    longest_streak: int  # 最长连续天数
    total_days: int  # 总学习天数
    today_completed: bool  # 今日是否完成目标
    today_cards: int  # 今日已复习卡片数
    daily_target: int  # 每日目标卡片数 (默认20)


def init_progress_table(db_path: str, logger: LoggerProtocol | None = None) -> None:
    """初始化进度表."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # 每日进度表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_progress (
                date TEXT PRIMARY KEY,
                cards_reviewed INTEGER DEFAULT 0,
                cards_created INTEGER DEFAULT 0,
                notes_created INTEGER DEFAULT 0,
                study_minutes INTEGER DEFAULT 0,
                target_completed BOOLEAN DEFAULT 0,
                updated_at REAL DEFAULT 0
            )
        """)
        
        # 连续天数统计表 (存储历史最高记录)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS streak_stats (
                key TEXT PRIMARY KEY,
                value INTEGER DEFAULT 0
            )
        """)
        
        # 插入默认统计
        cursor.execute("""
            INSERT OR IGNORE INTO streak_stats (key, value) VALUES 
            ('longest_streak', 0),
            ('total_days', 0)
        """)
        
        conn.commit()
    
    if logger:
        logger.info("Progress tables initialized")


def _today_str() -> str:
    """获取今天日期字符串 YYYY-MM-DD."""
    return time.strftime("%Y-%m-%d", time.localtime())


def _date_to_ts(date_str: str) -> float:
    """日期字符串转时间戳."""
    return time.mktime(time.strptime(date_str, "%Y-%m-%d"))


def record_card_reviewed(db_path: str, logger: LoggerProtocol | None = None) -> None:
    """记录复习了一张卡片."""
    init_progress_table(db_path, logger)
    
    today = _today_str()
    now = time.time()
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # 插入或更新今日记录
        cursor.execute("""
            INSERT INTO daily_progress (date, cards_reviewed, updated_at)
            VALUES (?, 1, ?)
            ON CONFLICT(date) DO UPDATE SET
                cards_reviewed = cards_reviewed + 1,
                updated_at = ?
        """, (today, now, now))
        
        conn.commit()


def record_card_created(db_path: str, logger: LoggerProtocol | None = None) -> None:
    """记录创建了一张卡片."""
    init_progress_table(db_path, logger)
    
    today = _today_str()
    now = time.time()
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO daily_progress (date, cards_created, updated_at)
            VALUES (?, 1, ?)
            ON CONFLICT(date) DO UPDATE SET
                cards_created = cards_created + 1,
                updated_at = ?
        """, (today, now, now))
        
        conn.commit()


def record_note_created(db_path: str, logger: LoggerProtocol | None = None) -> None:
    """""记录创建了一篇笔记."""
    init_progress_table(db_path, logger)
    
    today = _today_str()
    now = time.time()
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO daily_progress (date, notes_created, updated_at)
            VALUES (?, 1, ?)
            ON CONFLICT(date) DO UPDATE SET
                notes_created = notes_created + 1,
                updated_at = ?
        """, (today, now, now))
        
        conn.commit()


def check_and_update_target(db_path: str, daily_target: int = 20) -> bool:
    """检查并更新今日目标完成状态.
    
    Returns:
        今日是否完成目标
    """
    today = _today_str()
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # 获取今日复习数
        cursor.execute(
            "SELECT cards_reviewed FROM daily_progress WHERE date = ?",
            (today,)
        )
        row = cursor.fetchone()
        today_cards = row[0] if row else 0
        
        # 更新目标完成状态
        target_completed = today_cards >= daily_target
        
        if row:
            cursor.execute("""
                UPDATE daily_progress 
                SET target_completed = ?, updated_at = ?
                WHERE date = ?
            """, (target_completed, time.time(), today))
            conn.commit()
        
        return target_completed


def get_streak_info(db_path: str, daily_target: int = 20) -> StreakInfo:
    """获取连续学习信息.
    
    Args:
        db_path: 数据库路径
        daily_target: 每日目标复习卡片数
    
    Returns:
        StreakInfo 连续学习信息
    """
    init_progress_table(db_path)
    
    today = _today_str()
    
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 获取所有有学习记录的日期，按日期降序
        cursor.execute("""
            SELECT date, cards_reviewed, target_completed
            FROM daily_progress
            WHERE cards_reviewed > 0 OR cards_created > 0 OR notes_created > 0
            ORDER BY date DESC
        """)
        
        records = cursor.fetchall()
        
        # 计算当前连续天数
        current_streak = 0
        if records:
            # 检查今天或昨天是否有记录
            today_ts = _date_to_ts(today)
            
            for i, row in enumerate(records):
                date_str = row["date"]
                date_ts = _date_to_ts(date_str)
                days_diff = int((today_ts - date_ts) / 86400)
                
                if i == 0:
                    # 第一天：必须是今天或昨天
                    if days_diff <= 1:
                        current_streak = 1
                    else:
                        break
                else:
                    # 后续：必须是连续的
                    prev_date_str = records[i-1]["date"]
                    prev_ts = _date_to_ts(prev_date_str)
                    days_gap = int((prev_ts - date_ts) / 86400)
                    if days_gap == 1:
                        current_streak += 1
                    else:
                        break
        
        # 获取今日数据
        cursor.execute("""
            SELECT cards_reviewed, target_completed
            FROM daily_progress
            WHERE date = ?
        """, (today,))
        
        today_row = cursor.fetchone()
        today_cards = today_row["cards_reviewed"] if today_row else 0
        today_completed = today_row["target_completed"] if today_row else False
        
        # 检查是否应该更新今日完成状态
        if not today_completed and today_cards >= daily_target:
            check_and_update_target(db_path, daily_target)
            today_completed = True
        
        # 获取历史最高记录
        cursor.execute(
            "SELECT value FROM streak_stats WHERE key = 'longest_streak'"
        )
        row = cursor.fetchone()
        longest_streak = row[0] if row else 0
        
        cursor.execute(
            "SELECT value FROM streak_stats WHERE key = 'total_days'"
        )
        row = cursor.fetchone()
        total_days = row[0] if row else 0
        
        # 更新最长记录（如果当前超过历史记录）
        if current_streak > longest_streak:
            longest_streak = current_streak
            cursor.execute("""
                INSERT OR REPLACE INTO streak_stats (key, value)
                VALUES ('longest_streak', ?)
            """, (longest_streak,))
            conn.commit()
        
        return StreakInfo(
            current_streak=current_streak,
            longest_streak=longest_streak,
            total_days=total_days,
            today_completed=today_completed,
            today_cards=today_cards,
            daily_target=daily_target
        )


def get_progress_history(
    db_path: str,
    days: int = 30
) -> list[DailyProgress]:
    """获取最近N天的学习历史.
    
    Args:
        db_path: 数据库路径
        days: 返回多少天的数据
    
    Returns:
        每日进度列表（倒序，今天在前）
    """
    init_progress_table(db_path)
    
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM daily_progress
            ORDER BY date DESC
            LIMIT ?
        """, (days,))
        
        return [
            DailyProgress(
                date=row["date"],
                cards_reviewed=row["cards_reviewed"],
                cards_created=row["cards_created"],
                notes_created=row["notes_created"],
                study_minutes=row["study_minutes"],
                target_completed=bool(row["target_completed"])
            )
            for row in cursor.fetchall()
        ]
