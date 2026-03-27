import { useState } from 'react';
import {
  Switch,
  Button,
  Typography,
  Card,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconTool,
  IconPlus,
  IconDelete,
  IconEdit,
  IconSettings,
  IconServer,
} from '@arco-design/web-react/icon';

const { Title, Text, Paragraph } = Typography;

interface McpServer {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

interface McpViewProps {
  onBack: () => void;
}

// MCP 服务侧边栏子菜单项
const MCP_MENU_ITEMS = [
  { key: 'servers', label: '服务列表', icon: IconServer },
  { key: 'settings', label: '高级设置', icon: IconSettings },
];

const McpView = ({ onBack }: McpViewProps) => {
  const [activeMenu, setActiveMenu] = useState('servers');
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([
    { id: '1', name: '文件系统', url: 'http://localhost:3001', enabled: true },
    { id: '2', name: '网页搜索', url: 'http://localhost:3002', enabled: false },
  ]);

  // 服务列表内容
  const ServersSettings = () => (
    <>
      <div className="settings-section">
        <SettingItem title="启用 MCP 服务" desc="允许 AI 通过 MCP 协议调用外部工具" divider={false}>
          <Switch checked={mcpEnabled} onChange={setMcpEnabled} />
        </SettingItem>
      </div>

      {mcpEnabled && (
        <div className="settings-section">
          <Title heading={4} className="settings-section-title">已配置的服务</Title>
          
          {mcpServers.map(server => (
            <Card 
              key={server.id} 
              className="settings-mcp-card"
              bodyStyle={{ padding: 16 }}
            >
              <div className="settings-mcp-card-content">
                <div className="settings-mcp-info">
                  <IconTool style={{ fontSize: 24, color: 'var(--color-primary)' }} />
                  <div>
                    <Text bold>{server.name}</Text>
                    <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                      {server.url}
                    </Paragraph>
                  </div>
                </div>
                <div className="settings-mcp-actions">
                  <Switch 
                    size="small" 
                    checked={server.enabled}
                    onChange={(checked) => {
                      setMcpServers(mcpServers.map(s => 
                        s.id === server.id ? { ...s, enabled: checked } : s
                      ));
                    }}
                  />
                  <Tooltip content="编辑">
                    <Button type="text" size="mini" icon={<IconEdit />} aria-label="编辑服务" />
                  </Tooltip>
                  <Tooltip content="删除">
                    <Button 
                      type="text" 
                      size="mini" 
                      icon={<IconDelete />}
                      status="danger"
                      onClick={() => {
                        setMcpServers(mcpServers.filter(s => s.id !== server.id));
                      }}
                      aria-label="删除服务"
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          ))}

          <Button 
            type="outline" 
            shape="round" 
            icon={<IconPlus />}
            style={{ marginTop: 16 }}
            onClick={() => {
              const newId = (mcpServers.length + 1).toString();
              setMcpServers([...mcpServers, { 
                id: newId, 
                name: '新服务', 
                url: 'http://localhost:3000', 
                enabled: false 
              }]);
            }}
          >
            添加服务
          </Button>
        </div>
      )}
    </>
  );

  // 高级设置内容
  const AdvancedSettings = () => (
    <>
      <SettingItem title="超时时间" desc="MCP 服务调用的最大等待时间（秒）" divider={false}>
        <Switch checked={true} onChange={() => {}} />
      </SettingItem>
    </>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'servers':
        return <ServersSettings />;
      case 'settings':
        return <AdvancedSettings />;
      default:
        return <ServersSettings />;
    }
  };

  const getCurrentTitle = () => {
    const item = MCP_MENU_ITEMS.find(item => item.key === activeMenu);
    return item?.label || '服务列表';
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
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>MCP 服务</Text>
        </div>

        {/* 菜单项 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {MCP_MENU_ITEMS.map((item) => {
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

export default McpView;
