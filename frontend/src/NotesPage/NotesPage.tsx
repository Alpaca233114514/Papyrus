import { useState, useCallback, useMemo, useEffect } from 'react';
import { Message } from '@arco-design/web-react';
import { NoteListView } from './views/NoteListView';
import { NoteDetailView } from './views/NoteDetailView';
import { FileTree } from './components/FileTree';
import { useNotes } from './useNotes';

import type { Note } from './types';

// 视图模式
type ViewMode = 'list' | 'detail';

const NotesPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);

  const {
    notes,
    folders,
    allTags,
    filteredNotes,
    activeFolder,
    totalWords,
    todayNotes,
    setActiveFolder,
    saveNote,
    deleteNote,
    refreshNotes,
  } = useNotes();

  // 获取所有文件夹名称
  const allFolders = useMemo(() => 
    folders.filter(f => f.name !== '全部笔记').map(f => f.name),
    [folders]
  );

  // 打开笔记详情
  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
    setIsCreateMode(false);
    setViewMode('detail');
  }, []);

  // 新建笔记
  const handleCreateClick = useCallback(() => {
    setSelectedNote(null);
    setIsCreateMode(true);
    setViewMode('detail');
  }, []);

  // 在指定文件夹新建笔记
  const handleCreateInFolder = useCallback((folder: string) => {
    setSelectedNote({
      id: 'temp',
      title: '',
      folder,
      preview: '',
      tags: [],
      updatedAt: '今天',
      wordCount: 0,
      content: '',
    });
    setIsCreateMode(true);
    setViewMode('detail');
  }, []);

  // 返回列表
  const handleBack = useCallback(() => {
    setViewMode('list');
    setSelectedNote(null);
    setIsCreateMode(false);
  }, []);

  // 删除后返回列表
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteNote(id);
      setViewMode('list');
      Message.success('删除成功');
    } catch (err) {
      Message.error(err instanceof Error ? err.message : '删除失败');
    }
  }, [deleteNote]);

  // 监听全局新建笔记事件（来自 TitleBar）
  useEffect(() => {
    const handleGlobalNewNote = () => {
      handleCreateClick();
    };
    window.addEventListener('papyrus_new_note', handleGlobalNewNote);
    return () => window.removeEventListener('papyrus_new_note', handleGlobalNewNote);
  }, [handleCreateClick]);

  // 保存笔记（可选是否返回列表）
  const handleSave = useCallback(async (
    params: Parameters<typeof saveNote>[0],
    isCreate: Parameters<typeof saveNote>[1],
    shouldReturnToList = true
  ) => {
    await saveNote(params, isCreate);
    if (shouldReturnToList) {
      setViewMode('list');
    }
  }, [saveNote]);

  // 侧边栏拖拽调整
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(400, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--color-bg-1)',
    }}>
      {/* 文件树侧边栏 - 只在详情模式显示 */}
      {viewMode === 'detail' && (
        <>
          <FileTree
            notes={notes}
            selectedNoteId={selectedNote?.id || null}
            onSelectNote={handleNoteClick}
            onCreateNote={handleCreateInFolder}
            width={sidebarWidth}
          />
          {/* 拖拽条 */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              width: '4px',
              cursor: isResizing ? 'col-resize' : 'ew-resize',
              background: isResizing ? PRIMARY_COLOR : 'transparent',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isResizing) e.currentTarget.style.background = 'var(--color-border-2)';
            }}
            onMouseLeave={(e) => {
              if (!isResizing) e.currentTarget.style.background = 'transparent';
            }}
          />
        </>
      )}

      {/* 主内容区 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'list' ? (
          <NoteListView
            folders={folders}
            allTags={allTags}
            notes={filteredNotes}
            activeFolder={activeFolder}
            totalWords={totalWords}
            todayNotes={todayNotes}
            onFolderChange={setActiveFolder}
            onNoteClick={handleNoteClick}
            onCreateClick={handleCreateClick}
            onNotesDeleted={refreshNotes}
          />
        ) : (
          <NoteDetailView
            note={selectedNote}
            isCreateMode={isCreateMode}
            allFolders={allFolders}
            onBack={handleBack}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
};

const PRIMARY_COLOR = '#206CCF';
const SECONDARY_COLOR = '#9FD4FD';

export default NotesPage;
