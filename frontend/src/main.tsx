/**
 * Papyrus 前端入口
 * 
 * 功能：
 * - React 18 并发渲染
 * - Arco Design 组件库
 * - 无障碍支持（WCAG 2.1 AA/AAA）
 * - 深色模式检测
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';

import '@arco-design/web-react/es/_util/react-19-adapter';
import '@arco-design/web-react/dist/css/arco.css';
import './theme.css';  // 全局主题样式
import './a11y.css';  // 无障碍样式（WCAG 2.1 AA/AAA）
import './tailwind.css';  // Tailwind CSS

import App from './App';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ScreenReaderAnnouncerProvider } from './components/ScreenReaderAnnouncer';

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
const Root = () => (
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
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

// 使用并发渲染
createRoot(el).render(<Root />);
