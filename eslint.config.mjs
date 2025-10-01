// eslint.config.js (flat config)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import n from "eslint-plugin-n";

export default [
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules only for TS files
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...tseslint.configs.recommendedTypeChecked,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,            // uses your tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // JavaScript (CommonJS) files
  {
    files: ["**/*.js", "**/*.cjs"],
    plugins: { n },
    languageOptions: {
      sourceType: "commonjs",
      ecmaVersion: "latest",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      // turn off TS-only rules for JS
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",

      // handle unused vars in JS with underscore convention
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // optional Node checks
      "n/no-missing-require": "error",
      "n/no-unsupported-features/es-syntax": "off",
    },
  },
];
