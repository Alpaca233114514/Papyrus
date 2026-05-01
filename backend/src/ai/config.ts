import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../utils/paths.js';
import { encryptApiKey, decryptApiKey } from '../core/crypto.js';

export interface ProviderConfig {
  api_key: string;
  base_url: string;
  models: string[];
}

export interface ParametersConfig {
  temperature: number;
  top_p: number;
  max_tokens: number;
  presence_penalty: number;
  frequency_penalty: number;
}

export interface FeaturesConfig {
  auto_hint: boolean;
  auto_explain: boolean;
  context_length: number;
  agent_enabled: boolean;
  cache_enabled: boolean;
}

export interface LogConfig {
  log_dir: string;
  log_level: string;
  max_log_files: number;
  log_rotation: boolean;
}

export interface AIConfigData {
  providers: Record<string, ProviderConfig>;
  current_provider: string;
  current_model: string;
  parameters: ParametersConfig;
  features: FeaturesConfig;
  log: LogConfig;
}

const LOCAL_PROVIDERS = new Set([
  'ollama',
  'lm-studio',
  'localai',
  'tabbyapi',
  'koboldcpp',
  'text-generation-webui',
  'llamacpp',
]);

function toFloat(value: unknown, defaultValue: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

function toInt(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

function toStr(value: unknown, defaultValue = ''): string {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

function toStrList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item ?? ''));
}

function isValidAscii(text: string): boolean {
  return /^[\x00-\x7F]*$/.test(text);
}

export function isPrivateUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)) {
      return true;
    }
    if (/^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.|::1$)/.test(hostname)) {
      return true;
    }
  } catch {
    // ignore invalid URLs
  }
  return false;
}

export class AIConfig {
  configFile: string;
  config: AIConfigData;

  constructor(dataDir: string = paths.dataDir) {
    this.configFile = path.join(dataDir, 'ai_config.json');
    this.config = this.buildDefaultConfig();
    this.loadConfig();
  }

