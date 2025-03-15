import axios from "axios";
import { openDB } from "idb";

const DB_NAME = "HomeworkDB";
const DB_VERSION = 1;

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("homework")) {
        db.createObjectStore("homework");
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config");
      }
    },
  });
};

const formatResponse = (data, message = null) => ({
  success: true,
  data,
  message,
});

const formatError = (message, code = "UNKNOWN_ERROR") => ({
  success: false,
  error: { code, message },
});

const providers = {
  localStorage: {
    async loadData(key, date) {
      try {
        // 检查是否设置了班号
        const classNumber = key.split("/").pop();
        if (!classNumber) {
          return formatError("请先设置班号", "CONFIG_ERROR");
        }

        // 使用班号作为本地存储的前缀
        const storageKey = `homework_${classNumber}_${date}`;
        const rawData = localStorage.getItem(storageKey);

        if (!rawData) {
          // 如果是今天的数据且没有找到，返回空结构而不是null
          const today = new Date().toISOString().split("T")[0];
          if (date === today) {
            return formatResponse({
              homework: {},
              attendance: { absent: [], late: [] },
            });
          }
          return formatError("数据不存在", "NOT_FOUND");
        }

        return formatResponse(JSON.parse(rawData));
      } catch (error) {
        return formatError("读取本地数据失败：" + error);
      }
    },

    async saveData(key, data, date) {
      try {
        // 检查是否设置了班号
        const classNumber = key.split("/").pop();
        if (!classNumber) {
          return formatError("请先设置班号", "CONFIG_ERROR");
        }

        // 使用班号作为本地存储的前缀
        const storageKey = `homework_${classNumber}_${date}`; // 使用传入的date参数
        localStorage.setItem(storageKey, JSON.stringify(data));
        return formatResponse(null, "保存成功");
      } catch (error) {
        return formatError("保存本地数据失败:" + error);
      }
    },

    async loadConfig(key) {
      try {
        const classNumber = key.split("/").pop();
        if (!classNumber) {
          return formatError("请先设置班号", "CONFIG_ERROR");
        }

        const storageKey = `config_${classNumber}`;
        const rawData = localStorage.getItem(storageKey);

        if (!rawData) {
          return formatResponse({
            studentList: [],
            displayOptions: {},
          });
        }

        return formatResponse(JSON.parse(rawData));
      } catch (error) {
        return formatError("读取本地配置失败:" + error);
      }
    },

    async saveConfig(key, config) {
      try {
        const classNumber = key.split("/").pop();
        if (!classNumber) {
          return formatError("请先设置班号", "CONFIG_ERROR");
        }

        const storageKey = `config_${classNumber}`;
        localStorage.setItem(storageKey, JSON.stringify(config));
        return formatResponse(null, "保存成功");
      } catch (error) {
        return formatError("保存本地配置失败:" + error);
      }
    },
  },

  server: {
    async loadData(key, date) {
      try {
        const res = await axios.get(`${key}/homework?date=${date}`);
        if (res.data?.status === false) {
          return formatError(res.data.msg || "获取数据失败", "SERVER_ERROR");
        }
        return formatResponse(res.data);
      } catch (error) {
        return formatError(
          error.response?.data?.message || "服务器连接失败",
          "NETWORK_ERROR"
        );
      }
    },

    async saveData(key, data, date) {
      try {
        // 添加date参数到URL
        const url = date ? `${key}/homework?date=${date}` : `${key}/homework`;
        await axios.post(url, data);
        return formatResponse(null, "保存成功");
      } catch (error) {
        return formatError(
          error.response?.data?.message || "保存失败",
          "SAVE_ERROR"
        );
      }
    },

    async loadConfig(key) {
      try {
        const res = await axios.get(`${key}/config`);
        if (res.data?.status === false) {
          return formatError(res.data.msg || "获取配置失败", "SERVER_ERROR");
        }
        return formatResponse(res.data);
      } catch (error) {
        return formatError(
          error.response?.data?.message || "服务器连接失败",
          "NETWORK_ERROR"
        );
      }
    },

    async saveConfig(key, config) {
      try {
        const res = await axios.put(`${key}/config`, config);
        if (res.data?.status === false) {
          return formatError(res.data.msg || "保存失败", "SAVE_ERROR");
        }
        return formatResponse(null, "保存成功");
      } catch (error) {
        return formatError(
          error.response?.data?.message || "保存失败",
          "SAVE_ERROR"
        );
      }
    },
  },

  indexedDB: {
    async loadData(key, date) {
      try {
        const classNumber = key.split("/").pop();
        if (!classNumber) {
          return formatError("请先设置班号", "CONFIG_ERROR");
        }

        const db = await initDB();
        const storageKey = `homework_${classNumber}_${date}`;
        const data = await db.get("homework", storageKey);

        if (!data) {
          const today = new Date().toISOString().split("T")[0];
          if (date === today) {
            return formatResponse({
              homework: {},
              attendance: { absent: [], late: [] },
            });
          }
          return formatError("数据不存在", "NOT_FOUND");
        }

        // 从字符串解析数据
        return formatResponse(JSON.parse(data));
      } catch (error) {
        return formatError("读取IndexedDB数据失败：" + error);
      }
    },

    async saveData(key, data, date) {
      try {
        const classNumber = key.split("/").pop();
        if (!classNumber) {
          return formatError("请先设置班号", "CONFIG_ERROR");
        }

        const db = await initDB();
        const storageKey = `homework_${classNumber}_${date}`; // 使用传入的date参数
        // 将数据序列化为字符串存储
        await db.put("homework", JSON.stringify(data), storageKey);
        return formatResponse(null, "保存成功");
      } catch (error) {
        return formatError("保存IndexedDB数据失败：" + error);
      }
    },

    async loadConfig(key) {
      try {
        const classNumber = key.split("/").pop();
        if (!classNumber) {
          return formatError("请先设置班号", "CONFIG_ERROR");
        }

        const db = await initDB();
        const storageKey = `config_${classNumber}`;
        const config = await db.get("config", storageKey);

        if (!config) {
          return formatResponse({
            studentList: [],
            displayOptions: {},
          });
        }

        // 从字符串解析配置
        return formatResponse(JSON.parse(config));
      } catch (error) {
        return formatError("读取IndexedDB配置失败：" + error);
      }
    },

    async saveConfig(key, config) {
      try {
        const classNumber = key.split("/").pop();
        if (!classNumber) {
          return formatError("请先设置班号", "CONFIG_ERROR");
        }

        const db = await initDB();
        const storageKey = `config_${classNumber}`;
        // 将配置序列化为字符串存储
        await db.put("config", JSON.stringify(config), storageKey);
        return formatResponse(null, "保存成功");
      } catch (error) {
        return formatError("保存IndexedDB配置失败：" + error);
      }
    },
  },
};

export default {
  loadData: (provider, key, date) => providers[provider]?.loadData(key, date),
  saveData: (provider, key, data, date) =>
    providers[provider]?.saveData(key, data, date),
  loadConfig: (provider, key) => providers[provider]?.loadConfig(key),
  saveConfig: (provider, key, config) =>
    providers[provider]?.saveConfig(key, config),
};

export const ErrorCodes = {
  NOT_FOUND: "数据不存在",
  NETWORK_ERROR: "网络连接失败",
  SERVER_ERROR: "服务器错误",
  SAVE_ERROR: "保存失败",
  CONFIG_ERROR: "配置错误",
  UNKNOWN_ERROR: "未知错误",
};
