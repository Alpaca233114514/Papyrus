import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';

import '@arco-design/web-react/es/_util/react-19-adapter';
import '@arco-design/web-react/dist/css/arco.css';
import './theme.css';  // 全局主题样式
import './a11y.css';  // 无障碍样式

import App from './App';

const el = document.getElementById('root');
if (!el) throw new Error('Missing #root');

// 检测系统主题偏好
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) {
  document.body.setAttribute('arco-theme', 'dark');
}

createRoot(el).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);