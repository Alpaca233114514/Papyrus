import { AIConfig } from './config.js';
import { isPrivateUrl } from './config.js';
import { loadAllProviders, saveApiKey, saveProvider } from '../db/database.js';

/**
 * 从数据库同步 provider 配置到 AIConfig
 * - 动态创建 AIConfig 中缺失的 provider（如 deepseek）
 * - 同步 api_key、base_url、models
 * - 同步 isDefault provider 到 current_provider
 * - 私有地址的 provider 名称统一用 custom 避免 SSRF 校验失败
 */
export function syncDBToAIConfig(aiConfig: AIConfig): void {
  try {
    const dbProviders = loadAllProviders();
    if (dbProviders.length === 0) return;

    for (const dbProvider of dbProviders) {
      const providerType = dbProvider.type;
      if (!providerType) continue;

      const firstKey = dbProvider.apiKeys.find((k) => k.key.trim() !== '');
      const apiKey = firstKey?.key ?? '';
      const baseUrl = dbProvider.baseUrl ?? '';
      const models = dbProvider.models
        .filter((m) => m.enabled)
        .map((m) => m.modelId)
        .filter((m) => m.length > 0);

      // 决定 provider 在 aiConfig 中的名称
      // 如果 base_url 是私有地址且不是已知本地 provider，使用 'custom' 避免 SSRF
      const isLocal = ['ollama', 'lm-studio', 'localai', 'tabbyapi', 'koboldcpp', 'text-generation-webui', 'llamacpp'].includes(providerType);
      const providerName = (isPrivateUrl(baseUrl) && !isLocal && providerType !== 'custom') ? 'custom' : providerType;

      const existing = aiConfig.config.providers[providerName];
      if (existing) {
        if (apiKey) existing.api_key = apiKey;
        if (baseUrl) existing.base_url = baseUrl;
        if (models.length > 0) existing.models = models;
      } else {
        aiConfig.config.providers[providerName] = {
          api_key: apiKey,
          base_url: baseUrl,
          models: models.length > 0 ? models : [],
        };
      }

      // 同步默认 provider 到 current_provider
      if (dbProvider.isDefault && providerType) {
        aiConfig.config.current_provider = providerType;
        // 同时同步 current_model（如果当前 model 不在 provider 的 models 中）
        const providerModels = aiConfig.config.providers[providerName]?.models ?? [];
        const currentModel = aiConfig.config.current_model;
        if (providerModels.length > 0 && !providerModels.includes(currentModel)) {
          aiConfig.config.current_model = providerModels[0] ?? currentModel;
        }
      }
    }
  } catch (e) {
    console.warn('从数据库同步 AI 配置失败:', e instanceof Error ? e.message : String(e));
  }
}

/**
 * 将 AIConfig 中的 provider 配置回写到数据库
 * - 更新 api_keys 表中的默认 key
 * - 更新 base_url
 */
export function syncAIConfigToDB(aiConfig: AIConfig): void {
  try {
    const dbProviders = loadAllProviders();
    const dbProviderMap = new Map(dbProviders.map((p) => [p.type, p]));

    for (const [providerName, providerConfig] of Object.entries(aiConfig.config.providers)) {
      const dbProvider = dbProviderMap.get(providerName);
      if (!dbProvider) continue;

      const apiKey = providerConfig.api_key ?? '';
      const baseUrl = providerConfig.base_url ?? '';

      // 同步 base_url（如果不同）
      if (baseUrl && baseUrl !== dbProvider.baseUrl) {
        saveProvider({
          id: dbProvider.id,
          type: dbProvider.type,
          name: dbProvider.name,
          baseUrl: baseUrl,
          enabled: dbProvider.enabled,
          isDefault: dbProvider.isDefault,
        });
      }

      // 同步 api_key（如果非空且与现有不同）
      if (apiKey) {
        const existingKey = dbProvider.apiKeys.find((k) => k.key === apiKey);
        if (!existingKey) {
          const defaultKey = dbProvider.apiKeys[0];
          if (defaultKey) {
            saveApiKey(dbProvider.id, { id: defaultKey.id, name: defaultKey.name || 'default', key: apiKey });
          } else {
            saveApiKey(dbProvider.id, { name: 'default', key: apiKey });
          }
        }
      }
    }
  } catch (e) {
    console.warn('同步 AI 配置到数据库失败:', e instanceof Error ? e.message : String(e));
  }
}

/**
 * 从数据库获取指定 provider 的第一个非空 API key
 * 用于 /chat 和 /completion 的临时 fallback
 */
export function getProviderApiKeyFromDB(providerType: string): string | null {
  try {
    const dbProviders = loadAllProviders();
    const dbProvider = dbProviders.find((p) => p.type === providerType);
    if (!dbProvider) return null;
    const firstKey = dbProvider.apiKeys.find((k) => k.key.trim() !== '');
    return firstKey?.key ?? null;
  } catch (e) {
    console.warn('从数据库获取 API key 失败:', e instanceof Error ? e.message : String(e));
    return null;
  }
}
