import { useState, useMemo, useCallback, useEffect } from 'react';
import { api } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Note, Folder, CreateNoteParams, UpdateNoteParams } from './types';


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
  saveNote: (params: UpdateNoteParams | CreateNoteParams, isCreate: boolean) => Promise<{ id: string } | undefined>;
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



export const useNotes = (): UseNotesReturn => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState('全部笔记');

  // 从 API 加载笔记
  const refreshNotes = useCallback(async () => {
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
          updatedAtTimestamp: n.updated_at,
          wordCount: n.word_count,
          content: n.content,
        }));
        setNotes(formattedNotes);
      }
    } catch (err) {
      console.error('[useNotes] Error loading notes:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useWebSocket({
    onFileChange: (event) => {
      if (event.path.includes('.db') || event.path.includes('sqlite')) {
        refreshNotes();
      }
    },
  });

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
    filteredNotes.reduce((sum, n) => sum + (n.wordCount || 0), 0),
    [filteredNotes]
  );

  const todayNotes = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
    return filteredNotes.filter(n => n.updatedAtTimestamp >= startOfToday).length;
  }, [filteredNotes]);

  // 保存笔记
  const saveNote = useCallback(async (
    params: UpdateNoteParams | CreateNoteParams,
    isCreate: boolean
  ) => {
    try {
      let createdNote = null;
      if (isCreate) {
        const createParams = params as CreateNoteParams;
        const result = await api.createNote(
          createParams.title,
          createParams.folder,
          createParams.content,
          createParams.tags
        );
        createdNote = result.note;
      } else {
        const updateParams = params as UpdateNoteParams;
        const result = await api.updateNote(updateParams.id, {
          title: updateParams.title,
          folder: updateParams.folder,
          content: updateParams.content,
          tags: updateParams.tags,
        });
        createdNote = result.note;
      }
      await refreshNotes();
      window.dispatchEvent(new CustomEvent('papyrus_notes_changed'));
      return createdNote;
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      throw new Error(message);
    }
  }, [refreshNotes]);

  // 删除笔记
  const deleteNote = useCallback(async (id: string) => {
    try {
      await api.deleteNote(id);
      await refreshNotes();
      window.dispatchEvent(new CustomEvent('papyrus_notes_changed'));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '删除笔记失败');
    }
  }, [refreshNotes]);

  // 从 Obsidian 导入
  const importFromObsidian = useCallback(async (vaultPath: string) => {
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
