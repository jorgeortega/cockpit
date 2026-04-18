// ESLint flat config.
// Flat config (eslint.config.js, not .eslintrc.*) is ESLint 9's standard.
// We compose three layers:
//   1. @eslint/js — core JS recommended rules.
//   2. typescript-eslint — TS-aware rules + parser.
//   3. eslint-plugin-vue — SFC (Single File Component) parsing + Vue rules.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.config.*'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    // Vue SFCs need vue-eslint-parser; it delegates <script> blocks to the TS parser.
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: { ...globals.browser },
    },
  },

  {
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Allow unused vars prefixed with _ (common for "intentionally unused").
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Vue templates read better without PascalCase enforcement in this codebase.
      'vue/multi-word-component-names': 'off',
    },
  },
]
