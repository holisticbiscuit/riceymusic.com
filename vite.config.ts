/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Custom domain (riceymusic.com) serves from root, so base '/'.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  // The Worker in worker/ runs its own tests.
  test: { include: ['src/**/*.test.ts'] },
})
