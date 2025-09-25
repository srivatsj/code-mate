// eslint.config.js
import antfu from '@antfu/eslint-config'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import simpleSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  {
    ignores: [
      '**/dist/**',         // ignore dist in all subfolders
      '**/node_modules/**', // ignore node_modules in all subfolders
      '**/docs/**' 
    ]
  },
  { ...antfu },

  {
    files: ['**/*.{ts,tsx,js,jsx,vue}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: [
          './tsconfig.base.json',
          './client/tsconfig.json',
          './server/tsconfig.json',
          './shared/tsconfig.json'
        ],
        tsconfigRootDir: process.cwd()
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleSort,
      'unused-imports': unusedImports
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [
            './tsconfig.base.json',
            './client/tsconfig.json',
            './server/tsconfig.json',
            './shared/tsconfig.json'
          ]
        }
      }
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }
      ],
      'prefer-const': 'warn',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variableLike',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        }
      ],
      'import/order': 'off',
      '@typescript-eslint/no-explicit-any': 'error'
    }
  }
]
