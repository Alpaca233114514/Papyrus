import { Tooltip, Modal, Button, Message as ArcoMessage } from '@arco-design/web-react';
import {
  IconRefresh,
  IconEdit,
  IconCopy,
  IconDelete,
  IconTranslate,
  IconSave,
} from '@arco-design/web-react/icon';
import type { Message } from '../types';
import { api } from '../../api';
import { stripMdTitle } from '../utils';

export interface MessageActionsProps {
  message: Message;
  isGenerating: boolean;
  messages: Message[];
  onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>>;
  onSendMessage: () => void;
  onTextOverride: (text: string) => void;
}

export function MessageActions({
  message,
  isGenerating,
  messages,
  onMessagesChange,
  onSendMessage,
  onTextOverride,
}: MessageActionsProps) {
  const handleRegenerate = () => {
    Modal.confirm({
      title: '重新生成',
      content: '是否重新生成？本操作会覆盖当前回答。',
      onOk: () => {
        const msgIndex = messages.findIndex((m) => m.id === message.id);
        if (msgIndex < messages.length - 1 && messages[msgIndex + 1]?.role === 'assistant') {
          onMessagesChange((prev) => prev.slice(0, msgIndex + 1));
        }
        onTextOverride(message.content);
        onSendMessage();
      },
    });
  };

  const handleEdit = () => {
    return { messageId: message.id, draft: message.content };
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(
      () => ArcoMessage.success('已复制'),
      () => ArcoMessage.error('复制失败'),
    );
  };

  const handleTranslate = () => {
    onTextOverride('请翻译以下内容为简体中文（如已是中文则翻译为英文），保留原 markdown 结构：\n\n' + message.content);
    onSendMessage();
  };

  const handleSaveToNote = () => {
    const msgIndex = messages.findIndex((m) => m.id === message.id);
    const userMsg = msgIndex > 0 && messages[msgIndex - 1]?.role === 'user' ? messages[msgIndex - 1] : null;
    const noteContent = userMsg ? `> **用户：** ${userMsg.content}\n\n${message.content}` : message.content;
    const title = stripMdTitle(message.content).slice(0, 30) || '未命名 AI 回复';
    api.createNote(title, 'AI 对话', noteContent, ['ai-chat']).then(
      () => ArcoMessage.success('已保存到笔记'),
      () => ArcoMessage.error('保存失败'),
    );
  };

  const handleDelete = () => {
    onMessagesChange((prev) => prev.filter((m) => m.id !== message.id));
  };

  if (message.role === 'user') {
    return (
      <div className="chat-message-actions">
        <Tooltip content="重新生成" mini>
          <button
            className="chat-message-action-btn"
            aria-label="重新生成"
            disabled={isGenerating}
            onClick={handleRegenerate}
          >
            <IconRefresh />
          </button>
        </Tooltip>
        <Tooltip content="编辑" mini>
          <button
            className="chat-message-action-btn"
            aria-label="编辑"
            disabled={isGenerating}
          >
            <IconEdit />
          </button>
        </Tooltip>
        <Tooltip content="复制" mini>
          <button
            className="chat-message-action-btn"
            aria-label="复制"
            disabled={isGenerating}
            onClick={handleCopy}
          >
            <IconCopy />
          </button>
        </Tooltip>
        <Tooltip content="删除" mini>
          <button
            className="chat-message-action-btn"
            aria-label="删除"
            disabled={isGenerating}
            onClick={handleDelete}
          >
            <IconDelete />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="chat-message-actions">
      <Tooltip content="重新生成" mini>
        <button
          className="chat-message-action-btn"
          aria-label="重新生成"
          disabled={isGenerating}
          onClick={handleRegenerate}
        >
          <IconRefresh />
        </button>
      </Tooltip>
      <Tooltip content="编辑" mini>
        <button
          className="chat-message-action-btn"
          aria-label="编辑"
          disabled={isGenerating}
        >
          <IconEdit />
        </button>
      </Tooltip>
      <Tooltip content="复制" mini>
        <button
          className="chat-message-action-btn"
          aria-label="复制"
          disabled={isGenerating}
          onClick={handleCopy}
        >
          <IconCopy />
        </button>
      </Tooltip>
      <Tooltip content="翻译" mini>
        <button
          className="chat-message-action-btn"
          aria-label="翻译"
          disabled={isGenerating}
          onClick={handleTranslate}
        >
          <IconTranslate />
        </button>
      </Tooltip>
      <Tooltip content="保存到笔记" mini>
        <button
          className="chat-message-action-btn"
          aria-label="保存到笔记"
          disabled={isGenerating}
          onClick={handleSaveToNote}
        >
          <IconSave />
        </button>
      </Tooltip>
      <Tooltip content="删除" mini>
        <button
          className="chat-message-action-btn"
          aria-label="删除"
          disabled={isGenerating}
          onClick={handleDelete}
        >
          <IconDelete />
        </button>
      </Tooltip>
    </div>
  );
}
