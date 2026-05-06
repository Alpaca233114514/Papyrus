import { Dropdown, Menu, Tooltip } from '@arco-design/web-react';
import { IconDown, IconPlus, IconHistory, IconClose } from '@arco-design/web-react/icon';
import IconAgentMode from '../../icons/IconAgentMode';
import { IconMessage } from '@arco-design/web-react/icon';
import type { ModelOption } from '../../utils/modelSelector';

export interface ChatHeaderProps {
  selectedModel: ModelOption | undefined;
  availableModels: { key: string; label: string }[];
  modelLoading: boolean;
  configChecked: boolean;
  onModelSelect: (modelId: string) => void;
  onNewChat: () => void;
  onHistoryClick: () => void;
  onClose: () => void;
}

const MODES = [
  { key: 'agent', icon: <IconAgentMode />, label: 'Agent 模式' },
  { key: 'chat', icon: <IconMessage />, label: 'Chat 模式' },
];

export function ChatHeader({
  selectedModel,
  availableModels,
  modelLoading,
  configChecked,
  onModelSelect,
  onNewChat,
  onHistoryClick,
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="chat-panel-header">
      <Dropdown
        trigger="click"
        disabled={availableModels.length === 0}
        triggerProps={{
          popupStyle: { minWidth: '320px' },
        }}
        droplist={
          <Menu className="chat-model-menu" onClickMenuItem={onModelSelect}>
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
          <span>{selectedModel?.name || '选择模型'}</span>
          <IconDown className="tw-text-xs" />
        </button>
      </Dropdown>
      <div className="chat-panel-header-actions">
        <Tooltip content="新建对话" mini>
          <button
            className="chat-panel-header-btn"
            aria-label="新建对话"
            onClick={onNewChat}
          >
            <IconPlus />
          </button>
        </Tooltip>
        <Tooltip content="历史记录" mini>
          <button
            className="chat-panel-header-btn"
            aria-label="历史记录"
            onClick={onHistoryClick}
          >
            <IconHistory />
          </button>
        </Tooltip>
        <Tooltip content="关闭" mini>
          <button className="chat-panel-header-btn" aria-label="关闭" onClick={onClose}>
            <IconClose />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
