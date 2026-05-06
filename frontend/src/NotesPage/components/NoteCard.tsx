import { useState } from 'react';
import { Typography, Tag, Checkbox } from '@arco-design/web-react';
import { IconFolder } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';
import type { Note } from '../types';
import { PRIMARY_COLOR } from '../constants';

function formatTimestamp(timestamp: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const now = new Date();
  const date = new Date(timestamp * 1000);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('notesPage.today');
  if (diffDays === 1) return t('notesPage.yesterday');
  if (diffDays < 7) return t('notesPage.daysAgo', { count: diffDays });
  if (diffDays < 30) return t('notesPage.weeksAgo', { count: Math.floor(diffDays / 7) });
  return t('notesPage.monthsAgo', { count: Math.floor(diffDays / 30) });
}

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const NoteCard = ({ note, onClick, selectable, selected, onToggleSelect }: NoteCardProps) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  const cardStyle = {
    borderRadius: '16px',
    border: `1px solid ${selected ? PRIMARY_COLOR : hovered ? PRIMARY_COLOR : 'var(--color-text-3)'}`,
    background: selected ? `${PRIMARY_COLOR}10` : hovered ? `${PRIMARY_COLOR}08` : 'var(--color-bg-1)',
    transition: 'border-color 0.2s, background 0.2s',
    cursor: 'pointer',
    height: '200px',
    boxSizing: 'border-box' as const,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={selectable ? () => onToggleSelect?.(note.id) : onClick}
      style={cardStyle}
    >
      {selectable && (
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onChange={() => onToggleSelect?.(note.id)}
          />
        </div>
      )}
      {/* 头部：文件夹和时间 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px' 
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--color-fill-2)',
          color: 'var(--color-text-3)',
          borderRadius: '999px',
          padding: '2px 10px',
          fontSize: '11px',
        }}>
          <IconFolder style={{ fontSize: '10px' }} />
          {note.folder}
        </div>
        <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
          {formatTimestamp(note.updatedAtTimestamp, t)}
        </Typography.Text>
      </div>

      {/* 标题 */}
      <Typography.Text bold style={{ fontSize: '16px', lineHeight: 1.4, marginBottom: '8px' }}>
        {note.title}
      </Typography.Text>

      {/* 预览 */}
      <Typography.Paragraph
        type='secondary'
        style={{ fontSize: '13px', lineHeight: '1.6', margin: 0, flex: 1 }}
        ellipsis={{ rows: 3 }}
      >
        {note.preview}
      </Typography.Paragraph>

      {/* 底部：标签和字数 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '16px' 
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {note.tags.slice(0, 2).map(tag => (
            <Tag key={tag} size='small' color='arcoblue' style={{ fontSize: '11px' }}>
              {tag}
            </Tag>
          ))}
          {note.tags.length > 2 && (
            <Tag size='small' style={{ fontSize: '11px', background: 'var(--color-fill-2)' }}>
              +{note.tags.length - 2}
            </Tag>
          )}
        </div>
        <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
          {note.wordCount} 字
        </Typography.Text>
      </div>
    </div>
  );
};
