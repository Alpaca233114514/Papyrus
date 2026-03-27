import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SettingsSidebar,
} from './components';
import {
  Input,
  Select,
  Switch,
  Button,
  Slider,
  InputNumber,
  Message,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Popconfirm,
  Checkbox,
  Tooltip,
  Card,
  Radio,
  Divider,
} from '@arco-design/web-react';
const CheckboxGroup = Checkbox.Group;

const OptGroup = Select.OptGroup;
import {
  IconRobot,
  IconSettings,
  IconStorage,
  IconSafe,
  IconThunderbolt,
  IconEyeInvisible,
  IconPlus,
  IconDelete,
  IconEdit,
  IconRefresh,
  IconEye,
  IconTool,
  IconBulb,
  IconFileImage,
  IconPalette,
  IconMessage,
  IconArrowLeft,
  IconInfoCircle,
  IconLeft,
  IconDown,
} from '@arco-design/web-react/icon';
import IconAccessibility from '../icons/IconAccessibility';

import './SettingsPage.css';
import { 
  useSceneryManager, 
  usePageScenery,
  useStartPageScenery,
  type PageType,
} from '../hooks/useScenery';

const FormItem = Form.Item;
const { Title, Text, Paragraph } = Typography;
const Option = Select.Option;
const RadioGroup = Radio.Group;

// 设置分类定义
const SETTING_CATEGORIES = [
  {
    key: 'appearance',
    title: '外观与窗景',
    desc: '主题、颜色、字体大小、窗景',
    icon: IconFileImage,
    color: '#206CCF',
  },
  {
    key: 'general',
    title: '通用',
    desc: '语言、启动、通知',
    icon: IconSettings,
    color: '#00B42A',
  },
  {
    key: 'chat',
    title: '聊天',
    desc: 'AI 助手、消息显示',
    icon: IconMessage,
    color: '#722ED1',
  },
  {
    key: 'mcp',
    title: 'MCP 服务',
    desc: '模型上下文协议配置',
    icon: IconTool,
    color: '#F53F3F',
  },
  {
    key: 'shortcuts',
    title: '快捷键',
    desc: '键盘快捷键设置',
    icon: IconEdit,
    color: '#FF7D00',
  },
  {
    key: 'accessibility',
    title: '无障碍',
    desc: '视觉辅助、动画、对比度',
    icon: IconAccessibility,
    color: '#c5b507',
  },
  {
    key: 'data',
    title: '数据设置',
    desc: '备份、导出、重置',
    icon: IconStorage,
    color: '#14C9C9',
  },
  {
    key: 'about',
    title: '关于',
    desc: '版本信息、检查更新',
    icon: IconInfoCircle,
    color: '#206CCF',
  },
];

// Provider 预设
const PROVIDER_PRESETS: Record<string, { name: string; baseUrl: string }> = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  ollama: { name: 'Ollama', baseUrl: 'http://localhost:11434' },
  gemini: { name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
  siliconflow: { name: '硅基流动', baseUrl: 'https://api.siliconflow.cn' },
  moonshot: { name: '月之暗面', baseUrl: 'https://api.moonshot.cn' },
  custom: { name: '自定义', baseUrl: '' },
};

// 端口选项
const PORT_OPTIONS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI-Response', value: 'openai-response' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Gemini', value: 'gemini' },
];

// 能力配置
const CAPABILITIES = [
  { key: 'tools', label: '工具调用', icon: IconTool },
  { key: 'vision', label: '视觉理解', icon: IconEye },
  { key: 'reasoning', label: '推理能力', icon: IconBulb },
];

// 主题选项
const THEME_OPTIONS = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
];

// 字体大小选项
const FONT_SIZE_OPTIONS = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
];

interface Model {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  port: string;
  capabilities: string[];
}

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
}

interface Provider {
  id: string;
  type: string;
  name: string;
  apiKeys: ApiKeyItem[];
  baseUrl: string;
  models: Model[];
  enabled: boolean;
  isDefault: boolean;
}

const defaultProviders: Provider[] = [
  { 
    id: '1', 
    type: 'openai', 
    name: 'OpenAI', 
    apiKeys: [{id: '1', name: 'default', key: ''}], 
    baseUrl: 'https://api.openai.com/v1', 
    models: [
      { id: 'm1', name: 'GPT-4o', modelId: 'gpt-4o', enabled: true, port: 'openai', capabilities: ['tools', 'vision'] },
      { id: 'm2', name: 'GPT-4 Turbo', modelId: 'gpt-4-turbo', enabled: true, port: 'openai', capabilities: ['tools'] },
      { id: 'm3', name: 'GPT-3.5 Turbo', modelId: 'gpt-3.5-turbo', enabled: true, port: 'openai', capabilities: ['tools'] },
    ], 
    enabled: true, 
    isDefault: true 
  },
  { 
    id: '2', 
    type: 'gemini', 
    name: 'Gemini', 
    apiKeys: [{id: '1', name: 'default', key: ''}], 
    baseUrl: 'https://generativelanguage.googleapis.com', 
    models: [
      { id: 'm4', name: 'Gemini 2.5 Flash', modelId: 'gemini-2.5-flash', enabled: true, port: 'gemini', capabilities: ['tools', 'vision'] },
      { id: 'm5', name: 'Gemini 2.5 Pro', modelId: 'gemini-2.5-pro', enabled: true, port: 'gemini', capabilities: ['tools', 'vision', 'reasoning'] },
    ], 
    enabled: false, 
    isDefault: false 
  },
  { 
    id: '3', 
    type: 'deepseek', 
    name: 'DeepSeek', 
    apiKeys: [{id: '1', name: 'default', key: ''}], 
    baseUrl: 'https://api.deepseek.com', 
    models: [
      { id: 'm6', name: 'DeepSeek Chat', modelId: 'deepseek-chat', enabled: true, port: 'openai', capabilities: [] },
      { id: 'm7', name: 'DeepSeek R1', modelId: 'deepseek-reasoner', enabled: true, port: 'openai', capabilities: ['reasoning'] },
    ], 
    enabled: false, 
    isDefault: false 
  },
  { 
    id: '4', 
    type: 'anthropic', 
    name: 'Anthropic', 
    apiKeys: [{id: '1', name: 'default', key: ''}], 
    baseUrl: 'https://api.anthropic.com/v1', 
    models: [
      { id: 'm8', name: 'Claude 3.5 Sonnet', modelId: 'claude-3-5-sonnet-20241022', enabled: true, port: 'anthropic', capabilities: ['tools', 'vision'] },
      { id: 'm9', name: 'Claude 3 Opus', modelId: 'claude-3-opus-20240229', enabled: false, port: 'anthropic', capabilities: ['tools', 'vision'] },
    ], 
    enabled: false, 
    isDefault: false 
  },
  { 
    id: '5', 
    type: 'moonshot', 
    name: '月之暗面', 
    apiKeys: [{id: '1', name: 'default', key: ''}], 
    baseUrl: 'https://api.moonshot.cn/v1', 
    models: [
      { id: 'm10', name: 'Kimi K2.5', modelId: 'kimi-k2.5', enabled: true, port: 'openai', capabilities: [] },
    ], 
    enabled: false, 
    isDefault: false 
  },
];

