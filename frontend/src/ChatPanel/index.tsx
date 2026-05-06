import { useState, useRef, useCallback, useEffect } from 'react';
import { Message as ArcoMessage } from '@arco-design/web-react';
import { ChatHistory } from '../components/ChatHistory';
import { useModelSelector } from '../hooks/useModelSelector';
import type { ChatPanelProps, Message, UserProfile } from './types';
import {
  loadAgentModeEnabled,
  loadUserProfile,
  loadStoredSessionId,
  persistSessionId,
  hydrateMessagesForSession,
  authFetch,
  ALLOWED_FILE_TYPES,
} from './utils';
import { useFileHandler } from './hooks/useFileHandler';
import { useChatSession } from './hooks/useChatSession';
import { useChatActions } from './hooks/useChatActions';
import {
  ChatHeader,
  MessageList,
  ChatInput,
} from './components';
import '../ChatPanel.css';

const ChatPanel = ({ open, width = 320, onClose }: ChatPanelProps) => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState('agent');
  const [reasoning, setReasoning] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [agentModeEnabled, setAgentModeEnabled] = useState<boolean>(loadAgentModeEnabled());
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [inputHeight, setInputHeight] = useState(118);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textOverrideRef = useRef<string | null>(null);

  const {
    models,
    selectedModelId: model,
    selectedModel,
    loading: modelLoading,
    configChecked,
    selectModel,
    refreshModels,
  } = useModelSelector();

  const availableModels = models.map((m) => ({
    key: m.id,
    label: m.name,
  }));

  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    setCurrentSessionId,
    loadSessions,
    createNewSession,
    clearAllSessions,
    switchSession,
  } = useChatSession(open);

  const fileHandler = useFileHandler();

  const {
    isGenerating,
    sendMessage,
    stopGeneration,
    handleToolApprove,
    handleToolReject,
  } = useChatActions({
    selectedModel,
    mode,
    reasoning,
    currentSessionId,
    text,
    selectedFiles: fileHandler.selectedFiles,
    isGenerating: false,
    setText,
    setMessages,
    setIsGenerating: () => {},
    messages,
  });

  useEffect(() => {
    persistSessionId(currentSessionId);
  }, [currentSessionId]);

  useEffect(() => {
    const handleStorageChange = () => {
      setUserProfile(loadUserProfile());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('papyrus_user_profile_changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('papyrus_user_profile_changed', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!agentModeEnabled && mode === 'agent') {
      setMode('chat');
    }
  }, []);

  useEffect(() => {
    const handleAgentModeChange = (e?: CustomEvent) => {
      let enabled: boolean;
      if (e?.detail && typeof e.detail.agentModeEnabled === 'boolean') {
        enabled = e.detail.agentModeEnabled;
      } else {
        enabled = loadAgentModeEnabled();
      }
      setAgentModeEnabled(enabled);
      if (!enabled && mode === 'agent') {
        setMode('chat');
      }
    };

    window.addEventListener('papyrus_agent_settings_changed', handleAgentModeChange as EventListener);
    const storageHandler = () => handleAgentModeChange();
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener('papyrus_agent_settings_changed', handleAgentModeChange as EventListener);
      window.removeEventListener('storage', storageHandler);
    };
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const listRes = await import('../api').then(m => m.api.listChatSessions());
        if (cancelled || !listRes.success) return;
        const sessionsList = listRes.sessions;
        const stored = loadStoredSessionId();
        const storedValid = stored && sessionsList.some((s: { id: string }) => s.id === stored);
        if (storedValid) {
          const restored = await hydrateMessagesForSession(stored);
          if (cancelled) return;
          setMessages(restored);
          setCurrentSessionId(stored);
          return;
        }
        if (listRes.activeSessionId && sessionsList.some((s: { id: string }) => s.id === listRes.activeSessionId)) {
          const activeId = listRes.activeSessionId;
          const restored = await hydrateMessagesForSession(activeId);
          if (cancelled) return;
          setMessages(restored);
          setCurrentSessionId(activeId);
          return;
        }
        const createRes = await import('../api').then(m => m.api.createChatSession());
        if (cancelled || !createRes.success) return;
        setMessages([]);
        setCurrentSessionId(createRes.session.id);
      } catch (err) {
        if (!cancelled) console.error('Failed to initialize chat session:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const handleConfigChange = () => {
      refreshModels();
    };
    window.addEventListener('papyrus_ai_config_changed', handleConfigChange);
    return () => window.removeEventListener('papyrus_ai_config_changed', handleConfigChange);
  }, [refreshModels]);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleModeChange = (newMode: string) => {
    if (newMode === 'agent' && !agentModeEnabled) {
      ArcoMessage.warning('请在设置中启用 Agent 模式');
      return;
    }
    setMode(newMode);
  };

  const handleModelSelect = async (modelId: string) => {
    await selectModel(modelId);
  };

  const handleTextOverride = (text: string) => {
    textOverrideRef.current = text;
  };

  const handleSendMessage = useCallback(async () => {
    const messageFromOverride = textOverrideRef.current;
    if (messageFromOverride !== null) {
      textOverrideRef.current = null;
    }
    const effectiveText = messageFromOverride ?? text;
    const trimmedText = effectiveText.trim();
    if (!trimmedText && fileHandler.selectedFiles.length === 0) return;

    if (!selectedModel) {
      ArcoMessage.error('请先选择 AI 模型');
      return;
    }

    const filesToUpload = [...fileHandler.selectedFiles];
    fileHandler.setSelectedFiles([]);

    let messageText = trimmedText;
    const attachments: Array<{ path?: string } | string> = [];

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
        ArcoMessage.error(uploadErr instanceof Error ? uploadErr.message : '文件上传失败');
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
      model: selectedModel.modelId,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setText('');
  }, [text, selectedModel, fileHandler]);

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

  useEffect(() => {
    return () => {
      if (dragActiveRef.current) {
        dragActiveRef.current = false;
      }
    };
  }, []);

  return (
    <div className="chat-panel" style={{ width }}>
      <ChatHeader
        selectedModel={selectedModel}
        availableModels={availableModels}
        modelLoading={modelLoading}
        configChecked={configChecked}
        onModelSelect={handleModelSelect}
        onNewChat={createNewSession}
        onHistoryClick={() => setHistoryDrawerVisible(true)}
        onClose={onClose || (() => {})}
      />
      <ChatHistory
        visible={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
        currentSessionId={currentSessionId}
        sessions={sessions}
        loading={sessionsLoading}
        onRefresh={loadSessions}
        onSwitchSession={switchSession}
        onCreateSession={createNewSession}
        onClearAll={clearAllSessions}
      />
      <div className="chat-panel-body" ref={messagesContainerRef}>
        <MessageList
          messages={messages}
          userProfile={userProfile}
          selectedModel={selectedModel}
          isGenerating={false}
          editingMessageId={editingMessageId}
          editingDraft={editingDraft}
          onMessagesChange={setMessages}
          onEditingMessageIdChange={setEditingMessageId}
          onEditingDraftChange={setEditingDraft}
          onSendMessage={handleSendMessage}
          onTextOverride={handleTextOverride}
          onToolApprove={handleToolApprove}
          onToolReject={handleToolReject}
          messagesEndRef={messagesEndRef}
        />
      </div>
      <div className="chat-input-resize-handle" onMouseDown={onDragStart} />
      <ChatInput
        text={text}
        setText={setText}
        selectedFiles={fileHandler.selectedFiles}
        isGenerating={false}
        configChecked={configChecked}
        mode={mode}
        reasoning={reasoning}
        agentModeEnabled={agentModeEnabled}
        onFilesChange={fileHandler.setSelectedFiles}
        onFileSelect={fileHandler.handleFileSelect}
        onSendMessage={handleSendMessage}
        onStopGeneration={stopGeneration}
        onModeChange={handleModeChange}
        onReasoningChange={setReasoning}
        fileInputRef={fileHandler.fileInputRef}
        onFileInputChange={fileHandler.handleFileInputChange}
        getFileIcon={fileHandler.getFileIcon}
        formatFileSize={fileHandler.formatFileSize}
        removeFile={fileHandler.removeFile}
        clearAllFiles={fileHandler.clearAllFiles}
      />
    </div>
  );
};

export default ChatPanel;
