import axios from "@/axios/axios";
import { formatResponse, formatError } from "../dataProvider";
import { openDB } from "idb";
import { getSetting } from "../settings";

// Database initialization for local storage
const DB_NAME = "ClassworksDB";
const DB_VERSION = 2;

// Helper function to get request headers with site key if available
const getHeaders = () => {
  const headers = { Accept: "application/json" };
  const siteKey = getSetting("server.siteKey");

  if (siteKey) {
    headers["x-site-key"] = siteKey;
  }

  return headers;
};

// Removed migrateToKvStorage function - now handled by the dedicated migration tool

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

export const kvProvider = {
  // Local storage provider
  local: {
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

    async saveData(data, key) {
      try {
        //const formattedDate = formatDateForKey(date);
        //const key = `${DATA_KEY_PREFIX}${formattedDate}`;

        const db = await initDB();
        await db.put("kv", JSON.stringify(data), key);
        return formatResponse(true, "保存成功");
      } catch (error) {
        return formatError("保存本地数据失败：" + error);
      }
    },
  },

  // Server storage provider
  server: {
    async loadData(key) {
      try {
        const serverUrl = getSetting("server.domain");
        const machineId = getSetting("device.uuid");

        const res = await axios.get(`${serverUrl}/${machineId}/${key}`, {
          headers: getHeaders(),
        });

        return formatResponse(res.data);
      } catch (error) {
        if (error.response?.status === 404) {
          return formatError("数据不存在", "NOT_FOUND");
        }

        return formatError(
          error.response?.data?.message || "服务器连接失败",
          "NETWORK_ERROR"
        );
      }
    },

    async saveData(key, data) {
      try {
        const serverUrl = getSetting("server.domain");
        const machineId = getSetting("device.uuid");
        await axios.post(`${serverUrl}/${machineId}/${key}`, data, {
          headers: getHeaders(),
        });
        return formatResponse(true);
      } catch (error) {
        return formatError(
          error.response?.data?.message || "保存失败",
          "SAVE_ERROR"
        );
      }
    },
  },
};
