import {
  loadAllCards,
  insertCard,
  updateCard as dbUpdateCard,
  deleteCardById,
  getCardsDueBefore,
  getCardCount,
} from '../db/database.js';
import type { CardRecord } from '../core/types.js';
import type { PapyrusLogger } from '../utils/logger.js';

export interface ToolResult {
  success: boolean;
  error?: string;
  message?: string;
  card?: CardRecord;
  old?: { q: string; a: string };
  new?: { q: string; a: string };
  deleted_card?: CardRecord;
  count?: number;
  results?: Array<{ index: number; question: string; answer: string }>;
  stats?: {
    total_cards: number;
    due_cards: number;
    average_ef: number;
    max_repetitions: number;
    cards_mastered: number;
  };
  topic?: string;
}

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
}

export interface ParsedAIResponse {
  content: string;
  reasoning: string | null;
  tool_call: ToolCall | null;
}

function safeFloat(value: unknown, defaultValue: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

function safeInt(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

export class CardTools {
  private logger: PapyrusLogger | null;

  constructor(logger?: PapyrusLogger) {
    this.logger = logger ?? null;
  }

  private logEvent(eventType: string, data: unknown = null, level = 'INFO'): void {
    this.logger?.logEvent(eventType, data, level);
  }

  getToolsDefinition(): string {
    return `
你可以使用以下工具来操作学习卡片：

1. 创建卡片 (create_card)
参数：
- question: 题目内容
- answer: 答案内容
- tags: 标签列表（可选）
示例：{"tool": "create_card", "params": {"question": "...", "answer": "...", "tags": ["数学"]}}

2. 更新卡片 (update_card)
参数：
- card_index: 卡片索引
- question: 新题目（可选）
- answer: 新答案（可选）
示例：{"tool": "update_card", "params": {"card_index": 0, "question": "..."}}

3. 删除卡片 (delete_card)
参数：
- card_index: 卡片索引
示例：{"tool": "delete_card", "params": {"card_index": 0}}

4. 搜索卡片 (search_cards)
参数：
- keyword: 搜索关键词
示例：{"tool": "search_cards", "params": {"keyword": "数学"}}

5. 获取统计 (get_card_stats)
无参数
示例：{"tool": "get_card_stats", "params": {}}

6. 生成练习集 (generate_practice_set)
参数：
- topic: 主题
- count: 题目数量（可选，默认5）
示例：{"tool": "generate_practice_set", "params": {"topic": "三角函数", "count": 5}}

使用格式：
\`\`\`json
{"tool": "工具名", "params": {...}}
\`\`\`

注意：所有修改操作会立即执行并保存。
`;
  }

  createCard(question: string, answer: string, tags?: string[]): ToolResult {
    if (!question || !answer) {
      return { success: false, error: '题目和答案不能为空' };
    }

    const newCard: CardRecord = {
      id: `${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      q: question,
      a: answer,
      next_review: Date.now() / 1000,
      interval: 86400,
      tags: tags ?? [],
      ef: 2.5,
      repetitions: 0,
    };

    insertCard(newCard, this.logger ?? undefined);
    this.logEvent('tool.create_card', { question: question.slice(0, 50) });

    return {
      success: true,
      message: '卡片已创建并保存',
      card: newCard,
    };
  }

  updateCard(cardIndex: number, question?: string, answer?: string): ToolResult {
    const cards = loadAllCards(this.logger ?? undefined);
    if (cardIndex < 0 || cardIndex >= cards.length) {
      return { success: false, error: '卡片索引无效' };
    }

    const card = cards[cardIndex];
    if (!card) {
      return { success: false, error: '卡片索引无效' };
    }

    const oldQ = card.q;
    const oldA = card.a;

    if (question) card.q = question;
    if (answer) card.a = answer;

    dbUpdateCard(card, this.logger ?? undefined);
    this.logEvent('tool.update_card', {
      index: cardIndex,
      old_q: oldQ.slice(0, 50),
      new_q: question?.slice(0, 50),
    });

    return {
      success: true,
      message: '卡片已更新并保存',
      old: { q: oldQ, a: oldA },
      new: { q: card.q, a: card.a },
    };
  }

  deleteCard(cardIndex: number): ToolResult {
    const cards = loadAllCards(this.logger ?? undefined);
    if (cardIndex < 0 || cardIndex >= cards.length) {
      return { success: false, error: '卡片索引无效' };
    }

    const card = cards[cardIndex];
    if (!card) {
      return { success: false, error: '卡片索引无效' };
    }

    deleteCardById(card.id, this.logger ?? undefined);
    this.logEvent('tool.delete_card', { index: cardIndex, question: card.q.slice(0, 50) });

    return {
      success: true,
      message: '卡片已删除并保存',
      deleted_card: card,
    };
  }

  searchCards(keyword: string): ToolResult {
    const keywordLower = (keyword || '').toLowerCase();
    const cards = loadAllCards(this.logger ?? undefined);
    const results: Array<{ index: number; question: string; answer: string }> = [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) continue;
      const q = card.q;
      const a = card.a;
      if (q.toLowerCase().includes(keywordLower) || a.toLowerCase().includes(keywordLower)) {
        results.push({
          index: i,
          question: q,
          answer: a.length > 100 ? `${a.slice(0, 100)}...` : a,
        });
      }
    }

    return {
      success: true,
      message: `找到 ${results.length} 张相关卡片`,
      count: results.length,
      results,
    };
  }

  getCardStats(): ToolResult {
    const cards = loadAllCards(this.logger ?? undefined);
    const total = cards.length;
    const now = Date.now() / 1000;
    const due = getCardsDueBefore(now).length;

    const efs = cards.map(c => safeFloat(c.ef, 2.5));
    const avgEf = efs.length > 0 ? efs.reduce((a, b) => a + b, 0) / efs.length : 2.5;
    const reps = cards.map(c => safeInt(c.repetitions, 0));

    return {
      success: true,
      stats: {
        total_cards: total,
        due_cards: due,
        average_ef: Math.round(avgEf * 100) / 100,
        max_repetitions: reps.length > 0 ? Math.max(...reps) : 0,
        cards_mastered: reps.filter(r => r >= 5).length,
      },
    };
  }

  executeTool(toolName: string, params: Record<string, unknown>): ToolResult {
    const knownTools = new Set([
      'create_card',
      'update_card',
      'delete_card',
      'search_cards',
      'get_card_stats',
      'generate_practice_set',
    ]);

    if (!knownTools.has(toolName)) {
      this.logEvent('tool.unknown', { tool: toolName }, 'WARNING');
      return { success: false, error: `未知工具: ${toolName}` };
    }

    this.logEvent('tool.execute_start', { tool: toolName, params });
    const start = Date.now();

    try {
      let result: ToolResult;

      if (toolName === 'create_card') {
        const question = params.question;
        const answer = params.answer;
        const tags = params.tags;
        if (typeof question !== 'string' || typeof answer !== 'string') {
          return { success: false, error: 'question 和 answer 必须是字符串' };
        }
        const tagList = Array.isArray(tags) ? tags.map(t => String(t)) : undefined;
        result = this.createCard(question, answer, tagList);
      } else if (toolName === 'update_card') {
        const cardIndex = params.card_index;
        const question = params.question;
        const answer = params.answer;
        if (typeof cardIndex !== 'number') {
          return { success: false, error: 'card_index 必须是整数' };
        }
        result = this.updateCard(
          Math.floor(cardIndex),
          typeof question === 'string' ? question : undefined,
          typeof answer === 'string' ? answer : undefined,
        );
      } else if (toolName === 'delete_card') {
        const cardIndex = params.card_index;
        if (typeof cardIndex !== 'number') {
          return { success: false, error: 'card_index 必须是整数' };
        }
        result = this.deleteCard(Math.floor(cardIndex));
      } else if (toolName === 'search_cards') {
        const keyword = params.keyword;
        if (typeof keyword !== 'string') {
          return { success: false, error: 'keyword 必须是字符串' };
        }
        result = this.searchCards(keyword);
      } else if (toolName === 'get_card_stats') {
        result = this.getCardStats();
      } else {
        const topic = params.topic;
        const count = params.count;
        if (typeof topic !== 'string') {
          return { success: false, error: 'topic 必须是字符串' };
        }
        result = this.generatePracticeSet(topic, typeof count === 'number' ? count : 5);
      }

      const elapsed = (Date.now() - start) / 1000;
      this.logEvent('tool.execute_ok', {
        tool: toolName,
        elapsed_s: elapsed,
        result_type: result.success ? 'success' : 'error',
      });
      return result;
    } catch (exc) {
      const elapsed = (Date.now() - start) / 1000;
      this.logEvent(
        'tool.execute_error',
        { tool: toolName, elapsed_s: elapsed, error: exc instanceof Error ? exc.message : String(exc) },
        'ERROR',
      );
      return { success: false, error: exc instanceof Error ? exc.message : String(exc) };
    }
  }

  generatePracticeSet(topic: string, count = 5): ToolResult {
    return {
      success: false,
      error: '生成功能尚未实现',
      topic,
      count,
    };
  }

  parseToolCall(aiResponse: string): ToolCall | null {
    const pattern = /```json\s*(\{.*?\})\s*```/s;
    const matches = aiResponse.match(pattern);
    if (!matches || !matches[1]) return null;

    try {
      const toolCallObj = JSON.parse(matches[1]) as unknown;
      if (
        toolCallObj !== null &&
        typeof toolCallObj === 'object' &&
        typeof (toolCallObj as Record<string, unknown>).tool === 'string' &&
        typeof (toolCallObj as Record<string, unknown>).params === 'object'
      ) {
        const tc = toolCallObj as Record<string, unknown>;
        const toolCall: ToolCall = {
          tool: tc.tool as string,
          params: tc.params as Record<string, unknown>,
        };
        this.logEvent('tool.parse_ok', {
          tool: toolCall.tool,
          params_keys: Object.keys(toolCall.params),
        });
        return toolCall;
      }
    } catch (exc) {
      this.logEvent('tool.parse_error', { error: exc instanceof Error ? exc.message : String(exc) }, 'WARNING');
    }
    return null;
  }
}

export class AIResponseParser {
  private static readonly REASONING_TAGS: Array<[RegExp, string]> = [
    [/<think>(.*?)<\/think>/gs, 'think'],
    [/<reasoning>(.*?)<\/reasoning>/gs, 'reasoning'],
    [/<thought>(.*?)<\/thought>/gs, 'thought'],
  ];

  private static readonly TOOL_CALL_PATTERNS = [
    /```json\s*(\{.*?\})\s*```/gs,
    /```\s*(\{[^{}]*"tool"[^{}]*\})\s*```/gs,
  ];

  static parseReasoning(content: string): { cleaned: string; reasoning: string | null } {
    const reasoningParts: string[] = [];
    let cleanedContent = content;

    for (const [pattern] of this.REASONING_TAGS) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        for (const match of matches) {
          const text = match[1];
          if (text) reasoningParts.push(text.trim());
        }
        cleanedContent = cleanedContent.replace(pattern, '');
      }
    }

    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim();
    const reasoning = reasoningParts.length > 0 ? reasoningParts.join('\n\n') : null;
    return { cleaned: cleanedContent, reasoning };
  }

  static parseToolCall(content: string): ToolCall | null {
    for (const pattern of this.TOOL_CALL_PATTERNS) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        try {
          const text = match[1];
          if (!text) continue;
          const obj = JSON.parse(text) as unknown;
          if (
            obj !== null &&
            typeof obj === 'object' &&
            typeof (obj as Record<string, unknown>).tool === 'string' &&
            typeof (obj as Record<string, unknown>).params === 'object'
          ) {
            return {
              tool: (obj as Record<string, unknown>).tool as string,
              params: (obj as Record<string, unknown>).params as Record<string, unknown>,
            };
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  static parseResponse(response: string, reasoningContent?: string | null): ParsedAIResponse {
    const { cleaned, reasoning } = this.parseReasoning(response);
    const finalReasoning = reasoningContent && !reasoning ? reasoningContent : reasoning;
    const toolCall = this.parseToolCall(cleaned) ?? this.parseToolCall(response);
    const contentWithoutTools = this.removeToolCallMarkers(cleaned);

    return {
      content: contentWithoutTools,
      reasoning: finalReasoning,
      tool_call: toolCall,
    };
  }

  static removeToolCallMarkers(content: string): string {
    let cleaned = content;
    for (const pattern of this.TOOL_CALL_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }
    cleaned = cleaned.replace(/\n{2,}/g, '\n').trim();
    return cleaned;
  }
}

export const parseToolCall = AIResponseParser.parseToolCall;
export const parseReasoning = AIResponseParser.parseReasoning;
export const parseResponse = AIResponseParser.parseResponse;
