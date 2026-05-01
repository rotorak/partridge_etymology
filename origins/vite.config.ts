import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['sqlite-wasm-http'],
  },
  server: {
    headers: {
      'Accept-Ranges': 'bytes',
      'Access-Control-Expose-Headers': '*',
    },
  },
})
