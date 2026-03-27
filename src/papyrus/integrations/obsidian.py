"""Obsidian vault import functionality."""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

from papyrus.data.notes_storage import Note, _generate_preview, _count_words


class LoggerProtocol(Protocol):
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...
    def warning(self, message: str) -> None: ...


@dataclass
class ImportResult:
    imported: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)
    imported_notes: list[Note] = field(default_factory=list)


def _parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content.
    
    Returns (frontmatter_dict, body_content)
    """
    frontmatter = {}
    body = content
    
    # Check for frontmatter between ---
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm_text = parts[1].strip()
            body = parts[2].strip()
            
            # Simple YAML parsing (key: value)
            for line in fm_text.split("\n"):
                line = line.strip()
                if ":" in line and not line.startswith("#"):
                    key, value = line.split(":", 1)
                    key = key.strip()
                    value = value.strip().strip('"\'')
                    
                    # Handle arrays (tags: [a, b, c] or tags:
                    #   - a
                    #   - b)
                    if value.startswith("[") and value.endswith("]"):
                        # Array format: [a, b, c]
                        items = value[1:-1].split(",")
                        frontmatter[key] = [item.strip().strip('"\'') for item in items]
                    elif not value:
                        # Might be multi-line array, skip for now
                        frontmatter[key] = []
                    elif key not in frontmatter:
                        frontmatter[key] = value
    
    return frontmatter, body


def _clean_wikilinks(content: str) -> str:
    """Convert Obsidian wiki-links [[Note Name]] to plain text."""
    # [[Note Name]] -> Note Name
    # [[Note Name|Display]] -> Display
    content = re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]', r'\2', content)
    content = re.sub(r'\[\[([^\]]+)\]\]', r'\1', content)
    return content


def _clean_embeds(content: str) -> str:
    """Remove or convert Obsidian embeds ![[File]]."""
    # ![[Embedded Note]] -> (see: Embedded Note)
    content = re.sub(r'!\[\[([^\]]+)\]\]', r'(see: \1)', content)
    return content


def _get_folder_from_path(file_path: Path, vault_path: Path) -> str:
    """Get folder name relative to vault root."""
    try:
        rel_path = file_path.relative_to(vault_path)
        parent = rel_path.parent
        if parent == Path("."):
            return "未分类"
        return str(parent).replace("\\", "/")
    except ValueError:
        return "未分类"


def import_obsidian_note(file_path: Path, vault_path: Path) -> Note | None:
    """Import a single Obsidian markdown file as a Note."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            raw_content = f.read()
        
        if not raw_content.strip():
            return None
        
        # Parse frontmatter
        frontmatter, body = _parse_frontmatter(raw_content)
        
        # Clean Obsidian-specific syntax
        body = _clean_wikilinks(body)
        body = _clean_embeds(body)
        
        # Get title from frontmatter, filename, or first heading
        title = frontmatter.get("title", "")
        if not title:
            # Try first heading
            match = re.search(r'^#\s+(.+)$', body, re.MULTILINE)
            if match:
                title = match.group(1).strip()
            else:
                # Use filename
                title = file_path.stem
        
        # Get folder from path
        folder = frontmatter.get("folder", "")
        if not folder:
            folder = _get_folder_from_path(file_path, vault_path)
        
        # Get tags
        tags = []
        fm_tags = frontmatter.get("tags", [])
        if isinstance(fm_tags, list):
            tags = fm_tags
        elif isinstance(fm_tags, str):
            tags = [t.strip() for t in fm_tags.split(",")]
        
        # Also extract inline tags #tag
        inline_tags = re.findall(r'#(\w+)', body)
        tags.extend(inline_tags)
        tags = list(set(tags))  # Deduplicate
        
        # Get creation time from frontmatter or file stat
        created_at = time.time()
        if "created" in frontmatter:
            try:
                # Try to parse various date formats
                date_str = frontmatter["created"]
                for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S"]:
                    try:
                        created_at = time.mktime(time.strptime(date_str, fmt))
                        break
                    except ValueError:
                        continue
            except Exception:
                pass
        else:
            # Use file modification time as fallback
            stat = file_path.stat()
            created_at = stat.st_mtime
        
        # Generate unique id based on file path and modification time
        file_stat = file_path.stat()
        note_id = f"ob_{file_stat.st_mtime_ns}"
        
        return Note(
            id=note_id,
            title=title,
            folder=folder,
            content=body,
            preview=_generate_preview(body),
            tags=tags,
            created_at=created_at,
            updated_at=file_stat.st_mtime,
            word_count=_count_words(body),
        )
    
    except Exception as e:
        raise RuntimeError(f"Failed to import {file_path}: {e}")


