import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'

export default [
  // ===== Global ignores =====
  {
    name: 'monorepo/ignores',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/dev-dist/**',
      '**/generated/**',
      '**/pnpm-lock.yaml',
      '**/package-lock.json',
      '**/*.timestamp-*.mjs',
      // Auto-generated declaration files
      '**/auto-imports.d.ts',
      '**/components.d.ts',
      '**/typed-router.d.ts',
      // Vendored / bundled sources (minified, WASM helpers, etc.)
      '**/vendor/**',
      '**/public/**',
      'apps/server/generated/**',
    ],
  },

  // ===== Base JS recommendations =====
  js.configs.recommended,

  // ===== Vue apps (web + dashboard) =====
  ...pluginVue.configs['flat/recommended'],
  {
    name: 'monorepo/vue-apps',
    files: ['apps/web/**/*.{js,mjs,jsx,vue}', 'apps/dashboard/**/*.{js,mjs,jsx,vue}'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
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
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        XMLHttpRequest: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        import: 'readonly',
        process: 'readonly',
        self: 'readonly',
        caches: 'readonly',
        Notification: 'readonly',
        ServiceWorker: 'readonly',
        PushManager: 'readonly',
        PushSubscription: 'readonly',
        Storage: 'readonly',
        StorageEvent: 'readonly',
        WebSocket: 'readonly',
        Worker: 'readonly',
        SharedWorker: 'readonly',
        AbortController: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        requestIdleCallback: 'readonly',
        cancelIdleCallback: 'readonly',
        matchMedia: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        getComputedStyle: 'readonly',
        scrollTo: 'readonly',
        scrollIntoView: 'readonly',
        addEventListener: 'readonly',
        removeEventListener: 'readonly',
        history: 'readonly',
        location: 'readonly',
        screen: 'readonly',
        performance: 'readonly',
      },
    },
  },

  // ===== Node server (Express backend) =====
  {
    name: 'monorepo/server',
    files: ['apps/server/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  // ===== Turn off formatting rules that conflict with Prettier =====
  prettier,
]
