import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const workerId = process.env.JEST_WORKER_ID ?? '0';
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `papyrus-jest-w${workerId}-`));
process.env.PAPYRUS_DATA_DIR = tmpDir;
