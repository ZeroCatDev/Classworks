// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    VueRouter(),
    Layouts(),
    Vue({
      template: { transformAssetUrls }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        navigateFallback: 'index.html',
        enabled: true,
        suppressWarnings: true,
      },

      lang: 'zh-CN',
      injectRegister: 'script',
      strategies: 'generateSW',
      registerSW: async () => {
        if (!('serviceWorker' in navigator)) {
          console.info('当前环境不支持 ServiceWorker');
          return;
        }

        if (window.location.protocol === 'file:') {
          console.info('在file://协议下ServiceWorker不可用');
          return;
        }

        try {
          const { registerSW } = await import('virtual:pwa-register');
          const registration = await registerSW({
            immediate: false,
            onRegisteredSW() {
              console.info('ServiceWorker 注册成功');
            },
            onRegisterError(error) {
              console.warn('ServiceWorker 注册失败:', error);
            }
          });

          if (registration) {
            registration.addEventListener('error', (error) => {
              console.warn('ServiceWorker 发生错误:', error);
            });
          }
        } catch (e) {
          console.warn('ServiceWorker 初始化失败:', e);
        }
      },

      workbox: {
        globPatterns: ['*'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => {
              return sameOrigin && url.pathname.endsWith('/assets/');
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60 天
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url, sameOrigin }) => {
              return sameOrigin && url.pathname.startsWith('/pwa/');
            },
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pwa-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url, sameOrigin }) => {
              if (!sameOrigin) return false;
              const path = url.pathname;
              return !(path.includes('/assets/') || path.includes('/pwa/'));
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'other-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 天
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
        ],
        additionalManifestEntries: [],
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigationPreload: true,
        importScripts: ['./sw-cache-manager.js'],
      },
      manifest: {
        name: 'Classworks作业板',
        short_name: 'Classworks',
        description: '记录，查看并同步作业',
        theme_color: '#212121',
        background_color: '#212121',
        display: 'standalone',
        start_url: './',
        edge_side_panel: {
          default_path: './',
        },
        icons: [
          {
            src: './pwa/image/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: './pwa/image/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: './pwa/image/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: './pwa/image/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: '随机点名',
            short_name: '随机点名',
            url: './#random-picker',
            icons: [
              {
                src: './pwa/image/pwa-64x64.png',
                sizes: '64x64',
                type: 'image/png'
              }
            ]
          },
        ],
      }
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    Components(),
    Fonts({
      google: {
        families: [{
          name: 'Roboto',
          styles: 'wght@100;300;400;500;700;900',
        }],
      },
    }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
      ],
      eslintrc: {
        enabled: true,
      },
      vueTemplate: true,
    }),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3031,
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
      },
    },
  },
})
