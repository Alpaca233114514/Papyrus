import { useState, useEffect } from 'react';
import {
  Select,
  Switch,
  Button,
  Slider,
  InputNumber,
  Typography,
  Tag,
  Card,
  Popconfirm,
  Form,
  Modal,
  Divider,
  Space,
  Tooltip,
  Checkbox,
  Input,
  Message,
} from '@arco-design/web-react';
import {
  IconMessage,
  IconSafe,
  IconRobot,
  IconBulb,
  IconSettings,
  IconPlus,
  IconDelete,
  IconEdit,
  IconTool,
  IconEye,
  IconDown,
  IconLeft,
  IconUser,
} from '@arco-design/web-react/icon';
import { SettingsSidebar } from '../components';

const FormItem = Form.Item;
const { Title, Text, Paragraph } = Typography;
const Option = Select.Option;
const OptGroup = Select.OptGroup;

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

// 聊天设置侧边栏子菜单项
const CHAT_MENU_ITEMS = [
  { key: 'general', label: '通用设置', icon: IconMessage },
  { key: 'user', label: '用户设置', icon: IconUser },
  { key: 'providers', label: '供应商管理', icon: IconSafe },
  { key: 'models', label: '模型管理', icon: IconRobot },
  { key: 'completion', label: '自动补全', icon: IconBulb },
  { key: 'parameters', label: '模型参数', icon: IconSettings },
];

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
}

interface Model {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  port: string;
  capabilities: string[];
  apiKeyId?: string;
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

interface ChatViewProps {
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
    {divider && <Divider className="settings-item-divider" />}
  </div>
);

// 能力图标渲染
const renderCapabilityIcons = (capabilities: string[]) => {
  return (
    <Space size={8}>
      {capabilities.includes('vision') && (
        <Tooltip content="视觉理解">
          <IconEye style={{ color: 'var(--color-primary)', fontSize: 16 }} />
        </Tooltip>
      )}
      {capabilities.includes('tools') && (
        <Tooltip content="工具调用">
          <IconTool style={{ color: 'var(--color-primary)', fontSize: 16 }} />
        </Tooltip>
      )}
      {capabilities.includes('reasoning') && (
        <Tooltip content="推理能力">
          <IconBulb style={{ color: 'var(--color-primary)', fontSize: 16 }} />
        </Tooltip>
      )}
    </Space>
  );
};

// 用户设置类型
interface UserProfile {
  userId: string;
  avatarUrl: string | null;
}

// 从 localStorage 加载用户设置
const loadUserProfile = (): UserProfile => {
  try {
    const saved = localStorage.getItem('papyrus_user_profile');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return { userId: 'P', avatarUrl: null };
};

// 保存用户设置到 localStorage
const saveUserProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem('papyrus_user_profile', JSON.stringify(profile));
    // 触发自定义事件，通知同页面内的其他组件更新
    window.dispatchEvent(new CustomEvent('papyrus_user_profile_changed'));
  } catch {
    // ignore
  }
};

// Agent 设置类型
interface AgentSettings {
  agentModeEnabled: boolean;
}

