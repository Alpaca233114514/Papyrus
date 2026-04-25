import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Notes', () => {
  const testDir = path.join(os.tmpdir(), `papyrus-notes-test-${Date.now()}`);

  let computeWordCount: (content: string) => number;
  let computeHash: (content: string) => string;
  let createNote: (title: string, content: string, folder?: string, tags?: string[], logger?: unknown) => unknown;
  let updateNote: (noteId: string, updates: unknown, logger?: unknown) => unknown | null;
  let deleteNote: (noteId: string, logger?: unknown) => boolean;
  let searchNotes: (query: string) => unknown[];
  let getAllNotes: (logger?: unknown) => unknown[];
  let getFolders: () => string[];
  let getStats: () => { total: number };
  let getNotesInFolder: (folder: string) => unknown[];
  let importObsidianVault: (vaultPath: string, logger?: unknown) => { imported: number; errors: number };

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.PAPYRUS_DATA_DIR = testDir;

    const notes = await import('../../src/core/notes.js');
    computeWordCount = notes.computeWordCount;
    computeHash = notes.computeHash;
    createNote = notes.createNote;
    updateNote = notes.updateNote;
    deleteNote = notes.deleteNote;
    searchNotes = notes.searchNotes;
    getAllNotes = notes.getAllNotes;
    getFolders = notes.getFolders;
    getStats = notes.getStats;
    getNotesInFolder = notes.getNotesInFolder;
    importObsidianVault = notes.importObsidianVault;
  });

  afterAll(async () => {
    const { closeDb } = await import('../../src/db/database.js');
    closeDb();
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.PAPYRUS_DATA_DIR;
  });

  describe('computeWordCount', () => {
    it('should count Chinese characters', () => {
      expect(computeWordCount('你好世界')).toBe(4);
    });

    it('should count English words', () => {
      expect(computeWordCount('Hello world foo bar')).toBe(4);
    });

    it('should count mixed content', () => {
      expect(computeWordCount('Hello 世界 test 测试')).toBe(2 + 4);
    });

    it('should return 0 for empty string', () => {
      expect(computeWordCount('')).toBe(0);
    });

    it('should handle punctuation only', () => {
      expect(computeWordCount('!!!???')).toBe(0);
    });
  });

  describe('computeHash', () => {
    it('should produce consistent hash for same input', () => {
      expect(computeHash('test')).toBe(computeHash('test'));
    });

    it('should produce different hash for different input', () => {
      expect(computeHash('a')).not.toBe(computeHash('b'));
    });

    it('should return hex string up to 8 chars', () => {
      const hash = computeHash('some content here');
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBeLessThanOrEqual(8);
    });
  });

  describe('createNote', () => {
    it('should create a note with default values', () => {
      const note = createNote('Test Title', 'Test content') as Record<string, unknown>;

      expect(note.title).toBe('Test Title');
      expect(note.content).toBe('Test content');
      expect(note.folder).toBe('默认');
      expect(note.tags).toEqual([]);
      expect(note.incoming_count).toBe(0);
      expect(typeof note.id).toBe('string');
      expect(note.id).toHaveLength(32);
    });

    it('should trim title and use custom folder', () => {
      const note = createNote('  Title  ', 'content', 'Custom Folder') as Record<string, unknown>;
      expect(note.title).toBe('Title');
      expect(note.folder).toBe('Custom Folder');
    });

    it('should fallback to default folder for empty string', () => {
      const note = createNote('Title', 'content', '  ') as Record<string, unknown>;
      expect(note.folder).toBe('默认');
    });

    it('should trim and filter empty tags', () => {
      const note = createNote('Title', 'content', '默认', ['a', '  b  ', '', 'c']) as Record<string, unknown>;
      expect(note.tags).toEqual(['a', 'b', 'c']);
    });

    it('should extract headings from content', () => {
      const note = createNote('Title', '# H1\n## H2\n### H3\n#### H4') as Record<string, unknown>;
      expect(note.headings).toEqual([
        { level: 1, text: 'H1' },
        { level: 2, text: 'H2' },
        { level: 3, text: 'H3' },
      ]);
    });

    it('should extract wiki links', () => {
      const note = createNote('Title', 'See [[Note A]] and [[Note B]] and [[Note A]]') as Record<string, unknown>;
      expect(note.outgoing_links).toEqual(['Note A', 'Note B']);
    });

    it('should generate preview', () => {
      const note = createNote('Title', 'This is a long content that should be previewed properly') as Record<string, unknown>;
      expect(typeof note.preview).toBe('string');
      expect((note.preview as string).length).toBeGreaterThan(0);
    });
  });

  describe('updateNote', () => {
    it('should return null for non-existent note', () => {
      const result = updateNote('non-existent-id', { title: 'New' });
      expect(result).toBeNull();
    });

    it('should update note title', () => {
      const note = createNote('Old Title', 'content') as Record<string, unknown>;
      const updated = updateNote(note.id as string, { title: 'New Title' }) as Record<string, unknown>;
      expect(updated.title).toBe('New Title');
    });

    it('should update note content and derived fields', () => {
      const note = createNote('Title', 'old') as Record<string, unknown>;
      const updated = updateNote(note.id as string, { content: '# New\n[[Link]]' }) as Record<string, unknown>;

      expect(updated.content).toBe('# New\n[[Link]]');
      expect(updated.headings).toEqual([{ level: 1, text: 'New' }]);
      expect(updated.outgoing_links).toEqual(['Link']);
      expect(updated.hash).not.toBe(note.hash);
    });

    it('should trim updated title', () => {
      const note = createNote('Title', 'content') as Record<string, unknown>;
      const updated = updateNote(note.id as string, { title: '  New  ' }) as Record<string, unknown>;
      expect(updated.title).toBe('New');
    });

    it('should fallback to default folder for empty string', () => {
      const note = createNote('Title', 'content', 'Custom') as Record<string, unknown>;
      const updated = updateNote(note.id as string, { folder: '  ' }) as Record<string, unknown>;
      expect(updated.folder).toBe('默认');
    });
  });

  describe('searchNotes', () => {
    beforeEach(() => {
      getAllNotes().forEach((n: Record<string, unknown>) => deleteNote(n.id as string));
    });

    it('should find notes by title', () => {
      createNote('JavaScript Basics', 'content about js');
      createNote('Python Guide', 'content about python');

      const results = searchNotes('javascript');
      expect(results.length).toBe(1);
      expect((results[0] as Record<string, unknown>).title).toBe('JavaScript Basics');
    });

    it('should find notes by content', () => {
      createNote('Title', 'This mentions TypeScript');
      const results = searchNotes('typescript');
      expect(results.length).toBe(1);
    });

    it('should find notes by tag', () => {
      createNote('Title', 'content', '默认', ['important', 'review']);
      const results = searchNotes('review');
      expect(results.length).toBe(1);
    });

    it('should return empty array for no match', () => {
      createNote('Title', 'content');
      expect(searchNotes('xyz-not-found')).toEqual([]);
    });
  });

  describe('getFolders', () => {
    beforeEach(() => {
      getAllNotes().forEach((n: Record<string, unknown>) => deleteNote(n.id as string));
    });

    it('should return unique folders', () => {
      createNote('A', 'content', 'Folder1');
      createNote('B', 'content', 'Folder2');
      createNote('C', 'content', 'Folder1');

      const folders = getFolders();
      expect(folders).toContain('Folder1');
      expect(folders).toContain('Folder2');
    });
  });

  describe('getStats', () => {
    it('should return total count', () => {
      const stats = getStats();
      expect(typeof stats.total).toBe('number');
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('importObsidianVault', () => {
    it('should return zero for non-existent path', () => {
      const result = importObsidianVault('/non-existent/path');
      expect(result.imported).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should import markdown files from directory', () => {
      const vaultDir = path.join(testDir, 'vault');
      fs.mkdirSync(vaultDir, { recursive: true });
      fs.writeFileSync(path.join(vaultDir, 'note1.md'), '# Note 1\nContent here', 'utf8');
      fs.writeFileSync(path.join(vaultDir, 'note2.md'), '---\ntitle: Custom Title\ntags: [a, b]\n---\nBody', 'utf8');

      const result = importObsidianVault(vaultDir);
      expect(result.imported).toBe(2);
      expect(result.errors).toBe(0);

      const notes = getAllNotes();
      const titles = notes.map((n: Record<string, unknown>) => n.title);
      expect(titles).toContain('note1');
      expect(titles).toContain('Custom Title');
    });

    it('should handle nested directories', () => {
      const vaultDir = path.join(testDir, 'nested-vault');
      const subDir = path.join(vaultDir, 'sub');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'deep.md'), 'Deep note', 'utf8');

      const result = importObsidianVault(vaultDir);
      expect(result.imported).toBe(1);

      const notes = getAllNotes();
      const note = notes.find((n: Record<string, unknown>) => n.title === 'deep') as Record<string, unknown>;
      expect(note.folder).toBe('sub');
    });
  });
});
