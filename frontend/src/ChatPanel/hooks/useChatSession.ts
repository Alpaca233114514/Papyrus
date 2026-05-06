import { useState, useCallback, useEffect } from 'react';
import { Message as ArcoMessage } from '@arco-design/web-react';
import type { ChatSession, Message } from '../types';
import { api } from '../../api';
import {
  loadStoredSessionId,
  persistSessionId,
  hydrateMessagesForSession,
} from '../utils';

export interface UseChatSessionReturn {
  sessions: ChatSession[];
  sessionsLoading: boolean;
  currentSessionId: string;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string>>;
  loadSessions: () => Promise<void>;
  createNewSession: () => Promise<void>;
  clearAllSessions: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
}

export function useChatSession(
  open: boolean,
): UseChatSessionReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(loadStoredSessionId());

  useEffect(() => {
    persistSessionId(currentSessionId);
  }, [currentSessionId]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await api.listChatSessions();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const createNewSession = useCallback(async () => {
    try {
      const data = await api.createChatSession();
      if (data.success) {
        setCurrentSessionId(data.session.id);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      ArcoMessage.error('创建会话失败');
    }
  }, []);

  const clearAllSessions = useCallback(async () => {
    try {
      const data = await api.clearAllChatSessions();
      if (data.success) {
        setSessions([]);
        if (data.activeSessionId) {
          setCurrentSessionId(data.activeSessionId);
        } else {
          const created = await api.createChatSession();
          if (created.success) {
            setCurrentSessionId(created.session.id);
          }
        }
        ArcoMessage.success(`已清空 ${data.deletedCount} 个会话`);
      }
    } catch (err) {
      console.error('Failed to clear sessions:', err);
      ArcoMessage.error('清空会话失败');
    }
  }, []);

  const switchSession = useCallback(async (sessionId: string) => {
    try {
      await hydrateMessagesForSession(sessionId);
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error('Failed to switch session:', err);
      ArcoMessage.error('切换会话失败');
    }
  }, []);

  return {
    sessions,
    sessionsLoading,
    currentSessionId,
    setCurrentSessionId,
    loadSessions,
    createNewSession,
    clearAllSessions,
    switchSession,
  };
}

export async function initializeSession(open: boolean): Promise<{
  sessionId: string;
  messages: Message[];
} | null> {
  if (!open) return null;

  let cancelled = false;
  try {
    const listRes = await api.listChatSessions();
    if (cancelled || !listRes.success) return null;

    const sessionsList = listRes.sessions;
    const stored = loadStoredSessionId();
    const storedValid = stored && sessionsList.some((s) => s.id === stored);

    if (storedValid) {
      const restored = await hydrateMessagesForSession(stored);
      if (cancelled) return null;
      return { sessionId: stored, messages: restored };
    }

    if (listRes.activeSessionId && sessionsList.some((s) => s.id === listRes.activeSessionId)) {
      const activeId = listRes.activeSessionId;
      const restored = await hydrateMessagesForSession(activeId);
      if (cancelled) return null;
      return { sessionId: activeId, messages: restored };
    }

    const createRes = await api.createChatSession();
    if (cancelled || !createRes.success) return null;
    return { sessionId: createRes.session.id, messages: [] };
  } catch (err) {
    if (!cancelled) console.error('Failed to initialize chat session:', err);
    return null;
  }
}
