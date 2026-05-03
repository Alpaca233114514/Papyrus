import { AIConfig } from './config.js';
import { paths } from '../utils/paths.js';
import { syncAIConfigToDB, syncDBToAIConfig } from './db-sync.js';

export let aiConfig = new AIConfig(paths.dataDir);

export function resetAIConfig(dataDir?: string): void {
  aiConfig = new AIConfig(dataDir ?? paths.dataDir);
}

export function initAIConfig(): void {
  try {
    syncAIConfigToDB(aiConfig);
    syncDBToAIConfig(aiConfig);
    aiConfig.saveConfig();
  } catch (e) {
    console.warn('启动时同步 AI 配置失败:', e instanceof Error ? e.message : String(e));
  }
}
