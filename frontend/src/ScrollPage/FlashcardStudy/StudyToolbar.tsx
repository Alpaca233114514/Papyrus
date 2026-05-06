import { Button, Typography, Switch } from '@arco-design/web-react';
import { IconArrowLeft } from '@arco-design/web-react/icon';
import { PRIMARY_COLOR, WARNING_COLOR, SUCCESS_COLOR, DANGER_COLOR, DEMO_CARDS } from './constants';
import type { StudyStats } from './constants';

interface StudyToolbarProps {
  onExit: () => void;
  isDemo: boolean;
  onToggleDemo: () => void;
  demoIndex: number;
  totalCount: number;
  dueCount: number;
  stats: StudyStats;
  studied: number;
}

export function StudyToolbar({
  onExit,
  isDemo,
  onToggleDemo,
  demoIndex,
  totalCount,
  dueCount,
  stats,
  studied,
}: StudyToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Button
        type="text"
        icon={<IconArrowLeft />}
        onClick={onExit}
        style={{ color: 'var(--color-text-2)' }}
      >
        退出学习
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            background: '#FFF7E8',
            borderRadius: '16px',
            border: `1px solid ${WARNING_COLOR}`,
          }}
        >
          <Typography.Text style={{ fontSize: '12px', color: WARNING_COLOR }}>
            演示模式
          </Typography.Text>
          <Switch
            checked={isDemo}
            onChange={onToggleDemo}
            size="small"
            className="demo-switch"
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            background: 'var(--color-fill-2)',
            borderRadius: '20px',
          }}
        >
          <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
            第
          </Typography.Text>
          <Typography.Text
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: PRIMARY_COLOR,
            }}
          >
            {isDemo ? demoIndex + 1 : studied + 1}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
            / {isDemo ? DEMO_CARDS.length : totalCount} 张
          </Typography.Text>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            background: 'var(--color-fill-2)',
            borderRadius: '20px',
          }}
        >
          <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
            待复习
          </Typography.Text>
          <Typography.Text
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: dueCount > 0 ? PRIMARY_COLOR : 'inherit',
            }}
          >
            {dueCount}
          </Typography.Text>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
          <span style={{ color: SUCCESS_COLOR }}>✓ {stats.mastered}</span>
          <span style={{ color: DANGER_COLOR }}>✗ {stats.forgotten}</span>
        </div>
      </div>
    </div>
  );
}
