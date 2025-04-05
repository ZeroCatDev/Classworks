// 添加缓存管理消息处理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_KEYS') {
    // 获取所有缓存键
    caches.keys().then((cacheNames) => {
      event.ports[0].postMessage({ cacheNames });
    });
  } else if (event.data && event.data.type === 'CACHE_CONTENT') {
    // 获取特定缓存的内容
    const cacheName = event.data.cacheName;
    caches.open(cacheName).then((cache) => {
      cache.keys().then((requests) => {
        const urls = requests.map(request => request.url);
        event.ports[0].postMessage({ cacheName, urls });
      });
    });
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    // 清除特定缓存
    const cacheName = event.data.cacheName;
    caches.delete(cacheName).then((success) => {
      event.ports[0].postMessage({ success, cacheName });
    });
  } else if (event.data && event.data.type === 'CLEAR_URL') {
    // 清除特定URL的缓存
    const cacheName = event.data.cacheName;
    const url = event.data.url;
    caches.open(cacheName).then((cache) => {
      cache.delete(url).then((success) => {
        event.ports[0].postMessage({ success, cacheName, url });
      });
    });
  } else if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    // 清除所有缓存
    caches.keys().then((cacheNames) => {
      Promise.all(
        cacheNames.map(name => caches.delete(name))
      ).then(() => {
        event.ports[0].postMessage({ success: true });
      });
    });
  }
});

console.log('Cache Manager extension loaded');