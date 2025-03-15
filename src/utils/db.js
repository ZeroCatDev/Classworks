const DB_NAME = 'homeworkboard';
const DB_VERSION = 1;
const LOG_STORE = 'message_logs';

class LogDB {
  constructor() {
    this.db = null;
    this.ready = this.initDB();
  }

  async initDB() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(LOG_STORE)) {
            const store = db.createObjectStore(LOG_STORE, {
              keyPath: 'id'
            });
            // 只保留时间和类型索引
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('type', 'type');
          }
        };
      });
      return true;
    } catch (error) {
      console.error('初始化日志数据库失败:', error);
      return false;
    }
  }

  async ensureDB() {
    if (!this.db) {
      await this.ready;
    }
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
  }

  async addLog(message) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([LOG_STORE], 'readwrite');
      const store = transaction.objectStore(LOG_STORE);

      const request = store.add(message);

      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getLogs(limit = 20) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([LOG_STORE], 'readonly');
      const store = transaction.objectStore(LOG_STORE);
      const index = store.index('timestamp');

      const request = index.getAll(null, limit);

      request.onsuccess = () => resolve(request.result.reverse());
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLog(messageId) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([LOG_STORE], 'readwrite');
      const store = transaction.objectStore(LOG_STORE);

      const request = store.delete(messageId);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearLogs() {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([LOG_STORE], 'readwrite');
      const store = transaction.objectStore(LOG_STORE);

      const request = store.clear();

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export default new LogDB();
