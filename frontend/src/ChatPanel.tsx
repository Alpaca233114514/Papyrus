import { useState, useRef, useCallback, useEffect } from 'react';
import { Dropdown, Menu, Avatar, Tooltip, Empty, Message as ArcoMessage, Tag, Button } from '@arco-design/web-react';
import { IconArrowUp, IconAt, IconFile, IconMessage, IconDown, IconBulb, IconRecordStop, IconTool, IconRefresh, IconEdit, IconCopy, IconDelete, IconTranslate, IconSave, IconPlus, IconHistory, IconClose, IconImage, IconFilePdf, IconSettings } from '@arco-design/web-react/icon';
import IconAgentMode from './icons/IconAgentMode';
import { ReasoningChain } from './components/ReasoningChain';
import { ToolCallCard } from './components/ToolCallCard';
import type { AIConfig, ProviderModel } from './types/ai';
import './ChatPanel.css';

interface ChatPanelProps {
  open: boolean;
  width?: number;
  onClose?: () => void;
}

// 从 localStorage 加载 Agent 模式设置
const loadAgentModeEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem('papyrus_agent_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.agentModeEnabled ?? false;
    }
  } catch {
    // ignore
  }
  return false;
};

const modes = [
  { key: 'agent', icon: <IconAgentMode />, label: 'Agent 模式' },
  { key: 'chat', icon: <IconMessage />, label: 'Chat 模式' },
];

/** 消息块类型 */
type MessageBlockType = 'text' | 'reasoning' | 'tool_call';

/** 消息块 */
interface MessageBlock {
  type: MessageBlockType;
  content?: string;
  toolName?: string;
  toolStatus?: 'pending' | 'executing' | 'success' | 'failed';
  toolParams?: Record<string, any>;
  toolResult?: any;
  toolError?: string;
}

/** 消息 */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks?: MessageBlock[];
}

/** 已选文件 */
interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'image' | 'document' | 'unknown';
}

/** SSE 事件类型 */
interface SSEEvent {
  type: 'text' | 'reasoning' | 'tool_call' | 'tool_result' | 'error' | 'done';
  data: any;
}

// 文件类型配置
const ALLOWED_IMAGE_TYPES = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const ALLOWED_DOCUMENT_TYPES = ['.pdf', '.txt', '.md', '.docx'];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

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
  return { userId: '', avatarUrl: null };
};

