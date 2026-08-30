import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['coverage'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
