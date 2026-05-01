import { AIConfig } from './config.js';
import { loadAllProviders } from '../db/database.js';

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
 * 将 AIConfig 中的全局配置回写到数据库
 * Phase 1 中不再同步 provider 列表（数据库为唯一事实来源）
 */
export function syncAIConfigToDB(_aiConfig: AIConfig): void {
  // Provider 配置已在数据库中维护，AIConfig 不再作为 provider 的存储介质
  // 此函数保留用于未来扩展全局参数的双向同步
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
