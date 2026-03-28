import { Typography, Spin } from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { api, type Card } from '../api';

interface Collection {
  id: string;
  title: string;
  scrollCount: number;
  dueCount: number;
  lastUsed: string;
  color: string;
}

const SECONDARY_COLOR = '#9FD4FD';
const PRIMARY_COLOR = '#206CCF';

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
          {collection.scrollCount} 张卡片
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

// 辅助函数：从卡片内容提取分类（基于问题的前几个字或预设分类）
function categorizeCards(cards: Card[]): Collection[] {
  // 不再生成默认分类，只返回空数组
  return [];
}

const RecentScrolls = ({ height }: RecentScrollsProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await api.listCards();
        if (response.success) {
          const cats = categorizeCards(response.cards);
          setCollections(cats);
        }
      } catch (err) {
        console.error('获取卡片列表失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
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

  if (collections.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
        height: `${height}px`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography.Text type="secondary">暂无卡片</Typography.Text>
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
      {collections.map(c => (
        <CollectionCard key={c.id} collection={c} />
      ))}
    </div>
  );
};

export default RecentScrolls;
