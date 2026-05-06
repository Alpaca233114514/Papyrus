import { Typography } from '@arco-design/web-react';
import { usePageScenery } from '../hooks/useScenery';
import { Spin } from '@arco-design/web-react';

const STATS_FONT_SIZE = '24px';
const STATS_LABEL_FONT_SIZE = '12px';
const STATS_VALUE_COLOR = '#FFFFFF';
const STATS_LABEL_COLOR = 'rgba(255, 255, 255, 0.75)';

interface StatItem {
  value: string | number;
  label: string;
  suffix?: string;
}

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  stats?: StatItem[];
  statsLoading?: boolean;
  pageKey?: string;
  extraStatsContent?: React.ReactNode;
  statsContent?: React.ReactNode;
}

export const PageLayout = ({
  title,
  children,
  actions,
  stats,
  statsLoading = false,
  pageKey,
  extraStatsContent,
  statsContent,
}: PageLayoutProps) => {
  const { config: sceneryConfig, loaded } = usePageScenery(pageKey || 'common');

  const renderStats = () => {
    if (statsContent) {
      if (!loaded || statsLoading) {
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

      const image = sceneryConfig.image;
      const poem = '且将新火试新茶，诗酒趁年华。';
      const source = '[宋] 苏轼《望江南·超然台作》';
      const overlayOpacity = Math.max(0.25, Math.min(0.75, sceneryConfig.opacity));

      return (
        <div style={{
          position: 'relative',
          padding: '24px',
          marginBottom: '32px',
          borderRadius: '12px',
          border: '1px solid var(--color-text-3)',
          overflow: 'hidden',
        }}>
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
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `rgba(255, 255, 255, ${overlayOpacity})`,
                }}
              />
            </>
          )}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            {statsContent}
            {extraStatsContent}
          </div>
        </div>
      );
    }

    if (!stats && !extraStatsContent) return null;

    if (!loaded || statsLoading) {
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

    const content = (
      <div style={{ display: 'flex', gap: stats ? '48px' : '0', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', gap: stats ? '48px' : '0' }}>
          {stats?.map((stat, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <Typography.Text style={{
                fontSize: STATS_FONT_SIZE,
                fontWeight: 600,
                color: STATS_VALUE_COLOR,
              }}>
                {stat.value}
                {stat.suffix && <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '4px' }}>{stat.suffix}</span>}
              </Typography.Text>
              <Typography.Text style={{
                fontSize: STATS_LABEL_FONT_SIZE,
                display: 'block',
                marginTop: '4px',
                color: STATS_LABEL_COLOR,
              }}>
                {stat.label}
              </Typography.Text>
            </div>
          ))}
        </div>
        {extraStatsContent}
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
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {content}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '48px 64px 64px',
      background: 'var(--color-bg-1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <Typography.Title
          heading={1}
          style={{ fontWeight: 600, lineHeight: 1, margin: 0, fontSize: '40px' }}
        >
          {title}
        </Typography.Title>
        {actions && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {actions}
          </div>
        )}
      </div>

      {renderStats()}

      {children}

      <div style={{ height: '32px' }} />
    </div>
  );
};

export default PageLayout;
