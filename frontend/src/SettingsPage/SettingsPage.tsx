import { useState } from 'react';
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
  Alert,
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
  IconSearch,
  IconEdit,
  IconRefresh,
  IconEye,
  IconTool,
  IconBulb,
  IconCompass,
} from '@arco-design/web-react/icon';
import './SettingsPage.css';

const FormItem = Form.Item;
const { Title, Text, Paragraph } = Typography;
const Option = Select.Option;


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

interface Model {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  port: string;
  capabilities: string[];
}

interface Provider {
  id: string;
  type: string;
  name: string;
  apiKey: string;
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
    apiKey: '', 
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
    apiKey: '', 
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
    apiKey: '', 
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
    apiKey: '', 
    baseUrl: 'https://api.anthropic.com/v1', 
    models: [
      { id: 'm8', name: 'Claude 3.5 Sonnet', modelId: 'claude-3-5-sonnet-20241022', enabled: true, port: 'anthropic', capabilities: ['tools', 'vision'] },
      { id: 'm9', name: 'Claude 3 Opus', modelId: 'claude-3-opus-20240229', enabled: false, port: 'anthropic', capabilities: ['tools', 'vision'] },
    ], 
    enabled: false, 
    isDefault: false 
  },
];

const SettingsPage = () => {
  const [activeMenu, setActiveMenu] = useState('models');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('1');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  
  // 当前选中的模型（全局）
  const [currentModelId, setCurrentModelId] = useState<string>('m1');
  
  const [providers, setProviders] = useState<Provider[]>(defaultProviders);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [newProviderType, setNewProviderType] = useState('openai');
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [modelForm] = Form.useForm();

  const filtered = providers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selected = providers.find(p => p.id === selectedId);

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
        apiKey: values.apiKey || '',
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
      
      // 收集能力
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
        // 编辑
        updateProvider(selected.id, {
          models: selected.models.map(m => 
            m.id === editingModel.id 
              ? { ...m, ...modelData }
              : m
          )
        });
        Message.success('模型已更新');
      } else {
        // 新增
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

  // 能力图标渲染
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

  const menuItems = [
    { key: 'models', icon: <IconRobot />, label: '模型服务' },
    { key: 'params', icon: <IconThunderbolt />, label: '模型参数' },
    { key: 'general', icon: <IconSettings />, label: '常规设置' },
    { key: 'data', icon: <IconStorage />, label: '数据管理' },
  ];

  const leftMenu = (
    <div className="settings-left-menu">
      <div className="settings-menu-header">
        <Title heading={6} style={{ margin: 0 }} bold>设置</Title>
      </div>
      <div className="settings-menu-list">
        {menuItems.map(item => (
          <div
            key={item.key}
            className={`settings-menu-item ${activeMenu === item.key ? 'active' : ''}`}
            onClick={() => setActiveMenu(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const providerList = (
    <div className="settings-provider-list">
      <div className="settings-provider-search">
        <Input
          placeholder="搜索模型平台..."
          prefix={<IconSearch />}
          value={searchQuery}
          onChange={setSearchQuery}
          allowClear
        />
      </div>
      <div className="settings-provider-items">
        {filtered.map(p => (
          <div
            key={p.id}
            className={`settings-provider-item ${selectedId === p.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(p.id)}
          >
            <div className="settings-provider-info">
              <div className="settings-provider-name">
                <Text bold style={{ fontSize: 14 }}>{p.name}</Text>
                {p.isDefault && <Tag size="mini" color="arcoblue">默认</Tag>}
              </div>
            </div>
            <Tag size="small" color="arcoblue">
              {p.enabled ? 'ON' : 'OFF'}
            </Tag>
          </div>
        ))}
      </div>
      <div className="settings-provider-footer">
        <Button type="outline" shape="round" long icon={<IconPlus />} onClick={() => setAddModalVisible(true)}>
          添加
        </Button>
      </div>
    </div>
  );

  const providerDetail = selected ? (
    <div className="settings-provider-detail">
      <div className="settings-detail-header">
        <div className="settings-detail-title">
          <div className="settings-detail-name">
            <Title heading={3} style={{ margin: 0 }}>{selected.name}</Title>
            {selected.isDefault && <Tag color="arcoblue">默认</Tag>}
          </div>
        </div>
        <Switch 
          checked={selected.enabled}
          onChange={(checked) => updateProvider(selected.id, { enabled: checked })}
        />
      </div>

      <div className="settings-form-item">
        <Title heading={6} className="settings-form-label">API 密钥</Title>
        <Input
          type={apiKeyVisible ? 'text' : 'password'}
          placeholder="输入 API Key"
          value={selected.apiKey}
          onChange={(v) => updateProvider(selected.id, { apiKey: v })}
          addAfter={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <IconEyeInvisible style={{ cursor: 'pointer' }} onClick={() => setApiKeyVisible(!apiKeyVisible)} />
              <span style={{ color: 'rgb(32, 108, 207)', cursor: 'pointer' }}>检测</span>
            </div>
          }
        />
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
          API Key 仅存储在本地，不会上传到服务器
        </Paragraph>
      </div>

      <div className="settings-form-item">
        <Title heading={6} className="settings-form-label">API 地址</Title>
        <Input
          placeholder="输入 Base URL"
          value={selected.baseUrl}
          onChange={(v) => updateProvider(selected.id, { baseUrl: v })}
          addAfter={
            <Button 
              type="text" 
              size="mini"
              onClick={() => updateProvider(selected.id, { baseUrl: PROVIDER_PRESETS[selected.type]?.baseUrl || '' })}
            >
              重置
            </Button>
          }
        />
      </div>

      <div className="settings-form-item">
        <div className="settings-models-header">
          <Space>
            <Title heading={6} style={{ margin: 0 }}>模型</Title>
            <Tag size="small">{selected.models.length}</Tag>
          </Space>
          <Space>
            <Button type="text" shape="round" size="mini" icon={<IconPlus />} onClick={() => openModelModal()}>添加</Button>
            <Button type="text" shape="round" size="mini" icon={<IconRefresh />}>刷新</Button>
          </Space>
        </div>
        
        <div className="settings-models-list">
          {selected.models.map(model => (
            <div key={model.id} className="settings-model-card">
              <div className="settings-model-info">
                <IconCompass style={{ color: 'rgb(32, 108, 207)', fontSize: 20 }} />
                <div className="settings-model-text">
                  <Text bold>{model.name}</Text>
                  <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>{model.modelId}</Paragraph>
                  <div style={{ marginTop: 6 }}>{renderCapabilityIcons(model.capabilities)}</div>
                </div>
              </div>
              <div className="settings-model-actions">
                <Switch
                  size="small"
                  checked={model.enabled}
                  onChange={(checked) => toggleModel(model.id, checked)}
                />
                <Button 
                  type="text" 
                  size="mini" 
                  icon={<IconEdit />}
                  onClick={() => openModelModal(model)}
                />
                <Popconfirm title="确认删除" content={`删除模型 "${model.name}"？`} onOk={() => deleteModel(model.id)}>
                  <Button type="text" size="mini" icon={<IconDelete />} status="danger" />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-detail-actions">
        <Button type="primary" shape="round" onClick={() => Message.success('保存成功')}>保存</Button>
        <Button shape="round" onClick={() => Message.success('连接正常')}>检查</Button>
        {!selected.isDefault && <Button shape="round" onClick={() => setDefault(selected.id)}>设为默认</Button>}
        <Popconfirm title="确认删除" content={`确定删除 "${selected.name}" 吗？`} onOk={() => deleteProvider(selected.id)}>
          <Button status="danger" shape="round">删除</Button>
        </Popconfirm>
      </div>
    </div>
  ) : null;

  const [agentModeEnabled, setAgentModeEnabled] = useState(false);
  
  // 获取当前选中的模型
  const getCurrentModel = () => {
    for (const p of providers) {
      const model = p.models.find(m => m.id === currentModelId && m.enabled);
      if (model) return { ...model, provider: p };
    }
    return null;
  };
  
  const currentModel = getCurrentModel();
  const currentModelSupportTools = currentModel?.capabilities.includes('tools') ?? false;

  const paramsView = (
    <div className="settings-content-page">
      <Title heading={4} style={{ marginBottom: 24 }}>模型参数</Title>
      
      {/* 当前模型信息 */}
      <div className="settings-card-blue" style={{ 
        padding: 16, 
        borderRadius: 8,
        marginBottom: 16,
      }}>
        <Title heading={6} style={{ margin: 0, marginBottom: 8 }}>当前模型</Title>
        <Select 
          value={currentModelId} 
          onChange={setCurrentModelId}
          style={{ width: '100%' }}
        >
          {providers.filter(p => p.enabled).map(p => (
            <OptGroup key={p.id} label={p.name}>
              {p.models.filter(m => m.enabled).map(m => (
                <Option key={m.id} value={m.id}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.name}
                    {renderCapabilityIcons(m.capabilities)}
                  </span>
                </Option>
              ))}
            </OptGroup>
          ))}
        </Select>
        {currentModel && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>能力：</Paragraph>
            {renderCapabilityIcons(currentModel.capabilities)}
          </div>
        )}
      </div>
      
      {/* Agent 模式开关 */}
      <div className={currentModelSupportTools ? 'settings-card-blue' : 'settings-card-warning'} style={{ 
        padding: 16, 
        borderRadius: 8,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title heading={6} style={{ margin: 0, marginBottom: 4 }}>Agent 模式</Title>
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
              启用工具调用功能，AI 可以操作卡片和笔记
            </Paragraph>
            {!currentModelSupportTools && currentModel && (
              <Paragraph type="warning" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                当前选中的模型 "{currentModel.name}" 不支持工具调用
              </Paragraph>
            )}
            {!currentModel && (
              <Paragraph type="warning" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                请先在模型列表中启用一个模型
              </Paragraph>
            )}
          </div>
          <Switch 
            checked={agentModeEnabled && currentModelSupportTools}
            onChange={setAgentModeEnabled}
            disabled={!currentModelSupportTools}
          />
        </div>
      </div>

      <Title heading={6} style={{ marginBottom: 16 }}>生成参数</Title>
      {[
        { label: 'Temperature', min: 0, max: 2, step: 0.1, default: 0.7 },
        { label: 'Top P', min: 0, max: 1, step: 0.1, default: 0.9 },
        { label: 'Max Tokens', min: 100, max: 8000, step: 100, default: 2000 },
      ].map(item => (
        <div key={item.label} className="settings-param-item">
          <Title heading={6} className="settings-form-label">{item.label}</Title>
          <div className="settings-param-control">
            <Slider min={item.min} max={item.max} step={item.step} defaultValue={item.default} style={{ flex: 1 }} />
            <InputNumber min={item.min} max={item.max} step={item.step} defaultValue={item.default} style={{ width: 80 }} />
          </div>
        </div>
      ))}
      <Button type="primary" shape="round">保存参数</Button>
    </div>
  );

  const generalView = (
    <div className="settings-content-page">
      <Title heading={4} style={{ marginBottom: 24 }}>常规设置</Title>
      {[
        { label: '开机自动启动', desc: '系统启动时自动运行' },
        { label: '关闭时最小化到托盘', desc: '点击关闭按钮时最小化' },
        { label: '复习提醒通知', desc: '有卡片需要复习时显示通知' },
      ].map(item => (
        <div key={item.label} className="settings-general-item">
          <div>
            <Text bold>{item.label}</Text>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>{item.desc}</Paragraph>
          </div>
          <Switch />
        </div>
      ))}
      <div style={{ marginTop: 32 }}>
        <Button type="primary" shape="round">保存设置</Button>
      </div>
    </div>
  );

  const dataView = (
    <div className="settings-content-page">
      <Title heading={4} style={{ marginBottom: 24 }}>数据管理</Title>
      {[
        { title: '创建备份', desc: '立即备份所有数据', btn: '立即备份', primary: true },
        { title: '导出数据', desc: '导出为 JSON 文件', btn: '导出 JSON' },
      ].map(item => (
        <div key={item.title} className="settings-data-card">
          <div>
            <Text bold>{item.title}</Text>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>{item.desc}</Paragraph>
          </div>
          <Button type={item.primary ? 'primary' : 'default'} shape="round">{item.btn}</Button>
        </div>
      ))}
      <div className="settings-data-danger">
        <div>
          <Text bold style={{ color: 'var(--color-danger)' }}>重置所有数据</Text>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>永久删除所有数据，不可恢复</Paragraph>
        </div>
        <Button status="danger" shape="round">重置</Button>
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      {leftMenu}
      
      {activeMenu === 'models' && (
        <>
          {providerList}
          {providerDetail}
        </>
      )}
      
      {activeMenu === 'params' && paramsView}
      {activeMenu === 'general' && generalView}
      {activeMenu === 'data' && dataView}

      {/* 添加 Provider 弹窗 */}
      <Modal
        title="添加 Provider"
        visible={addModalVisible}
        onOk={addProvider}
        onCancel={() => { setAddModalVisible(false); addForm.resetFields(); }}
        autoFocus={false}
        focusLock
      >
        <Form form={addForm} layout="vertical">
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>类型</Title>} field="type" initialValue="openai">
            <Select value={newProviderType} onChange={setNewProviderType}>
              {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                <Option key={key} value={key}>{preset.name}</Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>名称</Title>} field="name">
            <Input placeholder={PROVIDER_PRESETS[newProviderType]?.name} />
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>API Key</Title>} field="apiKey">
            <Input.Password placeholder="输入 API Key" />
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>Base URL</Title>} field="baseUrl">
            <Input placeholder={PROVIDER_PRESETS[newProviderType]?.baseUrl} />
          </FormItem>
        </Form>
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
        <Form form={modelForm} layout="vertical">
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>模型名称</Title>} field="name" rules={[{ required: true }]}>
            <Input placeholder="如：GPT-4o" />
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>模型 ID</Title>} field="modelId" rules={[{ required: true }]}>
            <Input placeholder="实际的 API ID，如：gpt-4o" />
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>端口选择</Title>} field="port" initialValue={selected?.type || 'openai'}>
            <Select>
              {PORT_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label={<Title heading={6} style={{ margin: 0 }}>模型能力</Title>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CAPABILITIES.map(cap => (
                <FormItem 
                  key={cap.key} 
                  field={`cap_${cap.key}`} 
                  style={{ marginBottom: 0 }}
                  triggerPropName="checked"
                >
                  <Checkbox style={{ width: '100%' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <cap.icon style={{ color: 'rgb(32, 108, 207)', fontSize: 16 }} />
                        <Text>{cap.label}</Text>
                      </span>
                    </span>
                  </Checkbox>
                </FormItem>
              ))}
            </div>
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;
