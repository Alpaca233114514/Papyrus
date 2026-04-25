import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CardRecord, Note } from '../../src/core/types.js';

describe('Database', () => {
  const testDir = path.join(os.tmpdir(), `papyrus-db-test-${Date.now()}`);
  let dbPath: string;

  let getDb: () => unknown;
  let closeDb: typeof import('../../src/db/database.js').closeDb;
  let loadAllCards: typeof import('../../src/db/database.js').loadAllCards;
  let saveAllCards: typeof import('../../src/db/database.js').saveAllCards;
  let insertCard: typeof import('../../src/db/database.js').insertCard;
  let deleteCardById: typeof import('../../src/db/database.js').deleteCardById;
  let getCardById: typeof import('../../src/db/database.js').getCardById;
  let updateCard: typeof import('../../src/db/database.js').updateCard;
  let getCardsDueBefore: typeof import('../../src/db/database.js').getCardsDueBefore;
  let getCardCount: typeof import('../../src/db/database.js').getCardCount;
  let loadAllNotes: typeof import('../../src/db/database.js').loadAllNotes;
  let saveAllNotes: typeof import('../../src/db/database.js').saveAllNotes;
  let insertNote: typeof import('../../src/db/database.js').insertNote;
  let deleteNoteById: typeof import('../../src/db/database.js').deleteNoteById;
  let getNoteById: typeof import('../../src/db/database.js').getNoteById;
  let updateNote: typeof import('../../src/db/database.js').updateNote;
  let getNotesByFolder: typeof import('../../src/db/database.js').getNotesByFolder;
  let getNoteCount: typeof import('../../src/db/database.js').getNoteCount;
  let getAllFolders: typeof import('../../src/db/database.js').getAllFolders;
  let loadAllProviders: typeof import('../../src/db/database.js').loadAllProviders;
  let saveProvider: typeof import('../../src/db/database.js').saveProvider;
  let deleteProvider: typeof import('../../src/db/database.js').deleteProvider;
  let setDefaultProvider: typeof import('../../src/db/database.js').setDefaultProvider;
  let updateProviderEnabled: typeof import('../../src/db/database.js').updateProviderEnabled;
  let saveApiKey: typeof import('../../src/db/database.js').saveApiKey;
  let deleteApiKey: typeof import('../../src/db/database.js').deleteApiKey;
  let saveModel: typeof import('../../src/db/database.js').saveModel;
  let deleteModel: typeof import('../../src/db/database.js').deleteModel;
  let migrateFromJson: typeof import('../../src/db/database.js').migrateFromJson;
  let checkpointDb: typeof import('../../src/db/database.js').checkpointDb;
  let runInTransaction: typeof import('../../src/db/database.js').runInTransaction;

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.PAPYRUS_DATA_DIR = testDir;

    const db = await import('../../src/db/database.js');
    getDb = db.getDb as () => unknown;
    closeDb = db.closeDb as typeof closeDb;
    loadAllCards = db.loadAllCards as typeof loadAllCards;
    saveAllCards = db.saveAllCards as typeof saveAllCards;
    insertCard = db.insertCard as typeof insertCard;
    deleteCardById = db.deleteCardById as typeof deleteCardById;
    getCardById = db.getCardById as typeof getCardById;
    updateCard = db.updateCard as typeof updateCard;
    getCardsDueBefore = db.getCardsDueBefore as typeof getCardsDueBefore;
    getCardCount = db.getCardCount as typeof getCardCount;
    loadAllNotes = db.loadAllNotes as typeof loadAllNotes;
    saveAllNotes = db.saveAllNotes as typeof saveAllNotes;
    insertNote = db.insertNote as typeof insertNote;
    deleteNoteById = db.deleteNoteById as typeof deleteNoteById;
    getNoteById = db.getNoteById as typeof getNoteById;
    updateNote = db.updateNote as typeof updateNote;
    getNotesByFolder = db.getNotesByFolder as typeof getNotesByFolder;
    getNoteCount = db.getNoteCount as typeof getNoteCount;
    getAllFolders = db.getAllFolders as typeof getAllFolders;
    loadAllProviders = db.loadAllProviders as typeof loadAllProviders;
    saveProvider = db.saveProvider as typeof saveProvider;
    deleteProvider = db.deleteProvider as typeof deleteProvider;
    setDefaultProvider = db.setDefaultProvider as typeof setDefaultProvider;
    updateProviderEnabled = db.updateProviderEnabled as typeof updateProviderEnabled;
    saveApiKey = db.saveApiKey as typeof saveApiKey;
    deleteApiKey = db.deleteApiKey as typeof deleteApiKey;
    saveModel = db.saveModel as typeof saveModel;
    deleteModel = db.deleteModel as typeof deleteModel;
    migrateFromJson = db.migrateFromJson as typeof migrateFromJson;
    checkpointDb = db.checkpointDb as typeof checkpointDb;
    runInTransaction = db.runInTransaction as typeof runInTransaction;

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
      if (found === null) throw new Error('expected card');
      expect(found.q).toBe('Inserted');
    });

    it('should update a card', () => {
      const card = makeCard({ q: 'Old' });
      insertCard(card);
      const updated = { ...card, q: 'New' };
      expect(updateCard(updated)).toBe(true);
      const foundCard = getCardById(card.id);
      if (foundCard === null) throw new Error('expected card');
      expect(foundCard.q).toBe('New');
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
      expect(due[0]?.id).toBe(past.id);
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
      expect(loaded[0]?.tags).toEqual(['a', 'b']);
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
      if (found === null) throw new Error('expected note');
      expect(found.title).toBe('Inserted');
    });

    it('should update a note', () => {
      const note = makeNote({ title: 'Old' });
      insertNote(note);
      const updated = { ...note, title: 'New', content: '# Heading\n[[Link]]' };
      expect(updateNote(updated)).toBe(true);
      const found = getNoteById(note.id);
      if (found === null) throw new Error('expected note');
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
      expect(loaded[0]?.headings).toEqual([{ level: 1, text: 'H1' }]);
      expect(loaded[0]?.outgoing_links).toEqual(['Other']);
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
      const found = providers.find((p) => p.id === id);
      if (found === undefined) throw new Error('expected provider');
      expect(found.name).toBe('Custom');
    });

    it('should delete a provider', () => {
      const id = saveProvider({ type: 'openai', name: 'ToDelete', baseUrl: '', enabled: false });
      expect(deleteProvider(id)).toBe(true);
      const providers = loadAllProviders();
      expect(providers.some((p) => p.id === id)).toBe(false);
    });

    it('should set default provider', () => {
      const id = saveProvider({ type: 'openai', name: 'Default', baseUrl: '', enabled: false });
      expect(setDefaultProvider(id)).toBe(true);
      const providers = loadAllProviders();
      const found = providers.find((p) => p.id === id);
      if (found === undefined) throw new Error('expected provider');
      expect(found.isDefault).toBe(true);
    });

    it('should update provider enabled status', () => {
      const id = saveProvider({ type: 'openai', name: 'Toggle', baseUrl: '', enabled: false });
      expect(updateProviderEnabled(id, true)).toBe(true);
      const providers = loadAllProviders();
      const found = providers.find((p) => p.id === id);
      // @ts-expect-error - tested above
      expect(found.enabled).toBe(true);
    });
  });

  describe('API Keys', () => {
    it('should save and delete an API key', () => {
      const providerId = saveProvider({ type: 'openai', name: 'KeyTest', baseUrl: '', enabled: false });
      const keyId = saveApiKey(providerId, { name: 'prod', key: 'sk-secret' });
      expect(typeof keyId).toBe('string');

      const providers = loadAllProviders();
      const provider = providers.find((p) => p.id === providerId);
      if (provider === undefined) throw new Error('expected provider');
      const keys = provider.apiKeys;
      const key = keys.find((k) => k.id === keyId);
      if (key === undefined) throw new Error('expected key');
      expect(key.key).toBe('sk-secret');

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
      const provider = providers.find((p) => p.id === providerId);
      // @ts-expect-error - tested above
      const models = provider.models;
      expect(models.some((m) => m.id === modelId)).toBe(true);

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
      // @ts-expect-error - getDb returns unknown in tests
      db.prepare('INSERT INTO cards (id, q, a, tags) VALUES (?, ?, ?, ?)')
        .run('bad-tags', 'Q', 'A', 'not-valid-json');
      const loaded = loadAllCards();
      const found = loaded.find(c => c.id === 'bad-tags');
      if (found === undefined) throw new Error('expected card');
      expect(found.tags).toEqual([]);
    });

    it('should handle corrupted headings json in database', () => {
      const db = getDb();
      // @ts-expect-error - getDb returns unknown in tests
      db.prepare('INSERT INTO notes (id, title, content, headings) VALUES (?, ?, ?, ?)')
        .run('bad-headings', 'Title', 'Content', 'not-valid-json');
      const loaded = loadAllNotes();
      const found = loaded.find(n => n.id === 'bad-headings');
      if (found === undefined) throw new Error('expected note');
      expect(found.headings).toEqual([]);
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
