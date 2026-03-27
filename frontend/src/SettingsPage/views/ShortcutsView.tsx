import { useState } from 'react';
import {
  Button,
  Typography,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconEdit,
  IconBulb,
  IconKeyboard,
  IconCommand,
} from '@arco-design/web-react/icon';

const { Title, Text, Paragraph } = Typography;

interface ShortcutsViewProps {
  onBack: () => void;
}

// 快捷键设置侧边栏子菜单项
const SHORTCUTS_MENU_ITEMS = [
  { key: 'general', label: '通用快捷键', icon: IconKeyboard },
  { key: 'advanced', label: '高级快捷键', icon: IconCommand },
];

const ShortcutsView = ({ onBack }: ShortcutsViewProps) => {
  const [activeMenu, setActiveMenu] = useState('general');
  const [shortcuts, setShortcuts] = useState({
    openChat: 'Ctrl+Shift+C',
    newNote: 'Ctrl+N',
    search: 'Ctrl+K',
    toggleSidebar: 'Ctrl+B',
  });

  // 通用快捷键内容
  const GeneralShortcuts = () => (
    <div className="settings-section">
      {Object.entries(shortcuts).map(([key, value]) => (
        <SettingItem 
          key={key}
          title={{
            openChat: '打开聊天面板',
            newNote: '新建笔记',
            search: '搜索',
            toggleSidebar: '切换侧边栏',
          }[key] || key}
          divider={key !== 'toggleSidebar'}
        >
          <div className="settings-shortcut-input">
            <span className="settings-shortcut-value">{value}</span>
            <Button type="text" size="mini" icon={<IconEdit />} aria-label="编辑快捷键" />
          </div>
        </SettingItem>
      ))}

      <div className="settings-tip">
        <IconBulb style={{ color: 'var(--color-primary)' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          点击编辑按钮可修改快捷键，快捷键冲突时会自动提示
        </Text>
      </div>
    </div>
  );

  // 高级快捷键内容
  const AdvancedShortcuts = () => (
    <div className="settings-section">
      <SettingItem 
        title="开发者工具"
        divider={false}
      >
        <div className="settings-shortcut-input">
          <span className="settings-shortcut-value">Ctrl+Shift+I</span>
          <Button type="text" size="mini" icon={<IconEdit />} aria-label="编辑快捷键" />
        </div>
      </SettingItem>

      <div className="settings-tip">
        <IconBulb style={{ color: 'var(--color-primary)' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          高级快捷键仅供进阶用户使用
        </Text>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'general':
        return <GeneralShortcuts />;
      case 'advanced':
        return <AdvancedShortcuts />;
      default:
        return <GeneralShortcuts />;
    }
  };

  const getCurrentTitle = () => {
    const item = SHORTCUTS_MENU_ITEMS.find(item => item.key === activeMenu);
    return item?.label || '通用快捷键';
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
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>快捷键</Text>
        </div>

        {/* 菜单项 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {SHORTCUTS_MENU_ITEMS.map((item) => {
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

export default ShortcutsView;
