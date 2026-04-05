const BACKEND_URL = 'http://127.0.0.1:8000';
const BASE = window.location.protocol === 'file:' 
  ? `${BACKEND_URL}/api` 
  : '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? res.statusText);
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.message.includes('Failed to fetch')) {
      throw new Error('无法连接到服务器，请检查后端是否已启动');
    }
    throw err;
  }
}

// ========== Card Types ==========
export type Card = {
  id: string;
  q: string;
  a: string;
  next_review: number;
  interval: number;
  tags?: string[];
};

export type ListCardsRes = { success: boolean; cards: Card[]; count: number };
export type NextDueRes = { success: boolean; card: Card | null; due_count: number; total_count: number };
export type RateRes = { success: boolean; card: Card; interval_days: number; ef: number; next: NextDueRes | null };
export type UpdateCardRes = { success: boolean; card: Card };

// ========== Note Types ==========
export type Note = {
  id: string;
  title: string;
  folder: string;
  content: string;
  preview: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  word_count: number;
};

export type ListNotesRes = { success: boolean; notes: Note[]; count: number };
export type CreateNoteRes = { success: boolean; note: Note };
export type UpdateNoteRes = { success: boolean; note: Note };
export type DeleteNoteRes = { success: boolean };
export type ImportObsidianRes = { 
  success: boolean; 
  imported: number; 
  skipped: number; 
  errors: string[];
};

// ========== Search Types ==========
export type SearchResult = {
  id: string;
  type: 'note' | 'card';
  title: string;
  preview: string;
  folder: string;
  tags: string[];
  matched_field: string;
  updated_at: number;
};

export type SearchRes = {
  success: boolean;
  query: string;
  results: SearchResult[];
  total: number;
  notes_count: number;
  cards_count: number;
};

// ========== AI Config Types ==========
export type ProviderConfig = {
  api_key?: string;
  base_url?: string;
  models: string[];
};

export type ParametersConfig = {
  temperature: number;
  top_p: number;
  max_tokens: number;
  presence_penalty: number;
  frequency_penalty: number;
};

export type FeaturesConfig = {
  auto_hint: boolean;
  auto_explain: boolean;
  context_length: number;
};

export type AIConfig = {
  current_provider: string;
  current_model: string;
  providers: Record<string, ProviderConfig>;
  parameters: ParametersConfig;
  features: FeaturesConfig;
};

export type AIConfigRes = {
  success: boolean;
  config: AIConfig;
};

// ========== Completion Types ==========
export type CompletionConfig = {
  enabled: boolean;
  require_confirm: boolean;
  trigger_delay: number;
  max_tokens: number;
};

// ========== Logs Config Types ==========
export type LogsConfig = {
  log_dir: string;
  log_level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  log_rotation: boolean;
  backup_count: number;
};

// ========== Chat Session Types ==========
export type ChatSession = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
};

export type ListChatSessionsRes = {
  success: boolean;
  sessions: ChatSession[];
};

export type CreateChatSessionRes = {
  success: boolean;
  session: ChatSession;
};

export type SwitchChatSessionRes = {
  success: boolean;
  session: ChatSession;
};

export type RenameChatSessionRes = {
  success: boolean;
};

export type DeleteChatSessionRes = {
  success: boolean;
};

