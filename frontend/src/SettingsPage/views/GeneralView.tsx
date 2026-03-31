import {
  Select,
  Switch,
  Button,
  Typography,
  Input,
  InputNumber,
  Message,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconSettings,
  IconClockCircle,
  IconNotification,
  IconFile,
} from '@arco-design/web-react/icon';
import { useState, useEffect } from 'react';

const { Title, Text, Paragraph } = Typography;
const Option = Select.Option;

interface GeneralViewProps {
  onBack: () => void;
}

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

// 通用设置侧边栏子菜单项
const GENERAL_MENU_ITEMS = [
  { key: 'basic', label: '基础设置', icon: IconSettings },
  { key: 'startup', label: '启动与通知', icon: IconClockCircle },
  { key: 'language', label: '语言与地区', icon: IconNotification },
  { key: 'logs', label: '日志', icon: IconFile },
];

// 日志配置类型
interface LogsConfig {
  log_dir: string;
  log_level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  log_rotation: boolean;
  backup_count: number;
}

const GeneralView = ({ onBack }: GeneralViewProps) => {
  const [activeMenu, setActiveMenu] = useState('basic');
  
  // 通用设置状态
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [reviewReminder, setReviewReminder] = useState(true);
  const [language, setLanguage] = useState('zh-CN');
  
  // 日志设置状态
  const [logsConfig, setLogsConfig] = useState<LogsConfig>({
    log_dir: '',
    log_level: 'INFO',
    log_rotation: true,
    backup_count: 7,
  });
  const [logsLoading, setLogsLoading] = useState(false);

  // 基础设置内容
  const BasicSettings = () => (
    <>
      <SettingItem title="语言" desc="选择应用显示语言">
        <Select value={language} onChange={setLanguage} style={{ width: 160 }}>
          <Option value="zh-CN">简体中文</Option>
          <Option value="zh-TW">繁体中文</Option>
          <Option value="en-US">English</Option>
          <Option value="ja-JP">日本語</Option>
        </Select>
      </SettingItem>
    </>
  );

  // 启动与通知内容
  const StartupSettings = () => (
    <>
      <SettingItem title="开机自动启动" desc="系统启动时自动运行应用">
        <Switch checked={autoStart} onChange={setAutoStart} />
      </SettingItem>

      <SettingItem title="关闭时最小化到托盘" desc="点击关闭按钮时最小化到系统托盘">
        <Switch checked={minimizeToTray} onChange={setMinimizeToTray} />
      </SettingItem>

      <SettingItem title="复习提醒通知" desc="有卡片需要复习时显示桌面通知" divider={false}>
        <Switch checked={reviewReminder} onChange={setReviewReminder} />
      </SettingItem>
    </>
  );

  // 语言与地区内容
  const LanguageSettings = () => (
    <>
      <SettingItem title="界面语言" desc="选择应用界面的显示语言">
        <Select value={language} onChange={setLanguage} style={{ width: 160 }}>
          <Option value="zh-CN">简体中文</Option>
          <Option value="zh-TW">繁体中文</Option>
          <Option value="en-US">English</Option>
          <Option value="ja-JP">日本語</Option>
        </Select>
      </SettingItem>

      <SettingItem title="日期格式" desc="选择日期显示格式" divider={false}>
        <Select value="yyyy-MM-dd" style={{ width: 160 }}>
          <Option value="yyyy-MM-dd">2024-01-01</Option>
          <Option value="yyyy/MM/dd">2024/01/01</Option>
          <Option value="dd/MM/yyyy">01/01/2024</Option>
          <Option value="MM/dd/yyyy">01/01/2024</Option>
        </Select>
      </SettingItem>
    </>
  );

  // 加载日志配置
  useEffect(() => {
    fetch('/api/config/logs')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setLogsConfig(data.config);
        }
      })
      .catch(err => {
        console.error('Failed to load logs config:', err);
      });
  }, []);

  // 保存日志配置
  const saveLogsConfig = async (updates: Partial<LogsConfig>) => {
    const newConfig = { ...logsConfig, ...updates };
    setLogsConfig(newConfig);
    
    try {
      const res = await fetch('/api/config/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const data = await res.json();
      if (data.success) {
        Message.success('设置已保存');
      } else {
        Message.error('保存失败');
      }
    } catch (err) {
      Message.error('保存失败');
    }
  };

  // 打开日志文件夹
  const openLogsDir = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch('/api/logs/open-dir', { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        Message.error('打开文件夹失败');
      }
    } catch (err) {
      Message.error('打开文件夹失败');
    } finally {
      setLogsLoading(false);
    }
  };

  // 选择日志文件夹
  const selectLogsDir = async () => {
    try {
      // 检查是否在 Electron 环境中
      if (window.electronAPI?.selectFolder) {
        const result = await window.electronAPI.selectFolder(logsConfig.log_dir);
        if (!result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          await saveLogsConfig({ log_dir: selectedPath });
        }
      } else {
        // 浏览器环境 - 提示用户手动输入路径
        const newPath = prompt('请输入日志文件夹路径:', logsConfig.log_dir);
        if (newPath !== null) {
          await saveLogsConfig({ log_dir: newPath });
        }
      }
    } catch (err) {
      Message.error('选择文件夹失败');
    }
  };

  // 日志设置内容
  const LogsSettings = () => (
    <>
      <SettingItem title="日志文件夹路径" desc="设置日志文件的存储位置">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            value={logsConfig.log_dir}
            readOnly
            placeholder="默认日志路径"
            style={{ width: 280 }}
          />
          <Button
            type="secondary"
            size="small"
            onClick={selectLogsDir}
          >
            选择文件夹
          </Button>
          <Button
            type="secondary"
            size="small"
            onClick={openLogsDir}
            loading={logsLoading}
          >
            打开
          </Button>
        </div>
      </SettingItem>

      <SettingItem title="日志级别" desc="选择记录的日志详细程度">
        <Select
          value={logsConfig.log_level}
          onChange={(value) => saveLogsConfig({ log_level: value })}
          style={{ width: 160 }}
        >
          <Option value="DEBUG">DEBUG</Option>
          <Option value="INFO">INFO</Option>
          <Option value="WARNING">WARNING</Option>
          <Option value="ERROR">ERROR</Option>
        </Select>
      </SettingItem>

      <SettingItem title="日志轮转" desc="启用后自动按日期分割日志文件">
        <Switch
          checked={logsConfig.log_rotation}
          onChange={(checked) => saveLogsConfig({ log_rotation: checked })}
        />
      </SettingItem>

      <SettingItem title="保留日志文件数" desc="设置保留的历史日志文件数量（0表示不限制）" divider={false}>
        <InputNumber
          min={0}
          max={365}
          value={logsConfig.backup_count}
          onChange={(value) => saveLogsConfig({ backup_count: value as number })}
          style={{ width: 120 }}
        />
      </SettingItem>
    </>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'basic':
        return <BasicSettings />;
      case 'startup':
        return <StartupSettings />;
      case 'language':
        return <LanguageSettings />;
      case 'logs':
        return <LogsSettings />;
      default:
        return <BasicSettings />;
    }
  };

  const getCurrentTitle = () => {
    const item = GENERAL_MENU_ITEMS.find(item => item.key === activeMenu);
    return item?.label || '基础设置';
  };

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--color-bg-1)',
      height: '100%',
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
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>通用</Text>
        </div>

        {/* 菜单项 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {GENERAL_MENU_ITEMS.map((item) => {
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
        
        <div className="settings-section">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default GeneralView;
