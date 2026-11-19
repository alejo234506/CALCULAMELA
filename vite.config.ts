import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // math.js es una dependencia grande; el bundle es esperado.
    chunkSizeWarningLimit: 1200,
  },
})
