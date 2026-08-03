import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'

const vitestGlobals = {
  vi: 'readonly', describe: 'readonly', it: 'readonly', test: 'readonly',
  expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
  beforeAll: 'readonly', afterAll: 'readonly',
};

export default defineConfig([
  globalIgnores(['dist', '.next']),
  {
    files: ['src/test/**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...vitestGlobals },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/no-direct-mutation-refs': 'off',
      'react-hooks/refs': 'off',
    },
  },
])
