import { openDB } from "idb";
import { formatResponse, formatError } from "../dataProvider";

// Database initialization for local storage
const DB_NAME = "ClassworksDB";
const DB_VERSION = 2;

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
        sortBy = "key",
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
};