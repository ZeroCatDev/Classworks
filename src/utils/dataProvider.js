import { kvLocalProvider } from "./providers/kvLocalProvider";
import { kvServerProvider } from "./providers/kvServerProvider";
import { getSetting } from "./settings";

export const formatResponse = (data) => data;

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
      return kvServerProvider.loadData(key);
    } else {
      return kvLocalProvider.loadData(key);
    }
  },

  saveData: async (key, data) => {
    const provider = getSetting("server.provider");
    const useServer =
      provider === "kv-server" || provider === "classworkscloud";

    if (useServer) {
      return kvServerProvider.saveData(key, data);
    } else {
      return kvLocalProvider.saveData(key, data);
    }
  },

  /**
   * 获取键名列表
   * @param {Object} options - 查询选项
   * @param {string} options.sortBy - 排序字段，默认为 "key"
   * @param {string} options.sortDir - 排序方向，"asc" 或 "desc"，默认为 "asc"
   * @param {number} options.limit - 每页返回的记录数，默认为 100
   * @param {number} options.skip - 跳过的记录数，默认为 0
   * @returns {Promise<Object>} 包含键名列表和分页信息的响应对象
   * 
   * 使用示例:
   * ```javascript
   * // 获取前10个键名
   * const result = await dataProvider.loadKeys({ limit: 10 });
   * if (result.success !== false) {
   *   console.log('键名列表:', result.keys);
   *   console.log('总数:', result.total_rows);
   * }
   * 
   * // 获取第二页数据（跳过前10个）
   * const page2 = await dataProvider.loadKeys({ limit: 10, skip: 10 });
   * 
   * // 按键名降序排列
   * const sorted = await dataProvider.loadKeys({ sortDir: 'desc' });
   * ```
   * 
   * 返回值格式:
   * ```javascript
   * {
   *   keys: ["key1", "key2", "key3"],
   *   total_rows: 150,
   *   current_page: {
   *     limit: 10,
   *     skip: 0,
   *     count: 10
   *   },
   *   load_more: "/api/kv/namespace/_keys?..." // 仅服务器模式
   * }
   * ```
   */
  loadKeys: async (options = {}) => {
    const provider = getSetting("server.provider");
    const useServer =
      provider === "kv-server" || provider === "classworkscloud";

    if (useServer) {
      return kvServerProvider.loadKeys(options);
    } else {
      return kvLocalProvider.loadKeys(options);
    }
  },
};

export const ErrorCodes = {
  NOT_FOUND: "数据不存在",
  NETWORK_ERROR: "网络连接失败",
  SERVER_ERROR: "服务器错误",
  SAVE_ERROR: "保存失败",
  CONFIG_ERROR: "配置错误",
  PERMISSION_DENIED: "无权限访问",
  UNAUTHORIZED: "认证失败",
  UNKNOWN_ERROR: "未知错误",
};
