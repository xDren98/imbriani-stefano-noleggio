import js from '@eslint/js'
import pluginSecurity from 'eslint-plugin-security'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    plugins: { security: pluginSecurity },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.node,
        bootstrap: 'readonly'
      }
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-alert': 'warn',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off'
    }
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.gs',
      'pwa/**',
      'scripts.js',
      'booking-submit.js',
      'test-*.js',
      'gas-deploy-manager.js',
      'deploy-instructions.js'
    ]
  }
]