const ChatPanel = ({ open, width = 320, onClose }: ChatPanelProps) => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState('agent');
  const [model, setModel] = useState('claude-sonnet-4');
  const [reasoning, setReasoning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputHeight, setInputHeight] = useState(118);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [configChecked, setConfigChecked] = useState(false);
  const [agentModeEnabled, setAgentModeEnabled] = useState<boolean>(loadAgentModeEnabled());
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 监听 localStorage 变化（用于设置页面修改后实时更新）
  useEffect(() => {
    const handleStorageChange = () => {
      setUserProfile(loadUserProfile());
    };
    
    window.addEventListener('storage', handleStorageChange);
    // 同时监听自定义事件（同页面内更新）
    window.addEventListener('papyrus_user_profile_changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('papyrus_user_profile_changed', handleStorageChange);
    };
  }, []);



  // 挂载时检查：如果 agent 已禁用但当前在 agent 模式，自动切到 chat
  useEffect(() => {
    if (!agentModeEnabled && mode === 'agent') {
      setMode('chat');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only check

  // 监听 Agent 模式设置变化
  useEffect(() => {
    const handleAgentModeChange = (e?: CustomEvent) => {
      // 如果事件中有详细数据，直接使用；否则从 localStorage 重新加载
      let enabled: boolean;
      if (e?.detail && typeof e.detail.agentModeEnabled === 'boolean') {
        enabled = e.detail.agentModeEnabled;
      } else {
        enabled = loadAgentModeEnabled();
      }
      setAgentModeEnabled(enabled);
      // 如果 Agent 模式被禁用，且当前在 Agent 模式，则切换到 Chat 模式
      if (!enabled && mode === 'agent') {
        setMode('chat');
      }
    };

    // 监听自定义事件（同页面内更新）
    window.addEventListener('papyrus_agent_settings_changed', handleAgentModeChange as EventListener);
    // 同时监听 storage 事件（跨标签页）
    const storageHandler = () => handleAgentModeChange();
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener('papyrus_agent_settings_changed', handleAgentModeChange as EventListener);
      window.removeEventListener('storage', storageHandler);
    };
  }, [mode]);

  // 加载 AI 配置
  const loadAIConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config/ai');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setAiConfig(data.config);
          if (data.config.current_model) {
            setModel(data.config.current_model);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    } finally {
      setConfigChecked(true);
    }
  }, []);

  // 加载供应商模型列表
  const loadProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/providers');
      if (!response.ok) {
        console.error('Failed to load providers:', response.status, response.statusText);
        return;
      }
      const data = await response.json();
      if (data.success && data.providers) {
        const models: ProviderModel[] = [];
        for (const provider of data.providers) {
          if (!provider.enabled) continue;
          for (const m of provider.models) {
            if (!m.enabled) continue;
            models.push({
              key: m.modelId,
              label: m.name,
              providerId: provider.id,
              providerType: provider.type,
            });
          }
        }
        setAvailableModels(models);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, []);

  // 组件挂载时加载配置和模型列表
  useEffect(() => {
    if (open) {
      loadAIConfig();
      loadProviders();
    }
  }, [open, loadAIConfig, loadProviders]);

  // 检查 AI 配置是否有效
  const checkAIConfig = useCallback((): { valid: boolean; message?: string } => {
    if (!aiConfig) {
      return { valid: false, message: '正在加载配置，请稍候...' };
    }

    // 检查是否有配置的 provider
    if (!aiConfig.current_provider) {
      return { valid: false, message: '请先配置 AI 供应商' };
    }

    const provider = aiConfig.providers[aiConfig.current_provider];
    if (!provider) {
      return { valid: false, message: '当前供应商配置无效，请前往设置页面重新配置' };
    }

    // 检查 API key
    if (!provider.api_key || provider.api_key.trim() === '') {
      return { valid: false, message: `请先配置 ${aiConfig.current_provider} 的 API Key` };
    }

    // 检查是否有可用的模型
    if (!aiConfig.current_model) {
      return { valid: false, message: '请先选择 AI 模型' };
    }

    if (!provider.models || provider.models.length === 0) {
      return { valid: false, message: '当前供应商没有可用的模型，请前往设置页面添加' };
    }

    const modelInProviders = provider.models.includes(aiConfig.current_model);
    const modelInDb = availableModels.some((m) => m.key === aiConfig.current_model);
    if (!modelInProviders && !modelInDb) {
      return { valid: false, message: '当前选择的模型不可用，请前往设置页面重新选择' };
    }

    return { valid: true };
  }, [aiConfig, availableModels]);

  // 跳转到设置页面
  const goToSettings = useCallback(() => {
    // 触发自定义事件，让主应用切换到设置页面
    window.dispatchEvent(new CustomEvent('papyrus_open_settings', { detail: { section: 'chat' } }));
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 获取文件扩展名
  const getFileExtension = (filename: string): string => {
    const ext = filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
    return ext ? `.${ext}` : '';
  };

  // 获取文件类型
  const getFileType = (filename: string): 'image' | 'document' | 'unknown' => {
    const ext = getFileExtension(filename);
    if (ALLOWED_IMAGE_TYPES.includes(ext)) return 'image';
    if (ALLOWED_DOCUMENT_TYPES.includes(ext)) return 'document';
    return 'unknown';
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // 获取文件类型图标
  const getFileIcon = (type: 'image' | 'document' | 'unknown', name: string) => {
    switch (type) {
      case 'image':
        return <IconImage />;
      case 'document':
        // PDF 文件使用 PDF 图标，其他文档使用通用文件图标
        if (name.toLowerCase().endsWith('.pdf')) {
          return <IconFilePdf />;
        }
        return <IconFile />;
      default:
        return <IconFile />;
    }
  };

  // 处理文件选择
  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 验证并添加文件
  const validateAndAddFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: SelectedFile[] = [];
    const errors: string[] = [];

    // 检查总数限制
    const currentCount = selectedFiles.length;
    const remainingSlots = MAX_FILES - currentCount;

    if (remainingSlots <= 0) {
      ArcoMessage.error(`最多只能选择 ${MAX_FILES} 个文件`);
      return;
    }

    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      const ext = getFileExtension(file.name);

      // 检查文件类型
      if (!ALLOWED_FILE_TYPES.includes(ext)) {
        errors.push(`${file.name}: 不支持的文件类型`);
        return;
      }

      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: 超过10MB大小限制`);
        return;
      }

      // 检查重复文件
      const isDuplicate = selectedFiles.some(
        (sf) => sf.name === file.name && sf.size === file.size
      );
      if (isDuplicate) {
        errors.push(`${file.name}: 文件已存在`);
        return;
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        file,
        name: file.name,
        size: file.size,
        type: getFileType(file.name),
      });
    });

    // 显示错误信息
    if (errors.length > 0) {
      errors.slice(0, 3).forEach((err) => ArcoMessage.error(err));
      if (errors.length > 3) {
        ArcoMessage.error(`还有 ${errors.length - 3} 个文件未添加`);
      }
    }

    // 添加新文件
    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }

    // 如果有文件被截断（超过5个）
    if (files.length > remainingSlots) {
      ArcoMessage.warning(`已达到最大文件数限制 (${MAX_FILES})，多余文件未添加`);
    }
  }, [selectedFiles]);

  // 处理文件输入变化
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    // 重置 input 以便可以再次选择相同文件
    e.target.value = '';
  }, [validateAndAddFiles]);

  // 删除已选文件
  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // 清空所有已选文件
  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // 处理 SSE 流
  const handleSSEStream = useCallback(async (response: Response, messageId: string) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const jsonStr = line.trim().slice(6);
              if (jsonStr === '[DONE]') continue;

              const event: SSEEvent = JSON.parse(jsonStr);
              
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMsg = newMessages.find((m) => m.id === messageId);
                if (!lastMsg) return prev;

                if (!lastMsg.blocks) {
                  lastMsg.blocks = [];
                }

                switch (event.type) {
                  case 'text':
                    lastMsg.content += event.data;
                    break;

                  case 'reasoning':
                    // 查找或创建 reasoning 块
                    const reasoningBlock = lastMsg.blocks.find(
                      (b) => b.type === 'reasoning'
                    );
                    if (reasoningBlock) {
                      reasoningBlock.content = (reasoningBlock.content || '') + event.data;
                    } else {
                      lastMsg.blocks.push({
                        type: 'reasoning',
                        content: event.data,
                      });
                    }
                    break;

                  case 'tool_call':
                    lastMsg.blocks.push({
                      type: 'tool_call',
                      toolName: event.data.name,
                      toolStatus: 'pending',
                      toolParams: event.data.params,
                    });
                    break;

                  case 'tool_result':
                    const toolBlock = lastMsg.blocks.find(
                      (b) => b.type === 'tool_call' && b.toolName === event.data.name && b.toolStatus === 'pending'
                    );
                    if (toolBlock) {
                      toolBlock.toolStatus = event.data.success ? 'success' : 'failed';
                      toolBlock.toolResult = event.data.result;
                      toolBlock.toolError = event.data.error;
                    }
                    break;

                  case 'error':
                    ArcoMessage.error(event.data.message || '发生错误');
                    break;
                }

                return newMessages;
              });
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, []);

  // 发送消息
  const sendMessage = useCallback(async () => {
    const trimmedText = text.trim();
    if ((!trimmedText && selectedFiles.length === 0) || isGenerating) return;

    // 检查 AI 配置
    const configCheck = checkAIConfig();
    if (!configCheck.valid) {
      ArcoMessage.error(configCheck.message || 'AI 配置不完整');
      return;
    }

    // 保存当前文件列表并清空（后端暂不支持 multipart，文件名会拼入消息文本）
    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);

    let messageText = trimmedText;
    if (filesToUpload.length > 0) {
      const fileNames = filesToUpload.map((f) => `[附件: ${f.name}]`).join(' ');
      messageText = messageText ? `${messageText}\n${fileNames}` : fileNames;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      blocks: [],
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setText('');
    setIsGenerating(true);

    // 创建 AbortController
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 检查是否是 SSE 响应
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        await handleSSEStream(response, assistantMessage.id);
      } else {
        // 普通 JSON 响应
        const data = await response.json();
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsg = newMessages.find((m) => m.id === assistantMessage.id);
          if (lastMsg) {
            lastMsg.content = data.content;
            if (data.reasoning) {
              lastMsg.blocks = [
                ...(lastMsg.blocks || []),
                { type: 'reasoning', content: data.reasoning },
              ];
            }
          }
          return newMessages;
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Failed to send message:', error);
        // 根据错误类型显示不同的错误信息
        let errorMessage = '发送消息失败，请重试';
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch')) {
            errorMessage = '无法连接到服务器，请检查后端是否已启动';
          } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'API Key 无效或已过期，请前往设置页面检查配置';
          } else if (error.message.includes('429')) {
            errorMessage = '请求过于频繁，请稍后再试';
          } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
            errorMessage = 'AI 服务暂时不可用，请稍后再试';
          } else if (error.message.includes('API key') || error.message.includes('api key')) {
            errorMessage = 'API Key 配置错误，请前往设置页面检查';
          }
        }
        ArcoMessage.error(errorMessage);
        
        // 更新最后一条助手消息显示错误
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = '❌ ' + errorMessage;
          }
          return newMessages;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [text, isGenerating, messages, model, mode, reasoning, selectedFiles, handleSSEStream, checkAIConfig]);

  // 停止生成
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  // 处理工具批准
  const handleToolApprove = useCallback((messageId: string, toolName: string) => {
    // 发送批准请求到后端
    fetch('/api/tool/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, toolName, approved: true }),
    });

    // 更新本地状态
    setMessages((prev) => {
      const newMessages = [...prev];
      const msg = newMessages.find((m) => m.id === messageId);
      if (msg?.blocks) {
        const block = msg.blocks.find(
          (b) => b.type === 'tool_call' && b.toolName === toolName && b.toolStatus === 'pending'
        );
        if (block) {
          block.toolStatus = 'executing';
        }
      }
      return newMessages;
    });
  }, []);

  // 处理工具拒绝
  const handleToolReject = useCallback((messageId: string, toolName: string) => {
    // 发送拒绝请求到后端
    fetch('/api/tool/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, toolName, approved: false }),
    });

    // 更新本地状态
    setMessages((prev) => {
      const newMessages = [...prev];
      const msg = newMessages.find((m) => m.id === messageId);
      if (msg?.blocks) {
        const block = msg.blocks.find(
          (b) => b.type === 'tool_call' && b.toolName === toolName && b.toolStatus === 'pending'
        );
        if (block) {
          block.toolStatus = 'failed';
          block.toolError = '用户拒绝了工具调用';
        }
      }
      return newMessages;
    });
  }, []);

  // 渲染消息块
  const renderMessageBlock = (block: MessageBlock, messageId: string) => {
    switch (block.type) {
      case 'reasoning':
        return (
          <ReasoningChain
            key={`reasoning-${messageId}`}
            content={block.content || ''}
            defaultExpanded={false}
          />
        );

      case 'tool_call':
        return (
          <ToolCallCard
            key={`tool-${messageId}-${block.toolName}`}
            toolName={block.toolName || '未知工具'}
            status={block.toolStatus || 'pending'}
            params={block.toolParams}
            result={block.toolResult}
            error={block.toolError}
            onApprove={() => handleToolApprove(messageId, block.toolName || '')}
            onReject={() => handleToolReject(messageId, block.toolName || '')}
            defaultExpanded={block.toolStatus === 'failed'}
          />
        );

      default:
        return null;
    }
  };

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = inputHeight;
    const onMove = (ev: MouseEvent) => {
      const delta = dragStartY.current - ev.clientY;
      setInputHeight(Math.min(400, Math.max(118, dragStartHeight.current + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [inputHeight]);

  if (!open) return null;

  const currentMode = modes.find((m) => m.key === mode) ?? modes[0]!;
  
  // 处理模式切换，检查 Agent 是否被禁用
  const handleModeChange = (newMode: string) => {
    if (newMode === 'agent' && !agentModeEnabled) {
      ArcoMessage.warning('请在设置中启用 Agent 模式');
      return;
    }
    setMode(newMode);
  };

  const handleModelSelect = async (key: string) => {
    setModel(key);
    const selected = availableModels.find((m) => m.key === key);
    if (!selected || !aiConfig) return;

    const updatedConfig = {
      ...aiConfig,
      current_provider: selected.providerType,
      current_model: key,
    };

    try {
      await fetch('/api/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      await loadAIConfig();
    } catch (error) {
      console.error('Failed to update AI config:', error);
    }
  };

  return (
    <div className="chat-panel" style={{ width }}>
      <div className="chat-panel-header">
        <Dropdown
          trigger="click"
          droplist={
            <Menu onClickMenuItem={(key) => handleModelSelect(key)}>
              {availableModels.map((m) => (
                <Menu.Item key={m.key}>{m.label}</Menu.Item>
              ))}
            </Menu>
          }
        >
          <button className="chat-model-btn">
            <span>{availableModels.find((m) => m.key === model)?.label ?? model}</span>
            <IconDown className="tw-text-xs" />
          </button>
        </Dropdown>
        <div className="chat-panel-header-actions">
          <Tooltip content="新建对话" mini><button className="chat-panel-header-btn" onClick={() => setMessages([])}><IconPlus /></button></Tooltip>
          <Tooltip content="历史记录" mini><button className="chat-panel-header-btn" onClick={() => {}}><IconHistory /></button></Tooltip>
          <Tooltip content="关闭" mini><button className="chat-panel-header-btn" onClick={onClose}><IconClose /></button></Tooltip>
        </div>
      </div>
      <div className="chat-panel-body">
        {messages.length === 0 ? (
          <div className="tw-flex-1 tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-8">
            {configChecked && aiConfig && !checkAIConfig().valid ? (
              <div className="chat-config-warning">
                <IconSettings style={{ fontSize: 48, color: 'var(--color-warning)', marginBottom: 16 }} />
                <div className="chat-config-warning-title">AI 配置不完整</div>
                <div className="chat-config-warning-desc">{checkAIConfig().message}</div>
                <Button 
                  type="primary" 
                  icon={<IconSettings />}
                  onClick={goToSettings}
                  className="chat-config-warning-btn"
                >
                  前往设置
                </Button>
              </div>
            ) : (
              <Empty description="开始新的对话" />
            )}
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
                {msg.role === 'user' && (
                  <div className="chat-message-with-avatar">
                    <Avatar 
                      size={28} 
                      className="tw-flex-shrink-0"
                      style={{ 
                        backgroundColor: userProfile.avatarUrl ? 'transparent' : '#206CCF', 
                        fontSize: 12,
                        overflow: 'hidden',
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
                    </Avatar>
                    <div className="chat-message-bubble">{msg.content}</div>
                    <div className="chat-message-actions">
                      <Tooltip content="重新生成" mini><button className="chat-message-action-btn"><IconRefresh /></button></Tooltip>
                      <Tooltip content="编辑" mini><button className="chat-message-action-btn"><IconEdit /></button></Tooltip>
                      <Tooltip content="复制" mini><button className="chat-message-action-btn"><IconCopy /></button></Tooltip>
                      <Tooltip content="删除" mini><button className="chat-message-action-btn"><IconDelete /></button></Tooltip>
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="chat-message-with-avatar tw-items-start">
                    <span className="chat-message-model-label">{availableModels.find((m) => m.key === model)?.label ?? model}</span>
                    <div className="chat-message-blocks">
                      {msg.blocks?.map((block) => renderMessageBlock(block, msg.id))}
                    </div>
                    {msg.content && (
                      <div className="chat-message-bubble">{msg.content}</div>
                    )}
                    <div className="chat-message-actions">
                      <Tooltip content="重新生成" mini><button className="chat-message-action-btn"><IconRefresh /></button></Tooltip>
                      <Tooltip content="编辑" mini><button className="chat-message-action-btn"><IconEdit /></button></Tooltip>
                      <Tooltip content="复制" mini><button className="chat-message-action-btn"><IconCopy /></button></Tooltip>
                      <Tooltip content="翻译" mini><button className="chat-message-action-btn"><IconTranslate /></button></Tooltip>
                      <Tooltip content="保存到笔记" mini><button className="chat-message-action-btn"><IconSave /></button></Tooltip>
                      <Tooltip content="删除" mini><button className="chat-message-action-btn"><IconDelete /></button></Tooltip>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="chat-input-resize-handle" onMouseDown={onDragStart} />
      <div className="chat-input-area" style={{ height: inputHeight }}>
        {/* 已选文件列表 */}
        {selectedFiles.length > 0 && (
          <div className="chat-file-list">
            <div className="chat-file-list-header">
              <span className="chat-file-list-title">
                已选择 {selectedFiles.length}/{MAX_FILES} 个文件
              </span>
              <button
                className="chat-file-list-clear"
                onClick={clearAllFiles}
                aria-label="清空所有文件"
              >
                清空
              </button>
            </div>
            <div className="chat-file-list-content">
              {selectedFiles.map((file) => (
                <Tag
                  key={file.id}
                  className="chat-file-tag"
                  closable
                  icon={getFileIcon(file.type, file.name)}
                  onClose={() => removeFile(file.id)}
                  aria-label={`${file.name} (${formatFileSize(file.size)})`}
                >
                  <Tooltip content={`${file.name} (${formatFileSize(file.size)})`} mini>
                    <span className="chat-file-tag-text">{file.name}</span>
                  </Tooltip>
                </Tag>
              ))}
            </div>
          </div>
        )}
        <textarea
          className="chat-textarea"
          placeholder={selectedFiles.length > 0 ? "添加消息描述（可选）..." : "发送消息..."}
          aria-label="消息输入框，按 Enter 发送"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isGenerating}
        />
        <div className="chat-toolbar">
          <div className="chat-toolbar-left">
            <Dropdown
              trigger="click"
              position="tl"
              droplist={
                <Menu onClickMenuItem={(key) => handleModeChange(key)}>
                  {modes.map((m) => (
                    <Menu.Item 
                      key={m.key} 
                      disabled={m.key === 'agent' && !agentModeEnabled}
                    >
                      <span className="chat-mode-menu-item">
                        {m.icon}
                        <span>{m.label}</span>
                        {m.key === 'agent' && !agentModeEnabled && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-3)' }}>
                            (已禁用)
                          </span>
                        )}
                      </span>
                    </Menu.Item>
                  ))}
                </Menu>
              }
            >
              <button 
                className="chat-mode-btn" 
                disabled={!agentModeEnabled && mode === 'agent'}
                title={!agentModeEnabled && mode === 'agent' ? 'Agent 模式已在设置中禁用' : ''}
              >
                {currentMode.icon}
                <span>{currentMode.label}</span>
              </button>
            </Dropdown>
            <Tooltip content="上传文件" mini>
              <button
                className="chat-toolbar-btn chat-toolbar-btn-dark"
                onClick={handleFileSelect}
                aria-label="上传文件"
                disabled={selectedFiles.length >= MAX_FILES || isGenerating}
              >
                <IconFile aria-hidden="true" />
              </button>
            </Tooltip>
            <button className="chat-toolbar-btn chat-toolbar-btn-dark" aria-label="@提及"><IconAt aria-hidden="true" /></button>
          </div>
          <div className="chat-toolbar-right">
            <button
              className={`chat-toolbar-btn${reasoning ? ' chat-toolbar-btn-active' : ''}`}
              onClick={() => setReasoning(!reasoning)}
              title="推理模式"
              aria-label={reasoning ? '关闭推理模式' : '开启推理模式'}
              aria-pressed={reasoning}
            >
              <IconBulb aria-hidden="true" />
            </button>
            <button className="chat-toolbar-btn" title="工具" aria-label="工具">
              <IconTool aria-hidden="true" />
            </button>
            <button
              className={`chat-send-btn${isGenerating ? ' chat-send-btn-stop' : (!text.trim() && selectedFiles.length === 0 ? ' chat-send-btn-disabled' : '')}`}
              onClick={() => isGenerating ? stopGeneration() : sendMessage()}
              disabled={!isGenerating && !text.trim() && selectedFiles.length === 0}
              title={isGenerating ? '停止生成' : '发送消息'}
              aria-label={isGenerating ? '停止生成' : '发送消息'}
            >
              {isGenerating ? <IconRecordStop /> : <IconArrowUp />}
            </button>
          </div>
        </div>
      </div>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        aria-label="文件选择输入"
      />
    </div>
  );
};

export default ChatPanel;
