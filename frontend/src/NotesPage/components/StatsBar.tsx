import { Typography } from '@arco-design/web-react';
import { PRIMARY_COLOR } from '../constants';
import { usePageScenery } from '../../hooks/useScenery';

interface StatsBarProps {
  noteCount: number;
  totalWords: number;
  todayNotes: number;
  tagCount: number;
}

export const StatsBar = ({ noteCount, totalWords, todayNotes, tagCount }: StatsBarProps) => {
  const { config: sceneryConfig, loaded } = usePageScenery('notes');

  // 等待设置加载完成
  if (!loaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '24px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
      }}>
        <div style={{ display: 'flex', gap: '48px' }}>
          <StatItem value={noteCount} label="笔记数" highlight />
          <StatItem value={`${(totalWords / 1000).toFixed(1)}k`} label="总字数" />
          <StatItem value={todayNotes} label="今日更新" />
          <StatItem value={tagCount} label="标签" />
        </div>
      </div>
    );
  }

  // 窗景开启时，获取图片和默认诗句
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
      marginBottom: '24px',
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
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        display: 'flex', 
        gap: '48px' 
      }}>
        <StatItem value={noteCount} label="笔记数" highlight />
        <StatItem value={`${(totalWords / 1000).toFixed(1)}k`} label="总字数" />
        <StatItem value={todayNotes} label="今日更新" />
        <StatItem value={tagCount} label="标签" />
      </div>
    </div>
  );
};

interface StatItemProps {
  value: string | number;
  label: string;
  highlight?: boolean;
}

const StatItem = ({ value, label, highlight }: StatItemProps) => (
  <div style={{ textAlign: 'center' }}>
    <Typography.Text style={{ 
      fontSize: '24px', 
      fontWeight: 600, 
      color: highlight ? PRIMARY_COLOR : 'var(--color-text-1)' 
    }}>
      {value}
    </Typography.Text>
    <Typography.Text 
      type='secondary' 
      style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}
    >
      {label}
    </Typography.Text>
  </div>
);
