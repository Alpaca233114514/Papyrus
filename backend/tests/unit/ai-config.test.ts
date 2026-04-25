import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AIConfig } from '../../src/ai/config.js';

describe('AIConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'papyrus-ai-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create default config when file does not exist', () => {
    const config = new AIConfig(tempDir);
    expect(config.config.current_provider).toBe('openai');
    expect(config.config.current_model).toBe('gpt-3.5-turbo');
    expect(config.config.providers.openai.base_url).toBe('https://api.openai.com/v1');
  });

  it('should persist and reload config', () => {
    const config1 = new AIConfig(tempDir);
    config1.config.current_provider = 'moonshot';
    config1.config.current_model = 'kimi-k2.5';
    config1.saveConfig();

    const config2 = new AIConfig(tempDir);
    expect(config2.config.current_provider).toBe('moonshot');
    expect(config2.config.current_model).toBe('kimi-k2.5');
  });

  it('should mask API keys in getMaskedConfig', () => {
    const config = new AIConfig(tempDir);
    config.config.providers.openai.api_key = 'sk-test12345';
    const masked = config.getMaskedConfig();
    expect(masked.providers.openai.api_key).not.toBe('sk-test12345');
    expect(masked.providers.openai.api_key).toContain('*');
  });

  it('should validate SSRF for cloud providers', () => {
    const config = new AIConfig(tempDir);
    config.config.providers.openai.base_url = 'http://localhost:8080';
    expect(() => config.validateConfig()).toThrow('SSRF');
  });

  it('should allow localhost for ollama', () => {
    const config = new AIConfig(tempDir);
    config.config.providers.ollama.base_url = 'http://localhost:11434';
    expect(() => config.validateConfig()).not.toThrow();
  });

  it('should encrypt and decrypt API keys on save/load', () => {
    const config = new AIConfig(tempDir);
    config.config.providers.openai.api_key = 'secret-key-123';
    config.saveConfig();

    const raw = fs.readFileSync(path.join(tempDir, 'ai_config.json'), 'utf8');
    expect(raw).not.toContain('secret-key-123');

    const config2 = new AIConfig(tempDir);
    expect(config2.config.providers.openai.api_key).toBe('secret-key-123');
  });

  it('should normalize invalid parameters on load', () => {
    const configFile = path.join(tempDir, 'ai_config.json');
    fs.writeFileSync(configFile, JSON.stringify({
      current_provider: 'openai',
      current_model: 'gpt-3.5-turbo',
      parameters: {
        temperature: 'invalid',
        max_tokens: 'also-invalid',
      },
    }), 'utf8');

    const config = new AIConfig(tempDir);
    expect(config.config.parameters.temperature).toBe(0.7);
    expect(config.config.parameters.max_tokens).toBe(2000);
  });
});
