import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { paths } from '../utils/paths.js';
import { encryptApiKey, decryptApiKey } from '../core/crypto.js';
import type { CardRecord, Note, Provider, FileRecord } from '../core/types.js';
import type { PapyrusLogger } from '../utils/logger.js';

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db === null) {
    const dbPath = paths.dbFile;
    try {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      db = new DatabaseSync(dbPath);
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA foreign_keys = ON;');
      db.exec('PRAGMA busy_timeout = 5000;');
      initSchema(db);
    } catch (err) {
      const message = `Failed to open database at "${dbPath}": ${err instanceof Error ? err.message : String(err)}`;
      console.error(message);
      throw new Error(message);
    }
  }
  return db;
}

function closeDb(): void {
  if (db !== null) {
    db.close();
    db = null;
  }
}

function resetDb(): void {
  closeDb();
}

function isValidSnapshotPath(snapshotPath: string): boolean {
  if (!snapshotPath || typeof snapshotPath !== 'string') return false;
  if (snapshotPath.includes('\x00') || snapshotPath.includes("'") || snapshotPath.includes('..')) return false;
  if (!path.isAbsolute(snapshotPath)) return false;
  return true;
}

/** 使用 VACUUM INTO 创建数据库快照（包含 schema + seed 数据的干净副本，无 WAL） */
export function createDbSnapshot(snapshotPath: string): void {
  if (!isValidSnapshotPath(snapshotPath)) {
    throw new Error('Invalid snapshot path: must be absolute, and cannot contain \x00, quotes, or .. sequences');
  }
  const database = getDb();
  database.exec(`VACUUM INTO '${snapshotPath}'`);
}

/** 关闭数据库，从快照恢复，删除 WAL/SHM，重新打开 */
export function restoreDbSnapshot(snapshotPath: string): void {
  const dbPath = paths.dbFile;
  closeDb();
  fs.copyFileSync(snapshotPath, dbPath);
  try { fs.unlinkSync(dbPath + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(dbPath + '-shm'); } catch { /* ignore */ }
  getDb();
}

function initSchema(database: DatabaseSync): void {
  const tableCheck = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='cards'"
  );
  const isNewDb = tableCheck.get() === undefined;

  database.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      q TEXT NOT NULL,
      a TEXT NOT NULL,
      next_review REAL DEFAULT 0.0,
      interval REAL DEFAULT 0.0,
      ef REAL DEFAULT 2.5,
      repetitions INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      folder TEXT NOT NULL DEFAULT '默认',
      content TEXT NOT NULL DEFAULT '',
      preview TEXT NOT NULL DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at REAL DEFAULT 0.0,
      updated_at REAL DEFAULT 0.0,
      word_count INTEGER DEFAULT 0,
      hash TEXT DEFAULT '',
      headings TEXT DEFAULT '[]',
      outgoing_links TEXT DEFAULT '[]',
      incoming_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL DEFAULT '',
      enabled INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at REAL DEFAULT 0.0,
      updated_at REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'default',
      encrypted_key TEXT NOT NULL DEFAULT '',
      created_at REAL DEFAULT 0.0,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS provider_models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      name TEXT NOT NULL,
      model_id TEXT NOT NULL,
      port TEXT NOT NULL,
      capabilities TEXT DEFAULT '[]',
      api_key_id TEXT,
      enabled INTEGER DEFAULT 1,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS note_versions (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      folder TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      preview TEXT NOT NULL DEFAULT '',
      tags TEXT DEFAULT '[]',
      word_count INTEGER DEFAULT 0,
      hash TEXT DEFAULT '',
      headings TEXT DEFAULT '[]',
      outgoing_links TEXT DEFAULT '[]',
      incoming_count INTEGER DEFAULT 0,
      created_at REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS card_versions (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      q TEXT NOT NULL,
      a TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      content_hash TEXT DEFAULT '',
      created_at REAL DEFAULT 0.0
    );

    CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review);
    CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_hash ON notes(hash);
    CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider_id);
    CREATE INDEX IF NOT EXISTS idx_models_provider ON provider_models(provider_id);
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'unknown',
      size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT '',
      parent_id TEXT,
      file_storage_path TEXT,
      is_folder INTEGER DEFAULT 0,
      created_at REAL DEFAULT 0.0,
      updated_at REAL DEFAULT 0.0
    );

    CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_id);
    CREATE INDEX IF NOT EXISTS idx_files_updated ON files(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(note_id, version DESC);
    CREATE INDEX IF NOT EXISTS idx_card_versions_card ON card_versions(card_id, version DESC);

    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      relation_type TEXT NOT NULL DEFAULT 'reference',
      description TEXT DEFAULT '',
      created_at REAL DEFAULT 0.0,
      updated_at REAL DEFAULT 0.0,
      UNIQUE(source_id, target_id)
    );

    CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
    CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      model TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 0,
      message_count INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at REAL NOT NULL DEFAULT 0.0,
      updated_at REAL NOT NULL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
      content TEXT NOT NULL DEFAULT '',
      blocks TEXT NOT NULL DEFAULT '[]',
      attachments TEXT NOT NULL DEFAULT '[]',
      model TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT '',
      token_usage TEXT NOT NULL DEFAULT '{}',
      parent_message_id TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at REAL NOT NULL DEFAULT 0.0
    );

    CREATE INDEX IF NOT EXISTS idx_chat_msgs_session ON chat_messages(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_msgs_parent ON chat_messages(parent_message_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(is_active);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);
  `);

  const providerCount = (database.prepare('SELECT COUNT(*) as c FROM providers').get() as { c: number }).c;
  if (providerCount === 0) {
    seedDefaults(database);
  }

  seedDefaults(database);

  deduplicateData(database);

  try {
    database.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_unique ON providers(type, name, base_url);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_models_unique ON provider_models(provider_id, model_id);
    `);
  } catch (err) {
    console.error('创建唯一索引失败:', err instanceof Error ? err.message : String(err));
  }
}

