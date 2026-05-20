import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Ordenação de imports: agrupa por tipo para facilitar leitura
      'sort-imports': [
        'warn',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true, // Deixa a ordem de declarações livres (ferramentas de auto-fix cuidam)
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        },
      ],
      // Prevenir imports não utilizados (TypeScript já faz, mas reforça no lint)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Garantir consistência de tipos de import
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      // ===== TYPESCRIPT STRICT MODE ENFORCEMENT =====
      // Proibir uso de `any` type (Phase 5 - Prevention)
      '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: false }],
      // Proibir acesso unsafe a members (ex: obj[key] sem validação)
      '@typescript-eslint/no-unsafe-member-access': ['warn'],
      // Proibir assignments unsafe (ex: any → typed variable)
      '@typescript-eslint/no-unsafe-assignment': ['warn'],
      // Proibir call arguments sem tipo
      '@typescript-eslint/no-unsafe-call': ['warn'],
      // Proibir return unsafe types
      '@typescript-eslint/no-unsafe-return': ['warn'],
      // Forçar explicit function return types
      '@typescript-eslint/explicit-function-return-types': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
    },
  },
]);
