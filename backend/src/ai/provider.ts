import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { Mutex } from 'async-mutex';
import OpenAI from 'openai';
import type { AIConfig } from './config.js';
import { isPrivateUrl } from './config.js';
import { LLMCache } from './llm-cache.js';

export type StreamEventType = 'content' | 'reasoning' | 'tool_start' | 'tool_result' | 'done' | 'error';

export interface StreamChunk {
  type: StreamEventType;
  data: string | Record<string, unknown>;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  stored_name: string;
  path: string;
  type: 'image' | 'document';
  mime_type: string;
  size: number;
  created_at: number;
}

export interface SessionMessage {
  role: string;
  content: string;
  attachments?: AttachmentMeta[];
}

export interface SessionData {
  id: string;
  title: string;
  messages: SessionMessage[];
  created_at: number;
  updated_at: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.docx']);
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 5;

interface RawMessage {
  role: string;
  content: string;
  attachments?: Array<{ path?: string } | string>;
}

export class AIManager {
  config: AIConfig;
  dataDir: string;
  conversationsDir: string;
  uploadsDir: string;
  sessionsFile: string;
  sessions: Record<string, SessionData> = {};
  activeSessionId: string | null = null;
  private saveMutex = new Mutex();
  llmCache: LLMCache;

  constructor(config: AIConfig) {
    this.config = config;
    this.dataDir = path.dirname(config.configFile);
    this.conversationsDir = path.join(this.dataDir, 'conversations');
    this.uploadsDir = path.join(this.dataDir, 'uploads');
    this.sessionsFile = path.join(this.conversationsDir, 'sessions.json');
    this.llmCache = new LLMCache(path.join(this.dataDir, 'llm_cache'), {
      enabled: config.config.features.cache_enabled,
    });

    fs.mkdirSync(this.conversationsDir, { recursive: true });
    fs.mkdirSync(this.uploadsDir, { recursive: true });
    this.loadSessions();

    if (!this.activeSessionId || !(this.activeSessionId in this.sessions)) {
      this.createSession('新对话', true);
    }
  }

  get conversationHistory(): SessionMessage[] {
    return this.getActiveSession().messages;
  }

  set conversationHistory(value: SessionMessage[] | null) {
    const session = this.getActiveSession();
    session.messages = value ? [...value] : [];
    session.updated_at = Date.now() / 1000;
    this.saveSessions();
  }

  private loadSessions(): void {
    if (!fs.existsSync(this.sessionsFile)) return;
    try {
      const content = fs.readFileSync(this.sessionsFile, 'utf8');
      const data = JSON.parse(content) as unknown;
      if (data === null || typeof data !== 'object') return;
      const dict = data as Record<string, unknown>;
      this.activeSessionId = dict.active_session_id !== undefined ? String(dict.active_session_id) : null;
      const loadedSessions = Array.isArray(dict.sessions) ? dict.sessions : [];
      for (const session of loadedSessions) {
        if (session === null || typeof session !== 'object') continue;
        const s = session as Record<string, unknown>;
        const sessionId = s.id !== undefined ? String(s.id) : '';
        if (!sessionId) continue;
        this.sessions[sessionId] = {
          id: sessionId,
          title: s.title !== undefined ? String(s.title) : '新对话',
          messages: Array.isArray(s.messages) ? s.messages.map((m: unknown) => this.normalizeMessage(m)) : [],
          created_at: typeof s.created_at === 'number' ? s.created_at : Date.now() / 1000,
          updated_at: typeof s.updated_at === 'number' ? s.updated_at : Date.now() / 1000,
        };
      }
    } catch {
      this.sessions = {};
      this.activeSessionId = null;
    }
  }

  private normalizeMessage(m: unknown): SessionMessage {
    if (m === null || typeof m !== 'object') return { role: 'user', content: '' };
    const msg = m as Record<string, unknown>;
    return {
      role: msg.role !== undefined ? String(msg.role) : 'user',
      content: msg.content !== undefined ? String(msg.content) : '',
      attachments: Array.isArray(msg.attachments) ? msg.attachments as AttachmentMeta[] : undefined,
    };
  }

