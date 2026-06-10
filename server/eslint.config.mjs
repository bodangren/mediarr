import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['src/**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // FR-2.4 / measure/code_styleguides/typescript.md:
          // `server/src/types/modelTypes.ts` must not export `any` aliases.
          // Every alias must be a Drizzle $inferSelect type so the data
          // layer is statically typed end-to-end.
          selector: "ExportNamedDeclaration > TSTypeAliasDeclaration[typeAnnotation.typeAnnotation.type='TSAnyKeyword']",
          message: 'modelTypes.ts aliases must be Drizzle $inferSelect types, not `any`. See chore_core_integrity_20260610 (FR-2.4).',
        },
      ],
    },
  },
]);
