import { useState, useRef, useCallback } from 'react';
import { Dropdown, Menu, Avatar, Tooltip, Empty } from '@arco-design/web-react';
import { IconArrowUp, IconAt, IconImage, IconMessage, IconDown, IconBulb, IconRecordStop, IconTool, IconRefresh, IconEdit, IconCopy, IconDelete, IconTranslate, IconSave, IconPlus, IconHistory, IconClose } from '@arco-design/web-react/icon';
import IconAgentMode from './icons/IconAgentMode';
import './ChatPanel.css';

const models = [
  { key: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { key: 'claude-opus-4', label: 'Claude Opus 4' },
  { key: 'gpt-4o', label: 'GPT-4o' },
  { key: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

interface ChatPanelProps {
  open: boolean;
  width?: number;
  onClose?: () => void;
}

const modes = [
  { key: 'agent', icon: <IconAgentMode />, label: 'Agent 模式' },
  { key: 'chat', icon: <IconMessage />, label: 'Chat 模式' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ChatPanel = ({ open, width = 320, onClose }: ChatPanelProps) => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState('agent');
  const [model, setModel] = useState('claude-sonnet-4');
  const [reasoning, setReasoning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputHeight, setInputHeight] = useState(118);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);

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

  const currentMode = modes.find((m) => m.key === mode)!;

  return (
    <div className="chat-panel" style={{ width }}>
      <div className="chat-panel-header">
        <Dropdown
          trigger="click"
          droplist={
            <Menu onClickMenuItem={(key) => setModel(key)}>
              {models.map((m) => (
                <Menu.Item key={m.key}>{m.label}</Menu.Item>
              ))}
            </Menu>
          }
        >
          <button className="chat-model-btn">
            <span>{models.find((m) => m.key === model)!.label}</span>
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
          <div className="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-p-8">
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
                      className="tw-flex-shrink-0"
                      style={{ backgroundColor: '#206CCF', fontSize: 12 }}
                    >
                      P
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
                    <span className="chat-message-model-label">{models.find((m) => m.key === model)!.label}</span>
                    <div className="chat-message-bubble">{msg.content}</div>
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
          </div>
        )}
      </div>
      <div className="chat-input-resize-handle" onMouseDown={onDragStart} />
      <div className="chat-input-area" style={{ height: inputHeight }}>
        <textarea
          className="chat-textarea"
          placeholder="发送消息..."
          aria-label="消息输入框，按 Enter 发送"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="chat-toolbar">
          <div className="chat-toolbar-left">
            <Dropdown
              trigger="click"
              droplist={
                <Menu onClickMenuItem={(key) => setMode(key)}>
                  {modes.map((m) => (
                    <Menu.Item key={m.key}>
                      <span className="chat-mode-menu-item">
                        {m.icon}
                        <span>{m.label}</span>
                      </span>
                    </Menu.Item>
                  ))}
                </Menu>
              }
            >
              <button className="chat-mode-btn">
                {currentMode.icon}
                <span>{currentMode.label}</span>
              </button>
            </Dropdown>
            <button className="chat-toolbar-btn chat-toolbar-btn-dark" aria-label="发送图片"><IconImage aria-hidden="true" /></button>
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
              className={`chat-send-btn${isGenerating ? ' chat-send-btn-stop' : (!text.trim() ? ' chat-send-btn-disabled' : '')}`}
              onClick={() => isGenerating && setIsGenerating(false)}
            >
              {isGenerating ? <IconRecordStop /> : <IconArrowUp />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
