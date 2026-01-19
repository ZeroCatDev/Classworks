import axios from "@/axios/axios";
import {formatResponse, formatError} from "../dataProvider";
import {getSetting} from "../settings";
import {tryWithPrimaryServer, isRotationEnabled} from "../serverRotation";

// Helper function to get request headers with kvtoken
const getHeaders = () => {
  const headers = {Accept: "application/json"};
  const kvToken = getSetting("server.kvToken");
  const siteKey = getSetting("server.siteKey");

  // 优先使用新的kvToken
  if (kvToken) {
    headers["x-app-token"] = kvToken;
  } else if (siteKey) {
    // 向后兼容旧的siteKey
    headers["x-site-key"] = siteKey;
  }

  return headers;
};

export const kvServerProvider = {
  async loadNamespaceInfo() {
    try {
      // Use primary server with fallback for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithPrimaryServer(async (serverUrl) => {
          const res = await axios.get(`${serverUrl}/kv/_info`, {
            headers: getHeaders(),
          });
          return formatResponse(res.data);
        });
      }

      // Standard single-server mode
      const serverUrl = getSetting("server.domain");
      const res = await axios.get(`${serverUrl}/kv/_info`, {
        headers: getHeaders(),
      });

      // 直接返回新格式 API 数据，包含 device 和 account 信息
      return formatResponse(res.data);
    } catch (error) {
      console.error("获取命名空间信息失败:", error);
      return formatError(
        error.response?.data?.message || "获取命名空间信息失败",
        "NAMESPACE_ERROR"
      );
    }
  },

  async updateNamespaceInfo(data) {
    try {
      // Use primary server with fallback for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithPrimaryServer(async (serverUrl) => {
          const res = await axios.put(`${serverUrl}/kv/_info`, data, {
            headers: getHeaders(),
          });
          return res;
        });
      }

      const serverUrl = getSetting("server.domain");
      const res = await axios.put(`${serverUrl}/kv/_info`, data, {
        headers: getHeaders(),
      });

      return res;
    } catch (error) {
      return formatError(
        error.response?.data?.message || "更新命名空间信息失败",
        "NAMESPACE_ERROR"
      );
    }
  },

  async loadData(key) {
    try {
      // Use primary server with fallback for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithPrimaryServer(async (serverUrl) => {
          const res = await axios.get(`${serverUrl}/kv/${key}`, {
            headers: getHeaders(),
          });
          return formatResponse(res.data);
        });
      }

      const serverUrl = getSetting("server.domain");
      const res = await axios.get(`${serverUrl}/kv/${key}`, {
        headers: getHeaders(),
      });

      return formatResponse(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
        return formatError("数据不存在", "NOT_FOUND");
      }
      console.log(error);
      return formatError(
        error.response?.data?.message || "服务器连接失败",
        "NETWORK_ERROR"
      );
    }
  },

  async saveData(key, data) {
    try {
      // Use primary server with fallback for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithPrimaryServer(async (serverUrl) => {
          await axios.post(`${serverUrl}/kv/${key}`, data, {
            headers: getHeaders(),
          });
          return formatResponse(true);
        });
      }

      const serverUrl = getSetting("server.domain");
      await axios.post(`${serverUrl}/kv/${key}`, data, {
        headers: getHeaders(),
      });
      return formatResponse(true);
    } catch (error) {
      console.log(error);
      return formatError(
        error.response?.data?.message || "保存失败",
        "SAVE_ERROR"
      );
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
   * 返回值示例:
   * {
   *   keys: ["key1", "key2", "key3"],
   *   total_rows: 150,
   *   current_page: {
   *     limit: 10,
   *     skip: 0,
   *     count: 10
   *   },
   *   load_more: "/api/kv/namespace/_keys?sortBy=key&sortDir=asc&limit=10&skip=10"
   * }
   */
  async loadKeys(options = {}) {
    try {
      // 设置默认参数
      const {
        sortBy = "key",
        sortDir = "asc",
        limit = 100,
        skip = 0
      } = options;

      // 构建查询参数
      const params = new URLSearchParams({
        sortBy,
        sortDir,
        limit: limit.toString(),
        skip: skip.toString()
      });

      // Use primary server with fallback for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithPrimaryServer(async (serverUrl) => {
          const res = await axios.get(`${serverUrl}/kv/_keys?${params}`, {
            headers: getHeaders(),
          });
          return formatResponse(res.data);
        });
      }

      const serverUrl = getSetting("server.domain");
      const res = await axios.get(`${serverUrl}/kv/_keys?${params}`, {
        headers: getHeaders(),
      });

      return formatResponse(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
        return formatError("命名空间不存在", "NOT_FOUND");
      }
      if (error.response?.status === 403) {
        return formatError("无权限访问此命名空间", "PERMISSION_DENIED");
      }
      if (error.response?.status === 401) {
        return formatError("认证失败", "UNAUTHORIZED");
      }
      console.log(error);
      return formatError(
        error.response?.data?.message || "获取键名列表失败",
        "NETWORK_ERROR"
      );
    }
  },
};
