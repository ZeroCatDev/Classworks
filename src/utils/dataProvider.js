import { serverProvider } from './providers/server';
import { indexedDBProvider } from './providers/indexedDB';

export const formatResponse = (data, message = null) => ({
  success: true,
  data,
  message,
});

export const formatError = (message, code = "UNKNOWN_ERROR") => ({
  success: false,
  error: { code, message },
});

const providers = {
  server: serverProvider,
  indexedDB: indexedDBProvider,
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
