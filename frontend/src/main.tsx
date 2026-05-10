/**
 * Papyrus 前端入口
 * 
 * 功能：
 * - React 18 并发渲染
 * - Arco Design 组件库
 * - 无障碍支持（WCAG 2.1 AA/AAA）
 * - 深色模式检测
 */
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';

import '@arco-design/web-react/es/_util/react-19-adapter';
import '@arco-design/web-react/dist/css/arco.css';
import './theme.css';  // 全局主题样式
import './a11y.css';  // 无障碍样式（WCAG 2.1 AA/AAA）
import './tailwind.css';  // Tailwind CSS

import App from './App';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ScreenReaderAnnouncerProvider } from './components/ScreenReaderAnnouncer';

// 初始化 i18n
import('./i18n');

const el = document.getElementById('root');
if (!el) throw new Error('Missing #root');

// ============================================
// 系统偏好检测
// ============================================

// 检测深色模式偏好
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) {
  document.body.setAttribute('arco-theme', 'dark');
}

// 初始化字体大小
try {
  const savedFontSize = localStorage.getItem('papyrus_font_size');
  if (savedFontSize) document.body.dataset.fontSize = savedFontSize;
} catch { /* ignore */ }

// 监听深色模式变化
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const handleDarkModeChange = (e: MediaQueryListEvent) => {
  if (e.matches) {
    document.body.setAttribute('arco-theme', 'dark');
  } else {
    document.body.removeAttribute('arco-theme');
  }
};
darkModeQuery.addEventListener('change', handleDarkModeChange);

// HMR cleanup: remove listener on hot reload to prevent duplicate listeners
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    darkModeQuery.removeEventListener('change', handleDarkModeChange);
  });
}

// ============================================
// 渲染应用
// ============================================

/**
 * 应用根组件
 * 包装所有必要的 Provider
 */
const LOCALE_MAP: Record<string, typeof zhCN> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// 动态更新启动屏幕文本
const updateSplashScreenText = async () => {
  try {
    const { default: i18n, init } = await import('./i18n');
    await init;
    const hintEl = document.querySelector('.splash-screen .hint');
    if (hintEl) {
      hintEl.textContent = i18n.t('settings.splashScreen');
    }
  } catch (e) {
    console.warn('Failed to update splash screen text:', e);
  }
};

const Root = () => {
  const [localeKey, setLocaleKey] = useState(() => {
    try { return localStorage.getItem('papyrus_language') ?? 'zh-CN'; }
    catch { return 'zh-CN'; }
  });

  const locale = LOCALE_MAP[localeKey] ?? zhCN;

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'papyrus_language') {
        setLocaleKey(e.newValue ?? 'zh-CN');
      }
    };
    window.addEventListener('storage', handler);
    // 更新启动屏幕文本
    updateSplashScreenText();
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <React.StrictMode>
      <ConfigProvider locale={locale}>
        {/* 无障碍设置管理 */}
        <AccessibilityProvider>
          {/* 屏幕阅读器通知系统 */}
          <ScreenReaderAnnouncerProvider timeout={2000}>
            <App />
          </ScreenReaderAnnouncerProvider>
        </AccessibilityProvider>
      </ConfigProvider>
    </React.StrictMode>
  );
};

// 使用并发渲染
createRoot(el).render(<Root />);
