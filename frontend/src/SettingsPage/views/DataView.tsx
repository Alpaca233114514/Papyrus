import { useState } from 'react';
import {
  Button,
  Typography,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconSafe,
  IconStorage,
  IconDelete,
  IconCloud,
  IconFolder,
} from '@arco-design/web-react/icon';

const { Title, Text, Paragraph } = Typography;

interface DataViewProps {
  onBack: () => void;
}

// 数据设置侧边栏子菜单项
const DATA_MENU_ITEMS = [
  { key: 'backup', label: '备份与恢复', icon: IconSafe },
  { key: 'storage', label: '存储管理', icon: IconStorage },
];

const DataView = ({ onBack }: DataViewProps) => {
  const [activeMenu, setActiveMenu] = useState('backup');

  // 备份与恢复内容
  const BackupSettings = () => (
    <>
      <div className="settings-section">
        <div className="settings-data-card">
          <div className="settings-data-info">
            <div 
              className="settings-data-icon"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <IconSafe style={{ fontSize: 24 }} />
            </div>
            <div>
              <Text bold style={{ fontSize: 15 }}>创建备份</Text>
              <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                立即备份所有数据到本地文件
              </Paragraph>
            </div>
          </div>
          <Button type="primary" shape="round">
            立即备份
          </Button>
        </div>

        <div className="settings-data-card">
          <div className="settings-data-info">
            <div 
              className="settings-data-icon"
              style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}
            >
              <IconStorage style={{ fontSize: 24 }} />
            </div>
            <div>
              <Text bold style={{ fontSize: 15 }}>导出数据</Text>
              <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                导出为 JSON 或 Markdown 文件
              </Paragraph>
            </div>
          </div>
          <Button shape="round">
            导出数据
          </Button>
        </div>

        <div className="settings-data-card danger">
          <div className="settings-data-info">
            <div 
              className="settings-data-icon"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
            >
              <IconDelete style={{ fontSize: 24 }} />
            </div>
            <div>
              <Text bold style={{ fontSize: 15, color: 'var(--color-danger)' }}>重置所有数据</Text>
              <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                永久删除所有数据，不可恢复
              </Paragraph>
            </div>
          </div>
          <Button status="danger" shape="round">
            重置
          </Button>
        </div>
      </div>

      <div className="settings-tip">
        <IconSafe style={{ color: 'var(--color-success)' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          建议定期备份数据，以防止意外丢失
        </Text>
      </div>
    </>
  );

  // 存储管理内容
  const StorageSettings = () => (
    <>
      <div className="settings-section">
        <div className="settings-data-card">
          <div className="settings-data-info">
            <div 
              className="settings-data-icon"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <IconFolder style={{ fontSize: 24 }} />
            </div>
            <div>
              <Text bold style={{ fontSize: 15 }}>本地存储</Text>
              <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                使用本地文件系统存储数据
              </Paragraph>
            </div>
          </div>
          <Button shape="round">
            查看位置
          </Button>
        </div>

        <div className="settings-data-card">
          <div className="settings-data-info">
            <div 
              className="settings-data-icon"
              style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}
            >
              <IconCloud style={{ fontSize: 24 }} />
            </div>
            <div>
              <Text bold style={{ fontSize: 15 }}>云同步</Text>
              <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                同步数据到云端（即将推出）
              </Paragraph>
            </div>
          </div>
          <Button shape="round" disabled>
            即将推出
          </Button>
        </div>
      </div>
    </>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'backup':
        return <BackupSettings />;
      case 'storage':
        return <StorageSettings />;
      default:
        return <BackupSettings />;
    }
  };

  const getCurrentTitle = () => {
    const item = DATA_MENU_ITEMS.find(item => item.key === activeMenu);
    return item?.label || '备份与恢复';
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
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>数据设置</Text>
        </div>

        {/* 菜单项 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {DATA_MENU_ITEMS.map((item) => {
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

export default DataView;
