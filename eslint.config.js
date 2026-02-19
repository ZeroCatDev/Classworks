import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        CSS: 'readonly',
        Notification: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        require: 'readonly',
        self: 'readonly',
        caches: 'readonly',
        Blob: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    languageOptions: {
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        fetch: 'readonly',
        XMLHttpRequest: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        // Vite globals
        import: 'readonly',
        process: 'readonly',
        // Service Worker globals
        self: 'readonly',
        caches: 'readonly',
        // Web API
        Notification: 'readonly',
        ServiceWorker: 'readonly',
        PushManager: 'readonly',
        PushSubscription: 'readonly',
        // Web Storage API
        Storage: 'readonly',
        StorageEvent: 'readonly',
        // Web Socket
        WebSocket: 'readonly',
        // Web Workers
        Worker: 'readonly',
        SharedWorker: 'readonly',
      },
    },
  }
]
