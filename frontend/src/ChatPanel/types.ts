import type { ChatSession, ChatBlock as ApiChatBlock } from '../api';
import type { UserProfile } from '../types/common';

export interface ChatPanelProps {
  open: boolean;
  width?: number;
  onClose?: () => void;
}

export type MessageBlockType = 'text' | 'reasoning' | 'tool_call';

export type MessageBlockToolStatus = 'pending' | 'executing' | 'success' | 'failed';

export interface MessageBlock {
  type: MessageBlockType;
  content?: string;
  toolName?: string;
  toolCallId?: string;
  toolStatus?: MessageBlockToolStatus;
  toolParams?: Record<string, any>;
  toolResult?: any;
  toolError?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks?: MessageBlock[];
  model?: string;
}

export interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'image' | 'document' | 'unknown';
}

export interface SSEEvent {
  type: 'text' | 'reasoning' | 'tool_call' | 'tool_result' | 'error' | 'done' | 'user_saved';
  data: any;
}

export interface RestoredMessageView {
  content: string;
  blocks: MessageBlock[];
}

export { type ChatSession, type ApiChatBlock, type UserProfile };
