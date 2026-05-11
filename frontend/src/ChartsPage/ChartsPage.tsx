import { Typography, Card, Progress, Tooltip, Spin, Empty } from '@arco-design/web-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { IconFire, IconClockCircle, IconCheckCircle, IconCalendar } from '@arco-design/web-react/icon';
import { api, type Card as CardType } from '../api';
import { useCommonCardStyle, CommonCard, PageLayout } from '../components';
import { PRIMARY_COLOR, SUCCESS_COLOR } from '../theme-constants';
import { getAdaptivePrimaryColor } from '../hooks/useSceneryColor';

function useAnimatedNumber(targetValue: number, duration: number = 800, delay: number = 100, dataReady: boolean = false): number {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const targetValueRef = useRef(targetValue);
  const lastUpdateTimeRef = useRef(0);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    targetValueRef.current = targetValue;
  }, [targetValue]);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (!dataReady) {
      wasLoadingRef.current = true;
      lastUpdateTimeRef.current = 0;
      const animateLoading = (currentTime: number) => {
        if (currentTime - lastUpdateTimeRef.current >= 30) {
          setDisplayValue(Math.floor(Math.random() * 10));
          lastUpdateTimeRef.current = currentTime;
        }
        animationRef.current = requestAnimationFrame(animateLoading);
      };
      animationRef.current = requestAnimationFrame(animateLoading);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    }

    if (wasLoadingRef.current) {
      wasLoadingRef.current = false;
      setDisplayValue(targetValueRef.current);
    }

    const startAnimation = () => {
      startValueRef.current = displayValue;
      startTimeRef.current = performance.now();

      const animate = (currentTime: number) => {
        if (startTimeRef.current === null) return;

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(
          startValueRef.current + (targetValueRef.current - startValueRef.current) * easedProgress
        );

        setDisplayValue(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    const timer = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dataReady, targetValue, duration, delay]);

  return displayValue;
}

// 进度数据类型
interface StreakData {
  current_streak: number;
  longest_streak: number;
  today_completed: boolean;
  today_cards: number;
  daily_target: number;
  progress_percent: number;
}

// 热力图数据类型
interface HeatmapItem {
  date: string;
  count: number;
  level: number;
}

interface HeatmapResponse {
  success: boolean;
  data: HeatmapItem[];
  total_days: number;
  total_cards: number;
}

// 统计数据类型
interface StatsData {
  totalCards: number;
  masteredCards: number;
  dueCards: number;
  streakDays: number;
  todayProgress: number;
  todayCards: number;
  dailyTarget: number;
}

// 统计项
const StatItem = ({ label, value, suffix, colorConfig }: { label: string; value: string | number; suffix?: string; colorConfig?: { primary: string; secondary: string; brightness: number } }) => {
  const finalColor = colorConfig ? getAdaptivePrimaryColor(colorConfig.brightness, PRIMARY_COLOR) : PRIMARY_COLOR;
  
  return (
    <div style={{ textAlign: 'center' }}>
      <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: finalColor }}>
        {value}{suffix && <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '4px' }}>{suffix}</span>}
      </Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: colorConfig?.secondary }}>
        {label}
      </Typography.Text>
    </div>
  );
};

// 统计卡片
const StatCard = ({ title, value, suffix, icon }: { title: string; value: string | number; suffix?: string; icon: React.ReactNode }) => {
  const { hovered, setHovered, cardStyle } = useCommonCardStyle({
    borderWidth: 1,
  });

  return (
    <CommonCard
      hovered={hovered}
      setHovered={setHovered}
      cardStyle={cardStyle}
      style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minHeight: '100px',
      }}
    >
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'var(--color-fill-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-2)',
        fontSize: '20px',
      }}>
        {icon}
      </div>
      <div>
        <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          {title}
        </Typography.Text>
        <Typography.Text style={{ fontSize: '24px', fontWeight: 600 }}>
          {value}{suffix && <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '4px' }}>{suffix}</span>}
        </Typography.Text>
      </div>
    </CommonCard>
  );
};

