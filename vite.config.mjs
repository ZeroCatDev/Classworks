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
  plugins: [
    VueRouter(),
    Layouts(),
    Vue({
      template: { transformAssetUrls }
    }), 
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        navigateFallback: '/',
        enabled: true,
        suppressWarnings: true,
      },
      
      lang: 'zh-CN', 
      injectRegister: 'auto',
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,jpg,jpeg,gif,ico,woff,woff2,ttf,eot}'],
        navigateFallback: '/',
        runtimeCaching: [
          {
            urlPattern: /\.(?:js)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'js-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
              }
            }
          },
          {
            urlPattern: /\.(?:css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'css-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
              }
            }
          },
          {
            urlPattern: /\.(?:html)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 // 1 天
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
              }
            }
          },
          {
            urlPattern: /\/cdn-cgi\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cdn-cgi-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 天
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // 匹配除了当前域名以外的所有请求
            urlPattern: ({ url }) => {
              return url.origin !== self.location.origin;
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 天
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        additionalManifestEntries: [],
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['sw-cache-manager.js']
      },
      manifest: {
        name: 'Classworks作业板',
        short_name: 'Classworks',
        description: '记录，查看并同步作业',
        theme_color: '#212121',
        background_color: '#212121',
        display: 'standalone',
        start_url: '/',
        edge_side_panel: {
          default_path: '/',
        },
        icons: [
          {
            src: '/image/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/image/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/image/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/image/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: '随机点名',
            short_name: '随机点名',
            url: '/#random-picker',
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
