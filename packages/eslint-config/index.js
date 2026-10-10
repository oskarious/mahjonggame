// Shared flat config, re-exported by the root eslint.config.js. It lives in its own workspace because typescript-eslint
// needs the TypeScript JS API, which TypeScript 7 (the repo's compiler) no longer ships: this package pins TS 6 for it.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
  { ignores: ['**/node_modules/', '**/.svelte-kit/', '**/build/', '**/dist/'] },
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // TypeScript already reports undefined names, and knows about type-only globals.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // For apps with a `paths.base`; ours is served from the root, so plain hrefs and goto() paths are right.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    // Migrations see the schema as it was at that point, not today's DB type: Kysely's docs use `Kysely<any>`.
    files: ['apps/web/migrations/**', 'apps/web/src/lib/server/migrate.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] } },
  },
);
