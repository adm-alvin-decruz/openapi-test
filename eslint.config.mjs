// eslint.config.js (flat config)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import n from 'eslint-plugin-n';

export default [
  // Base JS rules
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    ...tseslint.configs.recommendedTypeChecked,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true, // uses your tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
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
      // TS already checks undefined identifiers
      'no-undef': 'off',
    },
  },

  // JavaScript (CommonJS) files
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
      // turn off TS-only rules for JS
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      // handle unused vars in JS with underscore convention
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // optional Node checks
      'n/no-missing-require': 'error',
      'n/no-unsupported-features/es-syntax': 'off',
    },
  },

  // ✅ Jest test files (JS & TS)
  {
    files: [
      '**/*.test.js',
      '**/*.spec.js',
      '**/__tests__/**/*.js',
      '**/__test__/**/*.js',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.test.tsx',
      '**/*.spec.tsx',
    ],
    languageOptions: {
      globals: {
        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        // Sometimes flagged in strict sandboxes
        console: 'readonly',
      },
    },
    rules: {
      // keep your usual severity; underscore still allowed if you want:
      // 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
