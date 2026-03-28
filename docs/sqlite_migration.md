# SQLite3 数据库迁移说明

## 概述

Papyrus 现已从 JSON 文件存储迁移到 SQLite3 数据库存储。此更改提高了数据完整性和查询性能，同时保持了向后兼容性。

## 主要更改

### 1. 数据库文件位置
- **数据库文件**: `data/papyrus.db`
- **旧数据文件**: `data/Papyrusdata.json` (自动迁移后会重命名为 `.migrated`)
- **旧笔记文件**: `data/notes_data.json` (自动迁移后会重命名为 `.migrated`)

### 2. 向后兼容性
- 所有现有的 API (`load_cards`, `save_cards`, `load_notes`, `save_notes` 等) 保持不变
- 首次启动时自动从 JSON 文件迁移数据
- 无需手动干预

### 3. 数据库 Schema

#### Cards 表
```sql
CREATE TABLE cards (
    id TEXT PRIMARY KEY,
    q TEXT NOT NULL,
    a TEXT NOT NULL,
    next_review REAL DEFAULT 0.0,
    interval REAL DEFAULT 0.0,
    ef REAL DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]'
);
```

#### Notes 表
```sql
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    folder TEXT NOT NULL DEFAULT '默认',
    content TEXT NOT NULL DEFAULT '',
    preview TEXT NOT NULL DEFAULT '',
    tags TEXT DEFAULT '[]',
    created_at REAL DEFAULT 0.0,
    updated_at REAL DEFAULT 0.0,
    word_count INTEGER DEFAULT 0
);
```

## 技术细节

### 新增模块
- `src/papyrus/data/database.py` - 核心数据库操作模块

### 修改的模块
- `src/papyrus/data/storage.py` - 现在使用数据库
- `src/papyrus/data/notes_storage.py` - 现在使用数据库
- `src/papyrus/data/__init__.py` - 导出新的数据库功能
- `src/papyrus/paths.py` - 添加 `DATABASE_FILE` 常量

### 线程安全
- 使用线程本地存储 (thread-local storage) 管理数据库连接
- 支持多线程并发访问

## 备份和恢复

### 自动备份
- 每小时自动备份一次（与之前相同）
- 备份文件: `backup/papyrus.db.bak`

### 手动备份
```python
from papyrus.data import create_backup

create_backup(DATA_FILE, BACKUP_FILE)
```

### 恢复备份
```python
from papyrus.data import restore_backup

restore_backup(BACKUP_FILE, DATA_FILE)
```

## 数据迁移

### 自动迁移
首次启动应用时，系统会自动：
1. 检测现有的 JSON 数据文件
2. 将数据导入 SQLite 数据库
3. 重命名原始 JSON 文件（添加 `.migrated` 后缀）

### 手动迁移
```python
from papyrus.data.database import migrate_from_json
from papyrus.paths import DATA_FILE, NOTES_FILE, DATABASE_FILE

migrate_from_json(
    DATABASE_FILE,
    cards_file=DATA_FILE,
    notes_file=NOTES_FILE,
    logger=logger
)
```

## 性能提升

- **查询速度**: 对于大型数据集，查询速度显著提升
- **索引**: 已为常用查询字段创建索引 (`next_review`, `folder`, `updated_at`)
- **数据完整性**: 使用事务确保数据一致性

## 故障排除

### 数据库被锁定
如果遇到数据库锁定错误，请确保：
1. 只有一个应用实例在运行
2. 关闭所有数据库连接后重试

### 迁移失败
如果自动迁移失败：
1. 检查原始 JSON 文件是否损坏
2. 手动运行迁移脚本
3. 查看日志了解详细错误信息