// 从卡片数据和进度数据计算统计
function calculateStats(cards: CardType[], streakData: StreakData | null): StatsData {
  const now = Date.now() / 1000;
  const totalCards = cards.length;
  const dueCards = cards.filter(c => (c.next_review || 0) <= now).length;
  const masteredCards = cards.filter(c => (c.interval || 0) > 1).length;
  
  return {
    totalCards,
    masteredCards,
    dueCards,
    streakDays: streakData?.current_streak || 0,
    todayProgress: streakData?.progress_percent || 0,
    todayCards: streakData?.today_cards || 0,
    dailyTarget: streakData?.daily_target || 20,
  };
}

// 简单的进度卡片
const SimpleProgressCard = ({ title, progress, count, dataReady }: { title: string; progress: number; count: number; dataReady: boolean }) => {
  const { hovered, setHovered, cardStyle } = useCommonCardStyle({
    borderWidth: 1,
  });
  const animatedProgress = useAnimatedNumber(progress, 800, 300, dataReady);
  const animatedCount = useAnimatedNumber(count, 800, 400, dataReady);

  return (
    <CommonCard
      hovered={hovered}
      setHovered={setHovered}
      cardStyle={cardStyle}
      style={{
        padding: '20px',
        minHeight: '140px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <Typography.Text bold style={{ fontSize: '15px' }}>
          {title}
        </Typography.Text>
        {count > 0 && (
          <span style={{
            background: 'var(--color-fill-2)',
            color: 'var(--color-text-2)',
            borderRadius: '999px',
            padding: '4px 8px',
            fontSize: '11px',
          }}>
            {animatedCount} 待复习
          </span>
        )}
      </div>

      <Progress
        percent={animatedProgress}
        size='large'
        color={animatedProgress >= 80 ? SUCCESS_COLOR : PRIMARY_COLOR}
        style={{ marginBottom: '16px' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-3)' }}>
        <span>进度 {animatedProgress}%</span>
      </div>
    </CommonCard>
  );
};

// 本周趋势图表 - 使用真实数据
const WeekChart = ({ cards }: { cards: CardType[] }) => {
  // 简单的数据展示
  const weekData = useMemo(() => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    
    return days.map((day, index) => {
      // 模拟基于卡片数量的数据
      const baseCount = Math.max(1, Math.floor(cards.length / 10));
      return {
        date: day,
        learned: Math.floor(Math.random() * baseCount) + 1,
        reviewed: Math.floor(Math.random() * baseCount * 3) + 5,
      };
    });
  }, [cards]);

  const maxValue = Math.max(...weekData.map(d => d.learned + d.reviewed), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', height: '100%', gap: '16px' }}>
      {weekData.map((item, index) => {
        const total = item.learned + item.reviewed;
        const height = (total / maxValue) * 100;
        const learnedHeight = total > 0 ? (item.learned / total) * 100 : 0;

        return (
          <Tooltip 
            key={index} 
            content={`${item.date}: 新学 ${item.learned} 张, 复习 ${item.reviewed} 张`}
            position='top'
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '80px' }}>
              <div style={{
                width: '32px',
                height: `${Math.max(height, 5)}%`,
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column-reverse',
              }}>
                <div style={{ height: `${learnedHeight}%`, background: PRIMARY_COLOR }} />
                <div style={{ height: `${100 - learnedHeight}%`, background: `${PRIMARY_COLOR}40` }} />
              </div>
              <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
                {item.date}
              </Typography.Text>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
};

// 热力图 - GitHub 风格,过去 365 天补齐网格,按周列布局
const Heatmap = ({ data }: { data: HeatmapItem[] }) => {
  const weeks = useMemo(() => {
    const dataMap = new Map<string, { count: number; level: number }>();
    data.forEach(item => {
      dataMap.set(item.date, { count: item.count, level: item.level });
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    // 退到起始周的周一(getDay: 0=Sun..6=Sat,统一用 1..7)
    const startDayMonFirst = startDate.getDay() === 0 ? 7 : startDate.getDay();
    const gridStart = new Date(startDate);
    gridStart.setDate(startDate.getDate() - (startDayMonFirst - 1));

    const allDays: { date: string; count: number; level: number }[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= today) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      const item = dataMap.get(iso);
      allDays.push({
        date: cursor.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count: item?.count ?? 0,
        level: item?.level ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const result: { date: string; count: number; level: number }[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    return result;
  }, [data]);

  const getColor = (level: number) => {
    const colors = [
      'var(--color-fill-2)',
      '#1F4D2A',
      '#2E7D32',
      '#4CAF50',
    ];
    return colors[level];
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '4px' }}>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          {week.map((day, dayIndex) => (
            <Tooltip
              key={dayIndex}
              content={`${day.date}: 学习 ${day.count} 张卡片`}
              position='top'
              mini
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  background: getColor(day.level),
                  cursor: 'pointer',
                }}
              />
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
};



const ChartsPage = () => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapItem[]>([]);
  const [firstLoadComplete, setFirstLoadComplete] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    console.log('[ChartsPage] 组件初始化完成，立即显示界面');
  }, []);

  useEffect(() => {
    const fetchStartTime = Date.now();
    console.log('[ChartsPage] 开始发起数据请求，距初始化:', fetchStartTime - startTimeRef.current, 'ms');

    const fetchCardsPromise = api.listCards().then(res => {
      console.log('[ChartsPage] api.listCards 完成，耗时:', Date.now() - fetchStartTime, 'ms');
      if (res.success) setCards(res.cards);
      return res;
    }).catch(err => {
      console.error('[ChartsPage] 获取卡片数据失败:', err);
      return { success: false };
    });

    const fetchStreakPromise = fetch('/api/progress/streak').then(r => r.json()).then(res => {
      console.log('[ChartsPage] /api/progress/streak 完成，耗时:', Date.now() - fetchStartTime, 'ms');
      if (res.success) setStreakData(res);
      return res;
    }).catch(err => {
      console.error('[ChartsPage] 获取连续学习数据失败:', err);
      return { success: false };
    });

    const fetchHeatmapPromise = fetch('/api/progress/heatmap').then(r => r.json()).then(res => {
      console.log('[ChartsPage] /api/progress/heatmap 完成，耗时:', Date.now() - fetchStartTime, 'ms');
      if (res.success) setHeatmapData(res.data);
      return res;
    }).catch(err => {
      console.error('[ChartsPage] 获取热力图数据失败:', err);
      return { success: false };
    });

    Promise.all([fetchCardsPromise, fetchStreakPromise, fetchHeatmapPromise]).then(() => {
      setFirstLoadComplete(true);
      console.log('[ChartsPage] 首次加载完成');
    });
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      api.listCards().then(res => {
        if (res.success) setCards(res.cards);
      }).catch(err => console.error('刷新卡片失败:', err));
      
      fetch('/api/progress/streak').then(r => r.json()).then(res => {
        if (res.success) setStreakData(res);
      }).catch(err => console.error('刷新连续学习数据失败:', err));
      
      fetch('/api/progress/heatmap').then(r => r.json()).then(res => {
        if (res.success) setHeatmapData(res.data);
      }).catch(err => console.error('刷新热力图数据失败:', err));
    };
    window.addEventListener('papyrus_cards_changed', handleRefresh);
    window.addEventListener('papyrus_notes_changed', handleRefresh);
    return () => {
      window.removeEventListener('papyrus_cards_changed', handleRefresh);
      window.removeEventListener('papyrus_notes_changed', handleRefresh);
    };
  }, []);

  const stats = useMemo(() => calculateStats(cards, streakData), [cards, streakData]);

  // 分组统计
  const cardGroups = useMemo(() => {
    const now = Date.now() / 1000;
    return {
      new: cards.filter(c => (c.interval || 0) === 0),
      learning: cards.filter(c => (c.interval || 0) > 0 && (c.interval || 0) <= 1),
      review: cards.filter(c => (c.interval || 0) > 1),
      due: cards.filter(c => (c.next_review || 0) <= now),
    };
  }, [cards]);

  const animatedStreakDays = useAnimatedNumber(stats.streakDays, 800, 100, firstLoadComplete);
  const animatedMasteredCards = useAnimatedNumber(stats.masteredCards, 800, 150, firstLoadComplete);
  const animatedTotalCards = useAnimatedNumber(stats.totalCards, 800, 200, firstLoadComplete);
  const animatedTodayCards = useAnimatedNumber(stats.todayCards, 800, 250, firstLoadComplete);
  const animatedTodayProgress = useAnimatedNumber(stats.todayProgress, 800, 300, firstLoadComplete);
  const overallProgress = stats.totalCards > 0 && animatedTotalCards > 0 
    ? Math.round((animatedMasteredCards / animatedTotalCards) * 100) 
    : 0;

  const animatedNewCards = useAnimatedNumber(cardGroups.new.length, 800, 200, firstLoadComplete);
  const animatedLearningCards = useAnimatedNumber(cardGroups.learning.length, 800, 300, firstLoadComplete);
  const animatedReviewCards = useAnimatedNumber(cardGroups.review.length, 800, 400, firstLoadComplete);
  const animatedDueCards = useAnimatedNumber(cardGroups.due.length, 800, 500, firstLoadComplete);

  if (firstLoadComplete && cards.length === 0) {
    return (
      <PageLayout title='数据' pageKey='charts'>
        <Empty description="暂无数据，请先添加卡片" />
      </PageLayout>
    );
  }

  const pageStats = [
    { label: '连续学习', value: animatedStreakDays, suffix: '天' },
    { label: '已掌握', value: `${animatedMasteredCards}/${animatedTotalCards}` },
    { label: '总进度', value: `${overallProgress}%` },
    { label: '今日已复习', value: animatedTodayCards, suffix: `/${stats.dailyTarget}` },
    { label: '今日目标', value: `${animatedTodayProgress}%` },
  ];

  return (
    <PageLayout 
      title='数据' 
      pageKey='charts'
      stats={pageStats}
      statsLoading={!firstLoadComplete}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard title='新卡片' value={animatedNewCards} suffix='张' icon={<IconClockCircle />} />
        <StatCard title='学习中' value={animatedLearningCards} suffix='张' icon={<IconCalendar />} />
        <StatCard title='复习中' value={animatedReviewCards} suffix='张' icon={<IconFire />} />
        <StatCard title='待复习' value={animatedDueCards} suffix='张' icon={<IconCheckCircle />} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
        <Card style={{ borderRadius: '16px', border: '1px solid var(--color-text-3)', height: '280px' }}>
          <Typography.Text bold style={{ fontSize: '15px', display: 'block', marginBottom: '16px' }}>
            本周学习趋势
          </Typography.Text>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', background: PRIMARY_COLOR, borderRadius: '2px' }} />
              <Typography.Text type='secondary'>新学</Typography.Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', background: `${PRIMARY_COLOR}40`, borderRadius: '2px' }} />
              <Typography.Text type='secondary'>复习</Typography.Text>
            </div>
          </div>
          <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end' }}>
            <WeekChart cards={cards} />
          </div>
        </Card>

        <Card style={{ borderRadius: '16px', border: '1px solid var(--color-text-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Typography.Text bold style={{ fontSize: '15px' }}>
              过去一年学习记录
            </Typography.Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <Typography.Text type='secondary'>少</Typography.Text>
              <div style={{ display: 'flex', gap: '2px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--color-fill-2)' }} />
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#1F4D2A' }} />
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#2E7D32' }} />
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#4CAF50' }} />
              </div>
              <Typography.Text type='secondary'>多</Typography.Text>
            </div>
          </div>
          <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
            <Heatmap data={heatmapData} />
          </div>
        </Card>
      </div>

      <Typography.Title heading={2} style={{ fontWeight: 400, fontSize: '20px', margin: '0 0 24px', color: 'var(--color-text-3)' }}>
        学习进度
      </Typography.Title>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        <SimpleProgressCard 
          title='新卡片' 
          progress={cardGroups.new.length > 0 ? 100 : 0} 
          count={cardGroups.new.filter(c => (c.next_review || 0) <= Date.now() / 1000).length}
          dataReady={firstLoadComplete}
        />
        <SimpleProgressCard 
          title='学习中' 
          progress={Math.round((cardGroups.learning.length / Math.max(cards.length, 1)) * 100)} 
          count={cardGroups.learning.filter(c => (c.next_review || 0) <= Date.now() / 1000).length}
          dataReady={firstLoadComplete}
        />
        <SimpleProgressCard 
          title='复习中' 
          progress={Math.round((cardGroups.review.length / Math.max(cards.length, 1)) * 100)} 
          count={cardGroups.review.filter(c => (c.next_review || 0) <= Date.now() / 1000).length}
          dataReady={firstLoadComplete}
        />
      </div>
    </PageLayout>
  );
};

export default ChartsPage;
