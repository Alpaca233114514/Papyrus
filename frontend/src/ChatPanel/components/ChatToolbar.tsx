import { Dropdown, Menu, Tooltip, Trigger } from '@arco-design/web-react';
import {
  IconArrowUp,
  IconAt,
  IconFile,
  IconBulb,
  IconRecordStop,
  IconTool,
} from '@arco-design/web-react/icon';
import IconAgentMode from '../../icons/IconAgentMode';
import { IconMessage } from '@arco-design/web-react/icon';
import { ToolsCatalogPopover } from '../../components/ToolsCatalogPopover';
import type { SelectedFile } from '../types';
import { MAX_FILES } from '../utils';

export interface ChatToolbarProps {
  mode: string;
  reasoning: boolean;
  isGenerating: boolean;
  agentModeEnabled: boolean;
  selectedFiles: SelectedFile[];
  onModeChange: (mode: string) => void;
  onReasoningChange: (reasoning: boolean) => void;
  onFileSelect: () => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  text: string;
}

const MODES = [
  { key: 'agent', icon: <IconAgentMode />, label: 'Agent 模式' },
  { key: 'chat', icon: <IconMessage />, label: 'Chat 模式' },
];

export function ChatToolbar({
  mode,
  reasoning,
  isGenerating,
  agentModeEnabled,
  selectedFiles,
  onModeChange,
  onReasoningChange,
  onFileSelect,
  onSendMessage,
  onStopGeneration,
  text,
}: ChatToolbarProps) {
  const currentMode = MODES.find((m) => m.key === mode) ?? MODES[0]!;
  const canSend = !isGenerating && (text.trim() || selectedFiles.length > 0);

  return (
    <div className="chat-toolbar">
      <div className="chat-toolbar-left">
        <Dropdown
          trigger="click"
          position="tl"
          droplist={
            <Menu onClickMenuItem={(key) => onModeChange(key)}>
              {MODES.map((m) => (
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
            onClick={onFileSelect}
            aria-label="上传文件"
            disabled={selectedFiles.length >= MAX_FILES || isGenerating}
          >
            <IconFile aria-hidden="true" />
          </button>
        </Tooltip>
        <button className="chat-toolbar-btn chat-toolbar-btn-dark" aria-label="@提及">
          <IconAt aria-hidden="true" />
        </button>
      </div>
      <div className="chat-toolbar-right">
        <button
          className={`chat-toolbar-btn${reasoning ? ' chat-toolbar-btn-active' : ''}`}
          onClick={() => onReasoningChange(!reasoning)}
          title="推理模式"
          aria-label={reasoning ? '关闭推理模式' : '开启推理模式'}
          aria-pressed={reasoning ? 'true' : 'false'}
        >
          <IconBulb aria-hidden="true" />
        </button>
        <Trigger
          trigger="click"
          popup={() => <ToolsCatalogPopover />}
          disabled={mode !== 'agent'}
        >
          <Tooltip
            content={mode === 'agent' ? '工具列表' : '切换到 Agent 模式以查看工具'}
            mini
          >
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
          className={`chat-send-btn${
            isGenerating ? ' chat-send-btn-stop' : !canSend ? ' chat-send-btn-disabled' : ''
          }`}
          onClick={() => (isGenerating ? onStopGeneration() : onSendMessage())}
          disabled={!canSend && !isGenerating}
          title={isGenerating ? '停止生成' : '发送消息'}
          aria-label={isGenerating ? '停止生成' : '发送消息'}
        >
          {isGenerating ? <IconRecordStop /> : <IconArrowUp />}
        </button>
      </div>
    </div>
  );
}
