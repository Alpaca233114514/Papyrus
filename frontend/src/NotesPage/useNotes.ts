import { useState, useMemo, useCallback, useEffect } from 'react';
import { api } from '../api';
import type { Note, Folder, CreateNoteParams, UpdateNoteParams } from './types';
import { MOCK_NOTES } from './mock';

export interface UseNotesReturn {
  // 数据
  notes: Note[];
  folders: Folder[];
  allTags: string[];
  filteredNotes: Note[];
  isLoading: boolean;
  error: string | null;
  
  // 状态
  activeFolder: string;
  
  // 统计
  totalWords: number;
  todayNotes: number;
  
  // 操作方法
  setActiveFolder: (folder: string) => void;
  saveNote: (params: UpdateNoteParams | CreateNoteParams, isCreate: boolean) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
  importFromObsidian: (vaultPath: string) => Promise<{ imported: number; skipped: number }>;
}

// 生成文件夹列表
const generateFolders = (notes: Note[]): Folder[] => {
  const folderMap = new Map<string, number>();
  folderMap.set('全部笔记', notes.length);
  notes.forEach(note => {
    folderMap.set(note.folder, (folderMap.get(note.folder) || 0) + 1);
  });
  return Array.from(folderMap.entries()).map(([name, count]) => ({ name, count }));
};

// 生成标签列表
const generateTags = (notes: Note[]): string[] => {
  const tagSet = new Set<string>();
  notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet);
};

// ===== Mock 数据模式 =====
// 设为 true 使用 mock 数据，false 则调用真实 API
const USE_MOCK = true;

export const useNotes = (): UseNotesReturn => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState('全部笔记');

  // 从 API 或 Mock 加载笔记
  const refreshNotes = useCallback(async () => {
    if (USE_MOCK) {
      // Mock 模式：直接使用 mock 数据
      setIsLoading(true);
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      setNotes(MOCK_NOTES);
      setIsLoading(false);
      return;
    }

    // 真实 API 模式
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.listNotes();
      if (response.success) {
        // 转换后端数据格式到前端格式
        const formattedNotes: Note[] = response.notes.map(n => ({
          id: n.id,
          title: n.title,
          folder: n.folder,
          preview: n.preview,
          tags: n.tags,
          updatedAt: formatTimestamp(n.updated_at),
          wordCount: n.word_count,
          content: n.content,
        }));
        setNotes(formattedNotes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    refreshNotes();
  }, [refreshNotes]);

  // 派生数据
  const folders = useMemo(() => generateFolders(notes), [notes]);
  const allTags = useMemo(() => generateTags(notes), [notes]);

  const filteredNotes = useMemo(() => {
    if (activeFolder === '全部笔记') return notes;
    return notes.filter(n => n.folder === activeFolder);
  }, [notes, activeFolder]);

  const totalWords = useMemo(() => 
    filteredNotes.reduce((sum, n) => n.wordCount, 0),
    [filteredNotes]
  );

  const todayNotes = useMemo(() => {
    // 使用 updatedAt 字符串判断是否为今天
    return filteredNotes.filter(n => n.updatedAt === '今天').length;
  }, [filteredNotes]);

  // 保存笔记
  const saveNote = useCallback(async (
    params: UpdateNoteParams | CreateNoteParams, 
    isCreate: boolean
  ) => {
    if (USE_MOCK) {
      // Mock 模式：本地更新数据
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (isCreate) {
        const newNote: Note = {
          id: 'mock_' + Date.now(),
          title: params.title,
          folder: params.folder,
          content: params.content,
          preview: params.content.slice(0, 100) + '...',
          tags: params.tags,
          updatedAt: '今天',
          wordCount: params.content.length,
        };
        setNotes(prev => [newNote, ...prev]);
      } else {
        setNotes(prev => prev.map(n => {
          if (n.id === params.id) {
            return {
              ...n,
              title: params.title,
              folder: params.folder,
              content: params.content,
              preview: params.content.slice(0, 100) + '...',
              tags: params.tags,
              updatedAt: '今天',
              wordCount: params.content.length,
            };
          }
          return n;
        }));
      }
      return;
    }

    // 真实 API 模式
    if (isCreate) {
      const createParams = params as CreateNoteParams;
      await api.createNote(
        createParams.title,
        createParams.folder,
        createParams.content,
        createParams.tags
      );
    } else {
      const updateParams = params as UpdateNoteParams;
      await api.updateNote(updateParams.id, {
        title: updateParams.title,
        folder: updateParams.folder,
        content: updateParams.content,
        tags: updateParams.tags,
      });
    }
    await refreshNotes();
  }, [refreshNotes]);

  // 删除笔记
  const deleteNote = useCallback(async (id: string) => {
    if (USE_MOCK) {
      // Mock 模式：本地删除
      await new Promise(resolve => setTimeout(resolve, 200));
      setNotes(prev => prev.filter(n => n.id !== id));
      return;
    }

    // 真实 API 模式
    await api.deleteNote(id);
    await refreshNotes();
  }, [refreshNotes]);

  // 从 Obsidian 导入
  const importFromObsidian = useCallback(async (vaultPath: string) => {
    if (USE_MOCK) {
      // Mock 模式：模拟导入
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { imported: 5, skipped: 2 };
    }

    const result = await api.importObsidian(vaultPath);
    await refreshNotes();
    return { imported: result.imported, skipped: result.skipped };
  }, [refreshNotes]);

  return {
    notes,
    folders,
    allTags,
    filteredNotes,
    isLoading,
    error,
    activeFolder,
    totalWords,
    todayNotes,
    setActiveFolder,
    saveNote,
    deleteNote,
    refreshNotes,
    importFromObsidian,
  };
};

// 辅助函数：时间戳转换为相对时间字符串
function formatTimestamp(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp * 1000);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return `${Math.floor(diffDays / 30)}月前`;
}