// ========== Card API ==========
export const api = {
  health: () => request<{ status: string }>('/health'),
  
  // Cards
  listCards: () => request<ListCardsRes>('/cards'),
  createCard: (q: string, a: string, tags?: string[]) => request<{ success: boolean; card: Card }>('/cards', { 
    method: 'POST', 
    body: JSON.stringify({ q, a, tags }) 
  }),
  deleteCard: (id: string) => request<{ success: boolean }>(`/cards/${id}`, { method: 'DELETE' }),
  updateCard: (id: string, data: { q?: string; a?: string; tags?: string[] }) => 
    request<UpdateCardRes>(`/cards/${id}`, { 
      method: 'PATCH', 
      body: JSON.stringify(data) 
    }),
  nextDue: (tag?: string) => request<NextDueRes>(tag ? `/review/next?tag=${encodeURIComponent(tag)}` : '/review/next'),
  rateCard: (id: string, grade: 1 | 2 | 3, tag?: string) => request<RateRes>(tag ? `/review/${id}/rate?tag=${encodeURIComponent(tag)}` : `/review/${id}/rate`, { 
    method: 'POST', 
    body: JSON.stringify({ grade }) 
  }),
  importTxt: (content: string) => request<{ success: boolean; count: number }>('/import/txt', { 
    method: 'POST', 
    body: JSON.stringify({ content }) 
  }),

  // Notes
  listNotes: () => request<ListNotesRes>('/notes'),
  createNote: (title: string, folder: string, content: string, tags?: string[]) => 
    request<CreateNoteRes>('/notes', { 
      method: 'POST', 
      body: JSON.stringify({ title, folder, content, tags: tags || [] }) 
    }),
  getNote: (id: string) => request<CreateNoteRes>(`/notes/${id}`),
  updateNote: (id: string, data: { title?: string; folder?: string; content?: string; tags?: string[] }) => 
    request<UpdateNoteRes>(`/notes/${id}`, { 
      method: 'PATCH', 
      body: JSON.stringify(data) 
    }),
  deleteNote: (id: string) => request<DeleteNoteRes>(`/notes/${id}`, { method: 'DELETE' }),
  
  // Obsidian Import
  importObsidian: (vaultPath: string, excludeFolders?: string[]) => 
    request<ImportObsidianRes>('/notes/import/obsidian', { 
      method: 'POST', 
      body: JSON.stringify({ vault_path: vaultPath, exclude_folders: excludeFolders || ['.obsidian', '.git'] }) 
    }),

  // Search
  search: (query: string) => 
    request<SearchRes>(`/search?query=${encodeURIComponent(query)}`),

  // AI Config
  getAIConfig: () => 
    request<AIConfig>('/config/ai'),
  saveAIConfig: (config: AIConfig) => 
    request<{ success: boolean }>('/config/ai', { 
      method: 'POST', 
      body: JSON.stringify(config) 
    }),
  testAIConnection: () => 
    request<{ success: boolean; message: string }>('/config/ai/test', { method: 'POST' }),

  // Data Management
  createBackup: () => 
    request<{ success: boolean; path: string }>('/backup', { method: 'POST' }),
  exportData: () => 
    request<{ cards: any[]; notes: any[]; config: any }>('/export'),
  importData: (data: any) => 
    request<{ success: boolean; imported: number }>('/import', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),

  // Completion
  getCompletionConfig: () =>
    request<{ success: boolean; config: CompletionConfig }>('/completion/config'),
  saveCompletionConfig: (config: CompletionConfig) =>
    request<{ success: boolean }>('/completion/config', {
      method: 'POST',
      body: JSON.stringify(config)
    }),

  // Logs Config
  getLogsConfig: () =>
    request<{ success: boolean; config: LogsConfig }>('/config/logs'),
  saveLogsConfig: (config: LogsConfig) =>
    request<{ success: boolean }>('/config/logs', {
      method: 'POST',
      body: JSON.stringify(config)
    }),
  openLogsDir: () =>
    request<{ success: boolean }>('/logs/open-dir', { method: 'POST' }),

  // Chat Sessions
  listChatSessions: () =>
    request<ListChatSessionsRes>('/ai/sessions'),
  createChatSession: () =>
    request<CreateChatSessionRes>('/ai/sessions', { method: 'POST' }),
  switchChatSession: (id: string) =>
    request<SwitchChatSessionRes>(`/ai/sessions/${id}/switch`, { method: 'POST' }),
  renameChatSession: (id: string, title: string) =>
    request<RenameChatSessionRes>(`/ai/sessions/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify({ title }) 
    }),
  deleteChatSession: (id: string) =>
    request<DeleteChatSessionRes>(`/ai/sessions/${id}`, { method: 'DELETE' }),
};
