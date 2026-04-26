import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

function ensureDir(dirPath: string): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function getDataDir(): string {
  const dir = process.env.PAPYRUS_DATA_DIR
    ? path.resolve(process.env.PAPYRUS_DATA_DIR)
    : path.join(os.homedir(), 'PapyrusData');
  return ensureDir(dir);
}

export const paths = {
  get dataDir() { return getDataDir(); },
  get dbFile() { return path.join(getDataDir(), 'papyrus.db'); },
  get dataFile() { return path.join(getDataDir(), 'data.json'); },
  get aiConfigFile() { return path.join(getDataDir(), 'ai_config.json'); },
  get masterKeyFile() { return path.join(getDataDir(), '.master_key'); },
  get logDir() { return ensureDir(path.join(getDataDir(), 'logs')); },
  get vaultDir() { return path.join(getDataDir(), 'vault'); },
  get backupDir() { return ensureDir(path.join(getDataDir(), 'backups')); },
};
