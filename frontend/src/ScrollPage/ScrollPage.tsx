import { Typography, Button, Empty, Spin } from '@arco-design/web-react';
import { IconPlus, IconClockCircle, IconBook, IconPlayCircle, IconEye } from '@arco-design/web-react/icon';
import { useState, useEffect } from 'react';
import FlashcardStudy from './FlashcardStudy';

import { api, type Card } from '../api';
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
          <StatItem label='已掌握' value={`${Math.round(totalCount * overallProgress / 100)}/${totalCount}`} color={SUCCESS_COLOR} />
          <StatItem label='总进度' value={`${overallProgress}%`} />
        </div>
      </div>
    );
  }

  const image = scenery.image;
  const poem = '且将新火试新茶，诗酒趁年华。';
  const source = '[宋] 苏轼《望江南·超然台作》';
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
const CollectionCard = ({ collection }: { collection: Collection }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${collection.title}，包含 ${collection.scrollCount} 个卷轴，共 ${collection.totalCards} 张卡片`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
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
          {collection.scrollCount} 个卷轴
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
    </div>
  );
};

// 从卡片生成集合
function generateCollections(cards: CardType[]): Collection[] {
  // 不再生成默认卷帙，只返回空数组
  return [];
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
      aria-disabled={!onStudy}
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
const AddCard = ({ label }: { label: string }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}，点击创建新项`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
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

const ScrollPage = () => {
  const [isStudying, setIsStudying] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardType[]>([]);
  
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
      } finally {
        setLoading(false);
      }
    };
    
    if (!isStudying) {
      fetchStats();
    }
  }, [isStudying]);

  const startStudy = () => {
    setIsDemo(false);
    setIsStudying(true);
  };

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
        <FlashcardStudy onExit={() => setIsStudying(false)} demo={isDemo} />
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
            onClick={startStudy}
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
          poem: '且将新火试新茶，诗酒趁年华。',
          source: '[宋] 苏轼《望江南·超然台作》'
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
            {collections.map(c => <CollectionCard key={c.id} collection={c} />)}
            <AddCard label='新建卷帙' />
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
            <AddCard label='新建卷轴' />
          </div>
        )}
      </section>

      <div style={{ height: '32px' }} />
    </div>
  );
};

export default ScrollPage;
