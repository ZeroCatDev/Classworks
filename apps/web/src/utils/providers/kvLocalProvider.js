import {openDB} from "idb";
import {formatResponse, formatError} from "../dataProvider";

// Database initialization for local storage
const DB_NAME = "ClassworksDB";
const DB_VERSION = 3;

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create or update stores as needed
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv");
      }

      // Add a system store for machine ID and other system settings
      if (!db.objectStoreNames.contains("system")) {
        db.createObjectStore("system");
      }

      // Add a sync queue store for offline write buffering
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue");
      }
    },
  });
};

export const kvLocalProvider = {
  async loadData(key) {
    try {
      const db = await initDB();
      const data = await db.get("kv", key);

      if (!data) {
        return formatError("数据不存在", "NOT_FOUND");
      }

      return formatResponse(JSON.parse(data));
    } catch (error) {
      return formatError("读取本地数据失败：" + error);
    }
  },

  async saveData(key, data) {
    try {
      const db = await initDB();
      await db.put("kv", JSON.stringify(data), key);
      return formatResponse(true);
    } catch (error) {
      return formatError("保存本地数据失败：" + error);
    }
  },

  /**
   * 获取本地存储的键名列表
   * @param {Object} options - 查询选项
   * @param {string} options.sortBy - 排序字段，默认为 "key"
   * @param {string} options.sortDir - 排序方向，"asc" 或 "desc"，默认为 "asc"
   * @param {number} options.limit - 每页返回的记录数，默认为 100
   * @param {number} options.skip - 跳过的记录数，默认为 0
   * @returns {Promise<Object>} 包含键名列表和分页信息的响应对象
   *
   * 返回值示例:
   * {
   *   keys: ["key1", "key2", "key3"],
   *   total_rows: 150,
   *   current_page: {
   *     limit: 10,
   *     skip: 0,
   *     count: 10
   *   },
   *   load_more: null // 本地存储不需要分页URL
   * }
   */
  async loadKeys(options = {}) {
    try {
      const db = await initDB();
      const transaction = db.transaction(["kv"], "readonly");
      const store = transaction.objectStore("kv");

      // 获取所有键名
      const allKeys = await store.getAllKeys();

      // 设置默认参数
      const {
        sortDir = "asc",
        limit = 100,
        skip = 0
      } = options;
      // 排序键名（本地存储只支持按键名排序）
      const sortedKeys = allKeys.sort((a, b) => {
        if (sortDir === "desc") {
          return b.localeCompare(a);
        }
        return a.localeCompare(b);
      });

      // 应用分页
      const totalRows = sortedKeys.length;
      const paginatedKeys = sortedKeys.slice(skip, skip + limit);

      // 构建响应数据
      const responseData = {
        keys: paginatedKeys,
        total_rows: totalRows,
        current_page: {
          limit,
          skip,
          count: paginatedKeys.length
        },
        load_more: null // 本地存储不需要分页URL
      };

      return formatResponse(responseData);
    } catch (error) {
      return formatError("获取本地键名列表失败：" + error.message);
    }
  },

  // --- Sync queue operations for offline write buffering ---

  async addToSyncQueue(entry) {
    try {
      const db = await initDB();
      await db.put("syncQueue", JSON.stringify(entry), entry.key);
      return formatResponse(true);
    } catch (error) {
      return formatError("添加同步队列失败：" + error);
    }
  },

  async getSyncQueue() {
    try {
      const db = await initDB();
      const keys = await db.getAllKeys("syncQueue");
      const entries = [];
      for (const key of keys) {
        const raw = await db.get("syncQueue", key);
        if (raw) entries.push(JSON.parse(raw));
      }
      entries.sort((a, b) => a.timestamp - b.timestamp);
      return formatResponse(entries);
    } catch (error) {
      return formatError("获取同步队列失败：" + error);
    }
  },

  async removeFromSyncQueue(key) {
    try {
      const db = await initDB();
      await db.delete("syncQueue", key);
      return formatResponse(true);
    } catch (error) {
      return formatError("删除同步队列项失败：" + error);
    }
  },

  // --- Prefix-based operations for cache management ---

  /**
   * 删除指定前缀的所有键
   * @param {string} prefix — 键名前缀
   * @returns {Promise<number>} 删除的键数
   */
  async deleteByPrefix(prefix) {
    try {
      const db = await initDB();
      const tx = db.transaction("kv", "readwrite");
      const store = tx.objectStore("kv");
      const allKeys = await store.getAllKeys();
      let deleted = 0;
      for (const key of allKeys) {
        if (key.startsWith(prefix)) {
          await store.delete(key);
          deleted++;
        }
      }
      await tx.done;
      return deleted;
    } catch (error) {
      console.warn("kvLocalProvider.deleteByPrefix 失败:", error);
      return 0;
    }
  },
};
