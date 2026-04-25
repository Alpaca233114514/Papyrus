import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

interface AIResponseParserClass {
  parseReasoning(text: string): { cleaned: string; reasoning: string | null };
  parseToolCall(text: string): { tool: string; params: Record<string, unknown> } | null;
  parseResponse(text: string, reasoningContent?: string | null): { content: string; reasoning: string | null; tool_call: { tool: string; params: Record<string, unknown> } | null };
  removeToolCallMarkers(text: string): string;
}

interface CardToolsInstance {
  createCard(q: string, a: string, tags?: string[]): { success: boolean; card?: { q: string } };
  searchCards(keyword: string): { success: boolean; results?: Array<{ question: string }> };
  getCardStats(): { success: boolean; stats?: { total_cards: number } };
  executeTool(tool: string, params: Record<string, unknown>): { success: boolean; error?: string; new?: { q: string } };
  updateCard(index: number, q?: string, a?: string): { success: boolean; new?: { q: string } };
  deleteCard(index: number): { success: boolean };
  parseToolCall(text: string): { tool: string } | null;
}

const testDir = path.join(os.tmpdir(), `papyrus-ai-tools-test-${Date.now()}`);
let CardToolsCtor: new () => CardToolsInstance;
let AIResponseParserCtor: AIResponseParserClass;
let closeDb: () => void;

describe('AIResponseParser', () => {
  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.PAPYRUS_DATA_DIR = testDir;

    const tools = await import('../../src/ai/tools.js');
    CardToolsCtor = tools.CardTools;
    AIResponseParserCtor = tools.AIResponseParser;

    const db = await import('../../src/db/database.js');
    closeDb = db.closeDb;
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.PAPYRUS_DATA_DIR;
  });

  it('should parse reasoning tags', () => {
    const { cleaned, reasoning } = AIResponseParserCtor.parseReasoning('Hello <think>这是推理</think> world');
    expect(cleaned).toBe('Hello  world');
    expect(reasoning).toBe('这是推理');
  });

  it('should parse tool call from json block', () => {
    const tc = AIResponseParserCtor.parseToolCall('```json\n{"tool": "search_cards", "params": {"keyword": "test"}}\n```');
    expect(tc).not.toBeNull();
    expect(tc?.tool).toBe('search_cards');
  });

  it('should parse full response', () => {
    const result = AIResponseParserCtor.parseResponse('Answer\n```json\n{"tool": "get_card_stats", "params": {}}\n```');
    expect(result.content).toBe('Answer');
    expect(result.tool_call?.tool).toBe('get_card_stats');
  });

  it('should remove tool call markers', () => {
    const cleaned = AIResponseParserCtor.removeToolCallMarkers('Text\n```json\n{"tool": "x"}\n```\nMore');
    expect(cleaned).toBe('Text\nMore');
  });
});

