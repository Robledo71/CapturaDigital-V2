import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['back/services/**', 'app/actions/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'tests/__mocks__/server-only.ts'),
      'next/headers': path.resolve(__dirname, 'tests/__mocks__/next-headers.ts'),
      'next/cache': path.resolve(__dirname, 'tests/__mocks__/next-cache.ts'),
      'next/navigation': path.resolve(__dirname, 'tests/__mocks__/next-navigation.ts'),
    },
  },
})
