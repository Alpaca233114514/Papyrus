import { useState, useRef, useCallback, useEffect } from 'react';
import { Dropdown, Menu, Avatar, Tooltip, Empty, Message as ArcoMessage, Tag, Button, Trigger } from '@arco-design/web-react';
import { IconArrowUp, IconAt, IconFile, IconMessage, IconDown, IconBulb, IconRecordStop, IconTool, IconRefresh, IconEdit, IconCopy, IconDelete, IconTranslate, IconSave, IconPlus, IconHistory, IconClose, IconImage, IconFilePdf } from '@arco-design/web-react/icon';
import IconAgentMode from './icons/IconAgentMode';
import { ReasoningChain } from './components/ReasoningChain';
import { ToolCallCard } from './components/ToolCallCard';
import type { AIConfig, ProviderModel } from './types/ai';
import { getAuthToken, BASE, api } from './api';
import type { ChatSession } from './api';
import { MarkdownView } from './components/MarkdownView';
import { ToolsCatalogPopover } from './components/ToolsCatalogPopover';
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
  toolCallId?: string;
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
  model?: string;
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
  } catch (err) {
    console.error('Failed to load user profile from localStorage:', err);
  }
  return { userId: '', avatarUrl: null };
};

function stripMdTitle(source: string): string {
  return source
    .replace(/^[#\>\-*\s]+/gm, '')
    .replace(/[*_`~]+/g, '')
    .split('\n')[0]
    .trim();
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAuthToken();
  const hasBody = init?.body !== undefined;
  return fetch(`${BASE}${url}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'X-Papyrus-Token': token } : {}),
      ...(init?.headers as Record<string, string> || {}),
    },
  });
}

