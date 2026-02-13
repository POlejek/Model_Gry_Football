import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Model_Gry_Football/',
  plugins: [react()],
  server: {
    host: true,
    port: 3000
  }
})
