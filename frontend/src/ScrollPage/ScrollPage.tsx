import { Typography, Button, Empty, Spin, Modal, Input, Select, Message } from '@arco-design/web-react';
import { IconPlus, IconClockCircle, IconBook, IconPlayCircle, IconEye, IconEdit } from '@arco-design/web-react/icon';
import { useState, useEffect } from 'react';
import FlashcardStudy from './FlashcardStudy';

import { api, type Card as CardType } from '../api';
import { type SceneryContent } from '../StartPage/sceneryContent';
import { usePageScenery } from '../hooks/useScenery';
import { useSceneryColor, getAdaptivePrimaryColor } from '../hooks/useSceneryColor';

// 类型定义
interface Collection {
  id: string;
  title: string;
  scrollCount: number;
  totalCards: number;
}

interface Scroll {
  id: string;
  title: string;
  collection: string;
  cardCount: number;
  dueCount: number;
  masteredCount: number;
  lastStudied: string;
}

const PRIMARY_COLOR = '#206CCF';
const SECONDARY_COLOR = '#9FD4FD';
const SUCCESS_COLOR = '#00B42A';

// 统计小卡片
const StatItem = ({ label, value, color, colorConfig }: { label: string; value: string | number; color?: string; colorConfig?: { primary: string; secondary: string; brightness: number } }) => {
  const finalColor = color 
    ? getAdaptivePrimaryColor(colorConfig?.brightness ?? 255, color)
    : (colorConfig?.primary ?? 'inherit');
  
  return (
    <div style={{ textAlign: 'center' }}>
      <Typography.Text style={{ fontSize: '28px', fontWeight: 600, color: finalColor }}>
        {value}
      </Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: colorConfig?.secondary }}>
        {label}
      </Typography.Text>
    </div>
  );
};

// 统计数据栏
const StatsCard = ({ 
  dueCount, 
  totalCount, 
  overallProgress, 
  scenery,
  opacity = 0.15,
  loading,
}: { 
  dueCount: number; 
  totalCount: number; 
  overallProgress: number; 
  scenery: SceneryContent | null;
  opacity?: number;
  loading: boolean;
}) => {
  const { primaryTextColor, secondaryTextColor, averageBrightness } = useSceneryColor(
    scenery?.image,
    !!scenery
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '40px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
      }}>
        <Spin size={24} />
      </div>
    );
  }

  if (!scenery) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '40px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
      }}>
        <div style={{ display: 'flex', gap: '48px' }}>
          <StatItem label='待复习' value={dueCount} color={dueCount > 0 ? PRIMARY_COLOR : undefined} />
          <StatItem label='已掌握' value={`${totalCount && overallProgress ? Math.round(totalCount * overallProgress / 100) : 0}/${totalCount ?? 0}`} color={SUCCESS_COLOR} />
          <StatItem label='总进度' value={`${overallProgress ?? 0}%`} />
        </div>
      </div>
    );
  }

  const image = scenery.image;
  const poem = scenery.poem || '且将新火试新茶，诗酒趁年华。';
  const source = scenery.source || '[宋] 苏轼《望江南·超然台作》';
  const overlayOpacity = Math.max(0.25, Math.min(0.75, opacity));

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '40px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        overflow: 'hidden',
      }}
    >
      <img
        src={image}
        alt={`窗景图片：${poem} —— ${source}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(255, 255, 255, ${overlayOpacity})`,
        }}
      />
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        display: 'flex', 
        gap: '48px',
      }}>
        <StatItem label='待复习' value={dueCount} color={dueCount > 0 ? PRIMARY_COLOR : undefined} colorConfig={scenery ? { primary: primaryTextColor, secondary: secondaryTextColor, brightness: averageBrightness } : undefined} />
        <StatItem label='已掌握' value={`${Math.round(totalCount * overallProgress / 100)}/${totalCount}`} color={SUCCESS_COLOR} colorConfig={scenery ? { primary: primaryTextColor, secondary: secondaryTextColor, brightness: averageBrightness } : undefined} />
        <StatItem label='总进度' value={`${overallProgress}%`} colorConfig={scenery ? { primary: primaryTextColor, secondary: secondaryTextColor, brightness: averageBrightness } : undefined} />
      </div>
    </div>
  );
};