describe('CardTools', () => {
  let tools: CardToolsInstance;

  beforeEach(() => {
    closeDb();
    const dbPath = path.join(testDir, 'papyrus.db');
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
    tools = new CardToolsCtor();
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.PAPYRUS_DATA_DIR;
  });

  it('should create card', () => {
    const result = tools.createCard('What is 2+2?', '4');
    expect(result.success).toBe(true);
    expect(result.card?.q).toBe('What is 2+2?');
  });

  it('should reject empty card', () => {
    const result = tools.createCard('', '');
    expect(result.success).toBe(false);
  });

  it('should search cards', () => {
    tools.createCard('Math question xyz', '42', ['math']);
    tools.createCard('History question', '1066', ['history']);
    const result = tools.searchCards('xyz');
    expect(result.success).toBe(true);
    expect(result.results?.some(r => r.question === 'Math question xyz')).toBe(true);
  });

  it('should get card stats', () => {
    const result = tools.getCardStats();
    expect(result.success).toBe(true);
    expect(result.stats).toBeDefined();
    expect(typeof result.stats?.total_cards).toBe('number');
  });

  it('should execute known tools', () => {
    tools.createCard('Q1', 'A1');
    const result = tools.executeTool('get_card_stats', {});
    expect(result.success).toBe(true);
  });

  it('should reject unknown tools', () => {
    const result = tools.executeTool('unknown_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should update a card', () => {
    tools.createCard('Old Q', 'Old A');
    const result = tools.updateCard(0, 'New Q', 'New A');
    expect(result.success).toBe(true);
    expect(result.new?.q).toBe('New Q');
  });

  it('should reject invalid card index for update', () => {
    const result = tools.updateCard(999, 'Q');
    expect(result.success).toBe(false);
  });

  it('should delete a card', () => {
    tools.createCard('Del', 'A');
    const result = tools.deleteCard(0);
    expect(result.success).toBe(true);
  });

  it('should reject invalid card index for delete', () => {
    const result = tools.deleteCard(999);
    expect(result.success).toBe(false);
  });

  it('should execute create_card via executeTool', () => {
    const result = tools.executeTool('create_card', { question: 'Q', answer: 'A' });
    expect(result.success).toBe(true);
  });

  it('should reject create_card with non-string params', () => {
    const result = tools.executeTool('create_card', { question: 123, answer: 'A' });
    expect(result.success).toBe(false);
  });

  it('should execute update_card via executeTool', () => {
    tools.createCard('Q', 'A');
    const result = tools.executeTool('update_card', { card_index: 0, question: 'New' });
    expect(result.success).toBe(true);
  });

  it('should reject update_card with invalid index type', () => {
    const result = tools.executeTool('update_card', { card_index: 'zero' });
    expect(result.success).toBe(false);
  });

  it('should execute delete_card via executeTool', () => {
    tools.createCard('Q', 'A');
    const result = tools.executeTool('delete_card', { card_index: 0 });
    expect(result.success).toBe(true);
  });

  it('should reject delete_card with invalid index type', () => {
    const result = tools.executeTool('delete_card', { card_index: 'zero' });
    expect(result.success).toBe(false);
  });

  it('should execute search_cards via executeTool', () => {
    tools.createCard('Math', '42');
    const result = tools.executeTool('search_cards', { keyword: 'math' });
    expect(result.success).toBe(true);
  });

  it('should reject search_cards with non-string keyword', () => {
    const result = tools.executeTool('search_cards', { keyword: 123 });
    expect(result.success).toBe(false);
  });

  it('should execute generate_practice_set via executeTool', () => {
    const result = tools.executeTool('generate_practice_set', { topic: 'Math', count: 3 });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should reject generate_practice_set with non-string topic', () => {
    const result = tools.executeTool('generate_practice_set', { topic: 123 });
    expect(result.success).toBe(false);
  });

  it('should parse tool call from AI response', () => {
    const tc = tools.parseToolCall('```json\n{"tool": "create_card", "params": {"question": "Q", "answer": "A"}}\n```');
    expect(tc).not.toBeNull();
    expect(tc?.tool).toBe('create_card');
  });

  it('should return null for invalid tool call json', () => {
    const tc = tools.parseToolCall('```json\nnot-json\n```');
    expect(tc).toBeNull();
  });

  it('should return null when params is not object', () => {
    const tc = tools.parseToolCall('```json\n{"tool": "x", "params": "string"}\n```');
    expect(tc).toBeNull();
  });

  it('should return null when tool is not string', () => {
    const tc = tools.parseToolCall('```json\n{"tool": 123, "params": {}}\n```');
    expect(tc).toBeNull();
  });
});

describe('AIResponseParser extended', () => {
  it('should parse multiple reasoning tags', () => {
    const { reasoning } = AIResponseParserCtor.parseReasoning('<think>A</think><think>B</think>');
    expect(reasoning).toBe('A\n\nB');
  });

  it('should fallback to reasoningContent param', () => {
    const result = AIResponseParserCtor.parseResponse('content', 'reasoning text');
    expect(result.reasoning).toBe('reasoning text');
  });

  it('should parse tool call with second pattern', () => {
    const tc = AIResponseParserCtor.parseToolCall('```\n{"tool":"x","params":null}\n```');
    expect(tc).not.toBeNull();
    expect(tc?.tool).toBe('x');
  });

  it('should return null when no tool call found', () => {
    expect(AIResponseParserCtor.parseToolCall('no tool here')).toBeNull();
  });

  it('should fallback to response for tool call when cleaned has none', () => {
    const result = AIResponseParserCtor.parseResponse('```json\n{"tool": "search_cards", "params": {}}\n```');
    expect(result.tool_call).not.toBeNull();
    expect(result.tool_call?.tool).toBe('search_cards');
  });

  it('should parse reasoning with reason tag', () => {
    const { cleaned, reasoning } = AIResponseParserCtor.parseReasoning('<reasoning>test</reasoning>');
    expect(reasoning).toBe('test');
    expect(cleaned).toBe('');
  });

  it('should parse reasoning with thought tag', () => {
    const { cleaned, reasoning } = AIResponseParserCtor.parseReasoning('<thought>test</thought>');
    expect(reasoning).toBe('test');
    expect(cleaned).toBe('');
  });

  it('should handle empty reasoning tags', () => {
    const { reasoning } = AIResponseParserCtor.parseReasoning('<think></think>');
    expect(reasoning).toBeNull();
  });

  it('should return null reasoning when no tags', () => {
    const { reasoning } = AIResponseParserCtor.parseReasoning('no tags');
    expect(reasoning).toBeNull();
  });

  it('should handle parseResponse without reasoning_content and no reasoning', () => {
    const result = AIResponseParserCtor.parseResponse('plain text');
    expect(result.reasoning).toBeNull();
    expect(result.content).toBe('plain text');
    expect(result.tool_call).toBeNull();
  });
});
