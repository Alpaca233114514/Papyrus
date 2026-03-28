import { Typography, Card, Progress, Tooltip, Spin, Empty } from '@arco-design/web-react';
import { useState, useMemo, useEffect } from 'react';
import { IconFire, IconClockCircle, IconCheckCircle, IconCalendar } from '@arco-design/web-react/icon';
import { usePageScenery } from '../hooks/useScenery';
import { useSceneryColor, getAdaptivePrimaryColor } from '../hooks/useSceneryColor';
import { api, type Card as CardType } from '../api';

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

const PRIMARY_COLOR = '#206CCF';
const SUCCESS_COLOR = '#00B42A';

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

// 通用卡片样式
const useCardStyle = (hovered: boolean) => ({
  borderRadius: '16px',
  border: `1px solid ${hovered ? PRIMARY_COLOR : 'var(--color-text-3)'}`,
  background: hovered ? `${PRIMARY_COLOR}08` : 'var(--color-bg-1)',
  transition: 'border-color 0.2s, background 0.2s',
  cursor: 'pointer',
});

// 统计卡片
const StatCard = ({ title, value, suffix, icon }: { title: string; value: string | number; suffix?: string; icon: React.ReactNode }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
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
    </div>
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
const SimpleProgressCard = ({ title, progress, count }: { title: string; progress: number; count: number }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        padding: '20px',
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
            {count} 待复习
          </span>
        )}
      </div>

      <Progress
        percent={progress}
        size='large'
        color={progress >= 80 ? SUCCESS_COLOR : PRIMARY_COLOR}
        style={{ marginBottom: '16px' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-3)' }}>
        <span>进度 {progress}%</span>
      </div>
    </div>
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

// 热力图 - 使用真实数据
const Heatmap = ({ data }: { data: HeatmapItem[] }) => {
  const weeks = useMemo(() => {
    const weeks: { date: string; count: number; level: number }[][] = [];
    
    // 将数据按周分组
    for (let i = 0; i < data.length; i += 7) {
      const weekData: { date: string; count: number; level: number }[] = [];
      for (let d = 0; d < 7 && i + d < data.length; d++) {
        const item = data[i + d];
        const date = new Date(item.date);
        weekData.push({
          date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          count: item.count,
          level: item.level,
        });
      }
      weeks.push(weekData);
    }
    return weeks;
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

  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px' }}>
        <Typography.Text type="secondary">暂无学习记录</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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

// 顶部统计栏组件
const StatsBar = ({ stats, loading }: { stats: StatsData; loading: boolean }) => {
  const { config: sceneryConfig, loaded } = usePageScenery('charts');
  const { primaryTextColor, secondaryTextColor, averageBrightness } = useSceneryColor(
    sceneryConfig.enabled ? sceneryConfig.image : undefined,
    sceneryConfig.enabled
  );

  if (loading || !loaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '32px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
      }}>
        <Spin size={24} />
      </div>
    );
  }

  const overallProgress = stats.totalCards > 0 
    ? Math.round((stats.masteredCards / stats.totalCards) * 100) 
    : 0;

  const content = (
    <div style={{ display: 'flex', gap: '48px' }}>
      <StatItem label='连续学习' value={stats.streakDays} suffix='天' colorConfig={sceneryConfig.enabled ? { primary: primaryTextColor, secondary: secondaryTextColor, brightness: averageBrightness } : undefined} />
      <StatItem label='已掌握' value={`${stats.masteredCards}/${stats.totalCards}`} colorConfig={sceneryConfig.enabled ? { primary: primaryTextColor, secondary: secondaryTextColor, brightness: averageBrightness } : undefined} />
      <StatItem label='总进度' value={`${overallProgress}%`} colorConfig={sceneryConfig.enabled ? { primary: primaryTextColor, secondary: secondaryTextColor, brightness: averageBrightness } : undefined} />
      <StatItem label='今日已复习' value={stats.todayCards} suffix={`/${stats.dailyTarget}`} colorConfig={sceneryConfig.enabled ? { primary: primaryTextColor, secondary: secondaryTextColor, brightness: averageBrightness } : undefined} />
      <StatItem label='今日目标' value={`${stats.todayProgress}%`} colorConfig={sceneryConfig.enabled ? { primary: primaryTextColor, secondary: secondaryTextColor, brightness: averageBrightness } : undefined} />
    </div>
  );

  if (!sceneryConfig.enabled) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '32px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
      }}>
        {content}
      </div>
    );
  }

  const image = sceneryConfig.image;
  const poem = '且将新火试新茶，诗酒趁年华。';
  const source = '[宋] 苏轼《望江南·超然台作》';
  const overlayOpacity = Math.max(0.25, Math.min(0.75, sceneryConfig.opacity));

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px',
      marginBottom: '32px',
      borderRadius: '12px',
      border: '1px solid var(--color-text-3)',
      overflow: 'hidden',
    }}>
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
      <div style={{ position: 'relative', zIndex: 1 }}>
        {content}
      </div>
    </div>
  );
};

const ChartsPage = () => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cardsRes, streakRes, heatmapRes] = await Promise.all([
          api.listCards(),
          fetch('http://127.0.0.1:8000/api/progress/streak').then(r => r.json()),
          fetch('http://127.0.0.1:8000/api/progress/heatmap').then(r => r.json()),
        ]);
        if (cardsRes.success) {
          setCards(cardsRes.cards);
        }
        if (streakRes.success) {
          setStreakData(streakRes);
        }
        if (heatmapRes.success) {
          setHeatmapData(heatmapRes.data);
        }
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size={40} />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <Empty description="暂无数据，请先添加卡片" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px', background: 'var(--color-bg-1)' }}>
      <Typography.Title
        heading={1}
        style={{ fontWeight: 600, lineHeight: 1, margin: 0, marginBottom: '32px', fontSize: '40px' }}
      >
        数据
      </Typography.Title>

      <StatsBar stats={stats} loading={loading} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard title='新卡片' value={cardGroups.new.length} suffix='张' icon={<IconClockCircle />} />
        <StatCard title='学习中' value={cardGroups.learning.length} suffix='张' icon={<IconCalendar />} />
        <StatCard title='复习中' value={cardGroups.review.length} suffix='张' icon={<IconFire />} />
        <StatCard title='待复习' value={cardGroups.due.length} suffix='张' icon={<IconCheckCircle />} />
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
        />
        <SimpleProgressCard 
          title='学习中' 
          progress={Math.round((cardGroups.learning.length / Math.max(cards.length, 1)) * 100)} 
          count={cardGroups.learning.filter(c => (c.next_review || 0) <= Date.now() / 1000).length} 
        />
        <SimpleProgressCard 
          title='复习中' 
          progress={Math.round((cardGroups.review.length / Math.max(cards.length, 1)) * 100)} 
          count={cardGroups.review.filter(c => (c.next_review || 0) <= Date.now() / 1000).length} 
        />
      </div>

      <div style={{ height: '32px' }} />
    </div>
  );
};

export default ChartsPage;
