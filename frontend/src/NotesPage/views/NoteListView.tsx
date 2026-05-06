import { useState, useCallback } from 'react';
import { Typography, Button, Tag, Message, Modal } from '@arco-design/web-react';
import { IconPlus, IconDelete, IconClose } from '@arco-design/web-react/icon';
import type { Note, Folder } from '../types';
import { NoteCard, FolderTab, AddCard } from '../components';
import { PRIMARY_COLOR, UNIFIED_BTN_STYLE } from '../constants';
import { api } from '../../api';
import { PageLayout } from '../../components';

interface NoteListViewProps {
  folders: Folder[];
  allTags: string[];
  notes: Note[];
  activeFolder: string;
  totalWords: number;
  todayNotes: number;
  isLoading: boolean;
  onFolderChange: (folder: string) => void;
  onNoteClick: (note: Note) => void;
  onCreateClick: () => void;
  onNotesDeleted: () => void;
}

export const NoteListView = ({
  folders,
  allTags,
  notes,
  activeFolder,
  totalWords,
  todayNotes,
  isLoading,
  onFolderChange,
  onNoteClick,
  onCreateClick,
  onNotesDeleted,
}: NoteListViewProps) => {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const cancelSelect = useCallback(() => {
    setSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedIds.size} 篇笔记吗？此操作不可撤销。`,
      onOk: async () => {
        try {
          const res = await api.batchDeleteNotes([...selectedIds]);
          Message.success(`已删除 ${res.deleted} 篇笔记`);
          setSelectedIds(new Set());
          setSelecting(false);
          onNotesDeleted();
        } catch {
          Message.error('批量删除失败');
        }
      },
    });
  }, [selectedIds, onNotesDeleted]);

  const actions = (
    <>
      <Button
        onClick={() => setSelecting(true)}
        style={UNIFIED_BTN_STYLE}
      >
        批量选择
      </Button>
      <Button
        type='primary'
        icon={<IconPlus />}
        onClick={onCreateClick}
        style={{ ...UNIFIED_BTN_STYLE, backgroundColor: PRIMARY_COLOR }}
      >
        新建笔记
      </Button>
    </>
  );

  const pageStats = [
    { label: '笔记数', value: notes.length },
    { label: '总字数', value: totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords },
    { label: '今日更新', value: todayNotes },
    { label: '标签', value: allTags.length },
  ];

  return (
    <PageLayout
      title='笔记库'
      pageKey='notes'
      actions={selecting ? (
        <>
          <Button
            type='primary'
            status='danger'
            icon={<IconDelete />}
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0}
            style={{ ...UNIFIED_BTN_STYLE }}
          >
            删除选中 ({selectedIds.size})
          </Button>
          <Button
            icon={<IconClose />}
            onClick={cancelSelect}
            style={UNIFIED_BTN_STYLE}
          >
            取消
          </Button>
        </>
      ) : actions}
      stats={pageStats}
      statsLoading={isLoading}
    >
      {/* 文件夹标签 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        overflowX: 'auto',
        paddingBottom: '4px',
      }}>
        {folders.map(({ name, count }) => (
          <FolderTab
            key={name}
            folder={name}
            count={count}
            isActive={activeFolder === name}
            onClick={() => onFolderChange(name)}
          />
        ))}
      </div>

      {/* 标签筛选 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {allTags.map(tag => (
          <Tag key={tag} color='arcoblue' style={{ cursor: 'pointer' }}>
            {tag}
          </Tag>
        ))}
      </div>

      {/* 笔记卡片网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {notes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={() => onNoteClick(note)}
            selectable={selecting}
            selected={selectedIds.has(note.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
        <AddCard onClick={onCreateClick} />
      </div>
    </PageLayout>
  );
};
