import { randomUUID } from 'node:crypto';
import { AIConfig } from './config.js';
import { loadAllProviders, saveProvider, saveApiKey, saveModel } from '../db/database.js';

function isMaskedKey(key: string): boolean {
  return key.length > 0 && key.startsWith('*');
}

/**
 * 从数据库同步全局配置到 AIConfig
 * - 同步 isDefault provider 到 current_provider / current_model
 * - 不再同步 provider 列表（数据库为唯一事实来源）
 */
export function syncDBToAIConfig(aiConfig: AIConfig): void {
  try {
    const dbProviders = loadAllProviders();
    if (dbProviders.length === 0) return;

    // 只在当前 provider 无效时，才同步默认 provider
    const currentProviderType = aiConfig.config.current_provider;
    const currentProviderValid = dbProviders.some(
      (p) => p.type === currentProviderType && p.enabled
    );

    if (!currentProviderValid) {
      const defaultProvider = dbProviders.find((p) => p.isDefault);
      if (defaultProvider && defaultProvider.type) {
        aiConfig.config.current_provider = defaultProvider.type;
        const enabledModels = defaultProvider.models
          .filter((m) => m.enabled)
          .map((m) => m.modelId);
        const currentModel = aiConfig.config.current_model;
        if (enabledModels.length > 0 && !enabledModels.includes(currentModel)) {
          aiConfig.config.current_model = enabledModels[0] ?? currentModel;
        }
      }
    }
  } catch (e) {
    console.warn('从数据库同步 AI 配置失败:', e instanceof Error ? e.message : String(e));
  }
}

/**
 * 将 AIConfig 中的 provider 配置同步到数据库
 * 确保 POST /api/config/ai 设置的 api_key / base_url / models 能被后续路由读取
 */
export function syncAIConfigToDB(aiConfig: AIConfig): void {
  try {
    const dbProviders = loadAllProviders();
    for (const [providerType, providerConfig] of Object.entries(aiConfig.config.providers)) {
      const sameType = dbProviders.filter((p) => p.type === providerType);
      if (sameType.length > 1) {
        console.warn(`[syncAIConfigToDB] 发现 ${sameType.length} 个同名 provider type "${providerType}"，使用第一个`);
      }
      const existing = sameType[0];
      const providerId = existing?.id ?? `p-${providerType}-${randomUUID()}`;

      try {
        saveProvider({
          id: providerId,
          type: providerType,
          name: existing?.name ?? providerType,
          baseUrl: providerConfig.base_url,
          enabled: true,
          isDefault: aiConfig.config.current_provider === providerType,
        });

        const existingKey = existing?.apiKeys[0];
        if (!isMaskedKey(providerConfig.api_key)) {
          saveApiKey(providerId, {
            id: existingKey?.id ?? `${providerId}-key`,
            name: 'default',
            key: providerConfig.api_key,
          });
        }

        for (const modelId of providerConfig.models) {
          if (modelId) {
            saveModel(providerId, {
              id: `${providerId}-${modelId}`,
              modelId,
              name: modelId,
              enabled: true,
            });
          }
        }
      } catch (innerErr) {
        console.warn(`[syncAIConfigToDB] 同步 provider "${providerType}" 失败:`, innerErr instanceof Error ? innerErr.message : String(innerErr));
      }
    }
  } catch (e) {
    console.warn('同步 AI 配置到数据库失败:', e instanceof Error ? e.message : String(e));
  }
}

/**
 * 从数据库获取指定 provider 的完整运行时配置
 * 用于替代 aiConfig.config.providers 的硬编码读取
 */
export function getProviderConfigFromDB(providerType: string): {
  api_key: string;
  base_url: string;
  models: string[];
} | null {
  try {
    const dbProviders = loadAllProviders();
    const dbProvider = dbProviders.find((p) => p.type === providerType);
    if (!dbProvider) return null;
    const firstKey = dbProvider.apiKeys.find((k) => k.key.trim() !== '');
    return {
      api_key: firstKey?.key ?? '',
      base_url: dbProvider.baseUrl ?? '',
      models: dbProvider.models
        .filter((m) => m.enabled)
        .map((m) => m.modelId)
        .filter((m) => m.length > 0),
    };
  } catch (e) {
    console.warn('从数据库获取 provider 配置失败:', e instanceof Error ? e.message : String(e));
    return null;
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
