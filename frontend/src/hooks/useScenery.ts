/**
 * 窗景背景管理 Hook
 * 统一管理各页面的窗景背景设置
 */
import { useState, useEffect, useCallback } from 'react';

export type PageType = 'notes' | 'scroll' | 'files' | 'extensions' | 'charts';

export interface PageSceneryConfig {
  enabled: boolean;
  image: string;
  name: string;
  opacity: number; // 遮罩透明度 (0.05 ~ 0.5)
}

export interface SceneryItem {
  id: string;
  name: string;
  image: string;
}

const DEFAULT_SCENERY: SceneryItem = {
  id: 'default',
  name: '默认窗景',
  image: '/scenery/image.png',
};

// 本地存储键
const STORAGE_KEY = 'papyrus_scenery_settings';
const CUSTOM_SCENERIES_KEY = 'papyrus_custom_sceneries';
const START_PAGE_SCENERY_KEY = 'papyrus_start_page_scenery';

// 默认设置（各页面独立窗景配置）
const defaultPageSceneries: Record<PageType, PageSceneryConfig> = {
  notes: { enabled: false, image: '/scenery/image.png', name: '默认窗景', opacity: 0.15 },
  scroll: { enabled: false, image: '/scenery/image.png', name: '默认窗景', opacity: 0.15 },
  files: { enabled: false, image: '/scenery/image.png', name: '默认窗景', opacity: 0.15 },
  extensions: { enabled: false, image: '/scenery/image.png', name: '默认窗景', opacity: 0.15 },
  charts: { enabled: false, image: '/scenery/image.png', name: '默认窗景', opacity: 0.15 },
};

// 开始页面窗景设置（用于 DoneCard）
export interface StartPageSceneryConfig {
  enabled: boolean;
  image: string;
  name: string;
  opacity: number; // 遮罩透明度 (0.05 ~ 0.5)
}

const defaultStartPageScenery: StartPageSceneryConfig = {
  enabled: true,
  image: '/scenery/image.png',
  name: '默认窗景',
  opacity: 0.15,
};

// 加载页面设置
const loadSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        pageSceneries: { ...defaultPageSceneries, ...(parsed.pageSceneries || {}) },
      };
    }
  } catch {
    // ignore
  }
  return {
    pageSceneries: defaultPageSceneries,
  };
};

// 保存页面设置
const saveSettings = (pageSceneries: Record<PageType, PageSceneryConfig>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pageSceneries }));
  } catch {
    // ignore
  }
};

// 加载开始页面窗景设置（单独存储，用于 DoneCard）
export const loadStartPageScenery = (): StartPageSceneryConfig => {
  try {
    const saved = localStorage.getItem(START_PAGE_SCENERY_KEY);
    if (saved) {
      return { ...defaultStartPageScenery, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return defaultStartPageScenery;
};

// 保存开始页面窗景设置
export const saveStartPageScenery = (config: StartPageSceneryConfig) => {
  try {
    localStorage.setItem(START_PAGE_SCENERY_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
};

// 获取窗景透明度（供其他界面使用）
export const getSceneryOpacity = (): number => {
  const config = loadStartPageScenery();
  return config.opacity ?? defaultStartPageScenery.opacity;
};

// 加载自定义窗景库
const loadCustomSceneries = (): SceneryItem[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_SCENERIES_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return [];
};

// 保存自定义窗景库
const saveCustomSceneries = (sceneries: SceneryItem[]) => {
  try {
    localStorage.setItem(CUSTOM_SCENERIES_KEY, JSON.stringify(sceneries));
  } catch {
    // ignore
  }
};

// 获取所有可用窗景
export const getAllSceneries = (): SceneryItem[] => {
  return [DEFAULT_SCENERY, ...loadCustomSceneries()];
};

// Hook: 单页面窗景
export const usePageScenery = (page: PageType) => {
  const [config, setConfig] = useState<PageSceneryConfig>(defaultPageSceneries[page]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const { pageSceneries } = loadSettings();
    if (pageSceneries[page]) {
      setConfig(pageSceneries[page]);
    }
    setLoaded(true);
  }, [page]);

  const updateConfig = useCallback((updates: Partial<PageSceneryConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      const { pageSceneries } = loadSettings();
      pageSceneries[page] = newConfig;
      saveSettings(pageSceneries);
      return newConfig;
    });
  }, [page]);

  return { config, updateConfig, loaded };
};

// Hook: 开始页面窗景（用于 DoneCard）
export const useStartPageScenery = () => {
  const [config, setConfig] = useState<StartPageSceneryConfig>(defaultStartPageScenery);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConfig(loadStartPageScenery());
    setLoaded(true);
  }, []);

  const updateConfig = useCallback((updates: Partial<StartPageSceneryConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveStartPageScenery(newConfig);
      return newConfig;
    });
  }, []);

  return { config, updateConfig, loaded };
};

// Hook: 全局窗景管理
export const useSceneryManager = () => {
  const [customSceneries, setCustomSceneries] = useState<SceneryItem[]>([]);

  useEffect(() => {
    setCustomSceneries(loadCustomSceneries());
  }, []);

  const addCustomScenery = useCallback((name: string, image: string) => {
    const newScenery: SceneryItem = {
      id: Date.now().toString(),
      name: name || '自定义窗景',
      image,
    };
    const updated = [...customSceneries, newScenery];
    setCustomSceneries(updated);
    saveCustomSceneries(updated);
    return newScenery;
  }, [customSceneries]);

  const deleteCustomScenery = useCallback((id: string) => {
    const updated = customSceneries.filter(s => s.id !== id);
    setCustomSceneries(updated);
    saveCustomSceneries(updated);
  }, [customSceneries]);

  const allSceneries = [DEFAULT_SCENERY, ...customSceneries];

  return {
    customSceneries,
    allSceneries,
    addCustomScenery,
    deleteCustomScenery,
  };
};
