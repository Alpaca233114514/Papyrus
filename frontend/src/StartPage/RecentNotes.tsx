import { Typography, Spin } from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { api, type Note } from '../api';

const SECONDARY_COLOR = '#9FD4FD';

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    preview: string;
    lastUsed: string;
  };
}

const NoteCard = ({ note }: NoteCardProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 auto',
        width: '220px',
        height: '100%',
        borderRadius: '16px',
        border: `2px solid ${hovered ? SECONDARY_COLOR : 'var(--color-text-3)'}`,
        background: 'transparent',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Typography.Text bold style={{ fontSize: '18px', lineHeight: 1.3 }}>
          {note.title}
        </Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: '13px', lineHeight: 1.5 }}>
          {note.preview}
        </Typography.Text>
      </div>

      <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
        {note.lastUsed}
      </Typography.Text>
    </div>
  );
};

interface RecentNotesProps {
  height: number;
}

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

const RecentNotes = ({ height }: RecentNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await api.listNotes();
        if (response.success) {
          // 取最近4条笔记，按更新时间排序
          const sortedNotes = response.notes
            .sort((a, b) => b.updated_at - a.updated_at)
            .slice(0, 4);
          setNotes(sortedNotes);
        }
      } catch (err) {
        console.error('获取最近笔记失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
        height: `${height}px`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spin size={24} />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
        height: `${height}px`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography.Text type="secondary">暂无笔记</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      gap: '16px',
      height: `${height}px`,
      overflowX: 'auto',
      overflowY: 'hidden',
      paddingBottom: '4px',
    }}>
      {notes.map(n => (
        <NoteCard
          key={n.id}
          note={{
            id: n.id,
            title: n.title,
            preview: n.preview,
            lastUsed: formatTimestamp(n.updated_at),
          }}
        />
      ))}
    </div>
  );
};

export default RecentNotes;
