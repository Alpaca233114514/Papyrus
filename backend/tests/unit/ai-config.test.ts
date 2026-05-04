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
    expect(config.config.current_provider).toBe('liyuan-deepseek');
    expect(config.config.current_model).toBe('deepseek-v4-pro');
    // providers are no longer hardcoded; database is the source of truth
    expect(config.config.providers).toEqual({});
  });

  it('should persist and reload config', () => {
    const config1 = new AIConfig(tempDir);
    // add provider manually so current_provider survives reload validation
    config1.config.providers['moonshot'] = {
      api_key: '',
      base_url: 'https://api.moonshot.cn/v1',
      models: ['kimi-k2.5'],
    };
    config1.config.current_provider = 'moonshot';
    config1.config.current_model = 'kimi-k2.5';
    config1.saveConfig();

    const config2 = new AIConfig(tempDir);
    expect(config2.config.current_provider).toBe('moonshot');
    expect(config2.config.current_model).toBe('kimi-k2.5');
  });

  it('should mask API keys in getMaskedConfig', () => {
    const config = new AIConfig(tempDir);
    config.config.providers['openai'] = { api_key: '', base_url: '', models: [] };
    config.config.providers['openai'].api_key = 'sk-test12345';

    const masked = config.getMaskedConfig();
    const maskedOpenai = masked.providers['openai'];
    if (!maskedOpenai) throw new Error('expected masked openai provider to exist');
    expect(maskedOpenai.api_key).not.toBe('sk-test12345');
    expect(maskedOpenai.api_key).toContain('*');
  });

  it('should mask short API keys completely', () => {
    const config = new AIConfig(tempDir);
    config.config.providers['openai'] = { api_key: '', base_url: '', models: [] };
    config.config.providers['openai'].api_key = 'abc';

    const masked = config.getMaskedConfig();
    const maskedOpenai = masked.providers['openai'];
    if (!maskedOpenai) throw new Error('expected masked openai provider to exist');
    expect(maskedOpenai.api_key).toBe('****');
  });

  it('should mask long API keys by preserving last 4 chars', () => {
    const config = new AIConfig(tempDir);
    config.config.providers['openai'] = { api_key: '', base_url: '', models: [] };
    config.config.providers['openai'].api_key = 'sk-very-long-key-1234';

    const masked = config.getMaskedConfig();
    const maskedOpenai = masked.providers['openai'];
    if (!maskedOpenai) throw new Error('expected masked openai provider to exist');
    expect(maskedOpenai.api_key).toMatch(/\*+1234$/);
    expect(maskedOpenai.api_key.length).toBe('sk-very-long-key-1234'.length);
  });

  it('should validate SSRF for cloud providers', () => {
    const config = new AIConfig(tempDir);
    config.config.providers['openai'] = { api_key: '', base_url: '', models: [] };
    config.config.providers['openai'].base_url = 'http://localhost:8080';
    expect(() => config.validateConfig()).toThrow('SSRF');
  });

  it('should allow localhost for ollama', () => {
    const config = new AIConfig(tempDir);
    config.config.providers['ollama'] = { api_key: '', base_url: '', models: [] };
    config.config.providers['ollama'].base_url = 'http://localhost:11434';
    expect(() => config.validateConfig()).not.toThrow();
  });

  it('should encrypt and decrypt API keys on save/load', () => {
    const config = new AIConfig(tempDir);
    config.config.providers['openai'] = { api_key: '', base_url: '', models: [] };
    config.config.providers['openai'].api_key = 'secret-key-123';
    config.saveConfig();

    const raw = fs.readFileSync(path.join(tempDir, 'ai_config.json'), 'utf8');
    expect(raw).not.toContain('secret-key-123');

    const config2 = new AIConfig(tempDir);
    const openai2 = config2.config.providers['openai'];
    if (!openai2) throw new Error('expected openai provider after reload');
    expect(openai2.api_key).toBe('secret-key-123');
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

  it('should handle empty api_key gracefully', () => {
    const config = new AIConfig(tempDir);
    config.config.providers['openai'] = { api_key: '', base_url: '', models: [] };
    expect(() => config.validateConfig()).not.toThrow();
  });

  it('should reject private IP for non-local providers', () => {
    const config = new AIConfig(tempDir);
    config.config.providers['openai'] = { api_key: '', base_url: '', models: [] };
    config.config.providers['openai'].base_url = 'http://192.168.1.100:8080';
    expect(() => config.validateConfig()).toThrow('SSRF');
  });

  it('should fallback to default provider when current_provider is invalid', () => {
    const configFile = path.join(tempDir, 'ai_config.json');
    fs.writeFileSync(configFile, JSON.stringify({
      providers: {
        moonshot: { api_key: '', base_url: 'https://api.moonshot.cn/v1', models: ['kimi-k2.5'] },
      },
      current_provider: 'nonexistent-provider',
      current_model: 'gpt-3.5-turbo',
      parameters: {},
      features: {},
      log: {},
    }), 'utf8');

    const config = new AIConfig(tempDir);
    expect(config.config.current_provider).toBe('liyuan-deepseek');
  });

  it('should preserve current_provider/current_model when providers field is empty (DB-managed)', () => {
    const configFile = path.join(tempDir, 'ai_config.json');
    fs.writeFileSync(configFile, JSON.stringify({
      current_provider: 'user-custom-provider',
      current_model: 'user-custom-model',
      parameters: {},
      features: {},
      log: {},
    }), 'utf8');

    const config = new AIConfig(tempDir);
    expect(config.config.current_provider).toBe('user-custom-provider');
    expect(config.config.current_model).toBe('user-custom-model');
  });
});