const SettingsPage = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // 聊天设置子菜单状态
  const [chatActiveMenu, setChatActiveMenu] = useState('general');
  
  // 模型相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('1');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string>('m1');
  const [providers, setProviders] = useState<Provider[]>(defaultProviders);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [newProviderType, setNewProviderType] = useState('openai');
  const [apiKeys, setApiKeys] = useState([{ id: '1', key: '', name: '' }]);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [modelForm] = Form.useForm();

  // 外观设置状态
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const [accentColor, setAccentColor] = useState('#206CCF');
  
  // 窗景设置状态（设置专用，独立存储）
  const { allSceneries, customSceneries, addCustomScenery, deleteCustomScenery } = useSceneryManager();
  const startPageScenery = useStartPageScenery();  // 开始界面独立配置
  const notesScenery = usePageScenery('notes');
  const scrollScenery = usePageScenery('scroll');
  const filesScenery = usePageScenery('files');
  const extensionsScenery = usePageScenery('extensions');
  const chartsScenery = usePageScenery('charts');
  
  // 添加自定义窗景弹窗状态
  const [addSceneryModalVisible, setAddSceneryModalVisible] = useState(false);
  const [sceneryForm] = Form.useForm();
  const [activeSceneryPage, setActiveSceneryPage] = useState<PageType>('scroll');
  
  // 添加自定义窗景
  const handleAddCustomScenery = () => {
    sceneryForm.validate().then((values: any) => {
      addCustomScenery(values.name, values.imageUrl);
      setAddSceneryModalVisible(false);
      sceneryForm.resetFields();
      Message.success('窗景添加成功');
    });
  };
  
  // 通用设置状态
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [reviewReminder, setReviewReminder] = useState(true);
  const [language, setLanguage] = useState('zh-CN');

  // 聊天设置状态
  const [agentModeEnabled, setAgentModeEnabled] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sendOnEnter, setSendOnEnter] = useState(true);

  // 自动补全设置状态
  const [completionEnabled, setCompletionEnabled] = useState(true);
  const [completionRequireConfirm, setCompletionRequireConfirm] = useState(false);
  const [completionTriggerDelay, setCompletionTriggerDelay] = useState(500);
  const [completionMaxTokens, setCompletionMaxTokens] = useState(50);

  // MCP 服务状态
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpServers, setMcpServers] = useState([
    { id: '1', name: '文件系统', url: 'http://localhost:3001', enabled: true },
    { id: '2', name: '网页搜索', url: 'http://localhost:3002', enabled: false },
  ]);

  // 快捷键设置状态
  const [shortcuts, setShortcuts] = useState({
    openChat: 'Ctrl+Shift+C',
    newNote: 'Ctrl+N',
    search: 'Ctrl+K',
    toggleSidebar: 'Ctrl+B',
  });

  // 无障碍设置状态
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderOptimized, setScreenReaderOptimized] = useState(false);
  const [focusIndicator, setFocusIndicator] = useState(true);
  const [largeCursor, setLargeCursor] = useState(false);

  const filtered = providers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selected = providers.find(p => p.id === selectedId);

  // 加载自动补全配置
  useEffect(() => {
    fetch('/api/completion/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setCompletionEnabled(data.config.enabled);
          setCompletionRequireConfirm(data.config.require_confirm);
          setCompletionTriggerDelay(data.config.trigger_delay);
          setCompletionMaxTokens(data.config.max_tokens);
        }
      })
      .catch(console.error);
  }, []);

  const updateProvider = (id: string, updates: Partial<Provider>) => {
    setProviders(providers.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addProvider = () => {
    addForm.validate().then((values: any) => {
      const preset = PROVIDER_PRESETS[newProviderType];
      const newProvider: Provider = {
        id: Date.now().toString(),
        type: newProviderType,
        name: values.name || preset.name,
        apiKeys: [{id: '1', name: 'default', key: values.apiKey || ''}],
        baseUrl: values.baseUrl || preset.baseUrl,
        models: [],
        enabled: false,
        isDefault: false,
      };
      setProviders([...providers, newProvider]);
      setSelectedId(newProvider.id);
      setAddModalVisible(false);
      addForm.resetFields();
      Message.success('添加成功');
    });
  };

  const deleteProvider = (id: string) => {
    const newProviders = providers.filter(p => p.id !== id);
    setProviders(newProviders);
    if (selectedId === id) setSelectedId(newProviders[0]?.id || '');
    Message.success('已删除');
  };

  const setDefault = (id: string) => {
    setProviders(providers.map(p => ({ ...p, isDefault: p.id === id })));
    Message.success('已设为默认');
  };

  const saveModel = () => {
    modelForm.validate().then((values: any) => {
      if (!selected) return;
      
      const capabilities: string[] = [];
      if (values.cap_tools) capabilities.push('tools');
      if (values.cap_vision) capabilities.push('vision');
      if (values.cap_reasoning) capabilities.push('reasoning');
      
      const modelData = {
        name: values.name,
        modelId: values.modelId,
        port: values.port,
        capabilities,
      };
      
      if (editingModel) {
        updateProvider(selected.id, {
          models: selected.models.map(m => 
            m.id === editingModel.id 
              ? { ...m, ...modelData }
              : m
          )
        });
        Message.success('模型已更新');
      } else {
        const newModel: Model = {
          id: Date.now().toString(),
          ...modelData,
          enabled: true,
        };
        updateProvider(selected.id, { models: [...selected.models, newModel] });
        Message.success('模型添加成功');
      }
      
      setModelModalVisible(false);
      modelForm.resetFields();
      setEditingModel(null);
    });
  };

  const deleteModel = (modelId: string) => {
    if (!selected) return;
    updateProvider(selected.id, { 
      models: selected.models.filter(m => m.id !== modelId) 
    });
    Message.success('模型已删除');
  };

  const toggleModel = (modelId: string, enabled: boolean) => {
    if (!selected) return;
    updateProvider(selected.id, {
      models: selected.models.map(m => m.id === modelId ? { ...m, enabled } : m)
    });
  };

  const openModelModal = (model?: Model) => {
    if (model) {
      setEditingModel(model);
      modelForm.setFieldsValue({
        name: model.name,
        modelId: model.modelId,
        port: model.port,
        cap_tools: model.capabilities.includes('tools'),
        cap_vision: model.capabilities.includes('vision'),
        cap_reasoning: model.capabilities.includes('reasoning'),
      });
    } else {
      setEditingModel(null);
      modelForm.resetFields();
      modelForm.setFieldValue('port', selected?.type || 'openai');
      modelForm.setFieldValue('cap_tools', false);
      modelForm.setFieldValue('cap_vision', false);
      modelForm.setFieldValue('cap_reasoning', false);
    }
    setModelModalVisible(true);
  };

  const renderCapabilityIcons = (capabilities: string[]) => {
    return (
      <Space size={8}>
        {capabilities.includes('vision') && (
          <Tooltip content="视觉理解">
            <IconEye style={{ color: 'rgb(32, 108, 207)', fontSize: 16 }} />
          </Tooltip>
        )}
        {capabilities.includes('tools') && (
          <Tooltip content="工具调用">
            <IconTool style={{ color: 'rgb(32, 108, 207)', fontSize: 16 }} />
          </Tooltip>
        )}
        {capabilities.includes('reasoning') && (
          <Tooltip content="推理能力">
            <IconBulb style={{ color: 'rgb(32, 108, 207)', fontSize: 16 }} />
          </Tooltip>
        )}
      </Space>
    );
  };

  const getCurrentModel = () => {
    for (const p of providers) {
      const model = p.models.find(m => m.id === currentModelId && m.enabled);
      if (model) return { ...model, provider: p };
    }
    return null;
  };

  const currentModel = getCurrentModel();
  const currentModelSupportTools = currentModel?.capabilities.includes('tools') ?? false;

  // 分类卡片组件
  const CategoryCard = ({ category }: { category: typeof SETTING_CATEGORIES[0] }) => {
    const Icon = category.icon;

    return (
      <div
        className="settings-category-card"
        onClick={() => setActiveCategory(category.key)}
      >
        <div 
          className="settings-category-icon"
          style={{ 
            color: category.color,
          }}
        >
          <Icon style={{ fontSize: 32 }} />
        </div>
        <div className="settings-category-content">
          <Text bold className="settings-category-title">{category.title}</Text>
          <Paragraph type="secondary" className="settings-category-desc">
            {category.desc}
          </Paragraph>
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
      {divider && <Divider className="settings-item-divider" />}
    </div>
  );

  // 主页面 - 分类网格
  const MainView = () => (
    <div className="settings-main">
      <Title heading={1} style={{ fontWeight: 600, lineHeight: 1, margin: 0, fontSize: '40px', marginBottom: 32 }}>设置</Title>
      <div className="settings-categories-grid">
        {SETTING_CATEGORIES.map(category => (
          <CategoryCard key={category.key} category={category} />
        ))}
      </div>
    </div>
  );

  // 外观设置侧边栏子菜单项
  const APPEARANCE_MENU_ITEMS = [
    { key: 'theme', label: '外观', icon: IconPalette },
    { key: 'scenery', label: '窗景', icon: IconFileImage },
  ];

  // 外观设置
  const AppearanceView = () => {
    const [activeMenu, setActiveMenu] = useState('theme');

    // 外观设置内容
    const ThemeSettings = () => (
      <>
        <SettingItem title="主题" desc="选择应用的整体配色方案">
          <RadioGroup
            type="button"
            value={theme}
            onChange={setTheme}
            options={THEME_OPTIONS}
          />
        </SettingItem>

        <SettingItem title="强调色" desc="选择应用的主色调">
          <div className="settings-color-picker">
            {['#206CCF', '#00B42A', '#F53F3F', '#FF7D00', '#722ED1', '#14C9C9'].map(color => (
              <div
                key={color}
                className={`settings-color-option ${accentColor === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => setAccentColor(color)}
              />
            ))}
          </div>
        </SettingItem>

        <SettingItem title="字体大小" desc="调整界面文字大小" divider={false}>
          <RadioGroup
            type="button"
            value={fontSize}
            onChange={setFontSize}
            options={FONT_SIZE_OPTIONS}
          />
        </SettingItem>
      </>
    );

    // 窗景设置内容
    const ScenerySettings = () => (
      <>
        {/* 开始界面窗景 - 使用独立 hook */}
        <div style={{ marginBottom: 24, padding: 16, border: '1px solid var(--color-border-2)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text style={{ fontWeight: 600, fontSize: 15 }}>开始界面</Text>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0 0' }}>
                今日完成卡片中的窗景（经典模式）
              </Paragraph>
            </div>
            <Switch 
              size="small"
              checked={startPageScenery.config.enabled} 
              onChange={(checked) => startPageScenery.updateConfig({ enabled: checked })}
            />
          </div>
          
          {startPageScenery.config.enabled && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13 }}>选择窗景图片</Text>
                <Button
                  type="primary"
                  size="mini"
                  icon={<IconPlus />}
                  onClick={() => setAddSceneryModalVisible(true)}
                  style={{ borderRadius: '999px' }}
                >
                  添加图片
                </Button>
              </div>
              
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allSceneries.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => startPageScenery.updateConfig({ image: item.image, name: item.name })}
                    style={{
                      width: 80,
                      height: 45,
                      borderRadius: 6,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: startPageScenery.config.image === item.image ? '2px solid #206CCF' : '2px solid transparent',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {startPageScenery.config.image === item.image && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: '#206CCF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider style={{ margin: '24px 0' }} />

        {/* 各界面窗景设置（仅设置使用，与页面独立） */}
        <Title heading={6} style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--color-text-2)' }}>
          各界面窗景配置（设置专用）
        </Title>
        
        <SinglePageScenerySettings sceneryHook={notesScenery} title="笔记库界面" pageKey="notes" />
        <SinglePageScenerySettings sceneryHook={scrollScenery} title="卷轴界面" pageKey="scroll" />
        <SinglePageScenerySettings sceneryHook={filesScenery} title="文件库界面" pageKey="files" />
        <SinglePageScenerySettings sceneryHook={extensionsScenery} title="扩展管理界面" pageKey="extensions" />
        <SinglePageScenerySettings sceneryHook={chartsScenery} title="数据图表界面" pageKey="charts" />
      </>
    );

    const renderContent = () => {
      switch (activeMenu) {
        case 'theme':
          return <ThemeSettings />;
        case 'scenery':
          return <ScenerySettings />;
        default:
          return <ThemeSettings />;
      }
    };

    const getCurrentTitle = () => {
      const item = APPEARANCE_MENU_ITEMS.find(item => item.key === activeMenu);
      return item?.label || '外观';
    };

    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--color-bg-1)',
      }}>
        <SettingsSidebar
          title="外观与窗景"
          menuItems={APPEARANCE_MENU_ITEMS}
          activeItem={activeMenu}
          onItemClick={setActiveMenu}
          onBack={() => setActiveCategory(null)}
        />

        {/* 主内容区 */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '48px',
          }}
        >
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

  // 单页面窗景设置组件
  interface SceneryHook {
    config: { enabled: boolean; image: string; name: string; opacity: number };
    updateConfig: (updates: Partial<{ enabled: boolean; image: string; name: string; opacity: number }>) => void;
    loaded?: boolean;
  }

  const SinglePageScenerySettings = ({ 
    sceneryHook, 
    title,
    pageKey,
  }: { 
    sceneryHook: SceneryHook; 
    title: string;
    pageKey: PageType;
  }) => {
    const { config, updateConfig } = sceneryHook;

    return (
      <div style={{ marginBottom: 24, padding: 16, border: '1px solid var(--color-border-2)', borderRadius: 12 }}>
        {/* 标题行：开关控制 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: config.enabled ? 16 : 0 }}>
          <div>
            <Text style={{ fontWeight: 600, fontSize: 15 }}>{title}</Text>
            <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0 0' }}>
              {config.enabled ? '已启用窗景背景' : '点击开关启用窗景'}
            </Paragraph>
          </div>
          <Switch 
            size="small"
            checked={config.enabled} 
            onChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>
        
        {/* 启用后的详细设置 */}
        {config.enabled && (
          <>
            {/* 透明度调节 */}
            <div style={{ marginBottom: 16, padding: '12px 0', borderTop: '1px solid var(--color-border-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 13, minWidth: 60 }}>透明度</Text>
                <Slider
                  min={25}
                  max={75}
                  step={5}
                  value={Math.round((config.opacity ?? 0.35) * 100)}
                  onChange={(val) => updateConfig({ opacity: (val as number) / 100 })}
                  style={{ flex: 1, maxWidth: 150 }}
                />
                <Text style={{ fontSize: 13, minWidth: 40 }}>
                  {Math.round((config.opacity ?? 0.35) * 100)}%
                </Text>
              </div>
            </div>

            {/* 图片选择 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13 }}>选择窗景图片</Text>
                <Button
                  type="primary"
                  size="mini"
                  icon={<IconPlus />}
                  onClick={() => {
                    setActiveSceneryPage(pageKey);
                    setAddSceneryModalVisible(true);
                  }}
                  style={{ borderRadius: '999px' }}
                >
                  添加图片
                </Button>
              </div>
              
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allSceneries.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => updateConfig({ image: item.image, name: item.name })}
                    style={{
                      width: 80,
                      height: 45,
                      borderRadius: 6,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: config.image === item.image ? '2px solid #206CCF' : '2px solid transparent',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.style.background = 'var(--color-fill-2)';
                      }}
                    />
                    {config.image === item.image && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: '#206CCF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // 通用设置
  const GeneralView = () => (
    <div className="settings-detail">
      <div className="settings-detail-header-row">
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={() => setActiveCategory(null)}
          className="settings-back-btn"
        >
          返回
        </Button>
      </div>
      <Title heading={2} className="settings-detail-title">通用</Title>
      
      <div className="settings-section">
        <SettingItem title="语言">
          <Select value={language} onChange={setLanguage} style={{ width: 160 }}>
            <Option value="zh-CN">简体中文</Option>
            <Option value="zh-TW">繁体中文</Option>
            <Option value="en-US">English</Option>
            <Option value="ja-JP">日本語</Option>
          </Select>
        </SettingItem>

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
    </div>
  );

  // 聊天设置侧边栏子菜单项
  const CHAT_MENU_ITEMS = [
    { key: 'general', label: '通用设置', icon: IconMessage },
    { key: 'providers', label: '供应商管理', icon: IconSafe },
    { key: 'models', label: '模型管理', icon: IconRobot },
    { key: 'completion', label: '自动补全', icon: IconBulb },
    { key: 'parameters', label: '模型参数', icon: IconSettings },
  ];

  // 聊天设置 - 通用设置内容
  const ChatGeneralSettings = () => (
    <>
      <SettingItem title="Agent 模式" desc="启用工具调用功能，AI 可以操作卡片和笔记">
        <Switch 
          checked={agentModeEnabled && currentModelSupportTools}
          onChange={setAgentModeEnabled}
          disabled={!currentModelSupportTools}
        />
      </SettingItem>

      {!currentModelSupportTools && currentModel && (
        <div className="settings-warning-tip">
          <IconBulb style={{ color: '#FF7D00' }} />
          <Text type="secondary" style={{ fontSize: 13 }}>
            当前选中的模型 "{currentModel.name}" 不支持工具调用
          </Text>
        </div>
      )}

      <SettingItem title="显示时间戳" desc="在消息旁显示发送时间">
        <Switch checked={showTimestamp} onChange={setShowTimestamp} />
      </SettingItem>

      <SettingItem title="自动滚动" desc="新消息到来时自动滚动到底部">
        <Switch checked={autoScroll} onChange={setAutoScroll} />
      </SettingItem>

      <SettingItem title="Enter 发送" desc="按 Enter 键发送消息，Shift+Enter 换行" divider={false}>
        <Switch checked={sendOnEnter} onChange={setSendOnEnter} />
      </SettingItem>
    </>
  );

  // 聊天设置 - 自动补全内容
  const ChatCompletionSettings = () => (
    <>
      <SettingItem title="笔记自动补全" desc="启用 AI 驱动的笔记内容自动补全功能">
        <Switch checked={completionEnabled} onChange={setCompletionEnabled} />
      </SettingItem>

      {completionEnabled && (
        <>
          <SettingItem title="二次确认模式" desc="开启后需按 Tab 触发补全，Enter 确认；关闭时输入自动显示补全，Tab 直接接受">
            <Switch 
              checked={completionRequireConfirm} 
              onChange={(checked) => {
                setCompletionRequireConfirm(checked);
                fetch('/api/completion/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    enabled: completionEnabled,
                    require_confirm: checked,
                    trigger_delay: completionTriggerDelay,
                    max_tokens: completionMaxTokens,
                  }),
                });
              }}
            />
          </SettingItem>

          <SettingItem title="触发延迟" desc="实时预览模式下的防抖延迟（毫秒）">
            <Slider
              min={200}
              max={2000}
              step={100}
              value={completionTriggerDelay}
              onChange={(val) => {
                setCompletionTriggerDelay(val as number);
                fetch('/api/completion/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    enabled: completionEnabled,
                    require_confirm: completionRequireConfirm,
                    trigger_delay: val,
                    max_tokens: completionMaxTokens,
                  }),
                });
              }}
              style={{ width: 200 }}
            />
          </SettingItem>

          <SettingItem title="最大补全长度" desc="每次补全的最大 token 数" divider={false}>
            <Slider
              min={10}
              max={200}
              step={10}
              value={completionMaxTokens}
              onChange={(val) => {
                setCompletionMaxTokens(val as number);
                fetch('/api/completion/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    enabled: completionEnabled,
                    require_confirm: completionRequireConfirm,
                    trigger_delay: completionTriggerDelay,
                    max_tokens: val,
                  }),
                });
              }}
              style={{ width: 200 }}
            />
          </SettingItem>
        </>
      )}
    </>
  );

  // 聊天设置 - 模型参数内容
  const ChatProvidersSettings = () => {
    const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
    // 本地编辑状态，离开时才保存
    const [editingProviders, setEditingProviders] = useState<Provider[]>(providers);
    
    // 同步 providers 到本地编辑状态
    useEffect(() => {
      setEditingProviders(providers);
    }, [providers]);
    
    const toggleExpand = (providerId: string) => {
      const newExpanded = new Set(expandedProviders);
      if (newExpanded.has(providerId)) {
        newExpanded.delete(providerId);
      } else {
        newExpanded.add(providerId);
      }
      setExpandedProviders(newExpanded);
    };
    
    // 更新本地编辑状态
    const updateEditingProvider = (id: string, updates: Partial<Provider>) => {
      setEditingProviders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };
    
    // 添加 API Key
    const addApiKey = (providerId: string) => {
      const provider = editingProviders.find(p => p.id === providerId);
      if (!provider) return;
      const newKey: ApiKeyItem = {
        id: Date.now().toString(),
        name: `key-${provider.apiKeys.length + 1}`,
        key: ''
      };
      updateEditingProvider(providerId, {
        apiKeys: [...provider.apiKeys, newKey]
      });
    };
    
    // 删除 API Key
    const removeApiKey = (providerId: string, keyId: string) => {
      const provider = editingProviders.find(p => p.id === providerId);
      if (!provider) return;
      updateEditingProvider(providerId, {
        apiKeys: provider.apiKeys.filter(k => k.id !== keyId)
      });
    };
    
    // 更新 API Key
    const updateApiKey = (providerId: string, keyId: string, updates: Partial<ApiKeyItem>) => {
      const provider = editingProviders.find(p => p.id === providerId);
      if (!provider) return;
      updateEditingProvider(providerId, {
        apiKeys: provider.apiKeys.map(k => k.id === keyId ? { ...k, ...updates } : k)
      });
    };
    
    // 保存所有修改
    const saveProviders = () => {
      editingProviders.forEach(editingProvider => {
        const originalProvider = providers.find(p => p.id === editingProvider.id);
        if (originalProvider) {
          const hasChanges = 
            JSON.stringify(originalProvider.apiKeys) !== JSON.stringify(editingProvider.apiKeys) ||
            originalProvider.baseUrl !== editingProvider.baseUrl;
          if (hasChanges) {
            updateProvider(editingProvider.id, {
              apiKeys: editingProvider.apiKeys,
              baseUrl: editingProvider.baseUrl
            });
          }
        }
      });
      Message.success('保存成功');
    };
    
    return (
      <>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" onClick={saveProviders} style={{ background: '#206CCF', borderRadius: '6px' }}>
            保存修改
          </Button>
        </div>
        {editingProviders.map(provider => {
          const isExpanded = expandedProviders.has(provider.id);
          return (
            <Card key={provider.id} style={{ marginBottom: 12 }} bodyStyle={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text bold>{provider.name}</Text>
                    {provider.isDefault && <Tag color="arcoblue" size="small">默认</Tag>}
                    {!provider.enabled && <Tag color="gray" size="small">禁用</Tag>}
                  </div>
                  <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                    {provider.baseUrl || '未设置 Base URL'}
                  </Paragraph>
                </div>
                <Space>
                  <Button 
                    type="text" 
                    size="mini" 
                    icon={isExpanded ? <IconDown /> : <IconLeft />}
                    onClick={() => toggleExpand(provider.id)}
                  />
                  <Switch size="small" checked={provider.enabled} onChange={(checked) => updateProvider(provider.id, { enabled: checked })} />
                  <Button type="text" size="mini" icon={<IconSafe />} onClick={() => setDefault(provider.id)} disabled={provider.isDefault} />
                  <Popconfirm title="删除供应商？" onOk={() => deleteProvider(provider.id)} disabled={provider.isDefault}>
                    <Button type="text" size="mini" icon={<IconDelete />} status="danger" disabled={provider.isDefault} />
                  </Popconfirm>
                </Space>
              </div>

              {isExpanded && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 12 }}>API Key</Text>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {provider.apiKeys.map((apiKey, index) => (
                          <div key={apiKey.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Input
                              value={apiKey.name}
                              onChange={(v) => updateApiKey(provider.id, apiKey.id, { name: v })}
                              style={{ width: 100, border: '1px solid var(--color-border-2)', borderRadius: '6px', background: '#fff', fontSize: 12, textAlign: 'center' }}
                            />
                            <Input.Password 
                              value={apiKey.key}
                              onChange={(v) => updateApiKey(provider.id, apiKey.id, { key: v })}
                              placeholder="输入 API Key" 
                              style={{ flex: 1, border: '1px solid var(--color-border-2)', borderRadius: '6px', background: '#fff' }}
                            />
                            {index === 0 ? (
                              <Button 
                                type="primary" 
                                icon={<IconPlus />} 
                                size="mini"
                                onClick={() => addApiKey(provider.id)}
                                style={{ background: '#206CCF', borderRadius: '4px' }}
                              />
                            ) : (
                              <Button 
                                type="text" 
                                icon={<IconDelete />} 
                                size="mini"
                                status="danger"
                                onClick={() => removeApiKey(provider.id, apiKey.id)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Text style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Base URL</Text>
                      <Input 
                        value={provider.baseUrl}
                        onChange={(v) => updateEditingProvider(provider.id, { baseUrl: v })}
                        placeholder="https://api.example.com/v1" 
                        style={{ width: '100%' }} 
                      />
                    </div>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </>
    );
  };

  const ChatModelsSettings = () => {
    const currentProvider = providers.find(p => p.id === selectedId);
    return (
    <>
      {currentProvider?.models.map(model => (
        <Card key={model.id} style={{ marginBottom: 10, border: currentModelId === model.id ? '1px solid #206CCF' : undefined }} bodyStyle={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text bold style={{ fontSize: 14 }}>{model.name}</Text>
              </div>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0 0' }}>{currentProvider?.name}</Paragraph>
            </div>
            <Space size={4}>
              <Button type="text" size="mini" icon={<IconSafe />} onClick={() => setCurrentModelId(model.id)} disabled={currentModelId === model.id} />
              <Button type="text" size="mini" icon={<IconEdit />} onClick={() => openModelModal(model)} />
              <Popconfirm title="删除模型？" onOk={() => deleteModel(model.id)}>
                <Button type="text" size="mini" icon={<IconDelete />} status="danger" />
              </Popconfirm>
            </Space>
          </div>
        </Card>
      ))}
    </>
  );
  };

  const ChatParametersSettings = () => (
    <>
      <div style={{ marginBottom: 24 }}>
        <Text className="settings-form-label" style={{ display: 'block', marginBottom: 12 }}>当前模型</Text>
        <Select value={currentModelId} onChange={setCurrentModelId} style={{ width: 280 }}>
          {providers.filter(p => p.enabled).map(p => (
            <OptGroup key={p.id} label={p.name}>
              {p.models.filter(m => m.enabled).map(m => (
                <Option key={m.id} value={m.id}>{m.name}</Option>
              ))}
            </OptGroup>
          ))}
        </Select>
      </div>

      {[
        { label: 'Temperature', min: 0, max: 2, step: 0.1, default: 0.7 },
        { label: 'Top P', min: 0, max: 1, step: 0.1, default: 0.9 },
        { label: 'Max Tokens', min: 100, max: 8000, step: 100, default: 2000 },
      ].map(item => (
        <div key={item.label} className="settings-slider-row">
          <Text className="settings-form-label">{item.label}</Text>
          <div className="settings-slider-control">
            <Slider min={item.min} max={item.max} step={item.step} defaultValue={item.default} style={{ flex: 1 }} />
            <InputNumber min={item.min} max={item.max} step={item.step} defaultValue={item.default} style={{ width: 80 }} />
          </div>
        </div>
      ))}

      <Button type="primary" shape="round" style={{ marginTop: 16 }}>保存参数</Button>
    </>
  );

  // 聊天设置主组件
  const ChatView = () => {
    // 根据当前菜单渲染对应内容
    const renderContent = () => {
      switch (chatActiveMenu) {
        case 'general':
          return <ChatGeneralSettings />;
        case 'providers':
          return <ChatProvidersSettings />;
        case 'models':
          return <ChatModelsSettings />;
        case 'completion':
          return <ChatCompletionSettings />;
        case 'parameters':
          return <ChatParametersSettings />;
        default:
          return <ChatGeneralSettings />;
      }
    };

    // 获取当前菜单标题
    const getCurrentTitle = () => {
      const item = CHAT_MENU_ITEMS.find(item => item.key === chatActiveMenu);
      return item?.label || '通用设置';
    };

    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--color-bg-1)',
      }}>
        <SettingsSidebar
          title="聊天设置"
          menuItems={CHAT_MENU_ITEMS}
          activeItem={chatActiveMenu}
          onItemClick={setChatActiveMenu}
          onBack={() => setActiveCategory(null)}
        />

        {/* 主内容区 */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '48px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              {getCurrentTitle()}
            </Title>
            {chatActiveMenu === 'providers' && (
              <Button type="primary" icon={<IconPlus />} onClick={() => setAddModalVisible(true)} style={{ borderRadius: '999px', padding: '4px 16px', display: 'flex', alignItems: 'center' }}>
                添加供应商
              </Button>
            )}
            {chatActiveMenu === 'models' && (
              <Button type="primary" icon={<IconPlus />} onClick={() => openModelModal()} style={{ borderRadius: '999px', padding: '4px 16px', display: 'flex', alignItems: 'center' }}>
                添加模型
              </Button>
            )}
          </div>
          
          <div className="settings-section">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  };

  // MCP 服务设置
  const McpView = () => (
    <div className="settings-detail">
      <div className="settings-detail-header-row">
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={() => setActiveCategory(null)}
          className="settings-back-btn"
        >
          返回
        </Button>
      </div>
      <Title heading={2} className="settings-detail-title">MCP 服务</Title>
      
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
                  <IconTool style={{ fontSize: 24, color: '#206CCF' }} />
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
                  <Button type="text" size="mini" icon={<IconEdit />} />
                  <Button 
                    type="text" 
                    size="mini" 
                    icon={<IconDelete />}
                    status="danger"
                    onClick={() => {
                      setMcpServers(mcpServers.filter(s => s.id !== server.id));
                    }}
                  />
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
    </div>
  );

  // 快捷键设置
  const ShortcutsView = () => (
    <div className="settings-detail">
      <div className="settings-detail-header-row">
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={() => setActiveCategory(null)}
          className="settings-back-btn"
        >
          返回
        </Button>
      </div>
      <Title heading={2} className="settings-detail-title">快捷键</Title>
      
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
              <Button type="text" size="mini" icon={<IconEdit />} />
            </div>
          </SettingItem>
        ))}
      </div>

      <div className="settings-tip">
        <IconBulb style={{ color: '#206CCF' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          点击编辑按钮可修改快捷键，快捷键冲突时会自动提示
        </Text>
      </div>
    </div>
  );

  // 无障碍设置
  const AccessibilityView = () => (
    <div className="settings-detail">
      <div className="settings-detail-header-row">
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={() => setActiveCategory(null)}
          className="settings-back-btn"
        >
          返回
        </Button>
      </div>
      <Title heading={2} className="settings-detail-title">无障碍</Title>
      
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
        <IconAccessibility style={{ color: '#86909C' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          这些设置可以帮助您更舒适地使用应用。字体大小调整请前往外观设置。
        </Text>
      </div>
    </div>
  );

  // 数据设置
  const DataView = () => (
    <div className="settings-detail">
      <div className="settings-detail-header-row">
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={() => setActiveCategory(null)}
          className="settings-back-btn"
        >
          返回
        </Button>
      </div>
      <Title heading={2} className="settings-detail-title">数据设置</Title>
      
      <div className="settings-section">
        <div className="settings-data-card">
          <div className="settings-data-info">
            <div 
              className="settings-data-icon"
              style={{ background: '#206CCF15', color: '#206CCF' }}
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
              style={{ background: '#00B42A15', color: '#00B42A' }}
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
              style={{ background: '#F53F3F15', color: '#F53F3F' }}
            >
              <IconDelete style={{ fontSize: 24 }} />
            </div>
            <div>
              <Text bold style={{ fontSize: 15, color: '#F53F3F' }}>重置所有数据</Text>
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
        <IconSafe style={{ color: '#00B42A' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          建议定期备份数据，以防止意外丢失
        </Text>
      </div>
    </div>
  );

  // 关于页面
  const AboutView = () => (
    <div className="settings-detail">
      <div className="settings-detail-header-row">
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={() => setActiveCategory(null)}
          className="settings-back-btn"
        >
          返回
        </Button>
      </div>
      <Title heading={2} className="settings-detail-title">关于</Title>
      
      <div className="settings-section" style={{ textAlign: 'center', padding: '40px 0' }}>
        <img 
          src="/icon.ico" 
          alt="Papyrus" 
          style={{ width: 80, height: 80, marginBottom: 16 }}
        />
        <Title heading={3} style={{ margin: '0 0 8px 0' }}>Papyrus</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>版本 1.0.0</Text>
        <Paragraph type="secondary" style={{ marginTop: 16, maxWidth: 400, margin: '16px auto 0' }}>
          SRS 复习引擎 - 基于间隔重复算法的智能记忆卡片应用
        </Paragraph>
        
        <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button 
            type="primary" 
            shape="round"
            onClick={() => Message.info('已是最新版本')}
          >
            检查更新
          </Button>
          <Button 
            shape="round"
            onClick={() => window.open('https://github.com/yourusername/papyrus', '_blank')}
          >
            GitHub
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <Title heading={4} className="settings-section-title">致谢</Title>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          感谢使用 Papyrus！本应用使用了以下开源项目：
        </Paragraph>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {['React', 'Arco Design', 'FastAPI', 'Python'].map(tech => (
            <Tag key={tech} color="arcoblue">{tech}</Tag>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <Title heading={4} className="settings-section-title">许可证</Title>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Papyrus 采用 MIT 许可证开源。您可以自由使用、修改和分发本软件。
        </Paragraph>
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      {activeCategory === null && <MainView />}
      {activeCategory === 'appearance' && <AppearanceView />}
      {activeCategory === 'general' && <GeneralView />}
      {activeCategory === 'chat' && <ChatView />}
      {activeCategory === 'mcp' && <McpView />}
      {activeCategory === 'shortcuts' && <ShortcutsView />}
      {activeCategory === 'accessibility' && <AccessibilityView />}
      {activeCategory === 'data' && <DataView />}
      {activeCategory === 'about' && <AboutView />}

      {/* 添加自定义窗景图片弹窗 */}
      <Modal
        title="添加自定义窗景图片"
        visible={addSceneryModalVisible}
        onOk={handleAddCustomScenery}
        onCancel={() => { setAddSceneryModalVisible(false); sceneryForm.resetFields(); }}
        autoFocus={false}
        focusLock
      >
        <Form form={sceneryForm} layout="vertical">
          <FormItem 
            label={<Title heading={6} style={{ margin: 0 }}>图片名称</Title>} 
            field="name" 
            rules={[{ required: true, message: '请输入图片名称' }]}
          >
            <Input placeholder="如：我的家乡" />
          </FormItem>
          <FormItem 
            label={<Title heading={6} style={{ margin: 0 }}>图片链接</Title>} 
            field="imageUrl" 
            rules={[{ required: true, message: '请输入图片链接' }]}
          >
            <Input placeholder="https://example.com/image.jpg" />
          </FormItem>
          <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
            支持网络图片链接或本地图片路径
          </Paragraph>
        </Form>
      </Modal>

      {/* 添加 Provider 弹窗 */}
      <Modal
        title="添加 Provider"
        visible={addModalVisible}
        onOk={addProvider}
        onCancel={() => { setAddModalVisible(false); addForm.resetFields(); setApiKeys([{ id: '1', key: '', name: '' }]); }}
        autoFocus={false}
        focusLock
      >
        <div style={{ background: '#fafafa', borderRadius: '16px', padding: '16px', border: '1px solid var(--color-border-2)' }}>
        <Form form={addForm} layout="vertical">
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>类型</Title>} field="type" initialValue="openai">
            <Select value={newProviderType} onChange={setNewProviderType} style={{ borderRadius: '8px' }}>
              {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                <Option key={key} value={key}>{preset.name}</Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>名称</Title>} field="name">
            <Input placeholder={PROVIDER_PRESETS[newProviderType]?.name} style={{ borderRadius: '8px' }} />
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>API Key</Title>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apiKeys.map((item, index) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Input.Password 
                    placeholder="输入 API Key" 
                    style={{ borderRadius: '8px', flex: 1 }}
                    value={item.key}
                    onChange={(v) => {
                      const newKeys = [...apiKeys];
                      newKeys[index].key = v;
                      setApiKeys(newKeys);
                    }}
                  />
                  <span style={{ color: 'var(--color-text-3)' }}>:</span>
                  <Input 
                    placeholder="自定义名称" 
                    style={{ borderRadius: '8px', width: 120 }}
                    value={item.name}
                    onChange={(v) => {
                      const newKeys = [...apiKeys];
                      newKeys[index].name = v;
                      setApiKeys(newKeys);
                    }}
                  />
                  {index === 0 ? (
                    <Button 
                      type="primary" 
                      icon={<IconPlus />} 
                      size="small"
                      onClick={() => setApiKeys([...apiKeys, { id: Date.now().toString(), key: '', name: '' }])}
                      style={{ background: '#206CCF', borderRadius: '6px', padding: '0 8px' }}
                    />
                  ) : (
                    <Button 
                      type="text" 
                      icon={<IconDelete />} 
                      size="small"
                      status="danger"
                      onClick={() => setApiKeys(apiKeys.filter((_, i) => i !== index))}
                    />
                  )}
                </div>
              ))}
            </div>
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>Base URL</Title>} field="baseUrl">
            <Input placeholder={PROVIDER_PRESETS[newProviderType]?.baseUrl} style={{ borderRadius: '8px' }} />
          </FormItem>
        </Form>
        </div>
      </Modal>

      {/* 添加/编辑模型弹窗 */}
      <Modal
        title={editingModel ? '编辑模型' : '添加模型'}
        visible={modelModalVisible}
        onOk={saveModel}
        onCancel={() => { setModelModalVisible(false); modelForm.resetFields(); setEditingModel(null); }}
        autoFocus={false}
        focusLock
      >
        <div style={{ background: '#fafafa', borderRadius: '16px', padding: '24px', border: '1px solid var(--color-border-2)' }}>
        <Form form={modelForm} layout="vertical">
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>供应商</Title>} field="providerId" initialValue={selectedId}>
            <Select style={{ borderRadius: '8px' }}>
              {providers.filter(p => p.enabled).map(p => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>模型名称</Title>} field="name">
            <Input placeholder="如：GPT-4o" style={{ borderRadius: '8px' }} />
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>模型 ID</Title>} field="modelId">
            <Input placeholder="实际的 API ID，如：gpt-4o" style={{ borderRadius: '8px' }} />
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>端口选择</Title>} field="port" initialValue={selected?.type || 'openai'}>
            <Select style={{ borderRadius: '8px' }}>
              {PORT_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>模型能力</Title>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CAPABILITIES.map(cap => (
                <FormItem 
                  key={cap.key} 
                  field={`cap_${cap.key}`} 
                  style={{ marginBottom: 0 }}
                  triggerPropName="checked"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <cap.icon style={{ color: 'rgb(32, 108, 207)', fontSize: 16 }} />
                      <Text>{cap.label}</Text>
                    </span>
                    <Checkbox />
                  </div>
                </FormItem>
              ))}
            </div>
          </FormItem>
        </Form>
        </div>
      </Modal>

    </div>
  );
};

export default SettingsPage;
