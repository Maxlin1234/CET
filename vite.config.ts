import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { unzipPhpProxyPlugin } from './vite-plugin-unzip-proxy'
// 暫時關閉頁面底部 Vue DevTools 浮標；需要時再加回 vueDevTools()
// import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const unzipApiKey = String(env.UNZIP_API_KEY ?? '').trim()

  return {
    plugins: [
      vue(),
      unzipPhpProxyPlugin(unzipApiKey),
      // vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
