import { Typography } from '@arco-design/web-react';
import { useState } from 'react';

interface Collection {
  id: string;
  title: string;
  scrollCount: number;
  dueCount: number;
  lastUsed: string; // 显示用字符串，如 "今天"、"3天前"
  // i18n: reserved for future localization
  color: string;
}

// 样板数据
const MOCK_COLLECTIONS: Collection[] = [
  { id: '1', title: '高等数学', scrollCount: 128, dueCount: 12, lastUsed: '今天', color: '#206CCF' },
  { id: '2', title: 'English Vocabulary', scrollCount: 340, dueCount: 0, lastUsed: '昨天', color: '#206CCF' },
  { id: '3', title: '操作系统', scrollCount: 76, dueCount: 5, lastUsed: '3天前', color: '#206CCF' },
  { id: '4', title: '日本語 N2', scrollCount: 210, dueCount: 31, lastUsed: '5天前', color: '#206CCF' },
];

const CollectionCard = ({ collection }: { collection: Collection }) => {
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
        border: `1px solid ${hovered ? collection.color : 'var(--color-text-3)'}`,
        background: hovered ? `${collection.color}0f` : 'transparent',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        boxSizing: 'border-box',
      }}
    >
      {/* 顶部：标题 + 待复习徽标 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {collection.dueCount > 0 && (
          <div style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            background: collection.color,
            color: '#fff',
            borderRadius: '999px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: '20px',
          }}>
            {collection.dueCount} 待复习
          </div>
        )}
        {collection.dueCount === 0 && (
          <div style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            background: 'var(--color-fill-2)',
            color: 'var(--color-text-3)',
            borderRadius: '999px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: '20px',
          }}>
            已完成
          </div>
        )}
        <Typography.Text bold style={{ fontSize: '18px', lineHeight: 1.3 }}>
          {collection.title}
        </Typography.Text>
      </div>

      {/* 底部：卡片数 + 最近使用 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
          {collection.scrollCount} 张卷轴
        </Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
          {collection.lastUsed}
        </Typography.Text>
      </div>
    </div>
  );
};

interface RecentScrollsProps {
  /** 与上方窗景卡片保持一致的高度 */
  height: number;
}

const RecentScrolls = ({ height }: RecentScrollsProps) => (
  <div style={{
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    height: `${height}px`,
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '4px',
  }}>
    {MOCK_COLLECTIONS.map(c => (
      <CollectionCard key={c.id} collection={c} />
    ))}
  </div>
);

export default RecentScrolls;