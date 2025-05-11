import { kvProvider } from "./providers/kvProvider";
import { getSetting } from "./settings";

export const formatResponse = (data, message = null) => (data);

export const formatError = (message, code = "UNKNOWN_ERROR") => ({
  success: false,
  error: { code, message },
});

// Main data provider with simplified API
export default {
  // Provider API methods
  loadData: async (key) => {
    const provider = getSetting("server.provider");
    const useServer =
      provider === "kv-server" || provider === "classworkscloud";

    if (useServer) {
      return kvProvider.server.loadData(key);
    } else {
      return kvProvider.local.loadData(key);
    }
  },

  saveData: async (key, data) => {
    const provider = getSetting("server.provider");
    const useServer =
      provider === "kv-server" || provider === "classworkscloud";

    if (useServer) {
      return kvProvider.server.saveData(key, data);
    } else {
      return kvProvider.local.saveData(key, data);
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
