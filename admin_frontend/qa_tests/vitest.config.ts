import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.join(root, 'src') } },
  test: {
    root,
    include: ['qa_tests/unit/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['qa_tests/unit/setup.ts'],
    reporters: ['default', ['json', { outputFile: 'qa_tests/results/vitest.json' }]],
  },
})