  private saveSessions(): void {
    const payload = {
      active_session_id: this.activeSessionId,
      sessions: Object.values(this.sessions),
    };
    const tempFile = `${this.sessionsFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tempFile, this.sessionsFile);
  }

  getActiveSession(): SessionData {
    if (!this.activeSessionId || !(this.activeSessionId in this.sessions)) {
      return this.createSession('新对话', true);
    }
    return this.sessions[this.activeSessionId]!;
  }

  listSessions(): SessionSummary[] {
    const summaries: SessionSummary[] = [];
    for (const session of Object.values(this.sessions)) {
      summaries.push({
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: session.messages.length,
      });
    }
    return summaries.sort((a, b) => b.updated_at - a.updated_at);
  }

  createSession(title?: string, switchSession = true): SessionData {
    const sessionId = uuidv4().replace(/-/g, '').slice(0, 12);
    const now = Date.now() / 1000;
    const session: SessionData = {
      id: sessionId,
      title: title ?? new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-'),
      messages: [],
      created_at: now,
      updated_at: now,
    };
    this.sessions[sessionId] = session;
    if (switchSession) {
      this.activeSessionId = sessionId;
    }
    this.saveSessions();
    return session;
  }

  switchSession(sessionId: string): SessionData {
    if (!(sessionId in this.sessions)) {
      throw new Error('会话不存在');
    }
    this.activeSessionId = sessionId;
    this.sessions[sessionId]!.updated_at = Date.now() / 1000;
    this.saveSessions();
    return this.sessions[sessionId]!;
  }

  renameSession(sessionId: string, title: string): void {
    if (!(sessionId in this.sessions)) {
      throw new Error('会话不存在');
    }
    this.sessions[sessionId]!.title = title.trim() || '新对话';
    this.sessions[sessionId]!.updated_at = Date.now() / 1000;
    this.saveSessions();
  }

  deleteSession(sessionId: string): void {
    if (!(sessionId in this.sessions)) {
      throw new Error('会话不存在');
    }
    if (Object.keys(this.sessions).length <= 1) {
      throw new Error('至少保留一个会话');
    }
    delete this.sessions[sessionId];
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = Object.keys(this.sessions)[0] ?? null;
    }
    this.saveSessions();
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  getActiveSessionTitle(): string {
    return this.getActiveSession().title;
  }

  clearHistory(): void {
    this.createSession('新对话', true);
  }

  private validateAttachments(attachments: Array<{ path?: string } | string> | null | undefined): string[] {
    if (!attachments) return [];
    if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new Error(`单次最多上传 ${MAX_ATTACHMENTS_PER_MESSAGE} 个附件`);
    }
    const normalized: string[] = [];
    for (const item of attachments) {
      const itemPath = typeof item === 'string' ? item : (item.path ?? '');
      if (!itemPath) continue;
      if (!fs.existsSync(itemPath)) {
        throw new Error(`文件不存在: ${itemPath}`);
      }
      if (this.config.config.current_provider === 'liyuan-deepseek') {
        const resolved = path.resolve(itemPath);
        const dataDir = path.resolve(this.dataDir);
        if (!resolved.startsWith(dataDir + path.sep) && resolved !== dataDir) {
          throw new Error('LiYuan 免费额度仅支持处理 Papyrus 工作区内的文件');
        }
      }
      const ext = path.extname(itemPath).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext) && !DOCUMENT_EXTENSIONS.has(ext)) {
        throw new Error(`不支持的文件类型: ${path.basename(itemPath)}`);
      }
      const size = fs.statSync(itemPath).size;
      if (size > MAX_ATTACHMENT_SIZE) {
        throw new Error(`文件超过大小限制(10MB): ${path.basename(itemPath)}`);
      }
      normalized.push(itemPath);
    }
    return normalized;
  }

  private storeAttachments(attachments: Array<{ path?: string } | string> | null | undefined): AttachmentMeta[] {
    const paths = this.validateAttachments(attachments);
    if (!paths.length) return [];

    const sessionId = this.getActiveSessionId() ?? this.createSession('新对话', true).id;
    const sessionUploadDir = path.join(this.uploadsDir, sessionId);
    fs.mkdirSync(sessionUploadDir, { recursive: true });

    const stored: AttachmentMeta[] = [];
    for (const filePath of paths) {
      const ext = path.extname(filePath).toLowerCase();
      const fileId = uuidv4().replace(/-/g, '');
      const storedName = `${fileId}${ext}`;
      const dst = path.join(sessionUploadDir, storedName);
      fs.copyFileSync(filePath, dst);
      const mimeType = getMimeType(filePath);
      const attachmentType: 'image' | 'document' = IMAGE_EXTENSIONS.has(ext) ? 'image' : 'document';
      stored.push({
        id: fileId,
        name: path.basename(filePath),
        stored_name: storedName,
        path: path.relative(this.dataDir, dst),
        type: attachmentType,
        mime_type: mimeType,
        size: fs.statSync(dst).size,
        created_at: Date.now() / 1000,
      });
    }
    return stored;
  }

  private resolveAttachmentPath(item: AttachmentMeta): string | null {
    const rawPath = item.path;
    const normalized = path.normalize(rawPath);
    if (normalized.startsWith('..') || normalized.split(path.sep).includes('..')) {
      return null;
    }
    const absPath = path.resolve(this.dataDir, normalized);
    const uploadsBase = path.resolve(this.uploadsDir);
    if (!absPath.startsWith(uploadsBase + path.sep) && absPath !== uploadsBase) {
      return null;
    }
    return absPath;
  }

  private safeReadTextFile(absPath: string, maxChars = 6000): string {
    try {
      const fd = fs.openSync(absPath, 'r');
      try {
        const buffer = Buffer.alloc(maxChars * 4);
        const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
        return buffer.toString('utf8', 0, Math.min(bytesRead, maxChars * 4)).slice(0, maxChars);
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return '';
    }
  }

  private buildUserMessageForProvider(
    providerName: string,
    userMessage: string,
    attachmentsMeta: AttachmentMeta[],
  ): { role: string; content: string | Array<Record<string, unknown>> } {
    if (!attachmentsMeta.length) {
      return { role: 'user', content: userMessage };
    }

    if (providerName === 'openai') {
      const blocks: Array<Record<string, unknown>> = [{ type: 'text', text: userMessage }];
      const docChunks: string[] = [];
      const unresolvedDocs: string[] = [];

      for (const item of attachmentsMeta) {
        const absPath = this.resolveAttachmentPath(item);
        if (!absPath) {
          unresolvedDocs.push(item.name);
          continue;
        }
        if (item.type === 'image') {
          try {
            const b64 = fs.readFileSync(absPath, 'base64');
            blocks.push({
              type: 'image_url',
              image_url: { url: `data:${item.mime_type};base64,${b64}` },
            });
          } catch {
            unresolvedDocs.push(item.name);
          }
        } else {
          const ext = path.extname(item.name).toLowerCase();
          if (ext === '.txt' || ext === '.md') {
            const snippet = this.safeReadTextFile(absPath);
            if (snippet) {
              docChunks.push(`[文件:${item.name}]\n${snippet}`);
            } else {
              unresolvedDocs.push(item.name);
            }
          } else {
            unresolvedDocs.push(item.name);
          }
        }
      }

      if (docChunks.length) {
        blocks.push({ type: 'text', text: docChunks.join('\n\n') });
      }
      if (unresolvedDocs.length) {
        blocks.push({
          type: 'text',
          text: `以下文件已上传但当前未做文本解析，请结合文件名理解上下文: ${unresolvedDocs.join(', ')}`,
        });
      }
      return { role: 'user', content: blocks };
    }

    const lines: string[] = [userMessage, '', '附件信息:'];
    for (const item of attachmentsMeta) {
      const itemAbsPath = this.resolveAttachmentPath(item);
      if (!itemAbsPath) {
        lines.push(`- ${item.name} (${item.type}) [路径无效]`);
        continue;
      }
      if (item.type === 'document' && ['.txt', '.md'].includes(path.extname(item.name).toLowerCase())) {
        const snippet = this.safeReadTextFile(itemAbsPath);
        lines.push(`- ${item.name} (${item.type})`);
        if (snippet) {
          lines.push(`  内容摘要: ${snippet.slice(0, 1200)}`);
        }
      } else {
        lines.push(`- ${item.name} (${item.type})`);
      }
    }
    return { role: 'user', content: lines.join('\n') };
  }

  private messageToProviderFormat(providerName: string, message: SessionMessage): { role: string; content: string | Array<Record<string, unknown>> } {
    const role = message.role;
    const content = message.content;
    const attachments = message.attachments ?? [];
    if (role === 'user' && attachments.length > 0) {
      return this.buildUserMessageForProvider(providerName, content, attachments);
    }
    return { role, content };
  }

  async *chatStream(
    userMessage: string,
    systemPrompt?: string,
    attachments?: Array<{ path?: string } | string>,
    overrideModel?: string,
  ): AsyncGenerator<StreamChunk> {
    const providerName = this.config.config.current_provider;
    const providerConfig = this.config.config.providers[providerName];
    if (!providerConfig) {
      yield { type: 'error', data: `未知 provider: ${providerName}` };
      return;
    }

    const messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    const contextLength = this.config.config.features.context_length;
    if (contextLength > 0) {
      const history = this.conversationHistory.slice(-(contextLength * 2));
      for (const msg of history) {
        messages.push(this.messageToProviderFormat(providerName, msg));
      }
    }

    const attachmentsMeta = this.storeAttachments(attachments);
    messages.push(this.buildUserMessageForProvider(providerName, userMessage, attachmentsMeta));

    const params = this.config.config.parameters;
    const model = overrideModel || this.config.config.current_model;

    const cacheKey = this.llmCache.buildCacheKey(providerName, model, messages, params, systemPrompt);
    const cached = this.llmCache.get(cacheKey);
    if (cached) {
      try {
        for (const chunk of cached) {
          yield chunk;
        }
        const activeSession = this.getActiveSession();
        activeSession.messages.push({
          role: 'user',
          content: userMessage,
          attachments: attachmentsMeta,
        });
        activeSession.updated_at = Date.now() / 1000;
        this.saveSessions();
        yield { type: 'done', data: '' };
      } catch (e) {
        yield { type: 'error', data: e instanceof Error ? e.message : String(e) };
      }
      return;
    }

    const collectedChunks: StreamChunk[] = [];
    try {
      const stream = providerName === 'ollama'
        ? this.chatStreamOllama(messages, model, params, providerConfig)
        : this.chatStreamOpenAI(messages, model, params, providerConfig, providerName);

      for await (const chunk of stream) {
        collectedChunks.push(chunk);
        yield chunk;
      }

      const activeSession = this.getActiveSession();
      activeSession.messages.push({
        role: 'user',
        content: userMessage,
        attachments: attachmentsMeta,
      });
      activeSession.updated_at = Date.now() / 1000;
      this.saveSessions();

      this.llmCache.set(cacheKey, collectedChunks);
      yield { type: 'done', data: '' };
    } catch (e) {
      yield { type: 'error', data: e instanceof Error ? e.message : String(e) };
    }
  }

  private async *chatStreamOpenAI(
    messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }>,
    model: string,
    params: { temperature?: number; max_tokens?: number; top_p?: number; presence_penalty?: number; frequency_penalty?: number },
    providerConfig: { base_url: string; api_key: string },
    providerName: string,
  ): AsyncGenerator<StreamChunk> {
    const baseUrl = providerConfig.base_url.replace(/\/$/, '');
    const apiKey = providerConfig.api_key;

    if (isPrivateUrl(baseUrl)) {
      throw new Error('SSRF: 禁止通过非本地 provider 访问私有地址');
    }

    const client = new OpenAI({ apiKey, baseURL: baseUrl });

    const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      stream: true,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 2000,
    };
    if (params.top_p !== undefined) requestParams.top_p = params.top_p;
    if (params.presence_penalty !== undefined) requestParams.presence_penalty = params.presence_penalty;
    if (params.frequency_penalty !== undefined) requestParams.frequency_penalty = params.frequency_penalty;

    const stream = await client.chat.completions.create(requestParams);

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const delta = choice.delta;

      const reasoningContent = (delta as Record<string, unknown>).reasoning_content;
      if (typeof reasoningContent === 'string' && reasoningContent) {
        yield { type: 'reasoning', data: reasoningContent };
      }
      if (delta.content) {
        yield { type: 'content', data: delta.content };
      }
      if (delta.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          yield { type: 'tool_start', data: toolCall as unknown as Record<string, unknown> };
        }
      }
    }
  }

  private async *chatStreamOllama(
    messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }>,
    model: string,
    params: { temperature?: number },
    providerConfig: { base_url: string },
  ): AsyncGenerator<StreamChunk> {
    const baseUrl = providerConfig.base_url.replace(/\/$/, '');

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: { temperature: params.temperature ?? 0.7 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取 Ollama 响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as unknown;
          if (chunk === null || typeof chunk !== 'object') continue;
          const dict = chunk as Record<string, unknown>;
          if (dict.done === true) return;

          const message = dict.message as Record<string, unknown> | undefined;
          if (!message) continue;

          const content = message.content;
          if (typeof content === 'string' && content) {
            yield { type: 'content', data: content };
          }

          const toolCalls = message.tool_calls;
          if (Array.isArray(toolCalls)) {
            for (const toolCall of toolCalls) {
              yield { type: 'tool_start', data: toolCall as Record<string, unknown> };
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  getHint(question: string): Promise<string> {
    const prompt = `用户正在学习这个问题：\n${question}\n\n请给出一个不直接透露答案的提示，帮助用户思考。`;
    return this.chat(prompt, '你是一个学习助手，擅长给出启发性的提示而不是直接答案。');
  }

  explainAnswer(question: string, answer: string): Promise<string> {
    const prompt = `题目：${question}\n答案：${answer}\n\n请用简单易懂的语言解释这个答案，帮助加深理解。`;
    return this.chat(prompt, '你是一个学习助手，擅长用通俗的语言解释复杂概念。');
  }

  generateRelated(question: string, answer: string): Promise<string> {
    const prompt = `基于这个知识点：\n题目：${question}\n答案：${answer}\n\n请生成3个相关的问题，帮助巩固这个知识点。`;
    return this.chat(prompt, '你是一个学习助手，擅长设计相关的练习题。');
  }

  async chat(userMessage: string, systemPrompt?: string): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.chatStream(userMessage, systemPrompt)) {
      if (chunk.type === 'content') {
        chunks.push(typeof chunk.data === 'string' ? chunk.data : '');
      }
      if (chunk.type === 'done') break;
      if (chunk.type === 'error') {
        throw new Error(typeof chunk.data === 'string' ? chunk.data : 'AI 调用失败');
      }
    }
    // Save assistant response to session
    const activeSession = this.getActiveSession();
    activeSession.messages.push({ role: 'assistant', content: chunks.join('') });
    activeSession.updated_at = Date.now() / 1000;
    this.saveSessions();
    return chunks.join('');
  }

  async appendAssistantMessage(content: string): Promise<void> {
    await this.saveMutex.runExclusive(() => {
      const activeSession = this.getActiveSession();
      activeSession.messages.push({ role: 'assistant', content });
      activeSession.updated_at = Date.now() / 1000;
      this.saveSessions();
    });
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}
