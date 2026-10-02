import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Model_Gry_Football/',
  plugins: [react()],
  server: {
    host: true,
    port: 3000
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**', 'src/main.jsx'],
      reporter: ['text-summary', 'html'],
      // Pure logic must stay well covered; the large editor components are covered by component and E2E tests.
      thresholds: {
        'src/utils/**': { statements: 85, lines: 85, branches: 80, functions: 75 },
      },
    },
  },
})
