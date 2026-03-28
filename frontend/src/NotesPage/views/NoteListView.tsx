import { Typography, Button, Tag } from '@arco-design/web-react';
import { IconPlus, IconDownload } from '@arco-design/web-react/icon';
import type { Note, Folder } from '../types';
import { NoteCard, FolderTab, AddCard, StatsBar } from '../components';
import { PRIMARY_COLOR, UNIFIED_BTN_STYLE } from '../constants';

interface NoteListViewProps {
  folders: Folder[];
  allTags: string[];
  notes: Note[];
  activeFolder: string;
  totalWords: number;
  todayNotes: number;
  onFolderChange: (folder: string) => void;
  onNoteClick: (note: Note) => void;
  onCreateClick: () => void;
  onImportObsidian?: () => void;
}

export const NoteListView = ({
  folders,
  allTags,
  notes,
  activeFolder,
  totalWords,
  todayNotes,
  onFolderChange,
  onNoteClick,
  onCreateClick,
  onImportObsidian,
}: NoteListViewProps) => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px' }}>
      {/* 标题栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px' 
      }}>
        <div>
          <Typography.Title 
            heading={1} 
            style={{ fontWeight: 600, lineHeight: 1, margin: 0, fontSize: '40px' }}
          >
            笔记库
          </Typography.Title>
          <Typography.Text 
            type='secondary' 
            style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}
          >
            {activeFolder} · {notes.length} 篇 · {totalWords.toLocaleString()} 字
          </Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button 
            type='secondary' 
            icon={<IconDownload />} 
            onClick={onImportObsidian}
            style={{ ...UNIFIED_BTN_STYLE }}
          >
            从 Obsidian 导入
          </Button>
          <Button 
            type='primary' 
            icon={<IconPlus />} 
            onClick={onCreateClick}
            style={{ ...UNIFIED_BTN_STYLE, backgroundColor: PRIMARY_COLOR }}
          >
            新建笔记
          </Button>
        </div>
      </div>

      {/* 统计栏 */}
      <StatsBar 
        noteCount={notes.length}
        totalWords={totalWords}
        todayNotes={todayNotes}
        tagCount={allTags.length}
      />

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
          <NoteCard key={note.id} note={note} onClick={() => onNoteClick(note)} />
        ))}
        <AddCard onClick={onCreateClick} />
      </div>

      <div style={{ height: '32px' }} />
    </div>
  );
};
