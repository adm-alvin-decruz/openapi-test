// eslint.config.mjs
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Ignore build artifacts
  { ignores: ['dist/**', 'node_modules/**'] },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (parser + plugin presets)
  ...tseslint.configs.recommended,

  // Disable formatting rules that Prettier handles
  prettier,

  // Project-wide rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      eqeqeq: 'error',
      'prefer-const': 'error',
    },
  },

  // Jest test files (allow describe/it/expect, etc.)
  {
    files: ['src/__test__/**/*.{js,jsx,ts,tsx}', 'src/**/__tests__/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
];
