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
  const withoutTraversal = name.replace(/\.\./g, '_');
  return withoutTraversal.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 200);
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

function validateFileContent(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 8) return true;
  const signatures: Record<string, number[][]> = {
    png: [[0x89, 0x50, 0x4E, 0x47]],
    jpg: [[0xFF, 0xD8, 0xFF]],
    jpeg: [[0xFF, 0xD8, 0xFF]],
    gif: [[0x47, 0x49, 0x46, 0x38]],
    pdf: [[0x25, 0x50, 0x44, 0x46]],
    zip: [[0x50, 0x4B, 0x03, 0x04]],
    docx: [[0x50, 0x4B, 0x03, 0x04]],
    xlsx: [[0x50, 0x4B, 0x03, 0x04]],
    '7z': [[0x37, 0x7A, 0xBC, 0xAF]],
    mp4: [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
    webp: [[0x52, 0x49, 0x46, 0x46]],
  };
  const sigList = signatures[ext];
  if (!sigList) return true;
  return sigList.some(sig => sig.every((byte, i) => buffer[i] === byte));
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

  const mime = mimeType || getMimeType(ext);
  const fileType = inferType(ext);

  const record: FileRecord = {
    id,
    name: name.trim(),
    type: fileType,
    size: 0,
    mime_type: mime,
    parent_id: parentId ?? null,
    file_storage_path: null,
    is_folder: 0,
    created_at: now,
    updated_at: now,
  };

  // 先写数据库，保证元数据持久化
  insertFile(record, logger);

  try {
    // Decode and write file content
    const buffer = Buffer.from(base64Content, 'base64');
    if (!validateFileContent(buffer, ext)) {
      throw new Error(`文件内容与实际扩展名 ${ext} 不匹配，可能为伪造文件`);
    }
    const storagePath = path.join(vaultDir, storageName);
    fs.writeFileSync(storagePath, buffer);

    // 更新数据库中的文件路径和大小
    record.file_storage_path = storagePath;
    record.size = buffer.length;
    insertFile(record, logger); // 重新插入以更新（或替换现有记录）

    logger?.info(`保存文件: ${record.id} -> ${name} (${buffer.length} bytes)`);
    return record;
  } catch (err) {
    // 磁盘写入失败，删除数据库记录避免孤儿文件
    try {
      deleteFileById(id, logger);
    } catch (cleanupErr) {
      logger?.error(`清理失败的数据库记录时出错: ${id} - ${cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)}`);
    }
    throw err;
  }
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
