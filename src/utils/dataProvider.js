import { serverProvider } from "./providers/server";
import { indexedDBProvider } from "./providers/indexedDB";
import { kvProvider } from "./providers/kvProvider";
import { getSetting } from "./settings";

export const formatResponse = (data, message = null) => ({
  success: true,
  data,
  message,
});

export const formatError = (message, code = "UNKNOWN_ERROR") => ({
  success: false,
  error: { code, message },
});

// Legacy providers
const legacyProviders = {
  server: serverProvider,
  indexedDB: indexedDBProvider,
};

// New KV provider
const newProviders = {
  kv: kvProvider,
};

// Main data provider with support for both legacy and new API
export default {
  // Provider API methods
  loadData: (provider, key, date) => {
    if (legacyProviders[provider]) {
      return legacyProviders[provider]?.loadData(key, date);
    }

    // If using new KV provider
    if (provider === "kv-local") {
      const classNumber = key.split("/").pop();
      return newProviders.kv.local.loadData(classNumber, date);
    } else if (provider === "kv-server") {
      const classNumber = key.split("/").pop();
      const serverUrl = getSetting("server.domain");
      return newProviders.kv.server.loadData(serverUrl, classNumber, date);
    }
  },

  saveData: (provider, key, data, date) => {
    if (legacyProviders[provider]) {
      return legacyProviders[provider]?.saveData(key, data, date);
    }

    // If using new KV provider
    if (provider === "kv-local") {
      const classNumber = key.split("/").pop();
      return newProviders.kv.local.saveData(classNumber, data, date);
    } else if (provider === "kv-server") {
      const classNumber = key.split("/").pop();
      const serverUrl = getSetting("server.domain");
      return newProviders.kv.server.saveData(
        serverUrl,
        classNumber,
        data,
        date
      );
    }
  },

  loadConfig: (provider, key) => {
    if (legacyProviders[provider]) {
      return legacyProviders[provider]?.loadConfig(key);
    }

    // If using new KV provider
    if (provider === "kv-local") {
      const classNumber = key.split("/").pop();
      return newProviders.kv.local.loadConfig(classNumber);
    } else if (provider === "kv-server") {
      const serverUrl = getSetting("server.domain");
      return newProviders.kv.server.loadConfig(serverUrl);
    }
  },

  saveConfig: (provider, key, config) => {
    if (legacyProviders[provider]) {
      return legacyProviders[provider]?.saveConfig(key, config);
    }

    // If using new KV provider
    if (provider === "kv-local") {
      const classNumber = key.split("/").pop();
      return newProviders.kv.local.saveConfig(classNumber, config);
    } else if (provider === "kv-server") {
      const serverUrl = getSetting("server.domain");
      return newProviders.kv.server.saveConfig(serverUrl, config);
    }
  },
};

export const ErrorCodes = {
  NOT_FOUND: "数据不存在",
  NETWORK_ERROR: "网络连接失败",
  SERVER_ERROR: "服务器错误",
  SAVE_ERROR: "保存失败",
  CONFIG_ERROR: "配置错误",
  UNKNOWN_ERROR: "未知错误",
};
