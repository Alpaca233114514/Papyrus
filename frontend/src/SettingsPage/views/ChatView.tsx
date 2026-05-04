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
  IconArrowLeft,
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
import { SettingItem } from '../components';
import { useScrollNavigation } from '../../hooks/useScrollNavigation';
import { ProviderLogo } from '../../icons/ProviderLogo';
import { ModelLogo } from '../../icons/ModelLogo';
import { api } from '../../api';

const FormItem = Form.Item;
const { Title, Text, Paragraph } = Typography;
const Option = Select.Option;

const PORT_OPTIONS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI-Response', value: 'openai-response' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'LiYuan For DeepSeek', value: 'liyuan-deepseek' },
  { label: 'Ollama', value: 'ollama' },
];

const CAPABILITIES = [
  { key: 'tools', label: '工具调用', icon: IconTool },
  { key: 'vision', label: '视觉理解', icon: IconEye },
  { key: 'reasoning', label: '推理能力', icon: IconBulb },
];

const PROVIDER_PRESETS: Record<string, { name: string; baseUrl: string }> = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  'openai-response': { name: 'OpenAI-Response', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  gemini: { name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  'liyuan-deepseek': { name: 'LiYuan For DeepSeek', baseUrl: 'https://papyrus.liyuanstudio.com/v1' },
  ollama: { name: 'Ollama', baseUrl: 'http://localhost:11434' },
};

const PROVIDER_PORT_OPTIONS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI-Response', value: 'openai-response' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'LiYuan For DeepSeek', value: 'liyuan-deepseek' },
  { label: 'Ollama', value: 'ollama' },
];

const NAV_ITEMS = [
  { key: 'general-section', label: '通用设置', icon: IconMessage },
  { key: 'user-section', label: '用户设置', icon: IconUser },
  { key: 'providers-section', label: '供应商管理', icon: IconSafe },
  { key: 'models-section', label: '模型管理', icon: IconRobot },
  { key: 'completion-section', label: '自动补全', icon: IconBulb },
  { key: 'parameters-section', label: '模型参数', icon: IconSettings },
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

interface UserProfile {
  userId: string;
  avatarUrl: string | null;
}

const loadUserProfile = (): UserProfile => {
  try {
    const saved = localStorage.getItem('papyrus_user_profile');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return { userId: '', avatarUrl: null };
};

const saveUserProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem('papyrus_user_profile', JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('papyrus_user_profile_changed'));
  } catch {
    // ignore
  }
};

interface AgentSettings {
  agentModeEnabled: boolean;
}

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

