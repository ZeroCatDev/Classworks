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
    }), VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        navigateFallback: '/index.html', // 离线支持（navigateFallback）
        enabled: true,
        suppressWarnings: true, // 是否抑制 Workbox 的警告
      },

      lang: 'zh-CN',
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
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg}'],
          navigateFallback: '/index.html', // 离线支持（navigateFallback）
          runtimeCaching: [
            //所有资源都使用网络优先
            {
              urlPattern: /./,
              handler: 'NetworkFirst',
            },
          ],
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
