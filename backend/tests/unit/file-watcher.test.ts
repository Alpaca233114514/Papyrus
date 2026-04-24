import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileWatcher, getFileWatcher, startFileWatching, stopFileWatching } from '../../src/integrations/file-watcher.js';

describe('FileWatcher', () => {
  let tempDir: string;
  let watcher: FileWatcher;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'papyrus-fw-test-'));
    watcher = new FileWatcher(tempDir);
  });

  afterEach(() => {
    watcher.stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
    stopFileWatching();
  });

  it('should call callback on db file creation', async () => {
    const events: Array<{ type: string; path: string }> = [];
    watcher.start((type, filePath) => {
      events.push({ type, path: filePath });
    });

    await new Promise(r => setTimeout(r, 100));

    fs.writeFileSync(path.join(tempDir, 'test.db'), 'data');

    await new Promise(r => setTimeout(r, 400));
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('created');
  });

  it('should call callback on db file modification', async () => {
    const dbPath = path.join(tempDir, 'test.db');
    fs.writeFileSync(dbPath, 'initial');

    const events: Array<{ type: string; path: string }> = [];
    watcher.start((type, filePath) => {
      events.push({ type, path: filePath });
    });

    await new Promise(r => setTimeout(r, 100));

    fs.writeFileSync(dbPath, 'modified');
    await new Promise(r => setTimeout(r, 300));

    const modifiedEvents = events.filter(e => e.type === 'modified');
    expect(modifiedEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should debounce rapid modifications', async () => {
    const dbPath = path.join(tempDir, 'test.db');
    fs.writeFileSync(dbPath, 'initial');

    const events: Array<{ type: string; path: string }> = [];
    watcher.start((type, filePath) => {
      events.push({ type, path: filePath });
    });

    await new Promise(r => setTimeout(r, 100));

    fs.writeFileSync(dbPath, 'v1');
    fs.writeFileSync(dbPath, 'v2');
    fs.writeFileSync(dbPath, 'v3');

    await new Promise(r => setTimeout(r, 300));

    const modifiedEvents = events.filter(e => e.type === 'modified');
    expect(modifiedEvents.length).toBeLessThanOrEqual(2);
  });

  it('should ignore non-db files', async () => {
    const events: Array<{ type: string; path: string }> = [];
    watcher.start((type, filePath) => {
      events.push({ type, path: filePath });
    });

    fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'hello');
    await new Promise(r => setTimeout(r, 300));

    expect(events.length).toBe(0);
  });

  it('should return singleton from getFileWatcher', () => {
    const fw1 = getFileWatcher();
    const fw2 = getFileWatcher();
    expect(fw1).toBe(fw2);
  });

  it('should report running state', () => {
    expect(watcher.isRunning()).toBe(false);
    watcher.start(() => {});
    expect(watcher.isRunning()).toBe(true);
    watcher.stop();
    expect(watcher.isRunning()).toBe(false);
  });
});
