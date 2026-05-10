import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const rootPkg = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')
)
const appVersion = rootPkg.version ?? 'unknown'

// TS + React 19 + Arco scaffold
export default defineConfig({
  base: './', // Required for Electron to load files locally
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react({
      // keep classic runtime if you still want `import React from 'react'`
      // jsxRuntime: 'classic',
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 把大的第三方库拆分成单独的 chunk，便于缓存
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'arco-vendor': ['@arco-design/web-react'],
        }
      }
    },
    // 生产构建时不生成 source map，加快构建
    sourcemap: false,
  },
})