def import_obsidian_vault(
    vault_path: str,
    *,
    exclude_folders: list[str] | None = None,
    logger: LoggerProtocol | None = None,
) -> ImportResult:
    """Import all markdown files from an Obsidian vault.
    
    Args:
        vault_path: Path to Obsidian vault folder
        exclude_folders: Folder names to exclude (e.g., ['.obsidian', '附件'])
        logger: Optional logger
    
    Returns:
        ImportResult with counts and any errors
    """
    result = ImportResult()
    vault = Path(vault_path)
    
    if not vault.exists():
        result.errors.append(f"Vault path does not exist: {vault_path}")
        return result
    
    if not vault.is_dir():
        result.errors.append(f"Vault path is not a directory: {vault_path}")
        return result
    
    exclude = set(exclude_folders or [".obsidian", ".git", "node_modules"])
    
    # Find all markdown files
    md_files: list[Path] = []
    for md_file in vault.rglob("*.md"):
        # Check if file is in excluded folder
        rel_parts = md_file.relative_to(vault).parts
        if any(part in exclude for part in rel_parts):
            continue
        md_files.append(md_file)
    
    if logger:
        logger.info(f"Found {len(md_files)} markdown files in vault")
    
    # Import each file
    for md_file in md_files:
        try:
            note = import_obsidian_note(md_file, vault)
            if note:
                result.imported_notes.append(note)
                result.imported += 1
            else:
                result.skipped += 1
        except Exception as e:
            result.errors.append(str(e))
            result.skipped += 1
    
    if logger:
        logger.info(f"Import complete: {result.imported} imported, {result.skipped} skipped")
    
    return result


def sync_obsidian_vault(
    data_file: str,
    vault_path: str,
    existing_notes: list[Note],
    *,
    exclude_folders: list[str] | None = None,
    logger: LoggerProtocol | None = None,
) -> ImportResult:
    """Sync Obsidian vault with existing notes.
    
    - New files: Add to notes
    - Modified files: Update existing notes (matching by file path hash)
    - Deleted files: Keep in Papyrus (manual delete only)
    """
    from papyrus.data.notes_storage import save_notes
    
    result = import_obsidian_vault(
        vault_path,
        exclude_folders=exclude_folders,
        logger=logger,
    )
    
    if not result.imported_notes:
        return result
    
    # Build lookup by id
    existing_by_id = {n.id: n for n in existing_notes}
    
    # Merge imported notes
    new_notes: list[Note] = []
    updated_count = 0
    
    for imported in result.imported_notes:
        if imported.id in existing_by_id:
            # Update existing note
            existing = existing_by_id[imported.id]
            existing.title = imported.title
            existing.folder = imported.folder
            existing.content = imported.content
            existing.preview = imported.preview
            existing.tags = imported.tags
            existing.updated_at = imported.updated_at
            existing.word_count = imported.word_count
            updated_count += 1
        else:
            # New note
            new_notes.append(imported)
    
    # Combine: existing (including updated) + new notes
    all_notes = list(existing_by_id.values()) + new_notes
    
    # Sort by updated_at desc
    all_notes.sort(key=lambda n: n.updated_at, reverse=True)
    
    # Save
    save_notes(data_file, all_notes)
    
    if logger:
        logger.info(f"Sync complete: {len(new_notes)} new, {updated_count} updated")
    
    return result