// 通用卡片样式
const useCardStyle = (hovered: boolean) => ({
  borderRadius: '16px',
  border: `2px solid ${hovered ? SECONDARY_COLOR : 'var(--color-text-3)'}`,
  background: 'var(--color-bg-1)',
  transition: 'border-color 0.2s, background 0.2s',
  cursor: 'pointer',
});

// 卷帙卡片
const CollectionCard = ({ collection, onClick, onManage }: { collection: Collection; onClick?: () => void; onManage?: (e: React.MouseEvent) => void }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${collection.title}，包含 ${collection.scrollCount} 个卷轴，共 ${collection.totalCards} 张卡片`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        ...cardStyle,
        flex: '0 0 auto',
        width: '220px',
        height: '140px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          background: 'var(--color-fill-2)',
          color: 'var(--color-text-3)',
          borderRadius: '999px',
          padding: '2px 10px',
          fontSize: '12px',
          fontWeight: 600,
        }}>
          {collection.totalCards} 张卡片
        </div>
        <Typography.Text bold style={{ fontSize: '16px', lineHeight: 1.3 }}>
          {collection.title}
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconBook style={{ fontSize: '14px', color: 'var(--color-text-3)' }} />
        <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
          {collection.totalCards} 张卡片
        </Typography.Text>
      </div>

      {hovered && onManage && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onManage(e);
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'var(--color-fill-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <IconEdit style={{ fontSize: '12px', color: 'var(--color-text-2)' }} />
        </div>
      )}
    </div>
  );
};

// 从卡片生成集合
function generateCollections(cards: CardType[]): Collection[] {
  const tagMap = new Map<string, number>();
  cards.forEach(card => {
    const tags = card.tags && card.tags.length > 0 ? card.tags : ['未分类'];
    tags.forEach(tag => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    });
  });
  const collections: Collection[] = Array.from(tagMap.entries()).map(([tag, count]) => ({
    id: tag,
    title: tag,
    scrollCount: 1,
    totalCards: count,
  }));
  collections.sort((a, b) => b.totalCards - a.totalCards);
  return collections;
}

// 卷轴卡片
const ScrollCard = ({ scroll, onStudy }: { scroll: Scroll; onStudy?: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <div
      role="button"
      tabIndex={onStudy ? 0 : -1}
      aria-label={`${scroll.title}，${scroll.collection}，${scroll.dueCount > 0 ? `${scroll.dueCount} 张待复习` : '已完成'}，共 ${scroll.cardCount} 张卡片`}
      aria-disabled={!onStudy ? 'true' : 'false'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onStudy}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onStudy) {
          e.preventDefault();
          onStudy();
        }
      }}
      style={{
        ...cardStyle,
        flex: '0 0 auto',
        width: '280px',
        height: '140px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {scroll.dueCount > 0 && hovered && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onStudy?.();
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: PRIMARY_COLOR,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(32, 108, 207, 0.3)',
          }}
        >
          <IconPlayCircle style={{ fontSize: '18px', color: '#fff' }} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {scroll.dueCount > 0 ? (
            <div style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              background: PRIMARY_COLOR,
              color: '#fff',
              borderRadius: '999px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              {scroll.dueCount} 待复习
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              background: '#E8FFEA',
              color: SUCCESS_COLOR,
              borderRadius: '999px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              已完成
            </div>
          )}
          <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
            {scroll.collection}
          </Typography.Text>
        </div>
        <Typography.Text bold style={{ fontSize: '16px', lineHeight: 1.3 }}>
          {scroll.title}
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconClockCircle style={{ fontSize: '14px', color: 'var(--color-text-3)' }} />
          <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
            {scroll.lastStudied}
          </Typography.Text>
        </div>
        <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
          {scroll.masteredCount}/{scroll.cardCount}
        </Typography.Text>
      </div>
    </div>
  );
};

// 添加卡片
const AddCard = ({ label, onClick }: { label: string; onClick?: () => void }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}，点击创建新项`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        flex: '0 0 auto',
        width: '220px',
        height: '140px',
        borderRadius: '16px',
        border: `2px dashed ${hovered ? SECONDARY_COLOR : 'var(--color-text-3)'}`,
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: hovered ? PRIMARY_COLOR : 'var(--color-fill-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        <IconPlus style={{ fontSize: '20px', color: hovered ? '#fff' : 'var(--color-text-2)' }} />
      </div>
      <Typography.Text type={hovered ? 'primary' : 'secondary'} style={{ fontSize: '14px' }}>
        {label}
      </Typography.Text>
    </div>
  );
};

