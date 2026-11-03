import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.prototypes', 'worker', 'legacy']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Worlds draws with three.js: scene objects, uniforms and refs are meant to be changed every
    // frame inside useFrame, which these React Compiler rules read as mistakes. (The compiler
    // isn't used here.) Its shared pieces also live beside the components that use them.
    files: ['src/worlds/**/*.{ts,tsx}', 'src/pages/Worlds.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/use-memo': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
