/** @type {import('tailwindcss').Config} */
export default {
  // 使用前缀避免与 Arco Design 类名冲突
  prefix: 'tw-',
  
  // 扫描这些文件中的类名
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  
  // 禁用浏览器重置样式，避免覆盖 Arco Design
  corePlugins: {
    preflight: false,
  },
  
  // 主题扩展 - 映射 Arco Design 的 CSS 变量
  theme: {
    extend: {
      colors: {
        // 主色调
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          hover: 'var(--color-primary-hover)',
        },
        // 功能色
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          light: 'var(--color-danger-light)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
        },
        // Arco 背景色
        'arco-bg': {
          1: 'var(--color-bg-1)',
          2: 'var(--color-bg-2)',
          3: 'var(--color-bg-3)',
          4: 'var(--color-bg-4)',
          5: 'var(--color-bg-5)',
          white: 'var(--color-bg-white)',
          popup: 'var(--color-bg-popup)',
        },
        // Arco 文字色
        'arco-text': {
          1: 'var(--color-text-1)',
          2: 'var(--color-text-2)',
          3: 'var(--color-text-3)',
          4: 'var(--color-text-4)',
        },
        // Arco 填充色
        'arco-fill': {
          1: 'var(--color-fill-1)',
          2: 'var(--color-fill-2)',
          3: 'var(--color-fill-3)',
          4: 'var(--color-fill-4)',
        },
        // Arco 边框色
        'arco-border': {
          1: 'var(--color-border-1)',
          2: 'var(--color-border-2)',
          3: 'var(--color-border-3)',
          4: 'var(--color-border-4)',
          hover: 'var(--color-border-hover)',
        },
        // 链接色
        link: {
          DEFAULT: 'var(--color-link)',
          hover: 'var(--color-link-hover)',
          active: 'var(--color-link-active)',
        },
      },
      borderRadius: {
        'arco-sm': '2px',
        'arco': '4px',
        'arco-md': '4px',
        'arco-lg': '8px',
      },
    },
  },
  plugins: [],
}
