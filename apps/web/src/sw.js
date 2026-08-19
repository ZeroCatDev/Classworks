import {precacheAndRoute, cleanupOutdatedCaches} from 'workbox-precaching'
import {registerRoute, setCatchHandler} from 'workbox-routing'
import {CacheFirst, NetworkFirst, StaleWhileRevalidate} from 'workbox-strategies'
import {ExpirationPlugin} from 'workbox-expiration'
import {CacheableResponsePlugin} from 'workbox-cacheable-response'

// 使用 self.__WB_MANIFEST 是 workbox 的一个特殊变量，会被实际的预缓存清单替换
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// JS 文件缓存
registerRoute(
  /\.(?:js)$/i,
  new StaleWhileRevalidate({
    cacheName: 'js-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
      })
    ]
  })
)

// CSS 文件缓存
registerRoute(
  /\.(?:css)$/i,
  new StaleWhileRevalidate({
    cacheName: 'css-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
      })
    ]
  })
)

// HTML 文件缓存
registerRoute(
  /\.(?:html)$/i,
  new NetworkFirst({
    cacheName: 'html-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 // 1 天
      })
    ]
  })
)

// 图片缓存
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif)$/i,
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
      })
    ]
  })
)

// CDN 缓存
registerRoute(
  /\/cdn-cgi\/.*/i,
  new NetworkFirst({
    cacheName: 'cdn-cgi-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 // 1 天
      })
    ],
    networkTimeoutSeconds: 10
  })
)

// 外部资源缓存
registerRoute(
  ({url}) => url.origin !== self.location.origin,
  new NetworkFirst({
    cacheName: 'external-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 // 1 天
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ],
    networkTimeoutSeconds: 10
  })
)

// 添加缓存管理消息处理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_KEYS') {
    // 获取所有缓存键
    caches.keys().then((cacheNames) => {
      event.ports[0].postMessage({cacheNames});
    });
  } else if (event.data && event.data.type === 'CACHE_CONTENT') {
    // 获取特定缓存的内容
    const cacheName = event.data.cacheName;
    caches.open(cacheName).then((cache) => {
      cache.keys().then((requests) => {
        const urls = requests.map(request => request.url);
        event.ports[0].postMessage({cacheName, urls});
      });
    });
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    // 清除特定缓存
    const cacheName = event.data.cacheName;
    caches.delete(cacheName).then((success) => {
      event.ports[0].postMessage({success, cacheName});
    });
  } else if (event.data && event.data.type === 'CLEAR_URL') {
    // 清除特定URL的缓存
    const cacheName = event.data.cacheName;
    const url = event.data.url;
    caches.open(cacheName).then((cache) => {
      cache.delete(url).then((success) => {
        event.ports[0].postMessage({success, cacheName, url});
      });
    });
  } else if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    // 清除所有缓存
    caches.keys().then((cacheNames) => {
      Promise.all(
        cacheNames.map(name => caches.delete(name))
      ).then(() => {
        event.ports[0].postMessage({success: true});
      });
    });
  }
});
