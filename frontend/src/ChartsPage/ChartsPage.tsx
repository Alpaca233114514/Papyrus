import { Typography, Card, Progress, Tooltip } from '@arco-design/web-react';
import { useState, useMemo } from 'react';
import { IconFire, IconClockCircle, IconCheckCircle, IconCalendar } from '@arco-design/web-react/icon';
import { usePageScenery } from '../hooks/useScenery';


const PRIMARY_COLOR = '#206CCF';
const SUCCESS_COLOR = '#00B42A';

// 模拟数据
const MOCK_STATS = {
  streakDays: 7,
  totalLearned: 590,
  totalCards: 910,
  totalDue: 56,
  avgAccuracy: 77,
  todayTime: 45,
  weekCards: 122,
  monthDays: 18,
  totalDays: 42,
};

const MOCK_COLLECTION_STATS = [
  { id: '1', title: '高等数学', totalCards: 128, masteredCards: 98, dueCards: 12, accuracy: 85 },
  { id: '2', title: '英语词汇', totalCards: 340, masteredCards: 256, dueCards: 0, accuracy: 78 },
  { id: '3', title: '操作系统', totalCards: 76, masteredCards: 42, dueCards: 5, accuracy: 72 },
  { id: '4', title: '日本語 N2', totalCards: 210, masteredCards: 105, dueCards: 31, accuracy: 68 },
  { id: '5', title: '计算机网络', totalCards: 156, masteredCards: 89, dueCards: 8, accuracy: 80 },
];

const MOCK_WEEK_DATA = [
  { date: '周一', learned: 15, reviewed: 45 },
  { date: '周二', learned: 20, reviewed: 38 },
  { date: '周三', learned: 12, reviewed: 52 },
  { date: '周四', learned: 18, reviewed: 30 },
  { date: '周五', learned: 25, reviewed: 42 },
  { date: '周六', learned: 10, reviewed: 35 },
  { date: '周日', learned: 22, reviewed: 48 },
];

// 生成热力图数据（过去一年 - 按周排列）
const generateHeatmapData = () => {
  const weeks: { date: string; count: number; level: number }[][] = [];
  const today = new Date();
  
  // 计算今天是一周的第几天（0=周日）
  const dayOfWeek = today.getDay();
  // 调整到本周一开始
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - daysSinceMonday);
  
  // 生成52周数据
  for (let w = 51; w >= 0; w--) {
    const weekData: { date: string; count: number; level: number }[] = [];
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - w * 7);
    
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      const count = Math.random() > 0.4 ? Math.floor(Math.random() * 50) + 5 : 0;
      const level = count === 0 ? 0 : count < 15 ? 1 : count < 30 ? 2 : 3;
      weekData.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count,
        level,
      });
    }
    weeks.push(weekData);
  }
  return weeks;
};

// 统计项
const StatItem = ({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) => (
  <div style={{ textAlign: 'center' }}>
    <Typography.Text style={{ fontSize: '24px', fontWeight: 600 }}>
      {value}{suffix && <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '4px' }}>{suffix}</span>}
    </Typography.Text>
    <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
      {label}
    </Typography.Text>
  </div>
);

// 通用卡片样式 - 与开始界面统一风格
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

// 卷轴进度卡片
const CollectionProgressCard = ({ stats }: { stats: typeof MOCK_COLLECTION_STATS[0] }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);
  const progress = Math.round((stats.masteredCards / stats.totalCards) * 100);

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
          {stats.title}
        </Typography.Text>
        {stats.dueCards > 0 && (
          <span style={{
            background: 'var(--color-fill-2)',
            color: 'var(--color-text-2)',
            borderRadius: '999px',
            padding: '4px 8px',
            fontSize: '11px',
          }}>
            {stats.dueCards} 待复习
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
        <span>{stats.masteredCards}/{stats.totalCards} 已掌握</span>
        <span>正确率 {stats.accuracy}%</span>
      </div>
    </div>
  );
};

