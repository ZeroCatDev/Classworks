<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <span>缓存管理</span>
      <v-spacer></v-spacer>
      <v-btn color="error" @click="clearAllCaches" :loading="loading">
        清除所有缓存
      </v-btn>
      <v-btn icon class="ml-2" @click="refreshCaches">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-alert v-if="!serviceWorkerActive" type="warning" class="mb-4">
        Service Worker 未激活，缓存管理功能不可用。
      </v-alert>

      <v-alert v-if="message" :type="messageType" class="mb-4">
        {{ message }}
      </v-alert>

      <v-expansion-panels v-if="caches.length > 0">
        <v-expansion-panel v-for="cache in caches" :key="cache.name">
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <span>{{ formatCacheName(cache.name) }}</span>
              <v-chip class="ml-2" size="small">{{ cache.urls.length }} 个文件</v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="d-flex justify-end mb-2">
              <v-btn color="error" size="small" @click="clearCache(cache.name)" :loading="loading">
                清除此缓存
              </v-btn>
            </div>
            <v-list lines="two">
              <v-list-item v-for="(url, index) in cache.urls" :key="index">
                <v-list-item-title class="text-truncate">
                  {{ getFileName(url) }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-truncate">
                  {{ url }}
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon size="small" color="error" @click="clearUrl(cache.name, url)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-skeleton-loader v-else-if="loading" type="article" />

      <v-alert v-else type="info">
        没有找到缓存数据。
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'CacheManager',
  data() {
    return {
      caches: [],
      loading: false,
      serviceWorkerActive: false,
      message: '',
      messageType: 'info',
    }
  },
  mounted() {
    this.checkServiceWorker();
  },
  methods: {
    checkServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
          this.serviceWorkerActive = true;
          this.refreshCaches();
        }).catch(() => {
          this.serviceWorkerActive = false;
        });
      } else {
        this.serviceWorkerActive = false;
      }
    },
    async refreshCaches() {
      if (!this.serviceWorkerActive) return;

      this.loading = true;
      this.message = '';
      this.caches = [];

      try {
        // 获取所有缓存名称
        const cacheNames = await this.sendMessageToSW({ type: 'CACHE_KEYS' });

        // 获取每个缓存的内容
        for (const cacheName of cacheNames.cacheNames) {
          const cacheContent = await this.sendMessageToSW({
            type: 'CACHE_CONTENT',
            cacheName
          });

          this.caches.push({
            name: cacheName,
            urls: cacheContent.urls || []
          });
        }
      } catch (error) {
        this.showMessage('获取缓存信息失败: ' + error.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    async clearCache(cacheName) {
      this.loading = true;
      try {
        const result = await this.sendMessageToSW({
          type: 'CLEAR_CACHE',
          cacheName
        });

        if (result.success) {
          this.showMessage(`已清除缓存: ${this.formatCacheName(cacheName)}`, 'success');
          await this.refreshCaches();
        } else {
          this.showMessage('清除缓存失败', 'error');
        }
      } catch (error) {
        this.showMessage('清除缓存失败: ' + error.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    async clearUrl(cacheName, url) {
      this.loading = true;
      try {
        const result = await this.sendMessageToSW({
          type: 'CLEAR_URL',
          cacheName,
          url
        });

        if (result.success) {
          this.showMessage(`已从缓存中删除: ${this.getFileName(url)}`, 'success');
          await this.refreshCaches();
        } else {
          this.showMessage('删除缓存项失败', 'error');
        }
      } catch (error) {
        this.showMessage('删除缓存项失败: ' + error.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    async clearAllCaches() {
      if (!confirm('确定要清除所有缓存吗？这可能会导致应用需要重新下载资源。')) {
        return;
      }

      this.loading = true;
      try {
        const result = await this.sendMessageToSW({ type: 'CLEAR_ALL_CACHES' });

        if (result.success) {
          this.showMessage('已清除所有缓存', 'success');
          await this.refreshCaches();
        } else {
          this.showMessage('清除所有缓存失败', 'error');
        }
      } catch (error) {
        this.showMessage('清除所有缓存失败: ' + error.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    sendMessageToSW(message) {
      return new Promise((resolve, reject) => {
        if (!navigator.serviceWorker.controller) {
          reject(new Error('Service Worker 未控制页面'));
          return;
        }

        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);

        // 设置超时
        setTimeout(() => {
          reject(new Error('Service Worker 响应超时'));
        }, 5000);
      });
    },
    formatCacheName(name) {
      // 格式化缓存名称，使其更易读
      return name
        .replace('workbox-precache-', '预缓存-')
        .replace('-cache', '')
        .replace('js', 'JS')
        .replace('css', 'CSS')
        .replace('html', 'HTML')
        .replace('images', '图片')
        .replace('external-resources', '外部资源')
        .replace('cdn-cgi', 'CDN');
    },
    getFileName(url) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        return pathParts[pathParts.length - 1] || urlObj.hostname;
      } catch (error) {
        console.error('获取文件名失败:', error);
        return url;
      }
    },
    showMessage(message, type = 'info') {
      this.message = message;
      this.messageType = type;

      // 5秒后自动清除消息
      setTimeout(() => {
        if (this.message === message) {
          this.message = '';
        }
      }, 5000);
    }
  }
}
</script>
