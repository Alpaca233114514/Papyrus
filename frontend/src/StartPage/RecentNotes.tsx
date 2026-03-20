import { Typography } from '@arco-design/web-react';
import { useState } from 'react';

interface Note {
  id: string;
  title: string;
  preview: string; // 内容摘要
  lastUsed: string;
  // i18n: reserved for future localization
}

const MOCK_NOTES: Note[] = [
  { id: '1', title: '线性代数笔记', preview: '矩阵乘法、行列式、特征值...', lastUsed: '今天' },
  { id: '2', title: 'React Hooks', preview: 'useState, useEffect, useRef...', lastUsed: '昨天' },
  { id: '3', title: '计算机网络', preview: 'TCP/IP、HTTP、DNS 协议...', lastUsed: '2天前' },
  { id: '4', title: '算法与数据结构', preview: '排序、树、图、动态规划...', lastUsed: '4天前' },
];

const NoteCard = ({ note }: { note: Note }) => {
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
        border: `1px solid ${hovered ? '#206CCF' : 'var(--color-text-3)'}`,
        background: hovered ? 'rgba(232, 255, 234, 0.3)' : 'transparent',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
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

const RecentNotes = ({ height }: RecentNotesProps) => (
  <div style={{
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    height: `${height}px`,
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '4px',
  }}>
    {MOCK_NOTES.map(n => (
      <NoteCard key={n.id} note={n} />
    ))}
  </div>
);

export default RecentNotes;