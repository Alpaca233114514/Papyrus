"""Papyrus data subpackage.

This subpackage provides data persistence for Papyrus using SQLite3 database.
"""

from papyrus.data.database import (
    close_connection,
    get_db_path,
    init_database,
    migrate_from_json,
)
from papyrus.paths import DATABASE_FILE
from papyrus.data.notes_storage import (
    Note,
    NoteRecord,
    create_note,
    delete_note,
    get_note,
    load_notes,
    save_notes,
    update_note,
)
from papyrus.data.relations import (
    NoteRelation,
    RelationType,
    create_relation,
    delete_relation,
    get_note_relations,
    get_relation_graph,
    init_relations_table,
    update_relation,
)
from papyrus.data.storage import (
    CardRecord,
    create_backup,
    load_cards,
    restore_backup,
    save_cards,
)

__all__ = [
    # Card operations
    "CardRecord",
    "load_cards",
    "save_cards",
    "create_backup",
    "restore_backup",
    # Note operations
    "Note",
    "NoteRecord",
    "load_notes",
    "save_notes",
    "create_note",
    "update_note",
    "delete_note",
    "get_note",
    # Relations
    "NoteRelation",
    "RelationType",
    "create_relation",
    "delete_relation",
    "get_note_relations",
    "get_relation_graph",
    "init_relations_table",
    "update_relation",
    # Database utilities
    "init_database",
    "close_connection",
    "get_db_path",
    "migrate_from_json",
    "DATABASE_FILE",
]