  private buildDefaultConfig(): AIConfigData {
    const defaultLogDir = path.join(paths.dataDir, 'logs');
    return {
      providers: {},
      current_provider: 'openai',
      current_model: 'gpt-4o',
      parameters: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000,
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
      },
      features: {
        auto_hint: false,
        auto_explain: false,
        context_length: 10,
        agent_enabled: false,
        cache_enabled: false,
      },
      log: {
        log_dir: defaultLogDir,
        log_level: 'DEBUG',
        max_log_files: 10,
        log_rotation: false,
      },
    };
  }

  private normalizeProviderConfig(raw: unknown, fallback: ProviderConfig): ProviderConfig {
    const normalized: ProviderConfig = {
      api_key: fallback.api_key,
      base_url: fallback.base_url,
      models: [...fallback.models],
    };
    if (raw === null || typeof raw !== 'object') return normalized;
    const dict = raw as Record<string, unknown>;
    if (dict.api_key !== undefined) normalized.api_key = toStr(dict.api_key);
    if (dict.base_url !== undefined) normalized.base_url = toStr(dict.base_url);
    if (Array.isArray(dict.models)) normalized.models = toStrList(dict.models);
    return normalized;
  }

  private normalizeParametersConfig(raw: unknown, fallback: ParametersConfig): ParametersConfig {
    const normalized = { ...fallback };
    if (raw === null || typeof raw !== 'object') return normalized;
    const dict = raw as Record<string, unknown>;
    if (dict.temperature !== undefined) normalized.temperature = toFloat(dict.temperature, normalized.temperature);
    if (dict.top_p !== undefined) normalized.top_p = toFloat(dict.top_p, normalized.top_p);
    if (dict.max_tokens !== undefined) normalized.max_tokens = toInt(dict.max_tokens, normalized.max_tokens);
    if (dict.presence_penalty !== undefined) normalized.presence_penalty = toFloat(dict.presence_penalty, normalized.presence_penalty);
    if (dict.frequency_penalty !== undefined) normalized.frequency_penalty = toFloat(dict.frequency_penalty, normalized.frequency_penalty);
    return normalized;
  }

  private normalizeFeaturesConfig(raw: unknown, fallback: FeaturesConfig): FeaturesConfig {
    if (raw === null || typeof raw !== 'object') return { ...fallback };
    const dict = raw as Record<string, unknown>;
    return {
      auto_hint: Boolean(dict.auto_hint ?? fallback.auto_hint),
      auto_explain: Boolean(dict.auto_explain ?? fallback.auto_explain),
      context_length: toInt(dict.context_length ?? fallback.context_length, fallback.context_length),
      agent_enabled: Boolean(dict.agent_enabled ?? fallback.agent_enabled),
      cache_enabled: Boolean(dict.cache_enabled ?? fallback.cache_enabled),
    };
  }

  private normalizeLogConfig(raw: unknown, fallback: LogConfig): LogConfig {
    if (raw === null || typeof raw !== 'object') return { ...fallback };
    const dict = raw as Record<string, unknown>;
    const defaultLogDir = path.join(paths.dataDir, 'logs');
    return {
      log_dir: dict.log_dir !== undefined ? toStr(dict.log_dir, fallback.log_dir) : fallback.log_dir,
      log_level: dict.log_level !== undefined ? toStr(dict.log_level, fallback.log_level) : fallback.log_level,
      max_log_files: toInt(dict.max_log_files ?? fallback.max_log_files, fallback.max_log_files),
      log_rotation: Boolean(dict.log_rotation ?? fallback.log_rotation),
    };
  }

  loadConfig(): void {
    const defaultConfig = this.buildDefaultConfig();

    if (!fs.existsSync(this.configFile)) {
      this.config = defaultConfig;
      this.saveConfig();
      return;
    }

    try {
      const content = fs.readFileSync(this.configFile, 'utf8');
      const loaded: unknown = JSON.parse(content);
      if (loaded === null || typeof loaded !== 'object') {
        this.config = defaultConfig;
        return;
      }
      const dict = loaded as Record<string, unknown>;

      const providersRaw = dict.providers;
      const providersDict = providersRaw !== null && typeof providersRaw === 'object' ? (providersRaw as Record<string, unknown>) : {};
      const normalizedProviders: Record<string, ProviderConfig> = {};
      // 只加载配置文件中实际存在的 provider，不再用硬编码默认值恢复
      for (const [providerName, providerConfig] of Object.entries(providersDict)) {
        const fallback: ProviderConfig = {
          api_key: '',
          base_url: '',
          models: [],
        };
        normalizedProviders[providerName] = this.normalizeProviderConfig(providerConfig, fallback);
      }

      let currentProvider = toStr(dict.current_provider, defaultConfig.current_provider);
      if (!(currentProvider in normalizedProviders)) {
        currentProvider = defaultConfig.current_provider;
      }

      let currentModel = toStr(dict.current_model, defaultConfig.current_model);
      const providerModels = normalizedProviders[currentProvider]?.models ?? [];
      if (!providerModels.includes(currentModel)) {
        currentModel = providerModels[0] ?? defaultConfig.current_model;
      }

      this.config = {
        providers: normalizedProviders,
        current_provider: currentProvider,
        current_model: currentModel,
        parameters: this.normalizeParametersConfig(dict.parameters, defaultConfig.parameters),
        features: this.normalizeFeaturesConfig(dict.features, defaultConfig.features),
        log: this.normalizeLogConfig(dict.log, defaultConfig.log),
      };
      this.decryptProviderKeys();
    } catch (e) {
      console.error('AI 配置加载失败，已重置为默认配置:', e instanceof Error ? e.message : String(e));
      this.config = defaultConfig;
    }
  }

  validateConfig(): void {
    const errors: string[] = [];
    for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
      const apiKey = providerConfig.api_key;
      if (apiKey && !isValidAscii(apiKey)) {
        errors.push(`${providerName.toUpperCase()} 的 API Key 中包含非法字符（如中文或特殊空格）`);
      }
      const baseUrl = providerConfig.base_url;
      if (baseUrl && !isValidAscii(baseUrl)) {
        errors.push(`${providerName.toUpperCase()} 的 Base URL 中包含非法字符`);
      }
      if (baseUrl && isPrivateUrl(baseUrl)) {
        const isLocal = LOCAL_PROVIDERS.has(providerName);
        const isCustom = providerName === 'custom';
        if (!isLocal && !isCustom) {
          errors.push(`${providerName.toUpperCase()} 的 Base URL 指向私有地址，存在 SSRF 风险。请使用公网 API 地址，或将 provider 名称改为已知的本地模型标识`);
        }
      }
    }
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  }

  saveConfig(): void {
    this.validateConfig();
    const dir = path.dirname(this.configFile);
    if (dir) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const configToSave = this.configWithEncryptedKeys();
    const tempFile = `${this.configFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(configToSave, null, 2), 'utf8');
    fs.renameSync(tempFile, this.configFile);
  }

  private configWithEncryptedKeys(): AIConfigData {
    const cfg: AIConfigData = JSON.parse(JSON.stringify(this.config));
    for (const provider of Object.values(cfg.providers)) {
      const key = provider.api_key;
      if (key && !key.startsWith('enc:')) {
        provider.api_key = encryptApiKey(key);
      }
    }
    return cfg;
  }

  private decryptProviderKeys(): void {
    for (const provider of Object.values(this.config.providers)) {
      const key = provider.api_key;
      if (key && (key.startsWith('enc:') || key.startsWith('plain:'))) {
        provider.api_key = decryptApiKey(key);
      }
    }
  }

  getMaskedConfig(): AIConfigData {
    const cfg: AIConfigData = JSON.parse(JSON.stringify(this.config));
    for (const provider of Object.values(cfg.providers)) {
      const key = provider.api_key;
      if (key) {
        provider.api_key = key.length > 4 ? '*'.repeat(key.length - 4) + key.slice(-4) : '****';
      }
    }
    return cfg;
  }

  getProviderConfig(): ProviderConfig {
    const providerName = this.config.current_provider;
    const providerConfig = this.config.providers[providerName];
    if (!providerConfig) {
      throw new Error(`未知 provider: ${providerName}`);
    }
    return providerConfig;
  }

  getCurrentModel(): string {
    return this.config.current_model;
  }

  getParameters(): ParametersConfig {
    return this.config.parameters;
  }

  getLogConfig(): LogConfig {
    return this.config.log;
  }

  setLogConfig(config: LogConfig): void {
    this.config.log = this.normalizeLogConfig(config, this.buildDefaultConfig().log);
    this.saveConfig();
  }
}
