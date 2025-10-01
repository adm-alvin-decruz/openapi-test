// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import n from 'eslint-plugin-n';

export default [
  // Base JS rules
  js.configs.recommended,

  // TypeScript recommended configs (spread as array, not inline object!)
  ...tseslint.configs.recommendedTypeChecked,

  // Your TypeScript overrides
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
      'no-undef': 'off', // TS already does this
    },
  },

  // JavaScript overrides
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
    files: [
      '**/*.test.{js,ts,tsx}',
      '**/*.spec.{js,ts,tsx}',
      '**/__tests__/**/*.{js,ts,tsx}',
      '**/__test__/**/*.{js,ts,tsx}',
    ],
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
];
