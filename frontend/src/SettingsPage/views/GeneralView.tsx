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
import { SettingItem } from '../components';
import { useScrollNavigation } from '../../hooks/useScrollNavigation';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

interface GeneralViewProps {
  onBack: () => void;
}

interface LogsConfig {
  log_dir: string;
  log_level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  log_rotation: boolean;
  backup_count: number;
}

const NAV_ITEMS = [
  { key: 'basic-section', label: '基础设置', icon: IconSettings },
  { key: 'startup-section', label: '启动与通知', icon: IconClockCircle },
  { key: 'language-section', label: '语言与地区', icon: IconNotification },
  { key: 'logs-section', label: '日志', icon: IconFile },
];

const GeneralView = ({ onBack }: GeneralViewProps) => {
  const { contentRef, activeSection, scrollToSection } = useScrollNavigation(NAV_ITEMS);
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(() => {
    const saved = localStorage.getItem('papyrus_minimize_to_tray');
    return saved !== null ? saved === 'true' : true;
  });
  const [reviewReminder, setReviewReminder] = useState(true);
  const [language, setLanguage] = useState('zh-CN');
  
  const [logsConfig, setLogsConfig] = useState<LogsConfig>({
    log_dir: '',
    log_level: 'INFO',
    log_rotation: true,
    backup_count: 7,
  });
  const [logsLoading, setLogsLoading] = useState(false);

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

  useEffect(() => {
    localStorage.setItem('papyrus_minimize_to_tray', String(minimizeToTray));
  }, [minimizeToTray]);

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
        Message.error(data.error || '保存失败');
      }
    } catch (err) {
      Message.error(err instanceof Error ? err.message : '保存失败');
    }
  };

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

  const selectLogsDir = async () => {
    try {
      if (window.electronAPI?.selectFolder) {
        const result = await window.electronAPI.selectFolder(logsConfig.log_dir);
        if (!result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          await saveLogsConfig({ log_dir: selectedPath });
        }
      } else {
        const newPath = prompt('请输入日志文件夹路径:', logsConfig.log_dir);
        if (newPath !== null) {
          await saveLogsConfig({ log_dir: newPath });
        }
      }
    } catch (err) {
      Message.error('选择文件夹失败');
    }
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
      <div style={{
        width: 220,
        height: '100%',
        borderRight: '1px solid var(--color-border-2)',
        background: 'var(--color-bg-1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
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
            aria-label="返回设置主页"
          />
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>通用</Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key;
            return (
              <button 
                key={key}
                onClick={() => scrollToSection(key)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '10px 12px',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-1)',
                  textDecoration: 'none',
                  borderRadius: 6,
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <Icon style={{ fontSize: 16 }} />
                <Text style={{ 
                  fontSize: 13, 
                  color: isActive ? 'var(--color-primary)' : 'inherit',
                  fontWeight: isActive ? 500 : 400,
                }}>{label}</Text>
              </button>
            );
          })}
        </div>
      </div>

      <div 
        ref={contentRef}
        onWheel={(e) => e.stopPropagation()}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '32px 48px',
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <IconSettings style={{ fontSize: 32, color: 'var(--color-success)' }} />
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              通用设置
            </Title>
          </div>
        </div>

        <section id="basic-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>基础设置</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="语言" desc="选择应用显示语言">
              <Select value={language} onChange={setLanguage} style={{ width: 160 }}>
                <Option value="zh-CN">简体中文</Option>
                <Option value="zh-TW">繁体中文</Option>
                <Option value="en-US">English</Option>
                <Option value="ja-JP">日本語</Option>
              </Select>
            </SettingItem>
          </div>
        </section>

        <section id="startup-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>启动与通知</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="开机自动启动" desc="系统启动时自动运行应用">
              <Switch checked={autoStart} onChange={setAutoStart} />
            </SettingItem>

            <SettingItem title="关闭时最小化到托盘" desc="点击关闭按钮时最小化到系统托盘">
              <Switch checked={minimizeToTray} onChange={setMinimizeToTray} />
            </SettingItem>

            <SettingItem title="复习提醒通知" desc="有卡片需要复习时显示桌面通知" divider={false}>
              <Switch checked={reviewReminder} onChange={setReviewReminder} />
            </SettingItem>
          </div>
        </section>

        <section id="language-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>语言与地区</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
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
          </div>
        </section>

        <section id="logs-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>日志</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
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
          </div>
        </section>

        <div style={{ height: 'calc(100vh - 200px)', flexShrink: 0 }} />
      </div>
    </div>
  );
};

export default GeneralView;