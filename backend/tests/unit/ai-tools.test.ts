import { CardTools, AIResponseParser } from '../../src/ai/tools.js';

describe('AIResponseParser', () => {
  it('should parse reasoning tags', () => {
    const { cleaned, reasoning } = AIResponseParser.parseReasoning('Hello <think>这是推理</think> world');
    expect(cleaned).toBe('Hello  world');
    expect(reasoning).toBe('这是推理');
  });

  it('should parse tool call from json block', () => {
    const tc = AIResponseParser.parseToolCall('```json\n{"tool": "search_cards", "params": {"keyword": "test"}}\n```');
    expect(tc).not.toBeNull();
    expect(tc?.tool).toBe('search_cards');
  });

  it('should parse full response', () => {
    const result = AIResponseParser.parseResponse('Answer\n```json\n{"tool": "get_card_stats", "params": {}}\n```');
    expect(result.content).toBe('Answer');
    expect(result.tool_call?.tool).toBe('get_card_stats');
  });

  it('should remove tool call markers', () => {
    const cleaned = AIResponseParser.removeToolCallMarkers('Text\n```json\n{"tool": "x"}\n```\nMore');
    expect(cleaned).toBe('Text\nMore');
  });
});

describe('CardTools', () => {
  let tools: CardTools;

  beforeEach(() => {
    tools = new CardTools();
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
    expect(result.error).toContain('未知工具');
  });

  it('should parse tool call from AI response', () => {
    const tc = tools.parseToolCall('```json\n{"tool": "create_card", "params": {"question": "Q", "answer": "A"}}\n```');
    expect(tc).not.toBeNull();
    expect(tc?.tool).toBe('create_card');
  });
});
