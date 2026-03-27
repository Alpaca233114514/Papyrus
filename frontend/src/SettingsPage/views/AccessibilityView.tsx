import { useState } from 'react';
import {
  Switch,
  Button,
  Typography,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconBulb,
  IconEye,
  IconMoon,
  IconSun,
} from '@arco-design/web-react/icon';
import IconAccessibility from '../../icons/IconAccessibility';

const { Title, Text, Paragraph } = Typography;

interface AccessibilityViewProps {
  onBack: () => void;
}

// 无障碍设置侧边栏子菜单项
const ACCESSIBILITY_MENU_ITEMS = [
  { key: 'visual', label: '视觉辅助', icon: IconEye },
  { key: 'motion', label: '动画与效果', icon: IconMoon },
];

const AccessibilityView = ({ onBack }: AccessibilityViewProps) => {
  const [activeMenu, setActiveMenu] = useState('visual');
  
  // 无障碍设置状态
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderOptimized, setScreenReaderOptimized] = useState(false);
  const [focusIndicator, setFocusIndicator] = useState(true);
  const [largeCursor, setLargeCursor] = useState(false);

  // 视觉辅助内容
  const VisualSettings = () => (
    <>
      <div className="settings-section">
        <SettingItem 
          title="减少动画" 
          desc="减弱界面动画效果，适用于对动画敏感的用户"
        >
          <Switch checked={reduceMotion} onChange={setReduceMotion} />
        </SettingItem>

        <SettingItem 
          title="高对比度" 
          desc="增强文字与背景的对比度，提高可读性"
        >
          <Switch checked={highContrast} onChange={setHighContrast} />
        </SettingItem>

        <SettingItem 
          title="屏幕阅读器优化" 
          desc="优化界面元素，提供更好的屏幕阅读器体验"
        >
          <Switch checked={screenReaderOptimized} onChange={setScreenReaderOptimized} />
        </SettingItem>

        <SettingItem 
          title="焦点指示器" 
          desc="始终显示键盘焦点高亮，方便键盘导航"
        >
          <Switch checked={focusIndicator} onChange={setFocusIndicator} />
        </SettingItem>

        <SettingItem 
          title="大光标" 
          desc="放大鼠标指针，方便视力不佳的用户"
          divider={false}
        >
          <Switch checked={largeCursor} onChange={setLargeCursor} />
        </SettingItem>
      </div>

      <div className="settings-tip">
        <IconAccessibility style={{ color: 'var(--color-text-3)' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          这些设置可以帮助您更舒适地使用应用。字体大小调整请前往外观设置。
        </Text>
      </div>
    </>
  );

  // 动画与效果内容
  const MotionSettings = () => (
    <>
      <div className="settings-section">
        <SettingItem 
          title="窗口动画" 
          desc="启用窗口打开和关闭的过渡动画"
          divider={false}
        >
          <Switch checked={!reduceMotion} onChange={(v) => setReduceMotion(!v)} />
        </SettingItem>
      </div>

      <div className="settings-tip">
        <IconBulb style={{ color: 'var(--color-primary)' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          减少动画可以降低对前庭功能障碍用户的影响
        </Text>
      </div>
    </>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'visual':
        return <VisualSettings />;
      case 'motion':
        return <MotionSettings />;
      default:
        return <VisualSettings />;
    }
  };

  const getCurrentTitle = () => {
    const item = ACCESSIBILITY_MENU_ITEMS.find(item => item.key === activeMenu);
    return item?.label || '视觉辅助';
  };

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--color-bg-1)',
    }}>
      {/* 左侧二级菜单 */}
      <div style={{
        width: 200,
        height: '100%',
        borderRight: '1px solid var(--color-border-2)',
        background: 'var(--color-bg-1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* 标题栏 */}
        <div style={{
          padding: 16,
          borderBottom: '1px solid var(--color-border-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Button
            type="text"
            icon={<IconArrowLeft />}
            onClick={onBack}
            style={{ padding: 0, fontSize: 14 }}
          />
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>无障碍</Text>
        </div>

        {/* 菜单项 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {ACCESSIBILITY_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.key;
            return (
              <div
                key={item.key}
                onClick={() => setActiveMenu(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderRadius: 8,
                  marginBottom: 4,
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-1)',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-fill-2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon style={{ fontSize: 16 }} />
                <Text
                  style={{
                    fontSize: 13,
                    color: isActive ? 'var(--color-primary)' : 'inherit',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {item.label}
                </Text>
              </div>
            );
          })}
        </div>
      </div>

      {/* 拖拽条 */}
      <div
        style={{
          width: 4,
          cursor: 'ew-resize',
          background: 'transparent',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-border-2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      />

      {/* 主内容区 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: 48,
      }}>
        <Title heading={2} style={{ margin: '0 0 32px 0', fontWeight: 400, fontSize: '28px' }}>
          {getCurrentTitle()}
        </Title>
        
        {renderContent()}
      </div>
    </div>
  );
};

// 设置项组件
const SettingItem = ({ 
  title, 
  desc, 
  children,
  divider = true 
}: { 
  title: string; 
  desc?: string; 
  children: React.ReactNode;
  divider?: boolean;
}) => (
  <div className="settings-item">
    <div className="settings-item-content">
      <div className="settings-item-info">
        <Text bold className="settings-item-title">{title}</Text>
        {desc && <Paragraph type="secondary" className="settings-item-desc">{desc}</Paragraph>}
      </div>
      <div className="settings-item-control">
        {children}
      </div>
    </div>
    {divider && <div className="settings-item-divider" />}
  </div>
);

export default AccessibilityView;
