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
};