const saveAgentSettings = (settings: AgentSettings) => {
  try {
    localStorage.setItem('papyrus_agent_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('papyrus_agent_settings_changed', { detail: settings }));
  } catch {
    // ignore
  }
};

const ChatView = ({ onBack }: ChatViewProps) => {
  const { contentRef, activeSection, scrollToSection } = useScrollNavigation(NAV_ITEMS);
  const [agentModeEnabled, setAgentModeEnabledState] = useState(() => loadAgentSettings().agentModeEnabled);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sendOnEnter, setSendOnEnter] = useState(true);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  
  const [completionEnabled, setCompletionEnabled] = useState(true);
  const [completionRequireConfirm, setCompletionRequireConfirm] = useState(false);
  const [completionTriggerDelay, setCompletionTriggerDelay] = useState(500);
  const [completionMaxTokens, setCompletionMaxTokens] = useState(50);
  const [completionSaving, setCompletionSaving] = useState(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string>('');
  const [aiCurrentModel, setAiCurrentModel] = useState<string>('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [newProviderType, setNewProviderType] = useState('openai');
  const [apiKeys, setApiKeys] = useState([{ id: '1', key: '', name: '' }]);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [modelForm] = Form.useForm();
  const [modelFormProviderId, setModelFormProviderId] = useState<string>('');
  const [addLoading, setAddLoading] = useState(false);
  const [saveModelLoading, setSaveModelLoading] = useState(false);

  const selected = providers.find(p => p.enabled);
  
  const getCurrentModel = () => {
    for (const p of providers) {
      const model = p.models.find(m => m.id === currentModelId && m.enabled);
      if (model) return { ...model, provider: p };
    }
    return null;
  };
  
  const currentModel = getCurrentModel();
  const currentModelSupportTools = currentModel?.capabilities.includes('tools') ?? false;

  useEffect(() => {
    api.getCompletionConfig()
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

  useEffect(() => {
    api.getAIConfig()
      .then(data => {
        if (data.success && data.config) {
          const backendCurrentModel = data.config.current_model;
          if (backendCurrentModel) {
            setAiCurrentModel(backendCurrentModel);
            // 如果 providers 已加载，立即同步 currentModelId
            setProviders(currentProviders => {
              for (const p of currentProviders) {
                const model = p.models.find(m => m.modelId === backendCurrentModel && m.enabled);
                if (model) {
                  setCurrentModelId(model.id);
                  break;
                }
              }
              return currentProviders;
            });
          }
          if (data.config.features) {
            const agentEnabled = data.config.features.agent_enabled ?? false;
            setAgentModeEnabledState(agentEnabled);
            saveAgentSettings({ agentModeEnabled: agentEnabled });
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = () => {
    setProvidersLoading(true);
    api.listProviders()
      .then(data => {
        if (data.success && data.providers) {
          setProviders(data.providers);
          // 根据后端 current_model (modelId) 查找对应的数据库 id
          if (aiCurrentModel) {
            for (const p of data.providers) {
              const model = p.models.find(m => m.modelId === aiCurrentModel && m.enabled);
              if (model) {
                setCurrentModelId(model.id);
                break;
              }
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setProvidersLoading(false));
  };

  const updateProvider = (id: string, updates: Partial<Provider>) => {
    setProviders(providers.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addProvider = () => {
    if (addLoading) return;
    addForm.validate().then((values: { name?: string; baseUrl?: string }) => {
      const preset = PROVIDER_PRESETS[newProviderType];

      const validApiKeys = apiKeys
        .filter(k => k.key.trim() !== '')
        .map((k, index) => ({
          id: k.id || crypto.randomUUID(),
          name: k.name.trim() || `key-${index + 1}`,
          key: k.key.trim()
        }));

      const finalApiKeys = validApiKeys.length > 0 ? validApiKeys : [{id: crypto.randomUUID(), name: 'default', key: ''}];

      const newProvider: Provider = {
        id: crypto.randomUUID(),
        type: newProviderType,
        name: values.name || preset.name,
        apiKeys: finalApiKeys,
        baseUrl: values.baseUrl || preset.baseUrl,
        models: [],
        enabled: false,
        isDefault: false,
      };

      setAddLoading(true);
      api.createProvider(newProvider)
        .then(data => {
          if (data.success) {
            Message.success('供应商添加成功');
            setAddModalVisible(false);
            addForm.resetFields();
            setApiKeys([{ id: '1', key: '', name: '' }]);
            loadProviders();
            notifyAIConfigChanged();
            const firstKey = validApiKeys.find(k => k.key.trim() !== '');
            if (firstKey) {
              syncKeyToAIConfig(newProviderType, firstKey.key);
            }
          } else {
            Message.error(data.error || '添加失败');
          }
        })
        .catch(err => {
          console.error('添加供应商失败:', err);
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('已存在')) {
            Message.warning('该配置已存在，无需重复添加');
          } else {
            Message.error('添加供应商失败');
          }
        })
        .finally(() => {
          setAddLoading(false);
        });

    });
  };

  const deleteProvider = (id: string) => {
    api.deleteProvider(id)
      .then(data => {
        if (data.success) {
          Message.success('供应商已删除');
          loadProviders();
          notifyAIConfigChanged();
        } else {
          Message.error(data.error || '删除失败');
        }
      })
      .catch(err => {
        console.error('删除供应商失败:', err);
        Message.error('删除供应商失败');
      });
  };

  const setDefault = (id: string) => {
    api.setDefaultProvider(id)
      .then(data => {
        if (data.success) {
          Message.success('默认供应商已设置');
          loadProviders();
        } else {
          Message.error(data.error || '设置失败');
        }
      })
      .catch(err => {
        console.error('设置默认供应商失败:', err);
        Message.error('设置默认供应商失败');
      });
  };

  const deleteModel = (providerId: string, modelId: string) => {
    api.deleteModel(providerId, modelId)
      .then(data => {
        if (data.success) {
          Message.success('模型已删除');
          loadProviders();
          notifyAIConfigChanged();
        } else {
          Message.error(data.error || '删除失败');
        }
      })
      .catch(err => {
        console.error('删除模型失败:', err);
        Message.error('删除模型失败');
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
        apiKeyId: model.apiKeyId,
        cap_tools: model.capabilities.includes('tools'),
        cap_vision: model.capabilities.includes('vision'),
        cap_reasoning: model.capabilities.includes('reasoning'),
      });
    } else {
      setEditingModel(null);
      modelForm.resetFields();
      modelForm.setFieldValue('providerId', effectiveProviderId);
      modelForm.setFieldValue('port', effectiveProvider?.type || 'openai');
      modelForm.setFieldValue('apiKeyId', effectiveProvider?.apiKeys[0]?.id);
      modelForm.setFieldValue('cap_tools', false);
      modelForm.setFieldValue('cap_vision', false);
      modelForm.setFieldValue('cap_reasoning', false);
    }
    setModelModalVisible(true);
  };

  const saveModel = () => {
    if (saveModelLoading) return;
    modelForm.validate().then((values: {
      name: string;
      modelId: string;
      port: string;
      apiKeyId?: string;
      providerId?: string;
      cap_tools?: boolean;
      cap_vision?: boolean;
      cap_reasoning?: boolean;
    }) => {
      const targetProviderId = values.providerId || '';
      const trimmedModelId = values.modelId.trim();

      const targetProvider = providers.find(p => p.id === targetProviderId);
      if (!targetProvider) {
        Message.error('所选供应商不存在，请刷新页面后重试');
        return;
      }

      if (!trimmedModelId) {
        Message.error('模型 ID 不能为空');
        return;
      }

      const capabilities: string[] = [];
      if (values.cap_tools) capabilities.push('tools');
      if (values.cap_vision) capabilities.push('vision');
      if (values.cap_reasoning) capabilities.push('reasoning');

      const modelData = {
        id: editingModel ? editingModel.id : crypto.randomUUID(),
        name: values.name.trim(),
        modelId: trimmedModelId,
        port: values.port,
        capabilities,
        apiKeyId: values.apiKeyId,
        enabled: true,
      };

      const closeModal = () => {
        setModelModalVisible(false);
        modelForm.resetFields();
        setEditingModel(null);
        setModelFormProviderId('');
      };

      setSaveModelLoading(true);
      if (editingModel) {
        api.updateModel(targetProviderId, editingModel.id, modelData)
          .then(data => {
            if (data.success) {
              Message.success('模型已更新');
              loadProviders();
              notifyAIConfigChanged();
              closeModal();
            } else {
              Message.error(data.error || '更新失败');
            }
          })
          .catch(err => {
            console.error('更新模型失败:', err);
            Message.error('更新模型失败');
          })
          .finally(() => {
            setSaveModelLoading(false);
          });
      } else {
        api.addModel(targetProviderId, modelData)
          .then(data => {
            if (data.success) {
              Message.success('模型已添加');
              loadProviders();
              notifyAIConfigChanged();
              closeModal();
            } else {
              Message.error(data.error || '添加失败');
            }
          })
          .catch(err => {
            console.error('添加模型失败:', err);
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('已存在')) {
              Message.warning('该模型已存在于当前供应商');
            } else {
              Message.error('添加模型失败');
            }
          })
          .finally(() => {
            setSaveModelLoading(false);
          });
      }
    }).catch((err: unknown) => {
      console.error('模型表单验证失败:', err);
      Message.error('模型表单验证失败，请检查输入');
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      Message.error('请选择图片文件');
      return;
    }
    
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
  
  const handleUserIdChange = (value: string) => {
    const userId = value.trim().slice(0, 10);
    const newProfile = { ...userProfile, userId };
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
  };
  
  const clearAvatar = () => {
    const newProfile = { ...userProfile, avatarUrl: null };
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
    Message.success('已恢复默认头像');
  };
  
  const setAgentModeEnabled = async (enabled: boolean) => {
    setAgentModeEnabledState(enabled);
    saveAgentSettings({ agentModeEnabled: enabled });
    try {
      // Provider 配置仅通过 /api/providers 管理，这里只同步 agent_enabled
      await api.saveAIConfig({
        features: {
          agent_enabled: enabled,
        },
      } as Partial<import('../../api').AIConfig>);
      notifyAIConfigChanged();
    } catch (err) {
      console.error('保存 Agent 模式配置失败:', err);
    }
  };

  const notifyAIConfigChanged = () => {
    window.dispatchEvent(new CustomEvent('papyrus_ai_config_changed'));
  };

  const saveDefaultModel = async (modelId: string) => {
    setCurrentModelId(modelId);
    try {
      const provider = providers.find(p => p.models.some(m => m.id === modelId));
      const model = provider?.models.find(m => m.id === modelId);
      // Provider 配置仅通过 /api/providers 管理，这里只同步 current_provider / current_model
      const updated: Partial<import('../../api').AIConfig> = {
        current_model: model?.modelId || modelId,
      };
      if (provider) {
        updated.current_provider = provider.type;
      }
      await api.saveAIConfig(updated);
      notifyAIConfigChanged();
    } catch (err) {
      console.error('同步模型配置到后端失败:', err);
      Message.error('同步模型配置到后端失败');
    }
  };

  const saveCompletionConfig = async (updates: Partial<{ enabled: boolean; require_confirm: boolean; trigger_delay: number; max_tokens: number }>) => {
    if (completionSaving) return;
    setCompletionSaving(true);
    try {
      await api.saveCompletionConfig({
        enabled: updates.enabled ?? completionEnabled,
        require_confirm: updates.require_confirm ?? completionRequireConfirm,
        trigger_delay: updates.trigger_delay ?? completionTriggerDelay,
        max_tokens: updates.max_tokens ?? completionMaxTokens,
      });
    } catch (err) {
      console.error('保存补全配置失败:', err);
    } finally {
      setCompletionSaving(false);
    }
  };

  const syncKeyToAIConfig = async (_providerType: string, _apiKey: string) => {
    // Phase 1: provider 配置由数据库独立维护，不再同步到 aiConfig
    // api_key 已通过 saveProviderChanges() 中的 api.updateProvider() 保存到数据库
    notifyAIConfigChanged();
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
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>聊天设置</Text>
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
            <IconMessage style={{ fontSize: 32, color: 'var(--color-primary)' }} />
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              聊天设置
            </Title>
          </div>
          <Paragraph type="secondary">
            配置 AI 聊天、供应商和模型参数
          </Paragraph>
        </div>

        <div id="general-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>通用设置</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="Agent 模式" desc="启用工具调用功能，AI 可以操作卡片和笔记">
              <Switch
                checked={agentModeEnabled}
                onChange={setAgentModeEnabled}
              />
            </SettingItem>

            <SettingItem title="显示时间戳" desc="在消息旁显示发送时间">
              <Switch checked={showTimestamp} onChange={setShowTimestamp} />
            </SettingItem>

            <SettingItem title="自动滚动" desc="新消息到来时自动滚动到底部">
              <Switch checked={autoScroll} onChange={setAutoScroll} />
            </SettingItem>

            <SettingItem title="Enter 发送" desc="按 Enter 键发送消息，Shift+Enter 换行" divider={false}>
              <Switch checked={sendOnEnter} onChange={setSendOnEnter} />
            </SettingItem>
          </div>
        </div>

        <div id="user-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>用户设置</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
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
                      userProfile.userId?.charAt(0)?.toUpperCase() || '?'
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
                      aria-label="选择头像图片"
                    />
                  </div>
                </div>
                <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                  支持 JPG、PNG、GIF 格式，最大 2MB
                </Paragraph>
              </div>
            </SettingItem>
          </div>
        </div>

        <div id="providers-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>供应商管理</Title>
            <Button type="primary" icon={<IconPlus />} onClick={() => setAddModalVisible(true)} style={{ borderRadius: '999px', padding: '4px 16px', display: 'flex', alignItems: 'center' }}>
              添加供应商
            </Button>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <ProvidersSection providers={providers} loadProviders={loadProviders} deleteProvider={deleteProvider} setDefault={setDefault} syncKeyToAIConfig={syncKeyToAIConfig} />
          </div>
        </div>

        <div id="models-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>模型管理</Title>
            <Button 
              type="primary" 
              icon={<IconPlus />} 
              onClick={() => {
                const enabledProvider = providers.find(p => p.enabled);
                if (!enabledProvider) {
                  Message.warning('请先启用至少一个供应商');
                  return;
                }
                openModelModal(enabledProvider.id);
              }} 
              style={{ borderRadius: '999px', padding: '4px 16px', display: 'flex', alignItems: 'center' }}
            >
              添加模型
            </Button>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <ModelsSection
              providers={providers}
              currentModelId={currentModelId}
              saveDefaultModel={saveDefaultModel}
              deleteModel={deleteModel}
              openModelModal={openModelModal}
              renderCapabilityIcons={renderCapabilityIcons}
            />
          </div>
        </div>

        <div id="completion-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>自动补全</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="笔记自动补全" desc="启用 AI 驱动的笔记内容自动补全功能">
              <Switch
                checked={completionEnabled}
                onChange={(checked) => {
                  setCompletionEnabled(checked);
                  saveCompletionConfig({ enabled: checked });
                }}
              />
            </SettingItem>

            {completionEnabled && (
              <>
                <SettingItem title="二次确认模式" desc="开启后需按 Tab 触发补全，Enter 确认；关闭时输入自动显示补全，Tab 直接接受">
                  <Switch
                    checked={completionRequireConfirm}
                    onChange={(checked) => {
                      setCompletionRequireConfirm(checked);
                      saveCompletionConfig({ require_confirm: checked });
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
                      saveCompletionConfig({ trigger_delay: val as number });
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
                      saveCompletionConfig({ max_tokens: val as number });
                    }}
                    style={{ width: 200 }}
                  />
                </SettingItem>
              </>
            )}
          </div>
        </div>

        <div id="parameters-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>模型参数</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            {[
              { label: 'Temperature', min: 0, max: 2, step: 0.1, default: 0.7 },
              { label: 'Top P', min: 0, max: 1, step: 0.1, default: 0.9 },
              { label: 'Max Tokens', min: 100, max: 8000, step: 100, default: 2000 },
            ].map((item, index) => (
              <SettingItem 
                key={item.label} 
                title={item.label} 
                desc="" 
                divider={index !== 2}
              >
                  <div className="settings-slider-control" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
                    <Slider min={item.min} max={item.max} step={item.step} defaultValue={item.default} style={{ flex: 1 }} />
                    <InputNumber min={item.min} max={item.max} step={item.step} defaultValue={item.default} style={{ width: 80 }} />
                  </div>
              </SettingItem>
            ))}

            <SettingItem title="" desc="" divider={false}>
              <Button type="primary" shape="round">保存参数</Button>
            </SettingItem>
          </div>
        </div>

        <div style={{ height: 'calc(100vh - 200px)', flexShrink: 0 }} />
      </div>

      <Modal
        title="添加 Provider"
        visible={addModalVisible}
        onOk={addProvider}
        confirmLoading={addLoading}
        onCancel={() => { setAddModalVisible(false); addForm.resetFields(); setApiKeys([{ id: '1', key: '', name: '' }]); }}
        autoFocus={false}
        focusLock
      >
        <div style={{ background: 'var(--color-fill-2)', borderRadius: '16px', padding: '16px', border: '1px solid var(--color-border-2)' }}>
        <Form form={addForm} layout="vertical">
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>端口</Title>} field="port" initialValue="openai">
            <Select value={newProviderType} onChange={setNewProviderType} style={{ borderRadius: '8px' }}>
              {PROVIDER_PORT_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProviderLogo type={opt.value} size={16} />
                    <span>{opt.label}</span>
                  </div>
                </Option>
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
                      onClick={() => setApiKeys([...apiKeys, { id: crypto.randomUUID(), key: '', name: '' }])}
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

      <Modal
        title={editingModel ? '编辑模型' : '添加模型'}
        visible={modelModalVisible}
        onOk={saveModel}
        confirmLoading={saveModelLoading}
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
                <Option key={p.id} value={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProviderLogo type={p.type} name={p.name} size={16} />
                    <span>{p.name}</span>
                  </div>
                </Option>
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
    </div>
  );
};

const ProvidersSection = ({ providers, loadProviders, deleteProvider, setDefault, syncKeyToAIConfig }: {
  providers: Provider[];
  loadProviders: () => void;
  deleteProvider: (id: string) => void;
  setDefault: (id: string) => void;
  syncKeyToAIConfig: (providerType: string, apiKey: string) => void;
}) => {
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [editingProviders, setEditingProviders] = useState<Provider[]>(providers);
  const [saveProviderLoading, setSaveProviderLoading] = useState<Set<string>>(new Set());
  
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
      id: crypto.randomUUID(),
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
    if (saveProviderLoading.has(providerId)) return;
    const provider = editingProviders.find(p => p.id === providerId);
    if (!provider) return;

    setSaveProviderLoading(prev => new Set(prev).add(providerId));
    api.updateProvider(providerId, {
      name: provider.name,
      baseUrl: provider.baseUrl,
      enabled: provider.enabled,
      apiKeys: provider.apiKeys,
    })
      .then(data => {
        if (data.success) {
          Message.success('供应商配置已保存');
          loadProviders();
          window.dispatchEvent(new CustomEvent('papyrus_ai_config_changed'));
          const firstKey = provider.apiKeys.find(k => k.key.trim() !== '');
          if (firstKey) {
            syncKeyToAIConfig(provider.type, firstKey.key);
          }
        } else {
          Message.error(data.error || '保存失败');
        }
      })
      .catch(err => {
        console.error('保存供应商配置失败:', err);
        Message.error('保存供应商配置失败');
      })
      .finally(() => {
        setSaveProviderLoading(prev => {
          const next = new Set(prev);
          next.delete(providerId);
          return next;
        });
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
                  <ProviderLogo type={provider.type} name={provider.name} size={20} />
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
                  updateEditingProvider(provider.id, { enabled: checked });
                  api.updateProviderEnabled(provider.id, checked)
                    .then(data => {
                      if (data.success) {
                        loadProviders();
                        window.dispatchEvent(new CustomEvent('papyrus_ai_config_changed'));
                      } else {
                        Message.error(data.error || '更新失败');
                        loadProviders();
                      }
                    })
                    .catch(err => {
                      console.error('更新供应商状态失败:', err);
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

const ModelsSection = ({ providers, currentModelId, saveDefaultModel, deleteModel, openModelModal, renderCapabilityIcons }: {
  providers: Provider[];
  currentModelId: string;
  saveDefaultModel: (id: string) => void;
  deleteModel: (providerId: string, modelId: string) => void;
  openModelModal: (providerId?: string, model?: Model) => void;
  renderCapabilityIcons: (capabilities: string[]) => React.ReactNode;
}) => {
  const enabledProviders = providers.filter(p => p.enabled && p.models.length > 0);

  if (enabledProviders.length === 0) {
    const hasEnabledProviders = providers.some(p => p.enabled);
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <IconSafe style={{ fontSize: 48, color: 'var(--color-text-4)', marginBottom: 16 }} />
        <Paragraph type="secondary" style={{ fontSize: 14 }}>
          {hasEnabledProviders
            ? '暂无模型，请点击右上角"添加模型"按钮添加'
            : '暂无启用的供应商，请先启用供应商后再添加模型'}
        </Paragraph>
      </div>
    );
  }
  
  return (
    <>
      {enabledProviders.map(provider => (
        <div key={provider.id} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ProviderLogo type={provider.type} name={provider.name} size={20} />
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
                      <ModelLogo model={model.name} modelId={model.modelId || model.id} size={18} />
                      <Text bold style={{ fontSize: 14 }}>{model.name}</Text>
                      {renderCapabilityIcons(model.capabilities)}
                    </div>
                    <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0 0' }}>
                      Key: {apiKey?.name || 'default'} {apiKey?.key ? `(已配置)` : '(未配置)'}
                    </Paragraph>
                  </div>
                  <Space size={4}>
                    <Button type="text" size="mini" icon={<IconSafe />} onClick={() => saveDefaultModel(model.id)} disabled={currentModelId === model.id} title="设为默认" />
                    <Button type="text" size="mini" icon={<IconEdit />} onClick={() => openModelModal(provider.id, model)} title="编辑" />
                    <Popconfirm title="删除模型？" onOk={() => deleteModel(provider.id, model.id)}>
                      <Button type="text" size="mini" icon={<IconDelete />} status="danger" />
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </>
  );
};

export default ChatView;
