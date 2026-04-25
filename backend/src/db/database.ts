import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../utils/paths.js';
import { encryptApiKey, decryptApiKey } from '../core/crypto.js';
import type { CardRecord, Note, Provider } from '../core/types.js';
import type { PapyrusLogger } from '../utils/logger.js';

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db === null) {
    const dbPath = paths.dbFile;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    initSchema(db);
  }
  return db;
}

function closeDb(): void {
  if (db !== null) {
    db.close();
    db = null;
  }
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
      note_id TEXT NOT NULL,
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
      card_id TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(note_id, version DESC);
    CREATE INDEX IF NOT EXISTS idx_card_versions_card ON card_versions(card_id, version DESC);
  `);

  if (isNewDb) {
    seedDefaults(database);
  }
}

function seedDefaults(database: DatabaseSync): void {
  const now = Date.now() / 1000;
  const encryptedEmpty = encryptApiKey('');

  const providers = [
    ['p-openai', 'openai', 'OpenAI', 'https://api.openai.com/v1', 0, 0, now, now],
    ['p-anthropic', 'anthropic', 'Anthropic', 'https://api.anthropic.com/v1', 0, 0, now, now],
    ['p-gemini', 'gemini', 'Gemini', 'https://generativelanguage.googleapis.com/v1beta', 0, 0, now, now],
    ['p-deepseek', 'deepseek', 'DeepSeek', 'https://api.deepseek.com', 0, 0, now, now],
    ['p-moonshot', 'moonshot', '月之暗面', 'https://api.moonshot.cn', 0, 0, now, now],
    ['p-siliconflow', 'siliconflow', '硅基流动', 'https://api.siliconflow.cn', 0, 0, now, now],
    ['p-ollama', 'ollama', 'Ollama', 'http://localhost:11434', 0, 0, now, now],
  ];

  const insertProvider = database.prepare(
    'INSERT INTO providers (id, type, name, base_url, enabled, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const p of providers) {
    insertProvider.run(...p);
  }

  const apiKeys = [
    ['k-openai', 'p-openai', 'default', encryptedEmpty, now],
    ['k-anthropic', 'p-anthropic', 'default', encryptedEmpty, now],
    ['k-gemini', 'p-gemini', 'default', encryptedEmpty, now],
    ['k-deepseek', 'p-deepseek', 'default', encryptedEmpty, now],
    ['k-moonshot', 'p-moonshot', 'default', encryptedEmpty, now],
    ['k-siliconflow', 'p-siliconflow', 'default', encryptedEmpty, now],
    ['k-ollama', 'p-ollama', 'default', encryptedEmpty, now],
  ];

  const insertKey = database.prepare(
    'INSERT INTO api_keys (id, provider_id, name, encrypted_key, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  for (const k of apiKeys) {
    insertKey.run(...k);
  }

  const allCaps = JSON.stringify(['tools', 'vision', 'reasoning']);
  const dsCaps = JSON.stringify(['tools', 'reasoning']);

  const models = [
    ['m-openai-1', 'p-openai', 'GPT 5.4', 'gpt-5.4', 'openai', allCaps, 'k-openai', 1],
    ['m-anthropic-1', 'p-anthropic', 'Claude Mythos', 'claude-mythos', 'anthropic', allCaps, 'k-anthropic', 1],
    ['m-anthropic-2', 'p-anthropic', 'Claude Opus 4.6', 'claude-opus-4.6', 'anthropic', allCaps, 'k-anthropic', 1],
    ['m-gemini-1', 'p-gemini', 'Gemini 3.1 Pro', 'gemini-3.1-pro-preview', 'gemini', allCaps, 'k-gemini', 1],
    ['m-gemini-2', 'p-gemini', 'Gemini 3.0 Flash', 'gemini-3-flash-preview', 'gemini', allCaps, 'k-gemini', 1],
    ['m-deepseek-1', 'p-deepseek', 'DeepSeek V3.2', 'deepseek-v3.2', 'openai', dsCaps, 'k-deepseek', 1],
    ['m-moonshot-1', 'p-moonshot', 'Kimi K2.5', 'kimi-k2.5', 'openai', allCaps, 'k-moonshot', 1],
  ];

  const insertModel = database.prepare(
    'INSERT INTO provider_models (id, provider_id, name, model_id, port, capabilities, api_key_id, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const m of models) {
    insertModel.run(...m);
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
  const stmt = database.prepare('DELETE FROM notes WHERE id = ?');
  const result = stmt.run(noteId);
  logger?.info(`删除笔记: ${noteId}`);
  return result.changes > 0;
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
      apiKeyId: m.api_key_id,
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

  return providers;
}

export function saveProvider(provider: Partial<Provider> & { id?: string }, logger?: PapyrusLogger): string {
  const database = getDb();
  const providerId = provider.id ?? String(Date.now());
  const now = Date.now() / 1000;

  const stmt = database.prepare(
    `INSERT OR REPLACE INTO providers (id, type, name, base_url, enabled, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM providers WHERE id = ?), ?), ?)`
  );
  stmt.run(
    providerId,
    provider.type ?? 'custom',
    provider.name ?? '',
    provider.baseUrl ?? '',
    provider.enabled ? 1 : 0,
    provider.isDefault ? 1 : 0,
    providerId,
    now,
    now
  );
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
  const keyId = apiKey.id ?? String(Date.now());
  const now = Date.now() / 1000;

  const stmt = database.prepare(
    `INSERT OR REPLACE INTO api_keys (id, provider_id, name, encrypted_key, created_at)
     VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM api_keys WHERE id = ?), ?))`
  );
  stmt.run(keyId, providerId, apiKey.name ?? 'default', encryptApiKey(apiKey.key), keyId, now);
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

export function saveModel(providerId: string, model: { id?: string; name?: string; modelId?: string; port?: string; capabilities?: string[]; apiKeyId?: string; enabled?: boolean }, logger?: PapyrusLogger): string {
  const database = getDb();
  const modelId = model.id ?? String(Date.now());

  const stmt = database.prepare(
    'INSERT OR REPLACE INTO provider_models (id, provider_id, name, model_id, port, capabilities, api_key_id, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    modelId,
    providerId,
    model.name ?? '',
    model.modelId ?? '',
    model.port ?? 'openai',
    JSON.stringify(model.capabilities ?? []),
    model.apiKeyId ?? null,
    model.enabled ? 1 : 0
  );
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

export function checkpointDb(): void {
  const database = getDb();
  database.exec('PRAGMA wal_checkpoint(FULL);');
}

export function runInTransaction(fn: () => void): void {
  const database = getDb();
  database.exec('BEGIN TRANSACTION;');
  try {
    fn();
    database.exec('COMMIT;');
  } catch (e) {
    database.exec('ROLLBACK;');
    throw e;
  }
}

export { closeDb, getDb };