// 从 localStorage 加载 Agent 设置
const loadAgentSettings = (): AgentSettings => {
  try {
    const saved = localStorage.getItem('papyrus_agent_settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return { agentModeEnabled: false };
};

// 保存 Agent 设置到 localStorage 并通知其他组件
const saveAgentSettings = (settings: AgentSettings) => {
  try {
    localStorage.setItem('papyrus_agent_settings', JSON.stringify(settings));
    // 触发自定义事件，通知同页面内的其他组件更新
    window.dispatchEvent(new CustomEvent('papyrus_agent_settings_changed', { detail: settings }));
  } catch {
    // ignore
  }
};

const ChatView = ({ onBack }: ChatViewProps) => {
  const [activeMenu, setActiveMenu] = useState('general');
  
  // 聊天设置状态
  const [agentModeEnabled, setAgentModeEnabledState] = useState(() => loadAgentSettings().agentModeEnabled);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sendOnEnter, setSendOnEnter] = useState(true);
  
  // 用户设置状态
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  
  // 自动补全设置状态
  const [completionEnabled, setCompletionEnabled] = useState(true);
  const [completionRequireConfirm, setCompletionRequireConfirm] = useState(false);
  const [completionTriggerDelay, setCompletionTriggerDelay] = useState(500);
  const [completionMaxTokens, setCompletionMaxTokens] = useState(50);
  
  // Provider 和模型状态
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string>('m1');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [newProviderType, setNewProviderType] = useState('openai');
  const [apiKeys, setApiKeys] = useState([{ id: '1', key: '', name: '' }]);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [modelForm] = Form.useForm();
  const [modelFormProviderId, setModelFormProviderId] = useState<string>('');

  const selected = providers.find(p => p.id === '1');
  
  const getCurrentModel = () => {
    for (const p of providers) {
      const model = p.models.find(m => m.id === currentModelId && m.enabled);
      if (model) return { ...model, provider: p };
    }
    return null;
  };
  
  const currentModel = getCurrentModel();
  const currentModelSupportTools = currentModel?.capabilities.includes('tools') ?? false;

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

  // 从后端加载 AI 配置（包含 agent_enabled）
  useEffect(() => {
    fetch('/api/config/ai')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config && data.config.features) {
          const agentEnabled = data.config.features.agent_enabled ?? false;
          setAgentModeEnabledState(agentEnabled);
          // 同步到 localStorage
          saveAgentSettings({ agentModeEnabled: agentEnabled });
        }
      })
      .catch(console.error);
  }, []);

  // 从后端加载 Providers
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = () => {
    setProvidersLoading(true);
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.providers) {
          setProviders(data.providers);
        }
      })
      .catch(console.error)
      .finally(() => setProvidersLoading(false));
  };

  const updateProvider = (id: string, updates: Partial<Provider>) => {
    setProviders(providers.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addProvider = () => {
    addForm.validate().then((values: { name?: string; baseUrl?: string }) => {
      const preset = PROVIDER_PRESETS[newProviderType];
      
      // 转换 apiKeys state 为 Provider 的 apiKeys 格式
      // 过滤掉 key 为空的条目，如果没有有效的 key 则使用空数组
      const validApiKeys = apiKeys
        .filter(k => k.key.trim() !== '')
        .map((k, index) => ({
          id: k.id || Date.now().toString() + index,
          name: k.name.trim() || `key-${index + 1}`,
          key: k.key.trim()
        }));
      
      // 如果没有输入任何 API Key，添加一个空的 default key
      const finalApiKeys = validApiKeys.length > 0 ? validApiKeys : [{id: '1', name: 'default', key: ''}];
      
      const newProvider: Provider = {
        id: Date.now().toString(),
        type: newProviderType,
        name: values.name || preset.name,
        apiKeys: finalApiKeys,
        baseUrl: values.baseUrl || preset.baseUrl,
        models: [],
        enabled: false,
        isDefault: false,
      };

      // 发送到后端
      fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            Message.success('供应商添加成功');
            loadProviders();  // 重新加载 providers
          } else {
            Message.error(data.message || '添加失败');
          }
        })
        .catch(err => {
          console.error(err);
          Message.error('添加供应商失败');
        });

      setAddModalVisible(false);
      addForm.resetFields();
      setApiKeys([{ id: '1', key: '', name: '' }]);  // 重置 apiKeys state
    });
  };

  const deleteProvider = (id: string) => {
    fetch(`/api/providers/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Message.success('供应商已删除');
          loadProviders();
        } else {
          Message.error(data.message || '删除失败');
        }
      })
      .catch(err => {
        console.error(err);
        Message.error('删除供应商失败');
      });
  };

  const setDefault = (id: string) => {
    fetch(`/api/providers/${id}/default`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Message.success('默认供应商已设置');
          loadProviders();
        } else {
          Message.error(data.message || '设置失败');
        }
      })
      .catch(err => {
        console.error(err);
        Message.error('设置默认供应商失败');
      });
  };

  const deleteModel = (providerId: string, modelId: string) => {
    fetch(`/api/providers/${providerId}/models/${modelId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Message.success('模型已删除');
          loadProviders();
        } else {
          Message.error(data.message || '删除失败');
        }
      })
      .catch(err => {
        console.error(err);
        Message.error('删除模型失败');
      });
  };

  const toggleModel = (providerId: string, modelId: string, enabled: boolean) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;
    updateProvider(providerId, {
      models: provider.models.map(m => m.id === modelId ? { ...m, enabled } : m)
    });
  };

  const openModelModal = (providerId?: string, model?: Model) => {
    const effectiveProviderId = providerId || '1';
    const effectiveProvider = providers.find(p => p.id === effectiveProviderId);
    setModelFormProviderId(effectiveProviderId);
    
    if (model) {
      setEditingModel(model);
      modelForm.setFieldsValue({
        providerId: effectiveProviderId,
        name: model.name,
        modelId: model.modelId,
        port: model.port,
        apiKeyId: model.apiKeyId || '1',
        cap_tools: model.capabilities.includes('tools'),
        cap_vision: model.capabilities.includes('vision'),
        cap_reasoning: model.capabilities.includes('reasoning'),
      });
    } else {
      setEditingModel(null);
      modelForm.resetFields();
      modelForm.setFieldValue('providerId', effectiveProviderId);
      modelForm.setFieldValue('port', effectiveProvider?.type || 'openai');
      modelForm.setFieldValue('apiKeyId', effectiveProvider?.apiKeys[0]?.id || '1');
      modelForm.setFieldValue('cap_tools', false);
      modelForm.setFieldValue('cap_vision', false);
      modelForm.setFieldValue('cap_reasoning', false);
    }
    setModelModalVisible(true);
  };

  const saveModel = () => {
    modelForm.validate().then((values: {
      name: string;
      modelId: string;
      port: string;
      apiKeyId: string;
      providerId?: string;
      cap_tools?: boolean;
      cap_vision?: boolean;
      cap_reasoning?: boolean;
    }) => {
      const targetProviderId = values.providerId || '1';
      
      const capabilities: string[] = [];
      if (values.cap_tools) capabilities.push('tools');
      if (values.cap_vision) capabilities.push('vision');
      if (values.cap_reasoning) capabilities.push('reasoning');
      
      const modelData = {
        name: values.name.trim(),
        modelId: values.modelId.trim(),
        port: values.port,
        capabilities,
        apiKeyId: values.apiKeyId,
        enabled: true,
      };
      
      if (editingModel) {
        // 更新现有模型
        fetch(`/api/providers/${targetProviderId}/models/${editingModel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelData),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              Message.success('模型已更新');
              loadProviders();
            } else {
              Message.error(data.message || '更新失败');
            }
          })
          .catch(err => {
            console.error(err);
            Message.error('更新模型失败');
          });
      } else {
        // 添加新模型
        fetch(`/api/providers/${targetProviderId}/models`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelData),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              Message.success('模型已添加');
              loadProviders();
            } else {
              Message.error(data.message || '添加失败');
            }
          })
          .catch(err => {
            console.error(err);
            Message.error('添加模型失败');
          });
      }
      
      setModelModalVisible(false);
      modelForm.resetFields();
      setEditingModel(null);
      setModelFormProviderId('');
    });
  };

  // 处理头像文件选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      Message.error('请选择图片文件');
      return;
    }
    
    // 验证文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      Message.error('图片大小不能超过 2MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const avatarUrl = event.target?.result as string;
      const newProfile = { ...userProfile, avatarUrl };
      setUserProfile(newProfile);
      saveUserProfile(newProfile);
      Message.success('头像已更新');
    };
    reader.readAsDataURL(file);
  };
  
  // 处理用户ID修改
  const handleUserIdChange = (value: string) => {
    const userId = value.trim().slice(0, 10); // 最多10个字符
    const newProfile = { ...userProfile, userId: userId || 'P' };
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
  };
  
  // 清除头像
  const clearAvatar = () => {
    const newProfile = { ...userProfile, avatarUrl: null };
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
    Message.success('已恢复默认头像');
  };
  
  // 处理 Agent 开关变化
  const setAgentModeEnabled = (enabled: boolean) => {
    setAgentModeEnabledState(enabled);
    // 保存到 localStorage 并通知其他组件
    saveAgentSettings({ agentModeEnabled: enabled });
    // 同步保存到后端
    fetch('/api/config/ai')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          // 更新 features 中的 agent_enabled
          const updatedConfig = {
            ...data.config,
            features: {
              ...data.config.features,
              agent_enabled: enabled,
            },
          };
          return fetch('/api/config/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig),
          });
        }
      })
      .catch(console.error);
  };

  // 通用设置内容
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
          <IconBulb style={{ color: 'var(--color-warning)' }} />
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

  // 自动补全内容
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

  // 供应商管理内容
  const ChatProvidersSettings = () => {
    const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
    const [editingProviders, setEditingProviders] = useState<Provider[]>(providers);
    
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
    
    const updateEditingProvider = (id: string, updates: Partial<Provider>) => {
      setEditingProviders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };
    
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
    
    const removeApiKey = (providerId: string, keyId: string) => {
      const provider = editingProviders.find(p => p.id === providerId);
      if (!provider) return;
      updateEditingProvider(providerId, {
        apiKeys: provider.apiKeys.filter(k => k.id !== keyId)
      });
    };
    
    const updateApiKey = (providerId: string, keyId: string, updates: Partial<ApiKeyItem>) => {
      const provider = editingProviders.find(p => p.id === providerId);
      if (!provider) return;
      updateEditingProvider(providerId, {
        apiKeys: provider.apiKeys.map(k => k.id === keyId ? { ...k, ...updates } : k)
      });
    };
    
    const saveProviderChanges = (providerId: string) => {
      const provider = editingProviders.find(p => p.id === providerId);
      if (!provider) return;
      
      // 调用后端 API 保存
      fetch(`/api/providers/${providerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: provider.name,
          baseUrl: provider.baseUrl,
          enabled: provider.enabled,
          apiKeys: provider.apiKeys,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            Message.success('供应商配置已保存');
            loadProviders();  // 重新加载以获取最新数据
          } else {
            Message.error(data.message || '保存失败');
          }
        })
        .catch(err => {
          console.error(err);
          Message.error('保存供应商配置失败');
        });
    };
    
    return (
      <>
        {editingProviders.map(provider => {
          const isExpanded = expandedProviders.has(provider.id);
          return (
            <Card key={provider.id} style={{ marginBottom: 12, borderRadius: 12, border: '1px solid var(--color-border-2)' }} bodyStyle={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div 
                  style={{ flex: 1, cursor: 'pointer' }} 
                  onClick={() => toggleExpand(provider.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text bold>{provider.name}</Text>
                    {provider.isDefault && <Tag color="arcoblue" size="small">默认</Tag>}
                    {!provider.enabled && <Tag color="gray" size="small">禁用</Tag>}
                  </div>
                  <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                    {provider.baseUrl || '未设置 Base URL'}
                  </Paragraph>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Button 
                    type="text" 
                    size="mini" 
                    icon={isExpanded ? <IconDown /> : <IconLeft />}
                    onClick={() => toggleExpand(provider.id)}
                  />
                  <Switch size="small" checked={provider.enabled} onChange={(checked) => {
                    // 先更新本地状态
                    updateEditingProvider(provider.id, { enabled: checked });
                    // 调用后端 API
                    fetch(`/api/providers/${provider.id}/enabled`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ enabled: checked }),
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          loadProviders();
                        } else {
                          Message.error(data.message || '更新失败');
                          // 恢复原状态
                          loadProviders();
                        }
                      })
                      .catch(err => {
                        console.error(err);
                        Message.error('更新供应商状态失败');
                        loadProviders();
                      });
                  }} />
                  <Button type="text" size="mini" icon={<IconSafe />} onClick={() => setDefault(provider.id)} disabled={provider.isDefault} />
                  <Popconfirm title="删除供应商？" onOk={() => deleteProvider(provider.id)} disabled={provider.isDefault}>
                    <Button type="text" size="mini" icon={<IconDelete />} status="danger" disabled={provider.isDefault} />
                  </Popconfirm>
                </div>
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
                              style={{ width: 100, border: '1px solid var(--color-border-2)', borderRadius: '6px', background: 'var(--color-bg-2)', fontSize: 12, textAlign: 'center' }}
                            />
                            <Input.Password 
                              value={apiKey.key}
                              onChange={(v) => updateApiKey(provider.id, apiKey.id, { key: v })}
                              placeholder="输入 API Key" 
                              style={{ flex: 1, border: '1px solid var(--color-border-2)', borderRadius: '6px', background: 'var(--color-bg-2)' }}
                            />
                            {index === 0 ? (
                              <Button 
                                type="primary" 
                                icon={<IconPlus />} 
                                size="mini"
                                onClick={() => addApiKey(provider.id)}
                                style={{ background: 'var(--color-primary)', borderRadius: '4px' }}
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Button 
                        type="primary" 
                        size="small"
                        onClick={() => saveProviderChanges(provider.id)}
                      >
                        保存修改
                      </Button>
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

  // 模型管理内容
  const ChatModelsSettings = () => {
    const enabledProviders = providers.filter(p => p.enabled);
    
    if (enabledProviders.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <IconSafe style={{ fontSize: 48, color: 'var(--color-text-4)', marginBottom: 16 }} />
          <Paragraph type="secondary" style={{ fontSize: 14 }}>
            暂无启用的供应商，请先启用供应商后再添加模型
          </Paragraph>
        </div>
      );
    }
    
    return (
      <>
        {enabledProviders.map(provider => (
          <div key={provider.id} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text bold style={{ fontSize: 16 }}>{provider.name}</Text>
              {provider.isDefault && <Tag color="arcoblue" size="small">默认</Tag>}
            </div>
            {provider.models.map(model => {
              const apiKey = provider.apiKeys.find(k => k.id === model.apiKeyId);
              return (
                <Card key={model.id} style={{ marginBottom: 10, borderRadius: 12, border: currentModelId === model.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border-2)' }} bodyStyle={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text bold style={{ fontSize: 14 }}>{model.name}</Text>
                        {renderCapabilityIcons(model.capabilities)}
                      </div>
                      <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0 0' }}>
                        Key: {apiKey?.name || 'default'} {apiKey?.key ? `(已配置)` : '(未配置)'}
                      </Paragraph>
                    </div>
                    <Space size={4}>
                      <Button type="text" size="mini" icon={<IconSafe />} onClick={() => setCurrentModelId(model.id)} disabled={currentModelId === model.id} title="设为默认" />
                      <Button type="text" size="mini" icon={<IconEdit />} onClick={() => openModelModal(provider.id, model)} title="编辑" />
                      <Popconfirm title="删除模型？" onOk={() => deleteModel(provider.id, model.id)}>
                        <Button type="text" size="mini" icon={<IconDelete />} status="danger" />
                      </Popconfirm>
                    </Space>
                  </div>
                </Card>
              );
            })}
            {provider.models.length === 0 && (
              <Paragraph type="secondary" style={{ fontSize: 13, margin: '8px 0' }}>
                暂无模型，点击右上角"添加模型"按钮添加
              </Paragraph>
            )}
          </div>
        ))}
      </>
    );
  };

  // 用户设置内容
  const ChatUserSettings = () => (
    <>
      <SettingItem title="用户标识" desc="显示在聊天头像上的文字（最多10个字符）">
        <Input
          value={userProfile.userId}
          onChange={handleUserIdChange}
          maxLength={10}
          style={{ width: 120 }}
          placeholder="P"
        />
      </SettingItem>

      <SettingItem title="头像" desc="自定义聊天中的用户头像图片" divider={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 头像预览 */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                overflow: 'hidden',
                background: userProfile.avatarUrl ? 'transparent' : '#206CCF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: '#fff',
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                userProfile.userId?.charAt(0) || 'P'
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Button
                type="primary"
                shape="round"
                size="small"
                style={{ height: '32px', padding: '0 16px', fontSize: '13px' }}
                onClick={() => document.getElementById('avatar-input')?.click()}
              >
                选择图片
              </Button>
              {userProfile.avatarUrl && (
                <Button
                  type="secondary"
                  shape="round"
                  size="small"
                  style={{ height: '32px', padding: '0 16px', fontSize: '13px' }}
                  onClick={clearAvatar}
                >
                  恢复默认
                </Button>
              )}
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>
          </div>
          <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
            支持 JPG、PNG、GIF 格式，最大 2MB
          </Paragraph>
        </div>
      </SettingItem>
    </>
  );

  // 模型参数内容
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

  const renderContent = () => {
    switch (activeMenu) {
      case 'general':
        return <ChatGeneralSettings />;
      case 'user':
        return <ChatUserSettings />;
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

  const getCurrentTitle = () => {
    const item = CHAT_MENU_ITEMS.find(item => item.key === activeMenu);
    return item?.label || '通用设置';
  };

  return (
    <>
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--color-bg-1)',
        height: '100%',
      }}>
        <SettingsSidebar
          title="聊天设置"
          menuItems={CHAT_MENU_ITEMS}
          activeItem={activeMenu}
          onItemClick={setActiveMenu}
          onBack={onBack}
        />

        {/* 主内容区 */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 48,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              {getCurrentTitle()}
            </Title>
            {activeMenu === 'providers' && (
              <Button type="primary" icon={<IconPlus />} onClick={() => setAddModalVisible(true)} style={{ borderRadius: '999px', padding: '4px 16px', display: 'flex', alignItems: 'center' }}>
                添加供应商
              </Button>
            )}
            {activeMenu === 'models' && (
              <Button 
                type="primary" 
                icon={<IconPlus />} 
                onClick={() => {
                  const enabledProvider = providers.find(p => p.enabled);
                  if (!enabledProvider) {
                    return;
                  }
                  openModelModal(enabledProvider.id);
                }} 
                style={{ borderRadius: '999px', padding: '4px 16px', display: 'flex', alignItems: 'center' }}
              >
                添加模型
              </Button>
            )}
          </div>
          
          <div className="settings-section">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* 添加 Provider 弹窗 */}
      <Modal
        title="添加 Provider"
        visible={addModalVisible}
        onOk={addProvider}
        onCancel={() => { setAddModalVisible(false); addForm.resetFields(); setApiKeys([{ id: '1', key: '', name: '' }]); }}
        autoFocus={false}
        focusLock
      >
        <div style={{ background: 'var(--color-fill-2)', borderRadius: '16px', padding: '16px', border: '1px solid var(--color-border-2)' }}>
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
                      style={{ background: 'var(--color-primary)', borderRadius: '6px', padding: '0 8px' }}
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
        onCancel={() => { setModelModalVisible(false); modelForm.resetFields(); setEditingModel(null); setModelFormProviderId(''); }}
        autoFocus={false}
        focusLock
      >
        <div style={{ background: 'var(--color-fill-2)', borderRadius: '16px', padding: '16px', border: '1px solid var(--color-border-2)' }}>
        <Form form={modelForm} layout="vertical">
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>供应商</Title>} field="providerId" initialValue="1">
            <Select 
              style={{ borderRadius: '8px' }}
              onChange={(value) => {
                setModelFormProviderId(value as string);
                const provider = providers.find(p => p.id === value);
                if (provider && provider.apiKeys.length > 0) {
                  modelForm.setFieldValue('apiKeyId', provider.apiKeys[0].id);
                }
              }}
            >
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
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>端口</Title>} field="port" initialValue={selected?.type || 'openai'}>
            <Select style={{ borderRadius: '8px' }}>
              {PORT_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>API Key 方案</Title>} field="apiKeyId">
            <Select style={{ borderRadius: '8px' }}>
              {(() => {
                const providerId = modelFormProviderId || modelForm.getFieldValue('providerId') || '1';
                const provider = providers.find(p => p.id === providerId);
                return provider?.apiKeys.map(key => (
                  <Option key={key.id} value={key.id}>{key.name || 'default'}</Option>
                ));
              })()}
            </Select>
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>模型能力</Title>} style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CAPABILITIES.map(cap => (
                <FormItem 
                  key={cap.key} 
                  field={`cap_${cap.key}`} 
                  style={{ marginBottom: 0 }}
                  triggerPropName="checked"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Checkbox />
                    <cap.icon style={{ color: 'var(--color-primary)', fontSize: 16 }} />
                    <Text style={{ fontSize: 14 }}>{cap.label}</Text>
                  </div>
                </FormItem>
              ))}
            </div>
          </FormItem>
        </Form>
        </div>
      </Modal>
    </>
  );
};

export default ChatView;
