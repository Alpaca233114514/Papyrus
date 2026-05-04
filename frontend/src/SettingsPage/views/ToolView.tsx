import { useState, useEffect } from 'react';
import {
  Switch,
  Button,
  Typography,
  Tag,
  Divider,
  Space,
  Tooltip,
  Message,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconTool,
  IconSettings,
} from '@arco-design/web-react/icon';
import { SettingItem } from '../components';
import { useScrollNavigation } from '../../hooks/useScrollNavigation';
import { api } from '../../api';

const { Title, Text, Paragraph } = Typography;

const NAV_ITEMS = [
  { key: 'tools-section', label: '工具调用管理', icon: IconTool },
];

interface ToolViewProps {
  onBack: () => void;
}

const ToolView = ({ onBack }: ToolViewProps) => {
  const { contentRef, activeSection, scrollToSection } = useScrollNavigation(NAV_ITEMS);

  // Tools config
  const [toolsMode, setToolsMode] = useState<string>('manual');
  const [autoExecuteTools, setAutoExecuteTools] = useState<string[]>([]);
  const [toolsConfigLoading, setToolsConfigLoading] = useState(false);
  const [toolsConfigSaving, setToolsConfigSaving] = useState(false);
  const [toolCatalog, setToolCatalog] = useState<Array<{ name: string; category: string; side_effect: string; description: string }>>([]);

  useEffect(() => {
    loadToolsConfig();
    loadToolCatalog();
  }, []);

  const loadToolsConfig = () => {
    setToolsConfigLoading(true);
    api.getToolsConfig()
      .then(data => {
        if (data.success && data.config) {
          setToolsMode(data.config.mode);
          setAutoExecuteTools(data.config.auto_execute_tools);
        }
      })
      .catch(console.error)
      .finally(() => setToolsConfigLoading(false));
  };

  const loadToolCatalog = () => {
    api.getToolsCatalog()
      .then(data => {
        if (data.success && data.tools) {
          setToolCatalog(data.tools);
        }
      })
      .catch(console.error);
  };

  const saveToolsConfig = () => {
    setToolsConfigSaving(true);
    api.saveToolsConfig({
      mode: toolsMode,
      auto_execute_tools: autoExecuteTools,
    })
      .then(data => {
        if (data.success) {
          Message.success('工具配置已保存');
        } else {
          Message.error('保存失败');
        }
      })
      .catch(() => Message.error('保存失败'))
      .finally(() => setToolsConfigSaving(false));
  };

  const resetToolsConfig = () => {
    setToolsMode('manual');
    setAutoExecuteTools([
      'search_cards', 'get_card_stats', 'search_notes', 'get_note',
      'list_relations', 'read_file', 'list_files', 'read_data_stats',
      'list_extensions', 'get_settings',
    ]);
  };

  const toggleAutoTool = (toolName: string, sideEffect: string) => {
    if (sideEffect === 'write') return;
    setAutoExecuteTools(prev =>
      prev.includes(toolName) ? prev.filter(t => t !== toolName) : [...prev, toolName]
    );
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
        width: 200,
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
          />
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>工具设置</Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
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
                  cursor: 'pointer',
                  borderRadius: 8,
                  marginBottom: 4,
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-1)',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  userSelect: 'none',
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
            <IconTool style={{ fontSize: 32, color: 'var(--color-primary)' }} />
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              工具设置
            </Title>
          </div>
          <Paragraph type="secondary">
            管理工具调用审批与白名单
          </Paragraph>
        </div>

        <div id="tools-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>工具调用管理</Title>
          </div>

          <div className="settings-section" style={{
            background: 'var(--color-bg-2)',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="审批模式" desc="自动模式：所有工具自动执行；手动模式：仅白名单内工具自动执行">
              <Tag color={toolsMode === 'auto' ? 'green' : 'orangered'}>
                {toolsMode === 'auto' ? '自动' : '手动'}
              </Tag>
              <Button
                size="mini"
                type="text"
                style={{ marginLeft: 8 }}
                onClick={() => setToolsMode(toolsMode === 'auto' ? 'manual' : 'auto')}
              >
                {toolsMode === 'auto' ? '切换为手动' : '切换为自动'}
              </Button>
            </SettingItem>

            <Divider style={{ margin: '8px 0' }} />
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
              白名单工具（开关 ON = 自动执行，无需审批）
            </Text>

            {Object.entries(
              toolCatalog.reduce<Record<string, typeof toolCatalog>>((acc, t) => {
                if (!acc[t.category]) acc[t.category] = [];
                acc[t.category].push(t);
                return acc;
              }, {})
            ).map(([category, items]) => (
              <div key={category} style={{ marginBottom: 12 }}>
                <Text bold style={{ fontSize: 12, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>
                  {(() => {
                    const labels: Record<string, string> = { cards: '卡片', notes: '笔记', relations: '关联', files: '文件库', data: '数据', extensions: '扩展', settings: '设置' };
                    return labels[category] || category;
                  })()}
                </Text>
                {items.map(tool => (
                  <div key={tool.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-border-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag size="small" color={tool.side_effect === 'write' ? 'orangered' : 'green'}>
                        {tool.side_effect === 'write' ? '写' : '读'}
                      </Tag>
                      <Text style={{ fontSize: 13 }}>{tool.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tool.description}
                      </Text>
                    </div>
                    <Tooltip content={tool.side_effect === 'write' ? '写操作不允许加入白名单' : undefined}>
                      <Switch
                        size="small"
                        checked={autoExecuteTools.includes(tool.name)}
                        disabled={tool.side_effect === 'write'}
                        onChange={() => toggleAutoTool(tool.name, tool.side_effect)}
                      />
                    </Tooltip>
                  </div>
                ))}
              </div>
            ))}

            <Divider style={{ margin: '12px 0' }} />
            <Space>
              <Button
                type="primary"
                size="small"
                onClick={saveToolsConfig}
                loading={toolsConfigSaving}
              >
                保存配置
              </Button>
              <Button
                type="secondary"
                size="small"
                onClick={resetToolsConfig}
              >
                重置为默认
              </Button>
            </Space>
          </div>
        </div>

        <div style={{ height: 'calc(100vh - 200px)', flexShrink: 0 }} />
      </div>
    </div>
  );
};

export default ToolView;
