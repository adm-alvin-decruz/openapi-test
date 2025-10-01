// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import n from 'eslint-plugin-n';
import prettierConfig from 'eslint-config-prettier'; // ✅ import prettier config

// ✅ reuseable glob for test files
const jestFiles = [
  '**/*.test.{js,ts,tsx}',
  '**/*.spec.{js,ts,tsx}',
  '**/__tests__/**/*.{js,ts,tsx}',
  '**/__test__/**/*.{js,ts,tsx}',
];

export default [
  // Base JS rules
  js.configs.recommended,

  // TypeScript recommended configs
  ...tseslint.configs.recommendedTypeChecked,

  // TypeScript overrides
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // handled by TS, no need for eslint duplicate
      'no-undef': 'off',
    },
  },

  // JavaScript (CommonJS) overrides
  {
    files: ['**/*.js', '**/*.cjs'],
    plugins: { n },
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'n/no-missing-require': 'error',
      'n/no-unsupported-features/es-syntax': 'off',
    },
  },

  // Jest tests
  {
    files: jestFiles, // ✅ reuse constant
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        console: 'readonly',
      },
    },
  },

  // ✅ Prettier config goes last to disable conflicting stylistic rules
  prettierConfig,
];
