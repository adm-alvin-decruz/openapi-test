// eslint.config.mjs
import fs from 'fs';
import path from 'path';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import n from 'eslint-plugin-n';
import prettierConfig from 'eslint-config-prettier';

const root = process.cwd();
const hasTsConfig = fs.existsSync(path.join(root, 'tsconfig.json'));
let hasTypeScript = false;
try {
  require.resolve('typescript', { paths: [root] });
  hasTypeScript = true;
} catch {
  hasTypeScript = false;
}

// ✅ reusable test file glob
const jestFiles = [
  '**/*.test.{js,ts,tsx}',
  '**/*.spec.{js,ts,tsx}',
  '**/__tests__/**/*.{js,ts,tsx}',
  '**/__test__/**/*.{js,ts,tsx}',
];

export default [
  // Base JS rules
  js.configs.recommended,

  // If TS is present, add TS rules
  ...(hasTypeScript && hasTsConfig
    ? [
        ...tseslint.configs.recommendedTypeChecked,
        {
          files: ['**/*.ts', '**/*.tsx'],
          languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
              project: true,
              tsconfigRootDir: root,
            },
          },
          plugins: { '@typescript-eslint': tseslint.plugin },
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
            'no-undef': 'off', // TS compiler already enforces this
          },
        },
      ]
    : []),

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

  // Jest test files
  {
    files: jestFiles,
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

  // Prettier config last to disable conflicting stylistic rules
  prettierConfig,
];
