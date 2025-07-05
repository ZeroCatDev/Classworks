// vite.config.mjs
import AutoImport from "file:///D:/Classworks/Classworks/node_modules/.pnpm/unplugin-auto-import@19.1.2/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/Classworks/Classworks/node_modules/.pnpm/unplugin-vue-components@28._3ac9cbb52ceac4398861ec149fbf8d84/node_modules/unplugin-vue-components/dist/vite.js";
import Fonts from "file:///D:/Classworks/Classworks/node_modules/.pnpm/unplugin-fonts@1.3.1_vite@5_0da2dbaf8b043328ba6ac4ced11b18f9/node_modules/unplugin-fonts/dist/vite.mjs";
import Layouts from "file:///D:/Classworks/Classworks/node_modules/.pnpm/vite-plugin-vue-layouts@0.1_c9f7ac9709945bf6ea55f41cc5804e0d/node_modules/vite-plugin-vue-layouts/dist/index.mjs";
import Vue from "file:///D:/Classworks/Classworks/node_modules/.pnpm/@vitejs+plugin-vue@5.2.3_vi_aa2b6d6e474e4f3c89cafcd1f6e5b905/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import VueRouter from "file:///D:/Classworks/Classworks/node_modules/.pnpm/unplugin-vue-router@0.12.0__59687ba25f9c89d4ac9f890107322c9d/node_modules/unplugin-vue-router/dist/vite.js";
import Vuetify, { transformAssetUrls } from "file:///D:/Classworks/Classworks/node_modules/.pnpm/vite-plugin-vuetify@2.1.1_v_25d6a1d522597c3e046942a3e5f2b058/node_modules/vite-plugin-vuetify/dist/index.mjs";
import { VitePWA } from "file:///D:/Classworks/Classworks/node_modules/.pnpm/vite-plugin-pwa@1.0.0_@vite_b62e707a85f7d1184469c7453818db54/node_modules/vite-plugin-pwa/dist/index.js";
import { defineConfig } from "file:///D:/Classworks/Classworks/node_modules/.pnpm/vite@5.4.17_sass-embedded@1.86.3_sass@1.86.3_terser@5.39.0/node_modules/vite/dist/node/index.js";
import { fileURLToPath, URL } from "node:url";
var __vite_injected_original_import_meta_url = "file:///D:/Classworks/Classworks/vite.config.mjs";
var vite_config_default = defineConfig({
  base: "./",
  plugins: [
    VueRouter(),
    Layouts(),
    Vue({
      template: { transformAssetUrls }
    }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        navigateFallback: "index.html",
        enabled: false,
        suppressWarnings: true
      },
      lang: "zh-CN",
      injectRegister: "auto",
      strategies: "generateSW",
      workbox: {
        globPatterns: ["*"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => {
              return sameOrigin && url.pathname.endsWith("/assets/");
            },
            handler: "CacheFirst",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60
                // 60 天
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url, sameOrigin }) => {
              return sameOrigin && url.pathname.startsWith("/pwa/");
            },
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "pwa-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7
                // 7 天
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // 匹配当前域名下除了上述规则外的所有请求
            urlPattern: ({ url, sameOrigin }) => {
              if (!sameOrigin) return false;
              const path = url.pathname;
              return !(path.includes("/assets/") || path.includes("/pwa/"));
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "other-resources",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
                // 1 天
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
        importScripts: ["/sw-cache-manager.js"]
      },
      manifest: {
        name: "Classworks\u4F5C\u4E1A\u677F",
        short_name: "Classworks",
        description: "\u8BB0\u5F55\uFF0C\u67E5\u770B\u5E76\u540C\u6B65\u4F5C\u4E1A",
        theme_color: "#212121",
        background_color: "#212121",
        display: "standalone",
        start_url: "./",
        edge_side_panel: {
          default_path: "./"
        },
        icons: [
          {
            src: "./pwa/image/pwa-64x64.png",
            sizes: "64x64",
            type: "image/png"
          },
          {
            src: "./pwa/image/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "./pwa/image/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "./pwa/image/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          {
            name: "\u968F\u673A\u70B9\u540D",
            short_name: "\u968F\u673A\u70B9\u540D",
            url: "./#random-picker",
            icons: [
              {
                src: "./pwa/image/pwa-64x64.png",
                sizes: "64x64",
                type: "image/png"
              }
            ]
          }
        ]
      }
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: "src/styles/settings.scss"
      }
    }),
    Components(),
    Fonts({
      google: {
        families: [{
          name: "Roboto",
          styles: "wght@100;300;400;500;700;900"
        }]
      }
    }),
    AutoImport({
      imports: [
        "vue",
        "vue-router"
      ],
      eslintrc: {
        enabled: true
      },
      vueTemplate: true
    })
  ],
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    },
    extensions: [
      ".js",
      ".json",
      ".jsx",
      ".mjs",
      ".ts",
      ".tsx",
      ".vue"
    ]
  },
  server: {
    port: 3031
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcQ2xhc3N3b3Jrc1xcXFxDbGFzc3dvcmtzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxDbGFzc3dvcmtzXFxcXENsYXNzd29ya3NcXFxcdml0ZS5jb25maWcubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9DbGFzc3dvcmtzL0NsYXNzd29ya3Mvdml0ZS5jb25maWcubWpzXCI7Ly8gUGx1Z2luc1xyXG5pbXBvcnQgQXV0b0ltcG9ydCBmcm9tICd1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlJ1xyXG5pbXBvcnQgQ29tcG9uZW50cyBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy92aXRlJ1xyXG5pbXBvcnQgRm9udHMgZnJvbSAndW5wbHVnaW4tZm9udHMvdml0ZSdcclxuaW1wb3J0IExheW91dHMgZnJvbSAndml0ZS1wbHVnaW4tdnVlLWxheW91dHMnXHJcbmltcG9ydCBWdWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xyXG5pbXBvcnQgVnVlUm91dGVyIGZyb20gJ3VucGx1Z2luLXZ1ZS1yb3V0ZXIvdml0ZSdcclxuaW1wb3J0IFZ1ZXRpZnksIHsgdHJhbnNmb3JtQXNzZXRVcmxzIH0gZnJvbSAndml0ZS1wbHVnaW4tdnVldGlmeSdcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcclxuXHJcbi8vIFV0aWxpdGllc1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCdcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgYmFzZTogJy4vJyxcclxuICBwbHVnaW5zOiBbXHJcbiAgICBWdWVSb3V0ZXIoKSxcclxuICAgIExheW91dHMoKSxcclxuICAgIFZ1ZSh7XHJcbiAgICAgIHRlbXBsYXRlOiB7IHRyYW5zZm9ybUFzc2V0VXJscyB9XHJcbiAgICB9KSxcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcclxuICAgICAgZGV2T3B0aW9uczoge1xyXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICdpbmRleC5odG1sJyxcclxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICBzdXBwcmVzc1dhcm5pbmdzOiB0cnVlLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgbGFuZzogJ3poLUNOJyxcclxuICAgICAgaW5qZWN0UmVnaXN0ZXI6ICdhdXRvJyxcclxuICAgICAgc3RyYXRlZ2llczogJ2dlbmVyYXRlU1cnLFxyXG5cclxuXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiddLFxyXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICdpbmRleC5odG1sJyxcclxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyB1cmwsIHNhbWVPcmlnaW4gfSkgPT4ge1xyXG4gICAgICAgICAgICAgIHJldHVybiBzYW1lT3JpZ2luICYmIHVybC5wYXRobmFtZS5lbmRzV2l0aCgnL2Fzc2V0cy8nKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnYXNzZXRzLWNhY2hlJyxcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAyMDAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiA2MCAvLyA2MCBcdTU5MjlcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHVybCwgc2FtZU9yaWdpbiB9KSA9PiB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHNhbWVPcmlnaW4gJiYgdXJsLnBhdGhuYW1lLnN0YXJ0c1dpdGgoJy9wd2EvJyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdTdGFsZVdoaWxlUmV2YWxpZGF0ZScsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdwd2EtY2FjaGUnLFxyXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcclxuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogNyAvLyA3IFx1NTkyOVxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcclxuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgLy8gXHU1MzM5XHU5MTREXHU1RjUzXHU1MjREXHU1N0RGXHU1NDBEXHU0RTBCXHU5NjY0XHU0RTg2XHU0RTBBXHU4RkYwXHU4OUM0XHU1MjE5XHU1OTE2XHU3Njg0XHU2MjQwXHU2NzA5XHU4QkY3XHU2QzQyXHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHVybCwgc2FtZU9yaWdpbiB9KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKCFzYW1lT3JpZ2luKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHVybC5wYXRobmFtZTtcclxuICAgICAgICAgICAgICAvLyBcdTYzOTJcdTk2NjRcdTVERjJcdTdFQ0ZcdTc1MzFcdTUxNzZcdTRFRDZcdTg5QzRcdTUyMTlcdTU5MDRcdTc0MDZcdTc2ODRcdThERUZcdTVGODRcclxuICAgICAgICAgICAgICByZXR1cm4gIShwYXRoLmluY2x1ZGVzKCcvYXNzZXRzLycpIHx8IHBhdGguaW5jbHVkZXMoJy9wd2EvJykpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnTmV0d29ya0ZpcnN0JyxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ290aGVyLXJlc291cmNlcycsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAwLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0IC8vIDEgXHU1OTI5XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBuZXR3b3JrVGltZW91dFNlY29uZHM6IDEwLFxyXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhZGRpdGlvbmFsTWFuaWZlc3RFbnRyaWVzOiBbXSxcclxuICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXHJcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXHJcbiAgICAgICAgaW1wb3J0U2NyaXB0czogWycvc3ctY2FjaGUtbWFuYWdlci5qcyddXHJcbiAgICAgIH0sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgbmFtZTogJ0NsYXNzd29ya3NcdTRGNUNcdTRFMUFcdTY3N0YnLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdDbGFzc3dvcmtzJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1x1OEJCMFx1NUY1NVx1RkYwQ1x1NjdFNVx1NzcwQlx1NUU3Nlx1NTQwQ1x1NkI2NVx1NEY1Q1x1NEUxQScsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMjEyMTIxJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzIxMjEyMScsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy4vJyxcclxuICAgICAgICBlZGdlX3NpZGVfcGFuZWw6IHtcclxuICAgICAgICAgIGRlZmF1bHRfcGF0aDogJy4vJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy4vcHdhL2ltYWdlL3B3YS02NHg2NC5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzY0eDY0JyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy4vcHdhL2ltYWdlL3B3YS0xOTJ4MTkyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICcuL3B3YS9pbWFnZS9wd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnLi9wd2EvaW1hZ2UvbWFza2FibGUtaWNvbi01MTJ4NTEyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnbWFza2FibGUnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXSxcclxuICAgICAgICBzaG9ydGN1dHM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZTogJ1x1OTY4Rlx1NjczQVx1NzBCOVx1NTQwRCcsXHJcbiAgICAgICAgICAgIHNob3J0X25hbWU6ICdcdTk2OEZcdTY3M0FcdTcwQjlcdTU0MEQnLFxyXG4gICAgICAgICAgICB1cmw6ICcuLyNyYW5kb20tcGlja2VyJyxcclxuICAgICAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBzcmM6ICcuL3B3YS9pbWFnZS9wd2EtNjR4NjQucG5nJyxcclxuICAgICAgICAgICAgICAgIHNpemVzOiAnNjR4NjQnLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfVxyXG4gICAgfSksXHJcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vdnVldGlmeWpzL3Z1ZXRpZnktbG9hZGVyL3RyZWUvbWFzdGVyL3BhY2thZ2VzL3ZpdGUtcGx1Z2luI3JlYWRtZVxyXG4gICAgVnVldGlmeSh7XHJcbiAgICAgIGF1dG9JbXBvcnQ6IHRydWUsXHJcbiAgICAgIHN0eWxlczoge1xyXG4gICAgICAgIGNvbmZpZ0ZpbGU6ICdzcmMvc3R5bGVzL3NldHRpbmdzLnNjc3MnLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgICBDb21wb25lbnRzKCksXHJcbiAgICBGb250cyh7XHJcbiAgICAgIGdvb2dsZToge1xyXG4gICAgICAgIGZhbWlsaWVzOiBbe1xyXG4gICAgICAgICAgbmFtZTogJ1JvYm90bycsXHJcbiAgICAgICAgICBzdHlsZXM6ICd3Z2h0QDEwMDszMDA7NDAwOzUwMDs3MDA7OTAwJyxcclxuICAgICAgICB9XSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gICAgQXV0b0ltcG9ydCh7XHJcbiAgICAgIGltcG9ydHM6IFtcclxuICAgICAgICAndnVlJyxcclxuICAgICAgICAndnVlLXJvdXRlcicsXHJcbiAgICAgIF0sXHJcbiAgICAgIGVzbGludHJjOiB7XHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgdnVlVGVtcGxhdGU6IHRydWUsXHJcbiAgICB9KSxcclxuICBdLFxyXG4gIGRlZmluZTogeyAncHJvY2Vzcy5lbnYnOiB7fSB9LFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpXHJcbiAgICB9LFxyXG4gICAgZXh0ZW5zaW9uczogW1xyXG4gICAgICAnLmpzJyxcclxuICAgICAgJy5qc29uJyxcclxuICAgICAgJy5qc3gnLFxyXG4gICAgICAnLm1qcycsXHJcbiAgICAgICcudHMnLFxyXG4gICAgICAnLnRzeCcsXHJcbiAgICAgICcudnVlJyxcclxuICAgIF0sXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMzEsXHJcbiAgfSxcclxuICBjc3M6IHtcclxuICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcclxuICAgICAgc2Fzczoge1xyXG4gICAgICAgIGFwaTogJ21vZGVybi1jb21waWxlcicsXHJcbiAgICAg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
