// Flat config port of the former .eslintrc.cjs (ESLint 10 dropped eslintrc).
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  { ignores: ['dist', 'dist-electron', 'release'] },
  {
    files: ['**/*.{ts,tsx}'],
    ...js.configs.recommended,
  },
  ...tsPlugin.configs['flat/recommended'].map((config) => ({
    files: ['**/*.{ts,tsx}'],
    ...config,
  })),
  {
    files: ['**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // New in typescript-eslint 8 recommended; it flags the existing
      // shadcn/ui InputProps interface, so warn until that is reworked.
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
]