function deduplicateData(database: DatabaseSync): void {
  try {
    database.exec('BEGIN TRANSACTION;');

    // Step 1: Deduplicate providers by (type, name, base_url)
    // Keep the one that is default, or has the earliest created_at, or minimum id
    const providerDups = database.prepare(`
      SELECT type, name, base_url,
        COALESCE(
          MIN(CASE WHEN is_default = 1 THEN id END),
          MIN(CASE WHEN created_at > 0 THEN id END),
          MIN(id)
        ) as keeper_id,
        COUNT(*) as cnt
      FROM providers
      GROUP BY type, name, base_url
      HAVING cnt > 1
    `).all() as Array<{ type: string; name: string; base_url: string; keeper_id: string }>;

    for (const dup of providerDups) {
      const dupIds = database.prepare(
        'SELECT id FROM providers WHERE type = ? AND name = ? AND base_url = ? AND id != ?'
      ).all(dup.type, dup.name, dup.base_url, dup.keeper_id) as Array<{ id: string }>;

      for (const { id } of dupIds) {
        database.prepare('UPDATE api_keys SET provider_id = ? WHERE provider_id = ?').run(dup.keeper_id, id);
        database.prepare('UPDATE provider_models SET provider_id = ? WHERE provider_id = ?').run(dup.keeper_id, id);
        database.prepare('DELETE FROM providers WHERE id = ?').run(id);
      }
    }

    if (providerDups.length > 0) {
      console.info(`数据去重: 清理 ${providerDups.length} 组重复供应商`);
    }

    // Step 2: Deduplicate models by (provider_id, model_id)
    // Keep enabled one if possible, otherwise minimum id
    const modelDups = database.prepare(`
      SELECT provider_id, model_id,
        COALESCE(MIN(CASE WHEN enabled = 1 THEN id END), MIN(id)) as keeper_id,
        COUNT(*) as cnt
      FROM provider_models
      GROUP BY provider_id, model_id
      HAVING cnt > 1
    `).all() as Array<{ provider_id: string; model_id: string; keeper_id: string }>;

    for (const dup of modelDups) {
      database.prepare(
        'DELETE FROM provider_models WHERE provider_id = ? AND model_id = ? AND id != ?'
      ).run(dup.provider_id, dup.model_id, dup.keeper_id);
    }

    if (modelDups.length > 0) {
      console.info(`数据去重: 清理 ${modelDups.length} 组重复模型`);
    }

    database.exec('COMMIT;');
  } catch (err) {
    database.exec('ROLLBACK;');
    console.error('数据去重失败:', err instanceof Error ? err.message : String(err));
  }
}

function seedDefaults(database: DatabaseSync): void {
  const now = Date.now();
  const pid = 'p-liyuan-deepseek';

  const existing = database.prepare('SELECT id FROM providers WHERE type = ?').get('liyuan-deepseek') as { id: string } | undefined;
  if (!existing) {
    database.prepare(
      `INSERT INTO providers (id, type, name, base_url, enabled, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(pid, 'liyuan-deepseek', 'LiYuan For DeepSeek', 'https://papyrus.liyuanstudio.com/v1', 1, 1, now, now);
  }

  const modelIds = ['deepseek-v4-flash', 'deepseek-v4-pro'];
  const modelNames = ['DeepSeek V4 Flash', 'DeepSeek V4 Pro'];
  for (let i = 0; i < modelIds.length; i++) {
    const modelId = modelIds[i];
    const modelName = modelNames[i];
    if (!modelId || !modelName) continue;
    const modelExists = database.prepare('SELECT id FROM provider_models WHERE provider_id = ? AND model_id = ?').get(pid, modelId) as { id: string } | undefined;
    if (!modelExists) {
      database.prepare(
        `INSERT INTO provider_models (id, provider_id, name, model_id, port, enabled)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(`${pid}-${modelId}`, pid, modelName, modelId, 'openai-compat', 1);
    }
  }
}

function tagsToJson(tags: string[] | undefined): string {
  return JSON.stringify(tags ?? []);
}

function tagsFromJson(tagsJson: string | undefined): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // ignore
  }
  return [];
}

function jsonFromStr(jsonStr: string | undefined): unknown[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

// ==================== Cards ====================

export function loadAllCards(logger?: PapyrusLogger): CardRecord[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM cards');
  const rows = stmt.all() as Array<{
    id: string;
    q: string;
    a: string;
    next_review: number;
    interval: number;
    ef: number;
    repetitions: number;
    tags: string;
  }>;

  const cards = rows.map(row => ({
    id: row.id,
    q: row.q,
    a: row.a,
    next_review: row.next_review,
    interval: row.interval,
    ef: row.ef,
    repetitions: row.repetitions,
    tags: tagsFromJson(row.tags),
  }));

  logger?.info(`从数据库加载 ${cards.length} 张卡片`);
  return cards;
}

export function saveAllCards(cards: CardRecord[], logger?: PapyrusLogger): void {
  const database = getDb();
  database.exec('BEGIN TRANSACTION;');
  try {
    database.exec('DELETE FROM cards');
    const stmt = database.prepare(
      'INSERT INTO cards (id, q, a, next_review, interval, ef, repetitions, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const card of cards) {
      stmt.run(card.id, card.q, card.a, card.next_review, card.interval, card.ef, card.repetitions, tagsToJson(card.tags));
    }
    database.exec('COMMIT;');
    logger?.info(`保存 ${cards.length} 张卡片到数据库`);
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export function insertCard(card: CardRecord, logger?: PapyrusLogger): void {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO cards (id, q, a, next_review, interval, ef, repetitions, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(card.id, card.q, card.a, card.next_review ?? 0, card.interval ?? 0, card.ef ?? 2.5, card.repetitions ?? 0, tagsToJson(card.tags));
  logger?.info(`插入卡片: ${card.id}`);
}

export function deleteCardById(cardId: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM cards WHERE id = ?');
  const result = stmt.run(cardId);
  logger?.info(`删除卡片: ${cardId}`);
  return result.changes > 0;
}

export function deleteCardsByIds(cardIds: string[], logger?: PapyrusLogger): number {
  if (cardIds.length === 0) return 0;
  const database = getDb();
  const placeholders = cardIds.map(() => '?').join(',');
  const stmt = database.prepare(`DELETE FROM cards WHERE id IN (${placeholders})`);
  const result = stmt.run(...cardIds);
  logger?.info(`批量删除 ${result.changes} 张卡片`);
  return Number(result.changes);
}

export function getCardById(cardId: string): CardRecord | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM cards WHERE id = ?');
  const row = stmt.get(cardId) as {
    id: string;
    q: string;
    a: string;
    next_review: number;
    interval: number;
    ef: number;
    repetitions: number;
    tags: string;
  } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    q: row.q,
    a: row.a,
    next_review: row.next_review,
    interval: row.interval,
    ef: row.ef,
    repetitions: row.repetitions,
    tags: tagsFromJson(row.tags),
  };
}

export function updateCard(card: CardRecord, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE cards SET q = ?, a = ?, next_review = ?, interval = ?, ef = ?, repetitions = ?, tags = ? WHERE id = ?'
  );
  const result = stmt.run(card.q, card.a, card.next_review ?? 0, card.interval ?? 0, card.ef ?? 2.5, card.repetitions ?? 0, tagsToJson(card.tags), card.id);
  logger?.info(`更新卡片: ${card.id}`);
  return result.changes > 0;
}

export function getCardsDueBefore(timestamp: number): CardRecord[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM cards WHERE next_review <= ?');
  const rows = stmt.all(timestamp) as Array<{
    id: string;
    q: string;
    a: string;
    next_review: number;
    interval: number;
    ef: number;
    repetitions: number;
    tags: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    q: row.q,
    a: row.a,
    next_review: row.next_review,
    interval: row.interval,
    ef: row.ef,
    repetitions: row.repetitions,
    tags: tagsFromJson(row.tags),
  }));
}

export function getCardCount(): number {
  const database = getDb();
  const stmt = database.prepare('SELECT COUNT(*) as count FROM cards');
  const row = stmt.get() as { count: number };
  return row.count;
}

