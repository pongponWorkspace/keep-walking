// Root ESLint flat config. Rules and their reasons: docs/adr/0001-repo-layout.md
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Numbers that are never "magic": identity, sign, halving/doubling, percent base. */
const ALLOWED_NUMBERS = [-1, 0, 1, 2, 100];

/** apps/* and packages/* must never depend on offline tools (ADR 0001). */
const TOOLS_IMPORT_BAN = {
  patterns: [
    {
      group: ['**/tools/**', '@keep-walking/tools-*'],
      message:
        'apps/* and packages/* must not import from tools/*. Move shared logic to packages/shared (ADR 0001).',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.wrangler/**',
      'reports/**',
      'test-results/**',
      'playwright-report/**',
      'tools/coverage/**',
      'config/**',
      'data/**',
      'design/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // All balance values come from config (CLAUDE.md non-negotiable 3).
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: ALLOWED_NUMBERS,
          ignoreArrayIndexes: true,
          ignoreDefaultValues: false,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: false,
          ignoreTypeIndexes: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', TOOLS_IMPORT_BAN],
    },
  },
  {
    files: ['apps/**/*.{js,mjs,cjs}', 'packages/**/*.{js,mjs,cjs}'],
    rules: {
      'no-restricted-imports': ['error', TOOLS_IMPORT_BAN],
    },
  },
  // No override for tools/sim/src/vectors*.ts (P1-X05 decision under ADR 0001 3.5): after
  // P1-X04 those files lint clean under the full rule set (config-derived boundaries come from
  // SimParams / EconomyRefs, example inputs are named consts in CASE). Adding a blanket
  // no-magic-numbers override would only hide future hard-coded balance values.
  {
    // Tests, golden-vector fixtures, and tool/config files may use literal numbers.
    files: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/test/**/*.ts',
      '**/e2e/**/*.ts',
      'qa/tests/**/*.ts',
      '*.config.ts',
      '*.config.js',
    ],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  {
    // Offline CLI tools print to the terminal.
    files: ['tools/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