const ChatPanel = ({ open, width = 320, onClose }: ChatPanelProps) => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState('agent');
  const [model, setModel] = useState('');
  const [reasoning, setReasoning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputHeight, setInputHeight] = useState(118);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [configChecked, setConfigChecked] = useState(false);
  const [agentModeEnabled, setAgentModeEnabled] = useState<boolean>(loadAgentModeEnabled());
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textOverrideRef = useRef<string | null>(null);
  const availableModelsRef = useRef<ProviderModel[]>([]);
  const modelRef = useRef<string>('');

  // 保持 ref 与 state 同步，避免 useCallback 依赖循环
  useEffect(() => {
    availableModelsRef.current = availableModels;
  }, [availableModels]);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

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

  // 串行初始化 AI 配置和模型列表，消除竞态和循环
  const initializeChatConfig = useCallback(async () => {
    // 先加载 providers，确保 availableModels 就绪
    let models: ProviderModel[] = [];
    try {
      const response = await authFetch('/providers');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.providers) {
          for (const provider of data.providers) {
            if (!provider.enabled) continue;
            for (const m of provider.models) {
              if (!m.enabled) continue;
              models.push({
                key: `${provider.type}:${m.modelId}`,
                label: m.name,
                providerId: provider.id,
                providerType: provider.type,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      ArcoMessage.warning('无法加载模型列表，请检查后端连接');
    }

    // 使用 ref 获取最新值，避免 stale closure
    const prevModels = availableModelsRef.current;

    // 如果新加载的 models 为空但旧值非空，保留旧值（防止选择框"消失"）
    if (models.length === 0 && prevModels.length > 0) {
      console.warn('Provider 列表返回为空，保留之前的模型列表');
    } else if (models.length > 0) {
      setAvailableModels(models);
    } else if (prevModels.length === 0) {
      setAvailableModels([]);
    }

    // 再加载 AI config，此时可用 models 已就绪
    try {
      const response = await authFetch('/config/ai');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setAiConfig(data.config);
          const configuredModel = data.config.current_model;
          // 只在配置的 model 存在于可用列表中时才更新，避免覆盖当前选择
          const currentModels = models.length > 0 ? models : prevModels;
          const currentModelRef = modelRef.current;
          const configuredCompositeKey = configuredModel
            ? currentModels.find((m) => m.key.endsWith(`:${configuredModel}`))?.key
            : undefined;
          if (configuredCompositeKey && currentModels.some((m) => m.key === configuredCompositeKey)) {
            setModel(configuredCompositeKey);
          } else if (currentModels.length > 0 && !currentModelRef) {
            setModel(currentModels[0].key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    } finally {
      setConfigChecked(true);
    }
  }, []);

  // 组件挂载时加载配置和模型列表
  useEffect(() => {
    if (open) {
      initializeChatConfig();
    }
  }, [open, initializeChatConfig]);

  // 初始化会话：当面板打开且没有当前会话时，创建新会话
  useEffect(() => {
    if (open && !currentSessionId) {
      authFetch('/sessions', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.session) {
            setCurrentSessionId(data.session.id);
          }
        })
        .catch(() => { /* ignore */ });
    }
  }, [open, currentSessionId]);

  // 监听设置页 AI 配置变化，实时刷新
  useEffect(() => {
    const handleConfigChange = () => {
      initializeChatConfig();
    };
    window.addEventListener('papyrus_ai_config_changed', handleConfigChange);
    return () => window.removeEventListener('papyrus_ai_config_changed', handleConfigChange);
  }, [initializeChatConfig]);

  // 滚动到底部（仅当用户在底部附近时自动滚动，避免打断阅读）
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, []);

  // 消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 组件卸载时中止进行中的 SSE 流
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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
        // 检查是否已取消，避免继续解析已缓冲的数据
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

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
                const msgIndex = prev.findIndex((m) => m.id === messageId);
                if (msgIndex === -1) return prev;

                const lastMsg = prev[msgIndex]!;
                let newBlocks = lastMsg.blocks ? [...lastMsg.blocks] : [];
                let newContent = lastMsg.content;

                switch (event.type) {
                  case 'text':
                    newContent += event.data;
                    break;

                  case 'reasoning': {
                    const reasoningIndex = newBlocks.findIndex(
                      (b) => b.type === 'reasoning'
                    );
                    if (reasoningIndex !== -1) {
                      newBlocks = newBlocks.map((b, idx) =>
                        idx === reasoningIndex
                          ? { ...b, content: (b.content || '') + event.data }
                          : b
                      );
                    } else {
                      newBlocks = [
                        ...newBlocks,
                        { type: 'reasoning' as const, content: event.data },
                      ];
                    }
                    break;
                  }

                  case 'tool_call':
                    newBlocks = [
                      ...newBlocks,
                      {
                        type: 'tool_call' as const,
                        toolCallId: event.data.callId || event.data.id || '',
                        toolName: event.data.function?.name || event.data.name || '',
                        toolStatus: 'pending' as const,
                        toolParams: event.data.function?.arguments
                          ? (() => { try { return JSON.parse(event.data.function.arguments); } catch { return {}; } })()
                          : (event.data.params || {}),
                      },
                    ];
                    break;

                  case 'tool_result': {
                    const toolIndex = newBlocks.findIndex(
                      (b) =>
                        b.type === 'tool_call' &&
                        b.toolName === event.data.name &&
                        b.toolStatus === 'pending'
                    );
                    if (toolIndex !== -1) {
                      newBlocks = newBlocks.map((b, idx) =>
                        idx === toolIndex
                          ? {
                              ...b,
                              toolStatus: event.data.success
                                ? ('success' as const)
                                : ('failed' as const),
                              toolResult: event.data.result,
                              toolError: event.data.error,
                            }
                          : b
                      );
                    }
                    break;
                  }

                  case 'done': {
                    const toolPattern = /```json\s*(\{[\s\S]*?"tool"[\s\S]*?\})\s*```/g;
                    let match = toolPattern.exec(newContent);
                    while (match !== null) {
                      try {
                        const parsed = JSON.parse(match[1]) as unknown;
                        if (parsed !== null && typeof parsed === 'object') {
                          const obj = parsed as Record<string, unknown>;
                          if (typeof obj.tool === 'string' && typeof obj.params === 'object' && obj.params !== null) {
                            newBlocks = [
                              ...newBlocks,
                              {
                                type: 'tool_call' as const,
                                toolCallId: '',
                                toolName: obj.tool,
                                toolStatus: 'pending' as const,
                                toolParams: obj.params as Record<string, unknown>,
                              },
                            ];
                            newContent = newContent.replace(match[0], '');
                          }
                        }
                      } catch {
                        // ignore malformed JSON
                      }
                      match = toolPattern.exec(newContent);
                    }
                    break;
                  }

                  case 'error': {
                    const errorData = event.data;
                    const errorMsg =
                      typeof errorData === 'string'
                        ? errorData
                        : errorData?.message || '发生错误';
                    ArcoMessage.error(errorMsg);
                    // 兜底：将错误信息写入消息气泡，避免空白
                    newContent = '❌ ' + errorMsg;
                    break;
                  }
                }

                const newMessages = [...prev];
                newMessages[msgIndex] = {
                  ...lastMsg,
                  content: newContent,
                  blocks: newBlocks,
                };
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
    const messageFromOverride = textOverrideRef.current;
    if (messageFromOverride !== null) {
      textOverrideRef.current = null;
    }
    const effectiveText = messageFromOverride ?? text;
    const trimmedText = effectiveText.trim();
    if ((!trimmedText && selectedFiles.length === 0) || isGenerating) return;

    // 检查 model 是否已选择
    if (!model) {
      ArcoMessage.error('请先选择 AI 模型');
      return;
    }

    // 保存当前文件列表并清空
    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);

    let messageText = trimmedText;
    const attachments: Array<{ path?: string } | string> = [];

    // 上传文件到后端
    if (filesToUpload.length > 0) {
      const fileNames = filesToUpload.map((f) => `[附件: ${f.name}]`).join(' ');
      messageText = messageText ? `${messageText}\n${fileNames}` : fileNames;

      try {
        const uploadFiles: Array<{ name: string; content: string; mimeType?: string }> = [];
        for (const sf of filesToUpload) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // 提取 base64 部分（去掉 data:xxx;base64, 前缀）
              const idx = result.indexOf('base64,');
              resolve(idx >= 0 ? result.slice(idx + 7) : result);
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(sf.file);
          });
          uploadFiles.push({ name: sf.name, content: base64, mimeType: sf.file.type });
        }

        const uploadRes = await authFetch('/files/upload', {
          method: 'POST',
          body: JSON.stringify({ files: uploadFiles }),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.files) {
            for (const f of uploadData.files) {
              attachments.push({ path: f.id });
            }
          }
        }
      } catch (uploadErr) {
        console.error('File upload failed:', uploadErr);
        const uploadErrorMessage = uploadErr instanceof Error ? uploadErr.message : '文件上传失败';
        ArcoMessage.error(uploadErrorMessage);
        // 继续发送消息，文件信息已拼入 messageText
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
    };

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      blocks: [],
      model,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setText('');
    setIsGenerating(true);

    // 创建 AbortController
    abortControllerRef.current = new AbortController();

    try {
      // 从 composite key 中提取真实的 modelId
      const actualModelId = model.includes(':') ? model.split(':').slice(1).join(':') : model;
      const chatBody: Record<string, unknown> = {
        message: messageText,
        model: actualModelId,
        mode,
        reasoning,
      };
      if (currentSessionId) {
        chatBody.session_id = currentSessionId;
      }
      if (attachments.length > 0) {
        chatBody.attachments = attachments;
      }

      const response = await authFetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errMsg = `HTTP error! status: ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody.error) errMsg = errBody.error;
        } catch { /* ignore parse errors */ }
        throw new Error(errMsg);
      }

      // 检查是否是 SSE 响应
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        await handleSSEStream(response, assistantMessage.id);
      } else {
        // 普通 JSON 响应
        const data = await response.json();
        setMessages((prev) => {
          const msgIndex = prev.findIndex((m) => m.id === assistantMessage.id);
          if (msgIndex === -1) return prev;
          return prev.map((msg, idx) =>
            idx === msgIndex
              ? {
                  ...msg,
                  content: data.content,
                  blocks: data.reasoning
                    ? [
                        ...(msg.blocks || []),
                        { type: 'reasoning' as const, content: data.reasoning },
                      ]
                    : msg.blocks,
                }
              : msg
          );
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
          const lastIndex = prev.length - 1;
          const lastMsg = prev[lastIndex];
          if (lastMsg && lastMsg.role === 'assistant') {
            return prev.map((msg, idx) =>
              idx === lastIndex
                ? { ...msg, content: '❌ ' + errorMessage }
                : msg
            );
          }
          return prev;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [text, isGenerating, model, mode, reasoning, selectedFiles, handleSSEStream]);

  // 停止生成
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  // 处理工具批准
  const handleToolApprove = useCallback((messageId: string, toolName: string, callId?: string) => {
    const cid = callId || `${messageId}-${toolName}`;

    // 乐观更新为执行中
    setMessages((prev) => {
      const msgIndex = prev.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return prev;
      const msg = prev[msgIndex];
      if (!msg || !msg.blocks) return prev;
      const blockIndex = msg.blocks.findIndex(
        (b) => b.type === 'tool_call' && b.toolName === toolName && b.toolStatus === 'pending'
      );
      if (blockIndex === -1) return prev;
      const newBlocks = msg.blocks.map((b, idx) =>
        idx === blockIndex ? { ...b, toolStatus: 'executing' as const } : b
      );
      const newMessages = [...prev];
      newMessages[msgIndex] = { ...msg, blocks: newBlocks };
      return newMessages;
    });

    authFetch(`/tools/approve/${encodeURIComponent(cid)}`, {
      method: 'POST',
    })
      .then(async (response) => {
        if (!response.ok) {
          let errMsg = `HTTP ${response.status}`;
          try {
            const errBody = await response.json();
            if (errBody.error) errMsg = errBody.error;
          } catch { /* ignore parse errors */ }
          throw new Error(errMsg);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || '工具执行失败');
        }
        // 更新为执行成功
        setMessages((prev) => {
          const msgIndex = prev.findIndex((m) => m.id === messageId);
          if (msgIndex === -1) return prev;
          const msg = prev[msgIndex];
          if (!msg || !msg.blocks) return prev;
          const blockIndex = msg.blocks.findIndex(
            (b) => b.type === 'tool_call' && b.toolName === toolName && b.toolStatus === 'executing'
          );
          if (blockIndex === -1) return prev;
          const newBlocks = msg.blocks.map((b, idx) =>
            idx === blockIndex
              ? {
                  ...b,
                  toolStatus: 'success' as const,
                  toolResult: data.result,
                  toolError: undefined,
                }
              : b
          );
          const newMessages = [...prev];
          newMessages[msgIndex] = { ...msg, blocks: newBlocks };
          return newMessages;
        });
      })
      .catch((error) => {
        console.error('Tool approve failed:', error);
        ArcoMessage.error(`工具批准请求失败: ${error instanceof Error ? error.message : String(error)}`);
        // 回滚本地状态
        setMessages((prev) => {
          const msgIndex = prev.findIndex((m) => m.id === messageId);
          if (msgIndex === -1) return prev;
          const msg = prev[msgIndex];
          if (!msg || !msg.blocks) return prev;
          const blockIndex = msg.blocks.findIndex(
            (b) => b.type === 'tool_call' && b.toolName === toolName && b.toolStatus === 'executing'
          );
          if (blockIndex === -1) return prev;
          const newBlocks = msg.blocks.map((b, idx) =>
            idx === blockIndex ? { ...b, toolStatus: 'pending' as const, toolError: undefined } : b
          );
          const newMessages = [...prev];
          newMessages[msgIndex] = { ...msg, blocks: newBlocks };
          return newMessages;
        });
      });
  }, []);

  // 处理工具拒绝
  const handleToolReject = useCallback((messageId: string, toolName: string, callId?: string) => {
    const cid = callId || `${messageId}-${toolName}`;

    // 乐观更新为已拒绝
    setMessages((prev) => {
      const msgIndex = prev.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return prev;
      const msg = prev[msgIndex];
      if (!msg || !msg.blocks) return prev;
      const blockIndex = msg.blocks.findIndex(
        (b) => b.type === 'tool_call' && b.toolName === toolName && b.toolStatus === 'pending'
      );
      if (blockIndex === -1) return prev;
      const newBlocks = msg.blocks.map((b, idx) =>
        idx === blockIndex
          ? { ...b, toolStatus: 'failed' as const, toolError: '用户拒绝了工具调用' }
          : b
      );
      const newMessages = [...prev];
      newMessages[msgIndex] = { ...msg, blocks: newBlocks };
      return newMessages;
    });

    authFetch(`/tools/reject/${encodeURIComponent(cid)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: '用户拒绝执行' }),
    })
      .then(async (response) => {
        if (!response.ok) {
          let errMsg = `HTTP ${response.status}`;
          try {
            const errBody = await response.json();
            if (errBody.error) errMsg = errBody.error;
          } catch { /* ignore parse errors */ }
          throw new Error(errMsg);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || '工具拒绝失败');
        }
        // 成功：UI 已显示 failed，无需额外操作
      })
      .catch((error) => {
        console.error('Tool reject failed:', error);
        ArcoMessage.error(`工具拒绝请求失败: ${error instanceof Error ? error.message : String(error)}`);
        // 回滚本地状态
        setMessages((prev) => {
          const msgIndex = prev.findIndex((m) => m.id === messageId);
          if (msgIndex === -1) return prev;
          const msg = prev[msgIndex];
          if (!msg || !msg.blocks) return prev;
          const blockIndex = msg.blocks.findIndex(
            (b) => b.type === 'tool_call' && b.toolName === toolName && b.toolStatus === 'failed'
          );
          if (blockIndex === -1) return prev;
          const newBlocks = msg.blocks.map((b, idx) =>
            idx === blockIndex ? { ...b, toolStatus: 'pending' as const, toolError: undefined } : b
          );
          const newMessages = [...prev];
          newMessages[msgIndex] = { ...msg, blocks: newBlocks };
          return newMessages;
        });
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
            onApprove={() => handleToolApprove(messageId, block.toolName || '', block.toolCallId)}
            onReject={() => handleToolReject(messageId, block.toolName || '', block.toolCallId)}
            expanded={block.toolStatus === 'pending' || block.toolStatus === 'executing' || block.toolStatus === 'failed'}
          />
        );

      default:
        return null;
    }
  };

  const dragActiveRef = useRef(false);
  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = inputHeight;
    dragActiveRef.current = true;
    const cleanup = () => {
      dragActiveRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
    const onMove = (ev: MouseEvent) => {
      const delta = dragStartY.current - ev.clientY;
      setInputHeight(Math.min(400, Math.max(118, dragStartHeight.current + delta)));
    };
    const onUp = () => cleanup();
    const onLeave = () => cleanup();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);
  }, [inputHeight]);

  // 卸载时清理拖拽监听器
  useEffect(() => {
    return () => {
      if (dragActiveRef.current) {
        dragActiveRef.current = false;
      }
    };
  }, []);

  if (!open) return null;

  const currentMode = modes.find((m) => m.key === mode) ?? modes[0]!;
  
  // 加载会话列表
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await authFetch('/sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // 切换会话并加载历史消息
  const switchSession = useCallback(async (sessionId: string) => {
    try {
      const res = await authFetch(`/sessions/${sessionId}/switch`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        ArcoMessage.error(data.error || '切换会话失败');
        return;
      }
      // 加载会话消息
      const msgRes = await authFetch(`/sessions/${sessionId}/messages`);
      if (msgRes.ok) {
        const data = await msgRes.json();
        if (data.success && data.session) {
          const loadedMessages: Message[] = data.session.messages.map((m: { role: string; content: string }, index: number) => ({
            id: `${sessionId}-${index}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            model: m.role === 'assistant' ? model : undefined,
          }));
          setMessages(loadedMessages);
          setCurrentSessionId(sessionId);
        }
      }
    } catch (err) {
      console.error('Failed to switch session:', err);
      ArcoMessage.error('切换会话失败');
    }
  }, [model]);

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
    if (isGenerating) {
      abortControllerRef.current?.abort();
      setIsGenerating(false);
    }
    const selected = availableModels.find((m) => m.key === key);
    if (!selected) return;

    // 如果 aiConfig 尚未加载，只更新本地状态，跳过保存
    if (!aiConfig) {
      console.warn('AI 配置尚未加载，模型选择仅在本地生效');
      return;
    }

    // 从 composite key 中提取真实 modelId
    const actualModelId = key.includes(':') ? key.split(':').slice(1).join(':') : key;

    // Provider 配置仅通过 /api/providers 管理，此处只同步 current_provider / current_model
    const updatedConfig = {
      current_provider: selected.providerType,
      current_model: actualModelId,
    };

    try {
      await authFetch('/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      window.dispatchEvent(new CustomEvent('papyrus_ai_config_changed'));
    } catch (error) {
      console.error('Failed to update AI config:', error);
    }
  };

  return (
    <div className="chat-panel" style={{ width }}>
      <div className="chat-panel-header">
        <Dropdown
          trigger="click"
          disabled={availableModels.length === 0}
          droplist={
            <Menu className="chat-model-menu" onClickMenuItem={(key) => handleModelSelect(key)}>
              {availableModels.length === 0 ? (
                <Menu.Item key="_empty" disabled>
                  {configChecked ? '暂无可用模型' : '正在加载模型...'}
                </Menu.Item>
              ) : (
                availableModels.map((m) => (
                  <Menu.Item key={m.key}>{m.label}</Menu.Item>
                ))
              )}
            </Menu>
          }
        >
          <button className="chat-model-btn" disabled={availableModels.length === 0}>
            <span>{(availableModels.find((m) => m.key === model)?.label ?? (model?.includes(':') ? model.split(':').slice(1).join(':') : model)) || '选择模型'}</span>
            <IconDown className="tw-text-xs" />
          </button>
        </Dropdown>
        <div className="chat-panel-header-actions">
          <Tooltip content="新建对话" mini><button className="chat-panel-header-btn" aria-label="新建对话" onClick={async () => { setMessages([]); try { const res = await authFetch('/sessions', { method: 'POST' }); const data = await res.json(); if (data.success && data.session) { setCurrentSessionId(data.session.id); } } catch { /* ignore */ } }}><IconPlus /></button></Tooltip>
          <Dropdown
            trigger="click"
            droplist={
              sessionsLoading ? (
                <Menu>
                  <Menu.Item key="loading">加载中...</Menu.Item>
                </Menu>
              ) : sessions.length === 0 ? (
                <Menu>
                  <Menu.Item key="empty">暂无历史会话</Menu.Item>
                </Menu>
              ) : (
                <Menu className="chat-session-menu">
                  {sessions.map((session) => (
                    <Menu.Item key={session.id} onClick={() => switchSession(session.id)}>
                      <div className="chat-session-item">
                        <span className="chat-session-title">{session.title}</span>
                        <span className="chat-session-meta">
                          {new Date(session.updated_at * 1000).toLocaleString('zh-CN')} · {session.message_count} 条消息
                        </span>
                      </div>
                    </Menu.Item>
                  ))}
                </Menu>
              )
            }
          >
            <Tooltip content="历史记录" mini>
              <button className="chat-panel-header-btn" aria-label="历史记录" onClick={() => { if (sessions.length === 0) loadSessions(); }}><IconHistory /></button>
            </Tooltip>
          </Dropdown>
          <Tooltip content="关闭" mini><button className="chat-panel-header-btn" aria-label="关闭" onClick={onClose}><IconClose /></button></Tooltip>
        </div>
      </div>
      <div className="chat-panel-body" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="tw-flex-1 tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-8">
            <Empty description="开始新的对话" />
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
                {msg.role === 'user' && (
                  <div className="chat-message-with-avatar">
                    <Avatar
                      size={28}
                      className="tw-flex-shrink-0 chat-user-avatar"
                      style={{
                        backgroundColor: userProfile.avatarUrl ? 'transparent' : '#206CCF',
                      }}
                    >
                      {userProfile.avatarUrl ? (
                        <img
                          src={userProfile.avatarUrl}
                          alt="avatar"
                          className="chat-user-avatar-img"
                        />
                      ) : (
                        userProfile.userId?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </Avatar>
                    {editingMessageId === msg.id ? (
                      <div className="chat-message-bubble chat-edit-bubble">
                        <textarea
                          className="chat-textarea chat-edit-textarea-user"
                          value={editingDraft}
                          onChange={(e) => setEditingDraft(e.target.value)}
                          autoFocus
                          rows={3}
                          aria-label="编辑消息"
                        />
                        <div className="chat-edit-actions">
                          <Button size="mini" onClick={() => setEditingMessageId(null)}>取消</Button>
                          <Button size="mini" type="primary" onClick={() => {
                            const msgIndex = messages.findIndex((m) => m.id === msg.id);
                            setMessages((prev) => prev.slice(0, msgIndex));
                            textOverrideRef.current = editingDraft;
                            setEditingMessageId(null);
                            sendMessage();
                          }}>保存</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="chat-message-bubble"><MarkdownView source={msg.content} compact /></div>
                    )}
                    <div className="chat-message-actions">
                      <Tooltip content="重新生成" mini><button className="chat-message-action-btn" aria-label="重新生成" disabled={isGenerating} onClick={() => {
                        const msgIndex = messages.findIndex((m) => m.id === msg.id);
                        if (msgIndex < messages.length - 1 && messages[msgIndex + 1]?.role === 'assistant') {
                          setMessages((prev) => prev.slice(0, msgIndex + 1));
                        }
                        textOverrideRef.current = msg.content;
                        sendMessage();
                      }}><IconRefresh /></button></Tooltip>
                      <Tooltip content="编辑" mini><button className="chat-message-action-btn" aria-label="编辑" disabled={isGenerating} onClick={() => { setEditingMessageId(msg.id); setEditingDraft(msg.content); }}><IconEdit /></button></Tooltip>
                      <Tooltip content="复制" mini><button className="chat-message-action-btn" aria-label="复制" disabled={isGenerating} onClick={() => {
                        navigator.clipboard.writeText(msg.content).then(() => ArcoMessage.success('已复制'), () => ArcoMessage.error('复制失败'));
                      }}><IconCopy /></button></Tooltip>
                      <Tooltip content="删除" mini><button className="chat-message-action-btn" aria-label="删除" disabled={isGenerating} onClick={() => setMessages((prev) => prev.filter((m) => m.id !== msg.id))}><IconDelete /></button></Tooltip>
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="chat-message-with-avatar tw-items-start">
                    <span className="chat-message-model-label">{availableModels.find((m) => m.key === msg.model)?.label ?? (msg.model?.includes(':') ? msg.model.split(':').slice(1).join(':') : msg.model) ?? (model?.includes(':') ? model.split(':').slice(1).join(':') : model)}</span>
                    <div className="chat-message-blocks">
                      {msg.blocks?.map((block) => renderMessageBlock(block, msg.id))}
                    </div>
                    {editingMessageId === msg.id ? (
                      <div className="chat-message-bubble chat-edit-bubble">
                        <textarea
                          className="chat-textarea chat-edit-textarea-assistant"
                          value={editingDraft}
                          onChange={(e) => setEditingDraft(e.target.value)}
                          autoFocus
                          rows={5}
                          aria-label="编辑消息"
                        />
                        <div className="chat-edit-actions">
                          <Button size="mini" onClick={() => setEditingMessageId(null)}>取消</Button>
                          <Button size="mini" type="primary" onClick={() => {
                            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: editingDraft } : m));
                            setEditingMessageId(null);
                          }}>保存</Button>
                        </div>
                      </div>
                    ) : (
                      msg.content && <div className="chat-message-bubble"><MarkdownView source={msg.content} compact /></div>
                    )}
                    <div className="chat-message-actions">
                      <Tooltip content="重新生成" mini><button className="chat-message-action-btn" aria-label="重新生成" disabled={isGenerating} onClick={() => {
                        const msgIndex = messages.findIndex((m) => m.id === msg.id);
                        if (msgIndex > 0 && messages[msgIndex - 1].role === 'user') {
                          setMessages((prev) => prev.slice(0, msgIndex));
                          textOverrideRef.current = messages[msgIndex - 1].content;
                          sendMessage();
                        }
                      }}><IconRefresh /></button></Tooltip>
                      <Tooltip content="编辑" mini><button className="chat-message-action-btn" aria-label="编辑" disabled={isGenerating} onClick={() => { setEditingMessageId(msg.id); setEditingDraft(msg.content); }}><IconEdit /></button></Tooltip>
                      <Tooltip content="复制" mini><button className="chat-message-action-btn" aria-label="复制" disabled={isGenerating} onClick={() => {
                        navigator.clipboard.writeText(msg.content).then(() => ArcoMessage.success('已复制'), () => ArcoMessage.error('复制失败'));
                      }}><IconCopy /></button></Tooltip>
                      <Tooltip content="翻译" mini><button className="chat-message-action-btn" aria-label="翻译" disabled={isGenerating} onClick={() => {
                        textOverrideRef.current = '请翻译以下内容为简体中文（如已是中文则翻译为英文），保留原 markdown 结构：\n\n' + msg.content;
                        sendMessage();
                      }}><IconTranslate /></button></Tooltip>
                      <Tooltip content="保存到笔记" mini><button className="chat-message-action-btn" aria-label="保存到笔记" disabled={isGenerating} onClick={() => {
                        const msgIndex = messages.findIndex((m) => m.id === msg.id);
                        const userMsg = msgIndex > 0 && messages[msgIndex - 1]?.role === 'user' ? messages[msgIndex - 1] : null;
                        const noteContent = userMsg ? `> **用户：** ${userMsg.content}\n\n${msg.content}` : msg.content;
                        const title = stripMdTitle(msg.content).slice(0, 30) || '未命名 AI 回复';
                        api.createNote(title, 'AI 对话', noteContent, ['ai-chat']).then(() => ArcoMessage.success('已保存到笔记'), () => ArcoMessage.error('保存失败'));
                      }}><IconSave /></button></Tooltip>
                      <Tooltip content="删除" mini><button className="chat-message-action-btn" aria-label="删除" disabled={isGenerating} onClick={() => setMessages((prev) => prev.filter((m) => m.id !== msg.id))}><IconDelete /></button></Tooltip>
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
      <div className="chat-input-area" style={{ minHeight: inputHeight, height: 'auto' }}>
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
          placeholder={!configChecked ? "正在加载配置..." : (selectedFiles.length > 0 ? "添加消息描述（可选）..." : "发送消息...")}
          aria-label="消息输入框，按 Enter 发送"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isGenerating || !configChecked}
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
                          <span className="chat-mode-menu-item-disabled">
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
                className="chat-toolbar-btn chat-mode-btn"
                disabled={!agentModeEnabled && mode === 'agent'}
                aria-label={`当前模式：${currentMode.label}`}
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
            <Trigger
              trigger="click"
              popup={() => <ToolsCatalogPopover />}
              disabled={mode !== 'agent'}
            >
              <Tooltip content={mode === 'agent' ? '工具列表' : '切换到 Agent 模式以查看工具'} mini>
                <button
                  className={`chat-toolbar-btn${mode !== 'agent' ? ' chat-toolbar-btn-disabled' : ''}`}
                  title="工具"
                  aria-label="工具"
                  disabled={mode !== 'agent'}
                >
                  <IconTool aria-hidden="true" />
                </button>
              </Tooltip>
            </Trigger>
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