// ==================== Notes ====================

function noteFromRow(row: {
  id: string;
  title: string;
  folder: string;
  content: string;
  preview: string;
  tags: string;
  created_at: number;
  updated_at: number;
  word_count: number;
  hash: string;
  headings: string;
  outgoing_links: string;
  incoming_count: number;
}): Note {
  return {
    id: row.id,
    title: row.title,
    folder: row.folder,
    content: row.content,
    preview: row.preview,
    tags: tagsFromJson(row.tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
    word_count: row.word_count,
    hash: row.hash,
    headings: jsonFromStr(row.headings) as Array<{ level: number; text: string }>,
    outgoing_links: jsonFromStr(row.outgoing_links) as string[],
    incoming_count: row.incoming_count,
  };
}

export function loadAllNotes(logger?: PapyrusLogger): Note[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM notes ORDER BY updated_at DESC');
  const rows = stmt.all() as Array<{
    id: string;
    title: string;
    folder: string;
    content: string;
    preview: string;
    tags: string;
    created_at: number;
    updated_at: number;
    word_count: number;
    hash: string;
    headings: string;
    outgoing_links: string;
    incoming_count: number;
  }>;

  const notes = rows.map(noteFromRow);
  logger?.info(`从数据库加载 ${notes.length} 条笔记`);
  return notes;
}

export function saveAllNotes(notes: Note[], logger?: PapyrusLogger): void {
  const database = getDb();
  database.exec('BEGIN TRANSACTION;');
  try {
    database.exec('DELETE FROM notes');
    const stmt = database.prepare(
      'INSERT INTO notes (id, title, folder, content, preview, tags, created_at, updated_at, word_count, hash, headings, outgoing_links, incoming_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const note of notes) {
      stmt.run(
        note.id, note.title, note.folder, note.content, note.preview,
        tagsToJson(note.tags), note.created_at, note.updated_at, note.word_count,
        note.hash, JSON.stringify(note.headings), JSON.stringify(note.outgoing_links), note.incoming_count
      );
    }
    database.exec('COMMIT;');
    logger?.info(`保存 ${notes.length} 条笔记到数据库`);
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export function insertNote(note: Note, logger?: PapyrusLogger): void {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO notes (id, title, folder, content, preview, tags, created_at, updated_at, word_count, hash, headings, outgoing_links, incoming_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    note.id, note.title, note.folder, note.content, note.preview,
    tagsToJson(note.tags), note.created_at, note.updated_at, note.word_count,
    note.hash, JSON.stringify(note.headings), JSON.stringify(note.outgoing_links), note.incoming_count
  );
  logger?.info(`插入笔记: ${note.id}`);
}

export function deleteNoteById(noteId: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  try {
    database.exec('BEGIN TRANSACTION;');
    // 更新被该笔记引用的笔记的 incoming_count
    const updateStmt = database.prepare(
      'UPDATE notes SET incoming_count = incoming_count - 1 WHERE id IN (SELECT target_id FROM relations WHERE source_id = ?)'
    );
    updateStmt.run(noteId);
    // 删除笔记（relations 会 CASCADE）
    const deleteStmt = database.prepare('DELETE FROM notes WHERE id = ?');
    const result = deleteStmt.run(noteId);
    database.exec('COMMIT;');
    logger?.info(`删除笔记: ${noteId}`);
    return result.changes > 0;
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export function deleteNotesByIds(noteIds: string[], logger?: PapyrusLogger): number {
  if (noteIds.length === 0) return 0;
  const database = getDb();
  const placeholders = noteIds.map(() => '?').join(',');
  const stmt = database.prepare(`DELETE FROM notes WHERE id IN (${placeholders})`);
  const result = stmt.run(...noteIds);
  logger?.info(`批量删除 ${result.changes} 条笔记`);
  return Number(result.changes);
}

export function getNoteById(noteId: string): Note | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM notes WHERE id = ?');
  const row = stmt.get(noteId) as {
    id: string;
    title: string;
    folder: string;
    content: string;
    preview: string;
    tags: string;
    created_at: number;
    updated_at: number;
    word_count: number;
    hash: string;
    headings: string;
    outgoing_links: string;
    incoming_count: number;
  } | undefined;

  if (!row) return null;
  return noteFromRow(row);
}

export function updateNote(note: Note, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE notes SET title = ?, folder = ?, content = ?, preview = ?, tags = ?, updated_at = ?, word_count = ?, hash = ?, headings = ?, outgoing_links = ?, incoming_count = ? WHERE id = ?'
  );
  const result = stmt.run(
    note.title, note.folder, note.content, note.preview, tagsToJson(note.tags),
    note.updated_at, note.word_count, note.hash, JSON.stringify(note.headings),
    JSON.stringify(note.outgoing_links), note.incoming_count, note.id
  );
  logger?.info(`更新笔记: ${note.id}`);
  return result.changes > 0;
}

export function getNotesByFolder(folder: string): Note[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM notes WHERE folder = ? ORDER BY updated_at DESC');
  const rows = stmt.all(folder) as Array<{
    id: string;
    title: string;
    folder: string;
    content: string;
    preview: string;
    tags: string;
    created_at: number;
    updated_at: number;
    word_count: number;
    hash: string;
    headings: string;
    outgoing_links: string;
    incoming_count: number;
  }>;
  return rows.map(noteFromRow);
}

export function getNoteCount(): number {
  const database = getDb();
  const stmt = database.prepare('SELECT COUNT(*) as count FROM notes');
  const row = stmt.get() as { count: number };
  return row.count;
}

export function getAllFolders(): string[] {
  const database = getDb();
  const stmt = database.prepare('SELECT DISTINCT folder FROM notes ORDER BY folder');
  const rows = stmt.all() as Array<{ folder: string }>;
  return rows.map(r => r.folder);
}

// ==================== Providers ====================

export function loadAllProviders(logger?: PapyrusLogger): Provider[] {
  const database = getDb();
  const providerStmt = database.prepare('SELECT * FROM providers ORDER BY created_at');
  const providerRows = providerStmt.all() as Array<{
    id: string;
    type: string;
    name: string;
    base_url: string;
    enabled: number;
    is_default: number;
  }>;

  const keyStmt = database.prepare('SELECT * FROM api_keys WHERE provider_id = ? ORDER BY name');
  const modelStmt = database.prepare('SELECT * FROM provider_models WHERE provider_id = ? ORDER BY name');

  const providers: Provider[] = [];
  for (const row of providerRows) {
    const keyRows = keyStmt.all(row.id) as Array<{ id: string; name: string; encrypted_key: string }>;
    const apiKeys = keyRows.map(k => ({
      id: k.id,
      name: k.name,
      key: decryptApiKey(k.encrypted_key),
    }));

    const modelRows = modelStmt.all(row.id) as Array<{
      id: string;
      name: string;
      model_id: string;
      port: string;
      capabilities: string;
      api_key_id: string;
      enabled: number;
    }>;
    const models = modelRows.map(m => ({
      id: m.id,
      name: m.name,
      modelId: m.model_id,
      port: m.port,
      capabilities: jsonFromStr(m.capabilities) as string[],
      apiKeyId: m.api_key_id ?? null,
      enabled: Boolean(m.enabled),
    }));

    providers.push({
      id: row.id,
      type: row.type,
      name: row.name,
      baseUrl: row.base_url,
      enabled: Boolean(row.enabled),
      isDefault: Boolean(row.is_default),
      apiKeys,
      models,
    });
  }

  // 防御性去重：即使数据库出现重复，输出层也不渲染重复项
  const seenProviders = new Set<string>();
  const dedupedProviders: Provider[] = [];
  for (const p of providers) {
    const key = `${p.type}|${p.name}|${p.baseUrl}`;
    if (seenProviders.has(key)) continue;
    seenProviders.add(key);

    const seenModels = new Set<string>();
    const dedupedModels = p.models.filter(m => {
      if (seenModels.has(m.modelId)) return false;
      seenModels.add(m.modelId);
      return true;
    });

    dedupedProviders.push({ ...p, models: dedupedModels });
  }

  return dedupedProviders;
}

function inferProviderType(baseUrl: string | undefined, fallbackType: string | undefined): string {
  if (fallbackType && fallbackType !== 'custom') return fallbackType;
  const url = (baseUrl ?? '').toLowerCase();
  if (url.includes('deepseek.com')) return 'deepseek';
  if (url.includes('liyuanstudio')) return 'liyuan-deepseek';
  if (url.includes('openai.com')) return 'openai';
  if (url.includes('anthropic.com')) return 'anthropic';
  if (url.includes('google') || url.includes('gemini')) return 'gemini';
  if (url.includes('moonshot')) return 'moonshot';
  if (url.includes('siliconflow')) return 'siliconflow';
  if (url.includes('localhost:11434') || url.includes('ollama')) return 'ollama';
  return fallbackType ?? 'custom';
}

export function saveProvider(provider: Partial<Provider> & { id?: string }, logger?: PapyrusLogger): string {
  const database = getDb();
  const providerType = inferProviderType(provider.baseUrl, provider.type);

  let providerId: string;
  if (provider.id) {
    providerId = provider.id;
  } else {
    const existing = database.prepare(
      'SELECT id FROM providers WHERE type = ? AND name = ? AND base_url = ?'
    ).get(providerType, provider.name ?? '', provider.baseUrl ?? '') as { id: string } | undefined;
    providerId = existing?.id ?? randomUUID();
  }

  const now = Date.now() / 1000;

  const existing = database.prepare('SELECT id FROM providers WHERE id = ?').get(providerId) as { id: string } | undefined;
  if (existing) {
    database.prepare(
      'UPDATE providers SET type = ?, name = ?, base_url = ?, enabled = ?, is_default = ?, updated_at = ? WHERE id = ?'
    ).run(
      providerType,
      provider.name ?? '',
      provider.baseUrl ?? '',
      provider.enabled ? 1 : 0,
      provider.isDefault ? 1 : 0,
      now,
      providerId
    );
  } else {
    database.prepare(
      'INSERT INTO providers (id, type, name, base_url, enabled, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      providerId,
      providerType,
      provider.name ?? '',
      provider.baseUrl ?? '',
      provider.enabled ? 1 : 0,
      provider.isDefault ? 1 : 0,
      now,
      now
    );
  }
  logger?.info(`Provider saved: ${provider.name}`);
  return providerId;
}

export function deleteProvider(providerId: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM providers WHERE id = ?');
  const result = stmt.run(providerId);
  logger?.info(`Provider deleted: ${providerId}`);
  return result.changes > 0;
}

export function setDefaultProvider(providerId: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  database.exec('UPDATE providers SET is_default = 0');
  const stmt = database.prepare('UPDATE providers SET is_default = 1 WHERE id = ?');
  const result = stmt.run(providerId);
  logger?.info(`Default provider set: ${providerId}`);
  return result.changes > 0;
}

export function updateProviderEnabled(providerId: string, enabled: boolean, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare('UPDATE providers SET enabled = ? WHERE id = ?');
  const result = stmt.run(enabled ? 1 : 0, providerId);
  logger?.info(`Provider enabled updated: ${providerId} = ${enabled}`);
  return result.changes > 0;
}

// ==================== API Keys ====================

export function saveApiKey(providerId: string, apiKey: { id?: string; name?: string; key: string }, logger?: PapyrusLogger): string {
  const database = getDb();
  const keyId = apiKey.id ?? randomUUID();
  const now = Date.now() / 1000;

  const existing = database.prepare('SELECT id FROM api_keys WHERE id = ?').get(keyId) as { id: string } | undefined;
  if (existing) {
    database.prepare(
      'UPDATE api_keys SET provider_id = ?, name = ?, encrypted_key = ?, created_at = COALESCE(created_at, ?) WHERE id = ?'
    ).run(providerId, apiKey.name ?? 'default', encryptApiKey(apiKey.key), now, keyId);
  } else {
    database.prepare(
      'INSERT INTO api_keys (id, provider_id, name, encrypted_key, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(keyId, providerId, apiKey.name ?? 'default', encryptApiKey(apiKey.key), now);
  }
  logger?.info(`API key saved: ${keyId}`);
  return keyId;
}

export function deleteApiKey(keyId: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM api_keys WHERE id = ?');
  const result = stmt.run(keyId);
  logger?.info(`API key deleted: ${keyId}`);
  return result.changes > 0;
}

// ==================== Models ====================

export function saveModel(providerId: string, model: { id?: string; name?: string; modelId?: string; port?: string; capabilities?: string[]; apiKeyId?: string | null; enabled?: boolean }, logger?: PapyrusLogger): string {
  const database = getDb();

  const existingByProviderModel = database.prepare(
    'SELECT id FROM provider_models WHERE provider_id = ? AND model_id = ?'
  ).get(providerId, model.modelId ?? '') as { id: string } | undefined;

  let modelId: string;
  if (existingByProviderModel) {
    modelId = existingByProviderModel.id;
  } else if (model.id) {
    modelId = model.id;
  } else {
    modelId = randomUUID();
  }

  const existingById = database.prepare('SELECT id FROM provider_models WHERE id = ?').get(modelId) as { id: string } | undefined;
  if (existingById) {
    database.prepare(
      'UPDATE provider_models SET provider_id = ?, name = ?, model_id = ?, port = ?, capabilities = ?, api_key_id = ?, enabled = ? WHERE id = ?'
    ).run(
      providerId,
      model.name ?? '',
      model.modelId ?? '',
      model.port ?? 'openai',
      JSON.stringify(model.capabilities ?? []),
      model.apiKeyId ?? null,
      model.enabled ? 1 : 0,
      modelId
    );
  } else {
    database.prepare(
      'INSERT INTO provider_models (id, provider_id, name, model_id, port, capabilities, api_key_id, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      modelId,
      providerId,
      model.name ?? '',
      model.modelId ?? '',
      model.port ?? 'openai',
      JSON.stringify(model.capabilities ?? []),
      model.apiKeyId ?? null,
      model.enabled ? 1 : 0
    );
  }
  logger?.info(`Model saved: ${modelId}`);
  return modelId;
}

export function deleteModel(modelId: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM provider_models WHERE id = ?');
  const result = stmt.run(modelId);
  logger?.info(`Model deleted: ${modelId}`);
  return result.changes > 0;
}

// ==================== Note Versions ====================

export function saveNoteVersion(note: Note, logger?: PapyrusLogger): string {
  const database = getDb();
  const versionStmt = database.prepare(
    'SELECT COALESCE(MAX(version), 0) as max_version FROM note_versions WHERE note_id = ?'
  );
  const versionRow = versionStmt.get(note.id) as { max_version: number } | undefined;
  const version = (versionRow?.max_version ?? 0) + 1;
  const versionId = `${note.id}_v${version}`;
  const now = Date.now() / 1000;

  const stmt = database.prepare(
    `INSERT INTO note_versions (id, note_id, version, title, folder, content, preview, tags, word_count, hash, headings, outgoing_links, incoming_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    versionId, note.id, version, note.title, note.folder, note.content, note.preview,
    tagsToJson(note.tags), note.word_count, note.hash, JSON.stringify(note.headings),
    JSON.stringify(note.outgoing_links), note.incoming_count, now
  );
  logger?.info(`保存笔记版本: ${note.id} v${version}`);
  return versionId;
}

export function getNoteVersions(noteId: string): Array<Note & { version: number; version_id: string; version_created_at: number }> {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT * FROM note_versions WHERE note_id = ? ORDER BY version DESC'
  );
  const rows = stmt.all(noteId) as Array<{
    id: string;
    note_id: string;
    version: number;
    title: string;
    folder: string;
    content: string;
    preview: string;
    tags: string;
    word_count: number;
    hash: string;
    headings: string;
    outgoing_links: string;
    incoming_count: number;
    created_at: number;
  }>;

  return rows.map(row => ({
    id: row.note_id,
    title: row.title,
    folder: row.folder,
    content: row.content,
    preview: row.preview,
    tags: tagsFromJson(row.tags),
    created_at: 0,
    updated_at: 0,
    word_count: row.word_count,
    hash: row.hash,
    headings: jsonFromStr(row.headings) as Array<{ level: number; text: string }>,
    outgoing_links: jsonFromStr(row.outgoing_links) as string[],
    incoming_count: row.incoming_count,
    version: row.version,
    version_id: row.id,
    version_created_at: row.created_at,
  }));
}

export function getNoteVersionById(versionId: string): (Note & { version: number; version_id: string; version_created_at: number }) | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM note_versions WHERE id = ?');
  const row = stmt.get(versionId) as {
    id: string;
    note_id: string;
    version: number;
    title: string;
    folder: string;
    content: string;
    preview: string;
    tags: string;
    word_count: number;
    hash: string;
    headings: string;
    outgoing_links: string;
    incoming_count: number;
    created_at: number;
  } | undefined;

  if (!row) return null;
  return {
    id: row.note_id,
    title: row.title,
    folder: row.folder,
    content: row.content,
    preview: row.preview,
    tags: tagsFromJson(row.tags),
    created_at: 0,
    updated_at: 0,
    word_count: row.word_count,
    hash: row.hash,
    headings: jsonFromStr(row.headings) as Array<{ level: number; text: string }>,
    outgoing_links: jsonFromStr(row.outgoing_links) as string[],
    incoming_count: row.incoming_count,
    version: row.version,
    version_id: row.id,
    version_created_at: row.created_at,
  };
}

export function getLatestNoteVersionHash(noteId: string): string | null {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT hash FROM note_versions WHERE note_id = ? ORDER BY version DESC LIMIT 1'
  );
  const row = stmt.get(noteId) as { hash: string } | undefined;
  return row?.hash ?? null;
}

// ==================== Card Versions ====================

export function saveCardVersion(card: CardRecord, contentHash: string, logger?: PapyrusLogger): string {
  const database = getDb();
  const versionStmt = database.prepare(
    'SELECT COALESCE(MAX(version), 0) as max_version FROM card_versions WHERE card_id = ?'
  );
  const versionRow = versionStmt.get(card.id) as { max_version: number } | undefined;
  const version = (versionRow?.max_version ?? 0) + 1;
  const versionId = `${card.id}_v${version}`;
  const now = Date.now() / 1000;

  const stmt = database.prepare(
    `INSERT INTO card_versions (id, card_id, version, q, a, tags, content_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(versionId, card.id, version, card.q, card.a, tagsToJson(card.tags), contentHash, now);
  logger?.info(`保存卡片版本: ${card.id} v${version}`);
  return versionId;
}

export function getCardVersions(cardId: string): Array<CardRecord & { version: number; version_id: string; version_created_at: number }> {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT * FROM card_versions WHERE card_id = ? ORDER BY version DESC'
  );
  const rows = stmt.all(cardId) as Array<{
    id: string;
    card_id: string;
    version: number;
    q: string;
    a: string;
    tags: string;
    content_hash: string;
    created_at: number;
  }>;

  return rows.map(row => ({
    id: row.card_id,
    q: row.q,
    a: row.a,
    next_review: 0,
    interval: 0,
    ef: 2.5,
    repetitions: 0,
    tags: tagsFromJson(row.tags),
    version: row.version,
    version_id: row.id,
    version_created_at: row.created_at,
  }));
}

export function getCardVersionById(versionId: string): (CardRecord & { version: number; version_id: string; version_created_at: number }) | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM card_versions WHERE id = ?');
  const row = stmt.get(versionId) as {
    id: string;
    card_id: string;
    version: number;
    q: string;
    a: string;
    tags: string;
    content_hash: string;
    created_at: number;
  } | undefined;

  if (!row) return null;
  return {
    id: row.card_id,
    q: row.q,
    a: row.a,
    next_review: 0,
    interval: 0,
    ef: 2.5,
    repetitions: 0,
    tags: tagsFromJson(row.tags),
    version: row.version,
    version_id: row.id,
    version_created_at: row.created_at,
  };
}

export function getLatestCardVersionHash(cardId: string): string | null {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT content_hash FROM card_versions WHERE card_id = ? ORDER BY version DESC LIMIT 1'
  );
  const row = stmt.get(cardId) as { content_hash: string } | undefined;
  return row?.content_hash ?? null;
}

// ==================== Files ====================

export function loadAllFiles(logger?: PapyrusLogger): FileRecord[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM files ORDER BY is_folder DESC, name ASC');
  const rows = stmt.all() as Record<string, unknown>[];
  return rows.map(rowToFileRecord);
}

export function getFileById(fileId: string): FileRecord | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM files WHERE id = ?');
  const row = stmt.get(fileId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToFileRecord(row);
}

function rowToFileRecord(row: Record<string, unknown>): FileRecord {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    type: String(row.type ?? 'unknown'),
    size: Number(row.size ?? 0),
    mime_type: String(row.mime_type ?? ''),
    parent_id: row.parent_id != null && row.parent_id !== '' ? String(row.parent_id) : null,
    file_storage_path: row.file_storage_path != null ? String(row.file_storage_path) : null,
    is_folder: Number(row.is_folder ?? 0),
    created_at: Number(row.created_at ?? 0),
    updated_at: Number(row.updated_at ?? 0),
  };
}

export function getFilesByParentId(parentId: string | null): FileRecord[] {
  const database = getDb();
  if (parentId === null) {
    const stmt = database.prepare('SELECT * FROM files WHERE parent_id IS NULL ORDER BY is_folder DESC, name ASC');
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(rowToFileRecord);
  }
  const stmt = database.prepare('SELECT * FROM files WHERE parent_id = ? ORDER BY is_folder DESC, name ASC');
  const rows = stmt.all(parentId) as Record<string, unknown>[];
  return rows.map(rowToFileRecord);
}

export function insertFile(file: FileRecord, logger?: PapyrusLogger): void {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO files (id, name, type, size, mime_type, parent_id, file_storage_path, is_folder, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(file.id, file.name, file.type, file.size, file.mime_type, file.parent_id, file.file_storage_path, file.is_folder, file.created_at, file.updated_at);
  logger?.info(`插入文件: ${file.id}`);
}

export function deleteFileById(fileId: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM files WHERE id = ?');
  const result = stmt.run(fileId);
  logger?.info(`删除文件: ${fileId}`);
  return result.changes > 0;
}

export function deleteFilesByIds(fileIds: string[], logger?: PapyrusLogger): number {
  if (fileIds.length === 0) return 0;
  const database = getDb();
  const placeholders = fileIds.map(() => '?').join(',');
  const stmt = database.prepare(`DELETE FROM files WHERE id IN (${placeholders})`);
  const result = stmt.run(...fileIds);
  logger?.info(`批量删除 ${result.changes} 个文件`);
  return Number(result.changes);
}

const ALLOWED_FILE_COLUMNS = new Set([
  'name', 'type', 'size', 'mime_type', 'parent_id', 'file_storage_path', 'is_folder', 'created_at', 'updated_at',
]);

export function updateFile(file: Partial<FileRecord> & { id: string }, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(file)) {
    if (key !== 'id' && value !== undefined) {
      if (!ALLOWED_FILE_COLUMNS.has(key)) {
        logger?.warning(`updateFile ignored disallowed column: ${key}`);
        continue;
      }
      sets.push(`${key} = ?`);
      values.push(value as string | number | null);
    }
  }
  if (sets.length === 0) return false;
  values.push(file.id);
  const stmt = database.prepare(`UPDATE files SET ${sets.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return Number(result.changes) > 0;
}

// ==================== Migration ====================

export function migrateFromJson(cardsFile?: string, notesFile?: string, logger?: PapyrusLogger): void {
  if (cardsFile && fs.existsSync(cardsFile)) {
    try {
      const data = fs.readFileSync(cardsFile, 'utf8');
      const cards = JSON.parse(data) as CardRecord[];
      if (Array.isArray(cards) && cards.length > 0) {
        saveAllCards(cards, logger);
        logger?.info(`已迁移 ${cards.length} 张卡片从 JSON 到数据库`);
      }
    } catch (e) {
      logger?.error(`迁移卡片失败: ${e}`);
    }
  }

  if (notesFile && fs.existsSync(notesFile)) {
    try {
      const data = fs.readFileSync(notesFile, 'utf8');
      const notes = JSON.parse(data) as Note[];
      if (Array.isArray(notes) && notes.length > 0) {
        saveAllNotes(notes, logger);
        logger?.info(`已迁移 ${notes.length} 条笔记从 JSON 到数据库`);
      }
    } catch (e) {
      logger?.error(`迁移笔记失败: ${e}`);
    }
  }
}

// ==================== Relations ====================

export interface RelationRecord {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  description: string;
  created_at: number;
  updated_at: number;
}

export function loadRelationsForNote(noteId: string): { outgoing: RelationRecord[]; incoming: RelationRecord[] } {
  const database = getDb();

  const outgoingStmt = database.prepare(`
    SELECT r.id, r.source_id, r.target_id, r.relation_type, r.description, r.created_at, r.updated_at,
           n.title as target_title, n.folder as target_folder
    FROM relations r
    JOIN notes n ON r.target_id = n.id
    WHERE r.source_id = ?
    ORDER BY r.created_at DESC
  `);
  const outgoingRows = outgoingStmt.all(noteId) as Array<{
    id: string; source_id: string; target_id: string; relation_type: string;
    description: string; created_at: number; updated_at: number;
    target_title: string; target_folder: string;
  }>;

  const incomingStmt = database.prepare(`
    SELECT r.id, r.source_id, r.target_id, r.relation_type, r.description, r.created_at, r.updated_at,
           n.title as source_title, n.folder as source_folder
    FROM relations r
    JOIN notes n ON r.source_id = n.id
    WHERE r.target_id = ?
    ORDER BY r.created_at DESC
  `);
  const incomingRows = incomingStmt.all(noteId) as Array<{
    id: string; source_id: string; target_id: string; relation_type: string;
    description: string; created_at: number; updated_at: number;
    source_title: string; source_folder: string;
  }>;

  return {
    outgoing: outgoingRows.map(r => ({
      id: r.id,
      source_id: r.source_id,
      target_id: r.target_id,
      relation_type: r.relation_type,
      description: r.description,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    incoming: incomingRows.map(r => ({
      id: r.id,
      source_id: r.source_id,
      target_id: r.target_id,
      relation_type: r.relation_type,
      description: r.description,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
  };
}

export function insertRelation(relation: RelationRecord, logger?: PapyrusLogger): void {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT INTO relations (id, source_id, target_id, relation_type, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(relation.id, relation.source_id, relation.target_id, relation.relation_type, relation.description, relation.created_at, relation.updated_at);
  logger?.info(`创建关联: ${relation.id}`);
}

export function updateRelation(relationId: string, updates: Partial<Pick<RelationRecord, 'relation_type' | 'description'>>, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const sets: string[] = [];
  const values: (string | number)[] = [];
  if (updates.relation_type !== undefined) {
    sets.push('relation_type = ?');
    values.push(updates.relation_type);
  }
  if (updates.description !== undefined) {
    sets.push('description = ?');
    values.push(updates.description);
  }
  if (sets.length === 0) return false;
  sets.push('updated_at = ?');
  values.push(Date.now() / 1000);
  values.push(relationId);
  const stmt = database.prepare(`UPDATE relations SET ${sets.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  logger?.info(`更新关联: ${relationId}`);
  return Number(result.changes) > 0;
}

export function deleteRelationById(relationId: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM relations WHERE id = ?');
  const result = stmt.run(relationId);
  logger?.info(`删除关联: ${relationId}`);
  return result.changes > 0;
}

export function searchNotesForRelation(query: string, excludeNoteId: string, limit: number): Note[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM notes
    WHERE id != ? AND (title LIKE ? OR content LIKE ? OR preview LIKE ? OR tags LIKE ?)
    ORDER BY updated_at DESC
    LIMIT ?
  `);
  const likeQuery = `%${query}%`;
  const rows = stmt.all(excludeNoteId, likeQuery, likeQuery, likeQuery, likeQuery, limit) as Array<{
    id: string; title: string; folder: string; content: string; preview: string;
    tags: string; created_at: number; updated_at: number; word_count: number;
    hash: string; headings: string; outgoing_links: string; incoming_count: number;
  }>;
  return rows.map(noteFromRow);
}

export function getGraphData(noteId: string, depth: number): { nodes: Array<{ id: string; title: string; is_center: boolean }>; links: Array<{ source: string; target: string; type: string }> } {
  const database = getDb();
  const nodeSet = new Map<string, { id: string; title: string; is_center: boolean }>();
  const linkSet = new Set<string>();
  const links: Array<{ source: string; target: string; type: string }> = [];

  function addNode(id: string, title: string, isCenter: boolean) {
    if (!nodeSet.has(id)) {
      nodeSet.set(id, { id, title, is_center: isCenter });
    }
  }

  function addLink(source: string, target: string, type: string) {
    const key = `${source}-${target}-${type}`;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push({ source, target, type });
    }
  }

  // 获取中心笔记
  const centerStmt = database.prepare('SELECT id, title FROM notes WHERE id = ?');
  const centerRow = centerStmt.get(noteId) as { id: string; title: string } | undefined;
  if (centerRow) {
    addNode(centerRow.id, centerRow.title, true);
  }

  // BFS 获取关联笔记
  let currentDepth = 0;
  let currentIds = [noteId];

  while (currentDepth < depth && currentIds.length > 0) {
    const nextIds: string[] = [];
    const placeholders = currentIds.map(() => '?').join(',');

    const outgoingStmt = database.prepare(`
      SELECT r.source_id, r.target_id, r.relation_type, n.title as target_title
      FROM relations r
      JOIN notes n ON r.target_id = n.id
      WHERE r.source_id IN (${placeholders})
    `);
    const outgoingRows = outgoingStmt.all(...currentIds) as Array<{ source_id: string; target_id: string; relation_type: string; target_title: string }>;
    for (const row of outgoingRows) {
      addNode(row.target_id, row.target_title, false);
      addLink(row.source_id, row.target_id, row.relation_type);
      if (!nodeSet.has(row.target_id) || currentDepth + 1 < depth) {
        nextIds.push(row.target_id);
      }
    }

    const incomingStmt = database.prepare(`
      SELECT r.source_id, r.target_id, r.relation_type, n.title as source_title
      FROM relations r
      JOIN notes n ON r.source_id = n.id
      WHERE r.target_id IN (${placeholders})
    `);
    const incomingRows = incomingStmt.all(...currentIds) as Array<{ source_id: string; target_id: string; relation_type: string; source_title: string }>;
    for (const row of incomingRows) {
      addNode(row.source_id, row.source_title, false);
      addLink(row.source_id, row.target_id, row.relation_type);
      if (!nodeSet.has(row.source_id) || currentDepth + 1 < depth) {
        nextIds.push(row.source_id);
      }
    }

    currentIds = [...new Set(nextIds)];
    currentDepth++;
  }

  return {
    nodes: Array.from(nodeSet.values()),
    links,
  };
}

export function checkpointDb(): void {
  const database = getDb();
  database.exec('PRAGMA wal_checkpoint(FULL);');
}

export function runInTransaction<T>(fn: () => T): T {
  const database = getDb();
  database.exec('BEGIN TRANSACTION;');
  try {
    const result = fn();
    database.exec('COMMIT;');
    return result;
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export function clearAllData(): void {
  const database = getDb();
  database.exec('DELETE FROM cards;');
  database.exec('DELETE FROM card_versions;');
  database.exec('DELETE FROM notes;');
  database.exec('DELETE FROM note_versions;');
  database.exec('DELETE FROM relations;');
  database.exec('DELETE FROM files;');
  database.exec('DELETE FROM chat_messages;');
  database.exec('DELETE FROM chat_sessions;');
  database.exec('DELETE FROM provider_models;');
  database.exec('DELETE FROM api_keys;');
  database.exec('DELETE FROM providers;');
  
  // 重新初始化默认的供应商和模型配置
  seedDefaults(database);
}

// ==================== Chat Sessions ====================

export interface ChatSessionRow {
  id: string;
  title: string;
  model: string;
  provider: string;
  is_active: number;
  message_count: number;
  metadata: string;
  created_at: number;
  updated_at: number;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  blocks: string;
  attachments: string;
  model: string;
  provider: string;
  token_usage: string;
  parent_message_id: string | null;
  is_deleted: number;
  created_at: number;
}

interface CreateChatSessionInput {
  id?: string;
  title?: string;
  model?: string;
  provider?: string;
  created_at?: number;
  updated_at?: number;
}

export function createChatSession(input: CreateChatSessionInput = {}, logger?: PapyrusLogger): ChatSessionRow {
  const database = getDb();
  const now = Date.now() / 1000;
  const row: ChatSessionRow = {
    id: input.id ?? randomUUID(),
    title: input.title ?? '新对话',
    model: input.model ?? '',
    provider: input.provider ?? '',
    is_active: 0,
    message_count: 0,
    metadata: '{}',
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now,
  };
  const stmt = database.prepare(
    'INSERT INTO chat_sessions (id, title, model, provider, is_active, message_count, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(row.id, row.title, row.model, row.provider, row.is_active, row.message_count, row.metadata, row.created_at, row.updated_at);
  logger?.info(`创建会话: ${row.id}`);
  return row;
}

export function listChatSessions(): ChatSessionRow[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC');
  return stmt.all() as unknown as ChatSessionRow[];
}

export function getChatSession(id: string): ChatSessionRow | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM chat_sessions WHERE id = ?');
  const row = stmt.get(id) as ChatSessionRow | undefined;
  return row ?? null;
}

interface ChatSessionPatch {
  title?: string;
  model?: string;
  provider?: string;
  metadata?: string;
}

export function updateChatSession(id: string, patch: ChatSessionPatch): boolean {
  const database = getDb();
  const fields: string[] = [];
  const values: Array<string | number> = [];
  if (patch.title !== undefined) { fields.push('title = ?'); values.push(patch.title); }
  if (patch.model !== undefined) { fields.push('model = ?'); values.push(patch.model); }
  if (patch.provider !== undefined) { fields.push('provider = ?'); values.push(patch.provider); }
  if (patch.metadata !== undefined) { fields.push('metadata = ?'); values.push(patch.metadata); }
  if (fields.length === 0) return false;
  fields.push('updated_at = ?');
  values.push(Date.now() / 1000);
  values.push(id);
  const stmt = database.prepare(`UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function setActiveChatSession(id: string): boolean {
  const database = getDb();
  const exists = database.prepare('SELECT id FROM chat_sessions WHERE id = ?').get(id);
  if (!exists) return false;
  database.exec('BEGIN TRANSACTION;');
  try {
    database.prepare('UPDATE chat_sessions SET is_active = 0 WHERE is_active = 1').run();
    database.prepare('UPDATE chat_sessions SET is_active = 1, updated_at = ? WHERE id = ?').run(Date.now() / 1000, id);
    database.exec('COMMIT;');
    return true;
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export function getActiveChatSession(): ChatSessionRow | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM chat_sessions WHERE is_active = 1 LIMIT 1');
  const row = stmt.get() as ChatSessionRow | undefined;
  return row ?? null;
}

export function deleteChatSession(id: string, logger?: PapyrusLogger): { deleted: boolean; newActiveId: string | null } {
  const database = getDb();
  const target = getChatSession(id);
  if (!target) return { deleted: false, newActiveId: getActiveChatSession()?.id ?? null };
  const wasActive = target.is_active === 1;
  database.exec('BEGIN TRANSACTION;');
  try {
    database.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id);
    let newActiveId: string | null = null;
    if (wasActive) {
      const next = database.prepare('SELECT id FROM chat_sessions ORDER BY updated_at DESC LIMIT 1').get() as { id: string } | undefined;
      if (next) {
        database.prepare('UPDATE chat_sessions SET is_active = 1, updated_at = ? WHERE id = ?').run(Date.now() / 1000, next.id);
        newActiveId = next.id;
      }
    } else {
      newActiveId = getActiveChatSession()?.id ?? null;
    }
    database.exec('COMMIT;');
    logger?.info(`删除会话: ${id}`);
    return { deleted: true, newActiveId };
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export function clearAllChatSessions(logger?: PapyrusLogger): number {
  const database = getDb();
  const before = database.prepare('SELECT COUNT(*) as c FROM chat_sessions').get() as { c: number };
  database.exec('BEGIN TRANSACTION;');
  try {
    database.exec('DELETE FROM chat_messages;');
    database.exec('DELETE FROM chat_sessions;');
    database.exec('COMMIT;');
    logger?.info(`清空 ${before.c} 个会话`);
    return before.c;
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export function touchChatSession(id: string, ts?: number): void {
  const database = getDb();
  database.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?').run(ts ?? Date.now() / 1000, id);
}

// ==================== Chat Messages ====================

interface AppendChatMessageInput {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  blocks?: string;
  attachments?: string;
  model?: string;
  provider?: string;
  token_usage?: string;
  parent_message_id?: string | null;
  created_at?: number;
}

export function appendChatMessage(input: AppendChatMessageInput, logger?: PapyrusLogger): ChatMessageRow {
  const database = getDb();
  const now = input.created_at ?? Date.now() / 1000;
  const row: ChatMessageRow = {
    id: input.id ?? randomUUID(),
    session_id: input.session_id,
    role: input.role,
    content: input.content ?? '',
    blocks: input.blocks ?? '[]',
    attachments: input.attachments ?? '[]',
    model: input.model ?? '',
    provider: input.provider ?? '',
    token_usage: input.token_usage ?? '{}',
    parent_message_id: input.parent_message_id ?? null,
    is_deleted: 0,
    created_at: now,
  };
  database.exec('BEGIN TRANSACTION;');
  try {
    const sessionExists = database.prepare('SELECT id FROM chat_sessions WHERE id = ?').get(row.session_id);
    if (!sessionExists) {
      throw new Error(`会话不存在: ${row.session_id}`);
    }
    database.prepare(
      'INSERT INTO chat_messages (id, session_id, role, content, blocks, attachments, model, provider, token_usage, parent_message_id, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(row.id, row.session_id, row.role, row.content, row.blocks, row.attachments, row.model, row.provider, row.token_usage, row.parent_message_id, row.is_deleted, row.created_at);
    database.prepare(
      'UPDATE chat_sessions SET message_count = message_count + 1, updated_at = ? WHERE id = ?'
    ).run(now, row.session_id);
    database.exec('COMMIT;');
    logger?.info(`插入消息: ${row.id} (session=${row.session_id}, role=${row.role})`);
    return row;
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export function listChatMessages(sessionId: string, opts?: { includeDeleted?: boolean }): ChatMessageRow[] {
  const database = getDb();
  const includeDeleted = opts?.includeDeleted === true;
  const sql = includeDeleted
    ? 'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
    : 'SELECT * FROM chat_messages WHERE session_id = ? AND is_deleted = 0 ORDER BY created_at ASC';
  const stmt = database.prepare(sql);
  return stmt.all(sessionId) as unknown as ChatMessageRow[];
}

export function getChatMessage(id: string): ChatMessageRow | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM chat_messages WHERE id = ?');
  const row = stmt.get(id) as ChatMessageRow | undefined;
  return row ?? null;
}

interface ChatMessagePatch {
  content?: string;
  blocks?: string;
  token_usage?: string;
  model?: string;
}

export function updateChatMessage(id: string, patch: ChatMessagePatch): boolean {
  const database = getDb();
  const fields: string[] = [];
  const values: Array<string | number> = [];
  if (patch.content !== undefined) { fields.push('content = ?'); values.push(patch.content); }
  if (patch.blocks !== undefined) { fields.push('blocks = ?'); values.push(patch.blocks); }
  if (patch.token_usage !== undefined) { fields.push('token_usage = ?'); values.push(patch.token_usage); }
  if (patch.model !== undefined) { fields.push('model = ?'); values.push(patch.model); }
  if (fields.length === 0) return false;
  values.push(id);
  const stmt = database.prepare(`UPDATE chat_messages SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function softDeleteChatMessage(id: string, logger?: PapyrusLogger): boolean {
  const database = getDb();
  const stmt = database.prepare('UPDATE chat_messages SET is_deleted = 1 WHERE id = ?');
  const result = stmt.run(id);
  if (result.changes > 0) logger?.info(`软删除消息: ${id}`);
  return result.changes > 0;
}

export function deleteMessagesAfter(sessionId: string, fromCreatedAt: number, logger?: PapyrusLogger): number {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM chat_messages WHERE session_id = ? AND created_at >= ?');
  const result = stmt.run(sessionId, fromCreatedAt);
  const changed = Number(result.changes);
  if (changed > 0) {
    database.prepare(
      'UPDATE chat_sessions SET message_count = (SELECT COUNT(*) FROM chat_messages WHERE session_id = ? AND is_deleted = 0), updated_at = ? WHERE id = ?'
    ).run(sessionId, Date.now() / 1000, sessionId);
    logger?.info(`删除会话 ${sessionId} 中 ${changed} 条消息`);
  }
  return changed;
}

export function getChatMessageCount(sessionId: string, opts?: { includeDeleted?: boolean }): number {
  const database = getDb();
  const sql = opts?.includeDeleted
    ? 'SELECT COUNT(*) as c FROM chat_messages WHERE session_id = ?'
    : 'SELECT COUNT(*) as c FROM chat_messages WHERE session_id = ? AND is_deleted = 0';
  const stmt = database.prepare(sql);
  const row = stmt.get(sessionId) as { c: number };
  return row.c;
}

export { closeDb, getDb, resetDb };
