import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  IconTool,
} from '@arco-design/web-react/icon';
import { SettingItem, SettingsViewLayout, type NavItem } from '../components';
import { api } from '../../api';

const { Title, Text } = Typography;

const NAV_ITEMS: NavItem[] = [
  { key: 'tools-section', label: 'toolView.toolManagement', icon: IconTool },
];

interface ToolViewProps {
  onBack: () => void;
}

const ToolView = ({ onBack }: ToolViewProps) => {
  const { t } = useTranslation();

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
          Message.success(t('toolView.configSaved'));
        } else {
          Message.error(t('toolView.saveFailed'));
        }
      })
      .catch(() => Message.error(t('toolView.saveFailed')))
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

  const renderSection = (sectionId: string) => {
    if (sectionId !== 'tools-section') return null;

    return (
      <>
        <SettingItem title={t('toolView.approvalMode')} desc={t('toolView.approvalModeDesc')}>
          <Tag color={toolsMode === 'auto' ? 'green' : 'orangered'}>
            {toolsMode === 'auto' ? t('toolView.auto') : t('toolView.manual')}
          </Tag>
          <Button
            size="mini"
            type="text"
            style={{ marginLeft: 8 }}
            onClick={() => setToolsMode(toolsMode === 'auto' ? 'manual' : 'auto')}
          >
            {toolsMode === 'auto' ? t('toolView.switchToManual') : t('toolView.switchToAuto')}
          </Button>
        </SettingItem>

        <Divider style={{ margin: '8px 0' }} />
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
          {t('toolView.whitelist')}
        </Text>

        {Object.entries(
          toolCatalog.reduce<Record<string, typeof toolCatalog>>((acc, t_item) => {
            if (!acc[t_item.category]) acc[t_item.category] = [];
            acc[t_item.category].push(t_item);
            return acc;
          }, {})
        ).map(([category, items]) => (
          <div key={category} style={{ marginBottom: 12 }}>
            <Text bold style={{ fontSize: 12, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>
              {(() => {
                const labels: Record<string, string> = { cards: t('toolView.cards'), notes: t('toolView.notes'), relations: t('toolView.relations'), files: t('toolView.files'), data: t('toolView.data'), extensions: t('toolView.extensions'), settings: t('toolView.settings') };
                return labels[category] || category;
              })()}
            </Text>
            {items.map(tool => (
              <div key={tool.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-border-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag size="small" color={tool.side_effect === 'write' ? 'orangered' : 'green'}>
                    {tool.side_effect === 'write' ? t('chatView.write') : t('chatView.read')}
                  </Tag>
                  <Text style={{ fontSize: 13 }}>{tool.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tool.description}
                  </Text>
                </div>
                <Tooltip content={tool.side_effect === 'write' ? t('chatView.writeNotAllowed') : undefined}>
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
            {t('toolView.saveConfig')}
          </Button>
          <Button
            type="secondary"
            size="small"
            onClick={resetToolsConfig}
          >
            {t('toolView.resetToDefault')}
          </Button>
        </Space>
      </>
    );
  };

  return (
    <SettingsViewLayout
      title={t('toolView.title')}
      description={t('toolView.titleDesc')}
      icon={IconTool}
      iconColor="var(--color-danger)"
      navItems={NAV_ITEMS.map(item => ({ ...item, label: t(item.label) }))}
      sections={[
        { id: 'tools-section', title: t('toolView.toolManagement'), icon: IconTool },
      ]}
      onBack={onBack}
    >
      {renderSection}
    </SettingsViewLayout>
  );
};

export default ToolView;