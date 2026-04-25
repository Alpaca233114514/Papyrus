import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CardRecord, Note } from '../../src/core/types.js';

describe('Database', () => {
  const testDir = path.join(os.tmpdir(), `papyrus-db-test-${Date.now()}`);
  let dbPath: string;

  let getDb: () => unknown;
  let closeDb: () => void;
  let loadAllCards: (logger?: unknown) => CardRecord[];
  let saveAllCards: (cards: CardRecord[], logger?: unknown) => void;
  let insertCard: (card: CardRecord, logger?: unknown) => void;
  let deleteCardById: (cardId: string, logger?: unknown) => boolean;
  let getCardById: (cardId: string) => CardRecord | null;
  let updateCard: (card: CardRecord, logger?: unknown) => boolean;
  let getCardsDueBefore: (timestamp: number) => CardRecord[];
  let getCardCount: () => number;
  let loadAllNotes: (logger?: unknown) => Note[];
  let saveAllNotes: (notes: Note[], logger?: unknown) => void;
  let insertNote: (note: Note, logger?: unknown) => void;
  let deleteNoteById: (noteId: string, logger?: unknown) => boolean;
  let getNoteById: (noteId: string) => Note | null;
  let updateNote: (note: Note, logger?: unknown) => boolean;
  let getNotesByFolder: (folder: string) => Note[];
  let getNoteCount: () => number;
  let getAllFolders: () => string[];
  let loadAllProviders: (logger?: unknown) => unknown[];
  let saveProvider: (provider: unknown, logger?: unknown) => string;
  let deleteProvider: (providerId: string, logger?: unknown) => boolean;
  let setDefaultProvider: (providerId: string, logger?: unknown) => boolean;
  let updateProviderEnabled: (providerId: string, enabled: boolean, logger?: unknown) => boolean;
  let saveApiKey: (providerId: string, apiKey: unknown, logger?: unknown) => string;
  let deleteApiKey: (keyId: string, logger?: unknown) => boolean;
  let saveModel: (providerId: string, model: unknown, logger?: unknown) => string;
  let deleteModel: (modelId: string, logger?: unknown) => boolean;
  let migrateFromJson: (cardsFile?: string, notesFile?: string, logger?: unknown) => void;
  let checkpointDb: () => void;
  let runInTransaction: (fn: () => void) => void;

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.PAPYRUS_DATA_DIR = testDir;

    const db = await import('../../src/db/database.js');
    getDb = db.getDb as () => unknown;
    closeDb = db.closeDb as () => void;
    loadAllCards = db.loadAllCards as (logger?: unknown) => CardRecord[];
    saveAllCards = db.saveAllCards as (cards: CardRecord[], logger?: unknown) => void;
    insertCard = db.insertCard as (card: CardRecord, logger?: unknown) => void;
    deleteCardById = db.deleteCardById as (cardId: string, logger?: unknown) => boolean;
    getCardById = db.getCardById as (cardId: string) => CardRecord | null;
    updateCard = db.updateCard as (card: CardRecord, logger?: unknown) => boolean;
    getCardsDueBefore = db.getCardsDueBefore as (timestamp: number) => CardRecord[];
    getCardCount = db.getCardCount as () => number;
    loadAllNotes = db.loadAllNotes as (logger?: unknown) => Note[];
    saveAllNotes = db.saveAllNotes as (notes: Note[], logger?: unknown) => void;
    insertNote = db.insertNote as (note: Note, logger?: unknown) => void;
    deleteNoteById = db.deleteNoteById as (noteId: string, logger?: unknown) => boolean;
    getNoteById = db.getNoteById as (noteId: string) => Note | null;
    updateNote = db.updateNote as (note: Note, logger?: unknown) => boolean;
    getNotesByFolder = db.getNotesByFolder as (folder: string) => Note[];
    getNoteCount = db.getNoteCount as () => number;
    getAllFolders = db.getAllFolders as () => string[];
    loadAllProviders = db.loadAllProviders as (logger?: unknown) => unknown[];
    saveProvider = db.saveProvider as (provider: unknown, logger?: unknown) => string;
    deleteProvider = db.deleteProvider as (providerId: string, logger?: unknown) => boolean;
    setDefaultProvider = db.setDefaultProvider as (providerId: string, logger?: unknown) => boolean;
    updateProviderEnabled = db.updateProviderEnabled as (providerId: string, enabled: boolean, logger?: unknown) => boolean;
    saveApiKey = db.saveApiKey as (providerId: string, apiKey: unknown, logger?: unknown) => string;
    deleteApiKey = db.deleteApiKey as (keyId: string, logger?: unknown) => boolean;
    saveModel = db.saveModel as (providerId: string, model: unknown, logger?: unknown) => string;
    deleteModel = db.deleteModel as (modelId: string, logger?: unknown) => boolean;
    migrateFromJson = db.migrateFromJson as (cardsFile?: string, notesFile?: string, logger?: unknown) => void;
    checkpointDb = db.checkpointDb as () => void;
    runInTransaction = db.runInTransaction as (fn: () => void) => void;

    dbPath = path.join(testDir, 'papyrus.db');
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.PAPYRUS_DATA_DIR;
  });

  beforeEach(() => {
    closeDb();
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
    getDb();
  });

  function makeCard(overrides?: Partial<CardRecord>): CardRecord {
    return {
      id: 'card-' + Math.random().toString(36).slice(2),
      q: 'Q',
      a: 'A',
      next_review: 0,
      interval: 0,
      ef: 2.5,
      repetitions: 0,
      tags: [],
      ...overrides,
    };
  }

  function makeNote(overrides?: Partial<Note>): Note {
    return {
      id: 'note-' + Math.random().toString(36).slice(2),
      title: 'Title',
      folder: '默认',
      content: 'content',
      preview: 'preview',
      tags: [],
      created_at: 0,
      updated_at: 0,
      word_count: 0,
      hash: '',
      headings: [],
      outgoing_links: [],
      incoming_count: 0,
      ...overrides,
    };
  }

  describe('getDb / closeDb', () => {
    it('should recreate db after closeDb', () => {
      closeDb();
      const d = getDb();
      expect(d).toBeDefined();
    });
  });

  describe('Cards', () => {
    it('should save and load all cards', () => {
      const cards = [makeCard({ q: 'Q1' }), makeCard({ q: 'Q2' })];
      saveAllCards(cards);
      const loaded = loadAllCards();
      expect(loaded.length).toBe(2);
      expect(loaded.map(c => c.q)).toContain('Q1');
      expect(loaded.map(c => c.q)).toContain('Q2');
    });

    it('should insert and get card by id', () => {
      const card = makeCard({ q: 'Inserted' });
      insertCard(card);
      const found = getCardById(card.id);
      expect(found).not.toBeNull();
      expect(found!.q).toBe('Inserted');
    });

    it('should update a card', () => {
      const card = makeCard({ q: 'Old' });
      insertCard(card);
      const updated = { ...card, q: 'New' };
      expect(updateCard(updated)).toBe(true);
      expect(getCardById(card.id)!.q).toBe('New');
    });

    it('should return false when updating non-existent card', () => {
      const result = updateCard(makeCard());
      expect(result).toBe(false);
    });

    it('should delete a card', () => {
      const card = makeCard();
      insertCard(card);
      expect(deleteCardById(card.id)).toBe(true);
      expect(getCardById(card.id)).toBeNull();
    });

    it('should return false when deleting non-existent card', () => {
      expect(deleteCardById('no-such-id')).toBe(false);
    });

    it('should get cards due before a timestamp', () => {
      const past = makeCard({ next_review: 100 });
      const future = makeCard({ next_review: 999999 });
      insertCard(past);
      insertCard(future);
      const due = getCardsDueBefore(500);
      expect(due.length).toBe(1);
      expect(due[0]!.id).toBe(past.id);
    });

    it('should return correct card count', () => {
      expect(getCardCount()).toBe(0);
      insertCard(makeCard());
      insertCard(makeCard());
      expect(getCardCount()).toBe(2);
    });

    it('should preserve tags through save/load', () => {
      const card = makeCard({ tags: ['a', 'b'] });
      saveAllCards([card]);
      const loaded = loadAllCards();
      expect(loaded[0]!.tags).toEqual(['a', 'b']);
    });
  });

  describe('Notes', () => {
    it('should save and load all notes', () => {
      const notes = [makeNote({ title: 'N1' }), makeNote({ title: 'N2' })];
      saveAllNotes(notes);
      const loaded = loadAllNotes();
      expect(loaded.length).toBe(2);
      expect(loaded.map(n => n.title)).toContain('N1');
    });

    it('should insert and get note by id', () => {
      const note = makeNote({ title: 'Inserted' });
      insertNote(note);
      const found = getNoteById(note.id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe('Inserted');
    });

    it('should update a note', () => {
      const note = makeNote({ title: 'Old' });
      insertNote(note);
      const updated = { ...note, title: 'New', content: '# Heading\n[[Link]]' };
      expect(updateNote(updated)).toBe(true);
      const found = getNoteById(note.id)!;
      expect(found.title).toBe('New');
    });

    it('should return false when updating non-existent note', () => {
      expect(updateNote(makeNote())).toBe(false);
    });

    it('should delete a note', () => {
      const note = makeNote();
      insertNote(note);
      expect(deleteNoteById(note.id)).toBe(true);
      expect(getNoteById(note.id)).toBeNull();
    });

    it('should return false when deleting non-existent note', () => {
      expect(deleteNoteById('no-such-id')).toBe(false);
    });

    it('should get notes by folder', () => {
      insertNote(makeNote({ folder: 'A' }));
      insertNote(makeNote({ folder: 'B' }));
      insertNote(makeNote({ folder: 'A' }));
      expect(getNotesByFolder('A').length).toBe(2);
      expect(getNotesByFolder('B').length).toBe(1);
    });

    it('should return correct note count', () => {
      expect(getNoteCount()).toBe(0);
      insertNote(makeNote());
      expect(getNoteCount()).toBe(1);
    });

    it('should return all folders', () => {
      insertNote(makeNote({ folder: 'A' }));
      insertNote(makeNote({ folder: 'C' }));
      insertNote(makeNote({ folder: 'B' }));
      const folders = getAllFolders();
      expect(folders).toEqual(['A', 'B', 'C']);
    });

    it('should preserve headings and outgoing_links', () => {
      const note = makeNote({
        headings: [{ level: 1, text: 'H1' }],
        outgoing_links: ['Other'],
      });
      saveAllNotes([note]);
      const loaded = loadAllNotes();
      expect(loaded[0]!.headings).toEqual([{ level: 1, text: 'H1' }]);
      expect(loaded[0]!.outgoing_links).toEqual(['Other']);
    });
  });

  describe('Providers', () => {
    it('should seed default providers on new db', () => {
      const providers = loadAllProviders();
      expect(providers.length).toBe(7);
    });

    it('should save and load a custom provider', () => {
      const id = saveProvider({ id: 'p-custom', type: 'openai', name: 'Custom', baseUrl: 'http://localhost', enabled: false, isDefault: false });
      const providers = loadAllProviders();
      const found = providers.find((p: Record<string, unknown>) => p.id === id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Custom');
    });

    it('should delete a provider', () => {
      const id = saveProvider({ type: 'openai', name: 'ToDelete', baseUrl: '', enabled: false });
      expect(deleteProvider(id)).toBe(true);
      const providers = loadAllProviders();
      expect(providers.some((p: Record<string, unknown>) => p.id === id)).toBe(false);
    });

    it('should set default provider', () => {
      const id = saveProvider({ type: 'openai', name: 'Default', baseUrl: '', enabled: false });
      expect(setDefaultProvider(id)).toBe(true);
      const providers = loadAllProviders();
      const found = providers.find((p: Record<string, unknown>) => p.id === id) as Record<string, unknown>;
      expect(found.isDefault).toBe(true);
    });

    it('should update provider enabled status', () => {
      const id = saveProvider({ type: 'openai', name: 'Toggle', baseUrl: '', enabled: false });
      expect(updateProviderEnabled(id, true)).toBe(true);
      const providers = loadAllProviders();
      const found = providers.find((p: Record<string, unknown>) => p.id === id) as Record<string, unknown>;
      expect(found.enabled).toBe(true);
    });
  });

  describe('API Keys', () => {
    it('should save and delete an API key', () => {
      const providerId = saveProvider({ type: 'openai', name: 'KeyTest', baseUrl: '', enabled: false });
      const keyId = saveApiKey(providerId, { name: 'prod', key: 'sk-secret' });
      expect(typeof keyId).toBe('string');

      const providers = loadAllProviders();
      const provider = providers.find((p: Record<string, unknown>) => p.id === providerId) as Record<string, unknown>;
      const keys = provider.apiKeys as Array<Record<string, unknown>>;
      const key = keys.find((k: Record<string, unknown>) => k.id === keyId);
      expect(key).toBeDefined();
      expect(key!.key).toBe('sk-secret');

      expect(deleteApiKey(keyId)).toBe(true);
      expect(deleteApiKey('non-existent')).toBe(false);
    });
  });

  describe('Models', () => {
    it('should save and delete a model', () => {
      const providerId = saveProvider({ type: 'openai', name: 'ModelTest', baseUrl: '', enabled: false });
      const modelId = saveModel(providerId, { name: 'GPT-4', modelId: 'gpt-4', port: 'openai', capabilities: ['tools'] });
      expect(typeof modelId).toBe('string');

      const providers = loadAllProviders();
      const provider = providers.find((p: Record<string, unknown>) => p.id === providerId) as Record<string, unknown>;
      const models = provider.models as Array<Record<string, unknown>>;
      expect(models.some((m: Record<string, unknown>) => m.id === modelId)).toBe(true);

      expect(deleteModel(modelId)).toBe(true);
      expect(deleteModel('non-existent')).toBe(false);
    });
  });

  describe('Migration', () => {
    it('should migrate cards from JSON file', () => {
      const cardsFile = path.join(testDir, 'cards.json');
      fs.writeFileSync(cardsFile, JSON.stringify([makeCard({ q: 'Migrated' })]));
      migrateFromJson(cardsFile);
      const loaded = loadAllCards();
      expect(loaded.some(c => c.q === 'Migrated')).toBe(true);
    });

    it('should migrate notes from JSON file', () => {
      const notesFile = path.join(testDir, 'notes.json');
      fs.writeFileSync(notesFile, JSON.stringify([makeNote({ title: 'Migrated' })]));
      migrateFromJson(undefined, notesFile);
      const loaded = loadAllNotes();
      expect(loaded.some(n => n.title === 'Migrated')).toBe(true);
    });

    it('should handle missing migration files gracefully', () => {
      expect(() => migrateFromJson('/non-existent/cards.json', '/non-existent/notes.json')).not.toThrow();
    });

    it('should handle corrupted cards json gracefully', () => {
      const cardsFile = path.join(testDir, 'bad-cards.json');
      fs.writeFileSync(cardsFile, 'not-json');
      expect(() => migrateFromJson(cardsFile)).not.toThrow();
    });

    it('should handle corrupted notes json gracefully', () => {
      const notesFile = path.join(testDir, 'bad-notes.json');
      fs.writeFileSync(notesFile, 'not-json');
      expect(() => migrateFromJson(undefined, notesFile)).not.toThrow();
    });

    it('should handle corrupted tags json in database', () => {
      const db = getDb();
      db.prepare('INSERT INTO cards (id, q, a, tags) VALUES (?, ?, ?, ?)')
        .run('bad-tags', 'Q', 'A', 'not-valid-json');
      const loaded = loadAllCards();
      const found = loaded.find(c => c.id === 'bad-tags');
      expect(found).toBeDefined();
      expect(found!.tags).toEqual([]);
    });

    it('should handle corrupted headings json in database', () => {
      const db = getDb();
      db.prepare('INSERT INTO notes (id, title, content, headings) VALUES (?, ?, ?, ?)')
        .run('bad-headings', 'Title', 'Content', 'not-valid-json');
      const loaded = loadAllNotes();
      const found = loaded.find(n => n.id === 'bad-headings');
      expect(found).toBeDefined();
      expect(found!.headings).toEqual([]);
    });
  });

  describe('Utilities', () => {
    it('should checkpoint without error', () => {
      expect(() => checkpointDb()).not.toThrow();
    });

    it('should commit successful transaction', () => {
      runInTransaction(() => {
        insertCard(makeCard({ q: 'Tx' }));
      });
      expect(loadAllCards().some(c => c.q === 'Tx')).toBe(true);
    });

    it('should rollback failed transaction', () => {
      expect(() => {
        runInTransaction(() => {
          insertCard(makeCard({ q: 'TxFail' }));
          throw new Error('abort');
        });
      }).toThrow('abort');
      expect(loadAllCards().some(c => c.q === 'TxFail')).toBe(false);
    });
  });
});