// 本周趋势图表
const WeekChart = () => {
  const maxValue = Math.max(...MOCK_WEEK_DATA.map(d => d.learned + d.reviewed));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', height: '100%', gap: '16px' }}>
      {MOCK_WEEK_DATA.map((item, index) => {
        const total = item.learned + item.reviewed;
        const height = (total / maxValue) * 100;
        const learnedHeight = (item.learned / total) * 100;

        return (
          <Tooltip 
            key={index} 
            content={`${item.date}: 新学 ${item.learned} 张, 复习 ${item.reviewed} 张`}
            position='top'
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '80px' }}>
              <div style={{
                width: '32px',
                height: `${height}%`,
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

// 热力图 - 带日期和学习情况冒泡（横向延展）
const Heatmap = () => {
  const weeks = useMemo(() => generateHeatmapData(), []);
  
  const getColor = (level: number) => {
    // 适配深色模式的绿色系
    const colors = [
      'var(--color-fill-2)',  // level 0 - 无记录
      '#1F4D2A',              // level 1 - 浅色（深色模式下的深绿）
      '#2E7D32',              // level 2 - 中色
      '#4CAF50',              // level 3 - 亮色
    ];
    return colors[level];
  };

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

// 顶部统计栏组件 - 支持窗景背景
const StatsBar = () => {
  const { config: sceneryConfig, loaded } = usePageScenery('charts');
  const overallProgress = Math.round((MOCK_STATS.totalLearned / MOCK_STATS.totalCards) * 100);

  // 等待设置加载完成
  if (!loaded) {
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
        <div style={{ display: 'flex', gap: '48px' }}>
          <StatItem label='连续学习' value={MOCK_STATS.streakDays} suffix='天' />
          <StatItem label='已掌握' value={`${MOCK_STATS.totalLearned}/${MOCK_STATS.totalCards}`} />
          <StatItem label='总进度' value={`${overallProgress}%`} />
          <StatItem label='今日待复习' value={MOCK_STATS.totalDue} />
          <StatItem label='平均正确率' value={`${MOCK_STATS.avgAccuracy}%`} />
        </div>
      </div>
    );
  }

  // 窗景配置
  const image = sceneryConfig.image;
  const poem = '且将新火试新茶，诗酒趁年华。';
  const source = '[宋] 苏轼《望江南·超然台作》';
  const overlayOpacity = Math.max(0.25, Math.min(0.5, sceneryConfig.opacity));

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
      {/* 窗景背景图 */}
      {sceneryConfig.enabled && (
        <>
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
          {/* 固定透明度遮罩层 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(255, 255, 255, ${overlayOpacity})`,
            }}
          />
        </>
      )}

      {/* 统计内容 */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '48px' }}>
        <StatItem label='连续学习' value={MOCK_STATS.streakDays} suffix='天' />
        <StatItem label='已掌握' value={`${MOCK_STATS.totalLearned}/${MOCK_STATS.totalCards}`} />
        <StatItem label='总进度' value={`${overallProgress}%`} />
        <StatItem label='今日待复习' value={MOCK_STATS.totalDue} />
        <StatItem label='平均正确率' value={`${MOCK_STATS.avgAccuracy}%`} />
      </div>
    </div>
  );
};

const ChartsPage = () => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px', background: 'var(--color-bg-1)' }}>
      {/* 标题 */}
      <Typography.Title
        heading={1}
        style={{ fontWeight: 600, lineHeight: 1, margin: 0, marginBottom: '32px', fontSize: '40px' }}
      >
        数据
      </Typography.Title>

      {/* 顶部统计栏 */}
      <StatsBar />

      {/* 统计卡片网格 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard title='今日学习时长' value={MOCK_STATS.todayTime} suffix='分钟' icon={<IconClockCircle />} />
        <StatCard title='本周学习卡片' value={MOCK_STATS.weekCards} suffix='张' icon={<IconCalendar />} />
        <StatCard title='本月学习天数' value={MOCK_STATS.monthDays} suffix='天' icon={<IconFire />} />
        <StatCard title='总学习天数' value={MOCK_STATS.totalDays} suffix='天' icon={<IconCheckCircle />} />
      </div>

      {/* 图表区域 - 上下排列，高度更大 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
        {/* 本周趋势 */}
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
            <WeekChart />
          </div>
        </Card>

        {/* 学习热力图 */}
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
            <Heatmap />
          </div>
        </Card>
      </div>

      {/* 各卷轴进度 */}
      <Typography.Title heading={2} style={{ fontWeight: 400, fontSize: '20px', margin: '0 0 24px', color: 'var(--color-text-3)' }}>
        各卷轴进度
      </Typography.Title>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {MOCK_COLLECTION_STATS.map(stats => (
          <CollectionProgressCard key={stats.id} stats={stats} />
        ))}
      </div>

      <div style={{ height: '32px' }} />
    </div>
  );
};

export default ChartsPage;
