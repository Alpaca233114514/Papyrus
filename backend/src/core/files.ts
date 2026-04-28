import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadAllFiles,
  insertFile,
  getFileById,
  getFilesByParentId,
  deleteFileById,
} from '../db/database.js';
import { paths } from '../utils/paths.js';

import type { FileRecord } from './types.js';
import type { PapyrusLogger } from '../utils/logger.js';

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 200);
}

export function listFiles(logger?: PapyrusLogger): FileRecord[] {
  const files = loadAllFiles(logger);

  // Count children for folders (itemCount)
  const childCounts = new Map<string, number>();
  for (const f of files) {
    if (f.parent_id) {
      childCounts.set(f.parent_id, (childCounts.get(f.parent_id) ?? 0) + 1);
    }
  }

  return files.map(f => ({
    ...f,
    itemCount: f.is_folder ? (childCounts.get(f.id) ?? 0) : undefined,
  }));
}

export function createFolder(
  name: string,
  parentId?: string,
  logger?: PapyrusLogger,
): FileRecord & { itemCount: number } {
  const now = Date.now() / 1000;
  const record: FileRecord = {
    id: uuidv4().replace(/-/g, ''),
    name: name.trim(),
    type: 'folder',
    size: 0,
    mime_type: '',
    parent_id: parentId ?? null,
    file_storage_path: null,
    is_folder: 1,
    created_at: now,
    updated_at: now,
  };

  insertFile(record, logger);
  logger?.info(`创建文件夹: ${record.id} -> ${name}`);
  return { ...record, itemCount: 0 };
}

function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

function inferType(ext: string): string {
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md', 'json'].includes(ext)) return 'document';
  return 'unknown';
}

export function saveFile(
  name: string,
  base64Content: string,
  mimeType?: string,
  parentId?: string,
  logger?: PapyrusLogger,
): FileRecord {
  const now = Date.now() / 1000;
  const id = uuidv4().replace(/-/g, '');
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const safeName = sanitizeFilename(name);
  const storageName = `${id}_${safeName}`;

  // Ensure vault directory exists
  const vaultDir = paths.vaultDir;
  fs.mkdirSync(vaultDir, { recursive: true });

  // Decode and write file content
  const buffer = Buffer.from(base64Content, 'base64');
  const storagePath = path.join(vaultDir, storageName);
  fs.writeFileSync(storagePath, buffer);

  const mime = mimeType || getMimeType(ext);
  const fileType = inferType(ext);

  const record: FileRecord = {
    id,
    name: name.trim(),
    type: fileType,
    size: buffer.length,
    mime_type: mime,
    parent_id: parentId ?? null,
    file_storage_path: storagePath,
    is_folder: 0,
    created_at: now,
    updated_at: now,
  };

  insertFile(record, logger);
  logger?.info(`保存文件: ${record.id} -> ${name} (${buffer.length} bytes)`);
  return record;
}

export function deleteFileItem(
  fileId: string,
  logger?: PapyrusLogger,
): { deleted: number } {
  const file = getFileById(fileId);
  if (!file) return { deleted: 0 };

  let count = 0;

  // If folder, recursively delete children first
  if (file.is_folder) {
    const children = getFilesByParentId(fileId);
    for (const child of children) {
      const result = deleteFileItem(child.id, logger);
      count += result.deleted;
    }
  }

  // Delete the file from disk if it has a storage path
  if (file.file_storage_path && fs.existsSync(file.file_storage_path)) {
    fs.unlinkSync(file.file_storage_path);
    logger?.info(`删除磁盘文件: ${file.file_storage_path}`);
  }

  deleteFileById(fileId, logger);
  count += 1;
  return { deleted: count };
}

export function getFileStream(fileId: string): { stream: fs.ReadStream; file: FileRecord } | null {
  const file = getFileById(fileId);
  if (!file || !file.file_storage_path || !fs.existsSync(file.file_storage_path)) {
    return null;
  }
  return {
    stream: fs.createReadStream(file.file_storage_path),
    file,
  };
}

export { getFileById };
