import { Typography, Spin, Message } from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type Card } from '../api';
import { PRIMARY_COLOR, SECONDARY_COLOR } from '../theme-constants';

interface Collection {
  id: string;
  title: string;
  scrollCount: number;
  dueCount: number;
  lastUsed: string;
  color: string;
}

const CollectionCard = ({ collection, onClick, t }: { collection: Collection; onClick?: () => void; t: (key: string, options?: Record<string, unknown>) => string }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
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
            {t('startPage.dueCount', { count: collection.dueCount })}
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
            {t('startPage.completed')}
          </div>
        )}
        <Typography.Text bold style={{ fontSize: '18px', lineHeight: 1.3 }}>
          {collection.title}
        </Typography.Text>
      </div>

      {/* 底部：卡片数 + 最近使用 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
          {t('startPage.cardCount', { count: collection.scrollCount })}
        </Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
          {t('startPage.lastUsed')}
        </Typography.Text>
      </div>
    </div>
  );
};

interface RecentScrollsProps {
  /** 与上方窗景卡片保持一致的高度 */
  height: number;
  onStudyTag?: (tag: string) => void;
}

const PRESET_COLORS = [
  '#206CCF', '#3B82F6', '#0EA5E9', '#06B6D4', '#10B981',
  '#84CC16', '#EAB308', '#F59E0B', '#F97316', '#EF4444',
  '#EC4899', '#D946EF', '#8B5CF6', '#6366F1', '#64748B',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// 辅助函数：从卡片 tags 生成分组
function categorizeCards(cards: Card[]): Collection[] {
  const tagMap = new Map<string, Card[]>();
  for (const card of cards) {
    const tags = card.tags && card.tags.length > 0 ? card.tags : ['未分类'];
    for (const tag of tags) {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, []);
      }
      tagMap.get(tag)!.push(card);
    }
  }

  const nowSec = Date.now() / 1000;
  const collections: Collection[] = [];
  for (const [tag, tagCards] of tagMap.entries()) {
    const dueCount = tagCards.filter(c => (c.next_review ?? Infinity) <= nowSec).length;
    collections.push({
      id: tag,
      title: tag,
      scrollCount: tagCards.length,
      dueCount,
      lastUsed: '最近使用',
      color: PRESET_COLORS[hashString(tag) % PRESET_COLORS.length],
    });
  }

  return collections.sort((a, b) => b.scrollCount - a.scrollCount);
}

const RecentScrolls = ({ height, onStudyTag }: RecentScrollsProps) => {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const response = await api.listCards();
        if (response.success) {
          const cats = categorizeCards(response.cards);
          setCollections(cats);
        } else {
          Message.error(t('startPage.fetchCardsFailed'));
        }
      } catch (err) {
        console.error(t('startPage.fetchCardsFailed'), err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();

    const handleCardsChanged = () => {
      fetchCards();
    };
    window.addEventListener('papyrus_cards_changed', handleCardsChanged);
    return () => window.removeEventListener('papyrus_cards_changed', handleCardsChanged);
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
        <Typography.Text type="secondary">{t('startPage.noCards')}</Typography.Text>
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
        <CollectionCard key={c.id} collection={c} onClick={() => onStudyTag?.(c.id)} t={t} />
      ))}
    </div>
  );
};

export default RecentScrolls;
