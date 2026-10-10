import { defineConfig } from 'vitest/config'

// Site tests only; the Worker in worker/ runs its own.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
})