// 书架区域标题
const ShelfTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography.Title
    heading={2}
    style={{ fontWeight: 400, lineHeight: 1, margin: '0 0 24px', fontSize: '20px', color: 'var(--color-text-3)' }}
  >
    {children}
  </Typography.Title>
);

interface ScrollPageProps {
  initialTag?: string;
  onInitialTagUsed?: () => void;
}

const ScrollPage = ({ initialTag, onInitialTagUsed }: ScrollPageProps) => {
  const [isStudying, setIsStudying] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardType[]>([]);
  const [filterTag, setFilterTag] = useState<string | undefined>(undefined);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [manageCollectionId, setManageCollectionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchCardModalVisible, setBatchCardModalVisible] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(new Set());
  const [createCardModalVisible, setCreateCardModalVisible] = useState(false);
  const [newCardQuestion, setNewCardQuestion] = useState('');
  const [newCardAnswer, setNewCardAnswer] = useState('');
  const [newCardTags, setNewCardTags] = useState('');
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  const { config: sceneryConfig } = usePageScenery('scroll');

  const overallProgress = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [nextDueRes, cardsRes] = await Promise.all([
          api.nextDue(),
          api.listCards(),
        ]);

        if (nextDueRes.success) {
          setDueCount(nextDueRes.due_count);
          setTotalCount(nextDueRes.total_count);
        }

        if (cardsRes.success) {
          setCards(cardsRes.cards);
          const mastered = cardsRes.cards.filter(c => (c.interval || 0) > 1).length;
          setMasteredCount(mastered);
        }
      } catch (err) {
        console.error('获取统计失败:', err);
        Message.error('获取统计数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    if (!isStudying) {
      fetchStats();
    }
  }, [isStudying]);

  // Refresh data when cards are imported or changed externally
  useEffect(() => {
    const handleCardsChanged = () => {
      if (!isStudying) {
        api.listCards()
          .then(res => {
            if (res.success) {
              setCards(res.cards);
              const mastered = res.cards.filter(c => (c.interval || 0) > 1).length;
              setMasteredCount(mastered);
            }
          })
          .catch(console.error);
      }
    };
    window.addEventListener('papyrus_cards_changed', handleCardsChanged);
    return () => window.removeEventListener('papyrus_cards_changed', handleCardsChanged);
  }, [isStudying]);

  // 监听全局新建卡片事件（来自 TitleBar）
  useEffect(() => {
    const handleGlobalNewCard = () => {
      setCreateCardModalVisible(true);
    };
    window.addEventListener('papyrus_new_card', handleGlobalNewCard);
    return () => window.removeEventListener('papyrus_new_card', handleGlobalNewCard);
  }, []);

  const startStudy = (tag?: string) => {
    setFilterTag(tag);
    setIsDemo(false);
    setIsStudying(true);
  };

  // 监听来自搜索的初始标签，自动开始复习
  useEffect(() => {
    if (initialTag && !isStudying) {
      startStudy(initialTag);
      onInitialTagUsed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTag]);

  const startDemo = () => {
    setIsDemo(true);
    setIsStudying(true);
  };

  const shelfContainerStyle = {
    display: 'flex',
    flexDirection: 'row' as const,
    gap: '16px',
    overflowX: 'auto' as const,
    overflowY: 'hidden' as const,
    paddingBottom: '8px',
  };

  // 从真实卡片生成 scrolls
  const generateScrolls = (cards: CardType[]): Scroll[] => {
    const now = Date.now() / 1000;
    const dueCards = cards.filter(c => (c.next_review || 0) <= now);
    const newCards = cards.filter(c => (c.interval || 0) === 0);
    const reviewCards = cards.filter(c => (c.interval || 0) > 0);

    const scrolls: Scroll[] = [];
    
    if (newCards.length > 0) {
      scrolls.push({
        id: 'new',
        title: '新卡片',
        collection: '学习',
        cardCount: newCards.length,
        dueCount: newCards.length,
        masteredCount: 0,
        lastStudied: '今天',
      });
    }
    
    if (reviewCards.length > 0) {
      scrolls.push({
        id: 'review',
        title: '复习卡片',
        collection: '复习',
        cardCount: reviewCards.length,
        dueCount: reviewCards.filter(c => (c.next_review || 0) <= now).length,
        masteredCount: reviewCards.filter(c => (c.interval || 0) > 1).length,
        lastStudied: '最近',
      });
    }

    return scrolls;
  };

  const collections = generateCollections(cards);
  const scrolls = generateScrolls(cards);

  if (isStudying) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <FlashcardStudy onExit={() => setIsStudying(false)} demo={isDemo} filterTag={filterTag} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <Typography.Title
          heading={1}
          style={{ fontWeight: 600, lineHeight: 1, margin: 0, fontSize: '40px' }}
        >
          卷轴
        </Typography.Title>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            shape='round'
            size='large'
            icon={<IconEdit />}
            onClick={() => {
              setBatchSelectedIds(new Set());
              setBatchCardModalVisible(true);
            }}
            style={{
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
            }}
          >
            管理卡片
          </Button>
          <Button
            shape='round'
            size='large'
            icon={<IconEye />}
            onClick={startDemo}
            style={{
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
            }}
          >
            预览学习界面
          </Button>
          <Button
            shape='round'
            type='primary'
            size='large'
            icon={<IconPlayCircle />}
            onClick={() => startStudy()}
            disabled={dueCount === 0}
            style={{
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
              backgroundColor: dueCount > 0 ? PRIMARY_COLOR : 'var(--color-text-3)',
            }}
          >
            {dueCount > 0 ? `开始复习 (${dueCount})` : '暂无待复习'}
          </Button>
        </div>
      </div>

      <StatsCard 
        dueCount={dueCount} 
        totalCount={totalCount} 
        overallProgress={overallProgress} 
        scenery={sceneryConfig.enabled ? { 
          id: 'scroll-scenery', 
          image: sceneryConfig.image, 
          poem: sceneryConfig.poem || '且将新火试新茶，诗酒趁年华。',
          source: sceneryConfig.source || '[宋] 苏轼《望江南·超然台作》'
        } : null}
        opacity={sceneryConfig.opacity}
        loading={loading}
      />

      <section style={{ marginBottom: '40px' }}>
        <ShelfTitle>卷帙</ShelfTitle>
        {collections.length === 0 ? (
          <Empty description="暂无卷帙" />
        ) : (
          <div style={shelfContainerStyle}>
            {collections.map(c => (
              <CollectionCard 
                key={c.id} 
                collection={c} 
                onClick={() => startStudy(c.id)}
                onManage={(e) => {
                  e.stopPropagation();
                  setManageCollectionId(c.id);
                  setManageModalVisible(true);
                }}
              />
            ))}
            <div onClick={() => setCreateModalVisible(true)}>
              <AddCard label='新建卷帙' />
            </div>
          </div>
        )}
      </section>

      <section>
        <ShelfTitle>最近使用</ShelfTitle>
        {scrolls.length === 0 ? (
          <Empty description="暂无卷轴" />
        ) : (
          <div style={shelfContainerStyle}>
            {scrolls.map(s => (
              <ScrollCard 
                key={s.id} 
                scroll={s} 
                onStudy={s.dueCount > 0 ? startStudy : undefined}
              />
            ))}
            <div onClick={() => setCreateCardModalVisible(true)}>
              <AddCard label='新建卷轴' />
            </div>
          </div>
        )}
      </section>

      <div style={{ height: '32px' }} />

      {/* 新建卷帙模态框 */}
      <Modal
        title="新建卷帙"
        visible={createModalVisible}
        onOk={async () => {
          const name = newCollectionName.trim();
          if (!name) {
            Message.error('请输入卷帙名称');
            return;
          }
          if (selectedCardIds.length === 0) {
            Message.error('请至少选择一张卡片');
            return;
          }
          setIsSubmitting(true);
          try {
            let successCount = 0;
            for (const cardId of selectedCardIds) {
              const card = cards.find(c => c.id === cardId);
              if (card) {
                const newTags = [...(card.tags || []), name];
                const res = await api.updateCard(cardId, { tags: newTags });
                if (res.success) successCount++;
              }
            }
            Message.success(`成功创建卷帙，已分配 ${successCount} 张卡片`);
            setCreateModalVisible(false);
            setNewCollectionName('');
            setSelectedCardIds([]);
            // 刷新卡片列表
            const cardsRes = await api.listCards();
            if (cardsRes.success) setCards(cardsRes.cards);
          } catch (err) {
            Message.error('创建卷帙失败');
          } finally {
            setIsSubmitting(false);
          }
        }}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewCollectionName('');
          setSelectedCardIds([]);
        }}
        confirmLoading={isSubmitting}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 8 }}>卷帙名称</Typography.Text>
            <Input 
              value={newCollectionName} 
              onChange={setNewCollectionName} 
              placeholder="例如：英语单词"
              maxLength={20}
            />
          </div>
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 8 }}>选择卡片</Typography.Text>
            <Select
              mode="multiple"
              value={selectedCardIds}
              onChange={setSelectedCardIds}
              placeholder="请选择要加入卷帙的卡片"
              style={{ width: '100%' }}
              options={cards.map(c => ({ label: c.q.slice(0, 40) || '无标题', value: c.id }))}
            />
          </div>
        </div>
      </Modal>

      {/* 管理卷帙模态框 */}
      <Modal
        title={`管理卷帙：${manageCollectionId || ''}`}
        visible={manageModalVisible && !!manageCollectionId}
        onCancel={() => {
          setManageModalVisible(false);
          setManageCollectionId(null);
        }}
        footer={[
          <Button key="close" onClick={() => { setManageModalVisible(false); setManageCollectionId(null); }}>
            关闭
          </Button>,
          <Button 
            key="delete" 
            type="primary" 
            status="danger"
            onClick={async () => {
              if (!manageCollectionId) return;
              Modal.confirm({
                title: '删除卷帙',
                content: `确定要删除卷帙「${manageCollectionId}」吗？卡片不会被删除，只是移除此标签。`,
                onOk: async () => {
                  try {
                    const targetCards = cards.filter(c => (c.tags || []).includes(manageCollectionId));
                    for (const card of targetCards) {
                      const newTags = (card.tags || []).filter(t => t !== manageCollectionId);
                      await api.updateCard(card.id, { tags: newTags });
                    }
                    Message.success('卷帙已删除');
                    setManageModalVisible(false);
                    setManageCollectionId(null);
                    const cardsRes = await api.listCards();
                    if (cardsRes.success) setCards(cardsRes.cards);
                  } catch {
                    Message.error('删除卷帙失败');
                  }
                }
              });
            }}
          >
            删除卷帙
          </Button>
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
          {cards
            .filter(c => manageCollectionId && (c.tags || []).includes(manageCollectionId))
            .map(card => (
              <div 
                key={card.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--color-fill-2)',
                  borderRadius: 8,
                }}
              >
                <Typography.Text style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {card.q.slice(0, 60) || '无标题'}
                </Typography.Text>
                <Button
                  type="text"
                  size="small"
                  onClick={async () => {
                    try {
                      const newTags = (card.tags || []).filter(t => t !== manageCollectionId);
                      await api.updateCard(card.id, { tags: newTags });
                      Message.success('已移出卷帙');
                      const cardsRes = await api.listCards();
                      if (cardsRes.success) setCards(cardsRes.cards);
                    } catch {
                      Message.error('移除失败');
                    }
                  }}
                >
                  移除
                </Button>
              </div>
            ))}
          {cards.filter(c => manageCollectionId && (c.tags || []).includes(manageCollectionId)).length === 0 && (
            <Empty description="该卷帙暂无卡片" />
          )}
        </div>
      </Modal>

      {/* 批量管理卡片模态框 */}
      <Modal
        title={`管理卡片 (${cards.length} 张)`}
        visible={batchCardModalVisible}
        onCancel={() => setBatchCardModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setBatchCardModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="delete"
            type="primary"
            status="danger"
            disabled={batchSelectedIds.size === 0}
            onClick={() => {
              Modal.confirm({
                title: '批量删除卡片',
                content: `确定要删除选中的 ${batchSelectedIds.size} 张卡片吗？此操作不可撤销。`,
                onOk: async () => {
                  try {
                    const res = await api.batchDeleteCards([...batchSelectedIds]);
                    Message.success(`已删除 ${res.deleted} 张卡片`);
                    setBatchCardModalVisible(false);
                    setBatchSelectedIds(new Set());
                    const cardsRes = await api.listCards();
                    if (cardsRes.success) setCards(cardsRes.cards);
                  } catch {
                    Message.error('批量删除失败');
                  }
                },
              });
            }}
          >
            删除选中 ({batchSelectedIds.size})
          </Button>,
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
          {cards.map(card => (
            <div
              key={card.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: batchSelectedIds.has(card.id) ? `${PRIMARY_COLOR}10` : 'var(--color-fill-2)',
                borderRadius: 8,
                cursor: 'pointer',
                border: batchSelectedIds.has(card.id) ? `1px solid ${PRIMARY_COLOR}` : '1px solid transparent',
              }}
              onClick={() => {
                setBatchSelectedIds(prev => {
                  const next = new Set(prev);
                  if (next.has(card.id)) {
                    next.delete(card.id);
                  } else {
                    next.add(card.id);
                  }
                  return next;
                });
              }}
            >
              <input
                type="checkbox"
                checked={batchSelectedIds.has(card.id)}
                onChange={() => {}}
                style={{ cursor: 'pointer', accentColor: PRIMARY_COLOR }}
                aria-label="选择此卡片"
              />
              <Typography.Text style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.q.slice(0, 60) || '无标题'}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {card.tags?.join(', ') || '未分类'}
              </Typography.Text>
            </div>
          ))}
          {cards.length === 0 && <Empty description="暂无卡片" />}
        </div>
      </Modal>

      {/* 新建卡片模态框 */}
      <Modal
        title="新建卡片"
        visible={createCardModalVisible}
        onOk={async () => {
          const q = newCardQuestion.trim();
          const a = newCardAnswer.trim();
          if (!q) {
            Message.error('请输入问题');
            return;
          }
          if (!a) {
            Message.error('请输入答案');
            return;
          }
          setIsSubmittingCard(true);
          try {
            const tags = newCardTags.split(',').map(t => t.trim()).filter(Boolean);
            const res = await api.createCard(q, a, tags.length > 0 ? tags : undefined);
            if (res.success) {
              Message.success('卡片创建成功');
              setCreateCardModalVisible(false);
              setNewCardQuestion('');
              setNewCardAnswer('');
              setNewCardTags('');
              const cardsRes = await api.listCards();
              if (cardsRes.success) {
                setCards(cardsRes.cards);
                const mastered = cardsRes.cards.filter(c => (c.interval || 0) > 1).length;
                setMasteredCount(mastered);
              }
              const nextDueRes = await api.nextDue();
              if (nextDueRes.success) {
                setDueCount(nextDueRes.due_count);
                setTotalCount(nextDueRes.total_count);
              }
            }
          } catch (err) {
            Message.error(err instanceof Error ? err.message : '创建卡片失败');
          } finally {
            setIsSubmittingCard(false);
          }
        }}
        onCancel={() => {
          setCreateCardModalVisible(false);
          setNewCardQuestion('');
          setNewCardAnswer('');
          setNewCardTags('');
        }}
        confirmLoading={isSubmittingCard}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 8 }}>问题（正面）</Typography.Text>
            <Input.TextArea
              value={newCardQuestion}
              onChange={setNewCardQuestion}
              placeholder="输入卡片问题..."
              rows={3}
            />
          </div>
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 8 }}>答案（背面）</Typography.Text>
            <Input.TextArea
              value={newCardAnswer}
              onChange={setNewCardAnswer}
              placeholder="输入卡片答案..."
              rows={3}
            />
          </div>
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 8 }}>标签（用逗号分隔）</Typography.Text>
            <Input
              value={newCardTags}
              onChange={setNewCardTags}
              placeholder="例如：英语, 单词"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ScrollPage;
