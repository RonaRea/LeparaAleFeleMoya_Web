import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { API_ORIGIN } from '../../shared/api-config'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_ORIGIN,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyRequest) => {
            proxyRequest.setHeader('origin', API_ORIGIN)
          })
        },
      },
    },
  },
})