import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

function ensureDir(dirPath: string): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

const dataDir = process.env.PAPYRUS_DATA_DIR
  ? path.resolve(process.env.PAPYRUS_DATA_DIR)
  : path.join(os.homedir(), 'PapyrusData');

export const paths = {
  dataDir: ensureDir(dataDir),
  dbFile: path.join(dataDir, 'papyrus.db'),
  dataFile: path.join(dataDir, 'data.json'),
  aiConfigFile: path.join(dataDir, 'ai_config.json'),
  masterKeyFile: path.join(dataDir, '.master_key'),
  logDir: ensureDir(path.join(dataDir, 'logs')),
  vaultDir: path.join(dataDir, 'vault'),
  backupDir: ensureDir(path.join(dataDir, 'backups')),
};
