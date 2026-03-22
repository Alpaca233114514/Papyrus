import { Typography, Button } from '@arco-design/web-react';
import { IconPlus, IconClockCircle, IconBook, IconPlayCircle, IconEye } from '@arco-design/web-react/icon';
import { useState, useEffect } from 'react';
import FlashcardStudy from './FlashcardStudy';
import { api } from '../api';

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

// 模拟数据
const MOCK_STATS = {
  totalDue: 43,
  totalScrolls: 6,
  totalCards: 186,
  masteredCards: 123,
  todayLearned: 24,
  streakDays: 42,
};

const MOCK_COLLECTIONS: Collection[] = [
  { id: '1', title: '高等数学', scrollCount: 5, totalCards: 128 },
  { id: '2', title: '英语词汇', scrollCount: 12, totalCards: 340 },
  { id: '3', title: '操作系统', scrollCount: 3, totalCards: 76 },
  { id: '4', title: '日本語 N2', scrollCount: 8, totalCards: 210 },
  { id: '5', title: '计算机网络', scrollCount: 4, totalCards: 156 },
];

const MOCK_SCROLLS: Scroll[] = [
  { id: '1', title: '极限与连续', collection: '高等数学', cardCount: 24, dueCount: 5, masteredCount: 18, lastStudied: '今天' },
  { id: '2', title: '导数与微分', collection: '高等数学', cardCount: 32, dueCount: 0, masteredCount: 28, lastStudied: '昨天' },
  { id: '3', title: '托福核心词汇', collection: '英语词汇', cardCount: 50, dueCount: 12, masteredCount: 35, lastStudied: '今天' },
  { id: '4', title: '进程管理', collection: '操作系统', cardCount: 18, dueCount: 3, masteredCount: 12, lastStudied: '2天前' },
  { id: '5', title: '内存管理', collection: '操作系统', cardCount: 22, dueCount: 8, masteredCount: 10, lastStudied: '3天前' },
  { id: '6', title: '动词变形', collection: '日本語 N2', cardCount: 40, dueCount: 15, masteredCount: 20, lastStudied: '今天' },
];

const PRIMARY_COLOR = '#206CCF';
const SUCCESS_COLOR = '#00B42A';

// 统计小卡片
const StatItem = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
  <div style={{ textAlign: 'center' }}>
    <Typography.Text style={{ fontSize: '28px', fontWeight: 600, color: color || 'inherit' }}>
      {value}
    </Typography.Text>
    <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '2px' }}>
      {label}
    </Typography.Text>
  </div>
);

// 通用卡片样式 - 与开始界面统一
const useCardStyle = (hovered: boolean) => ({
  borderRadius: '16px',
  border: `1px solid ${hovered ? PRIMARY_COLOR : 'var(--color-text-3)'}`,
  background: hovered ? `${PRIMARY_COLOR}08` : 'var(--color-bg-1)',
  transition: 'border-color 0.2s, background 0.2s',
  cursor: 'pointer',
});

// 卷帙卡片
const CollectionCard = ({ collection }: { collection: Collection }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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

// 卷轴卡片
const ScrollCard = ({ scroll, onStudy }: { scroll: Scroll; onStudy?: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onStudy}
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
      {/* 快速学习按钮 */}
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
            transition: 'transform 0.2s',
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
              padding: '2px 10px',
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
              padding: '2px 10px',
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 auto',
        width: '220px',
        height: '140px',
        borderRadius: '16px',
        border: `1px dashed ${hovered ? PRIMARY_COLOR : 'var(--color-text-3)'}`,
        background: hovered ? `${PRIMARY_COLOR}08` : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
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
    style={{ fontWeight: 400, lineHeight: 1, margin: '0 0 20px', fontSize: '20px', color: 'var(--color-text-3)' }}
  >
    {children}
  </Typography.Title>
);

const ScrollPage = () => {
  const [isStudying, setIsStudying] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [dueCount, setDueCount] = useState(MOCK_STATS.totalDue);
  const [totalCount, setTotalCount] = useState(MOCK_STATS.totalCards);
  const overallProgress = Math.round((MOCK_STATS.masteredCards / MOCK_STATS.totalCards) * 100);

  // 获取真实的待复习数量
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.nextDue();
        setDueCount(res.due_count);
        setTotalCount(res.total_count);
      } catch (err) {
        console.error('获取统计失败:', err);
      }
    };
    
    if (!isStudying) {
      fetchStats();
    }
  }, [isStudying]);

  // 开始学习（真实模式）
  const startStudy = () => {
    setIsDemo(false);
    setIsStudying(true);
  };

  // 开始演示
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

  // 学习模式
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

  // 列表模式
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px' }}>
      {/* 标题行 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <Typography.Title
          heading={1}
          style={{ fontWeight: 400, lineHeight: 1, margin: 0, fontSize: '40px' }}
        >
          卷轴
        </Typography.Title>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* 演示按钮 */}
          <Button
            size='large'
            icon={<IconEye />}
            onClick={startDemo}
            style={{
              height: '48px',
              borderRadius: '24px',
              padding: '0 24px',
              fontSize: '15px',
            }}
          >
            预览学习界面
          </Button>
          {/* 开始学习按钮 */}
          <Button
            type='primary'
            size='large'
            icon={<IconPlayCircle />}
            onClick={startStudy}
            disabled={dueCount === 0}
            style={{
              height: '48px',
              borderRadius: '24px',
              padding: '0 28px',
              fontSize: '15px',
              backgroundColor: dueCount > 0 ? PRIMARY_COLOR : 'var(--color-text-3)',
            }}
          >
            {dueCount > 0 ? `开始复习 (${dueCount})` : '暂无待复习'}
          </Button>
        </div>
      </div>

      {/* 数据小栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        marginBottom: '40px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
      }}>
        <div style={{ display: 'flex', gap: '48px' }}>
          <StatItem label='待复习' value={dueCount} color={dueCount > 0 ? PRIMARY_COLOR : undefined} />
          <StatItem label='已掌握' value={`${MOCK_STATS.masteredCards}/${totalCount || MOCK_STATS.totalCards}`} color={SUCCESS_COLOR} />
          <StatItem label='总进度' value={`${overallProgress}%`} />
          <StatItem label='今日已学' value={MOCK_STATS.todayLearned} />
          <StatItem label='连续学习' value={`${MOCK_STATS.streakDays}天`} />
        </div>
      </div>

      {/* 卷帙分类 */}
      <section style={{ marginBottom: '40px' }}>
        <ShelfTitle>卷帙</ShelfTitle>
        <div style={shelfContainerStyle}>
          {MOCK_COLLECTIONS.map(c => <CollectionCard key={c.id} collection={c} />)}
          <AddCard label='新建卷帙' />
        </div>
      </section>

      {/* 最近卷轴 */}
      <section>
        <ShelfTitle>最近使用</ShelfTitle>
        <div style={shelfContainerStyle}>
          {MOCK_SCROLLS.map(s => (
            <ScrollCard 
              key={s.id} 
              scroll={s} 
              onStudy={s.dueCount > 0 ? startStudy : undefined}
            />
          ))}
          <AddCard label='新建卷轴' />
        </div>
      </section>

      <div style={{ height: '32px' }} />
    </div>
  );
};

export default ScrollPage;
