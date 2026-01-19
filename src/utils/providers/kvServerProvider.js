import axios from "@/axios/axios";
import {formatResponse, formatError} from "../dataProvider";
import {getSetting} from "../settings";
import {CLASSWORKS_CLOUD_SERVERS} from "../constants";

// 当前正在使用的服务器索引
let currentServerIndex = 0;

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

/**
 * 获取服务器URL，支持Classworks云服务的自动故障转移
 * @returns {string} 服务器URL
 */
const getServerUrl = () => {
  const provider = getSetting("server.provider");
  
  // 如果使用classworkscloud，使用服务器列表
  if (provider === "classworkscloud") {
    return CLASSWORKS_CLOUD_SERVERS[currentServerIndex];
  }
  
  // 否则使用用户配置的服务器域名
  return getSetting("server.domain");
};

/**
 * 尝试下一个服务器（仅对classworkscloud生效）
 */
const tryNextServer = () => {
  const provider = getSetting("server.provider");
  
  if (provider === "classworkscloud") {
    currentServerIndex = (currentServerIndex + 1) % CLASSWORKS_CLOUD_SERVERS.length;
    console.warn(`切换到备用服务器: ${CLASSWORKS_CLOUD_SERVERS[currentServerIndex]}`);
  }
};

/**
 * 带自动故障转移的请求包装器
 * @param {Function} requestFn - 执行请求的函数
 * @returns {Promise} 请求结果
 */
const requestWithFailover = async (requestFn) => {
  const provider = getSetting("server.provider");
  const maxRetries = provider === "classworkscloud" ? CLASSWORKS_CLOUD_SERVERS.length : 1;
  
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // 只有在使用classworkscloud且还有其他服务器可尝试时才切换
      if (provider === "classworkscloud" && attempt < maxRetries - 1) {
        console.warn(`服务器请求失败，尝试备用服务器...`, error.message);
        tryNextServer();
      }
    }
  }
  
  // 所有服务器都失败后抛出最后一个错误
  throw lastError;
};

export const kvServerProvider = {
  async loadNamespaceInfo() {
    try {
      return await requestWithFailover(async () => {
        const serverUrl = getServerUrl();

        const res = await axios.get(`${serverUrl}/kv/_info`, {
          headers: getHeaders(),
        });

        // 直接返回新格式 API 数据，包含 device 和 account 信息
        return formatResponse(res.data);
      });
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
      return await requestWithFailover(async () => {
        const serverUrl = getServerUrl();

        const res = await axios.put(`${serverUrl}/kv/_info`, data, {
          headers: getHeaders(),
        });

        return res;
      });
    } catch (error) {
      return formatError(
        error.response?.data?.message || "更新命名空间信息失败",
        "NAMESPACE_ERROR"
      );
    }
  },

  async loadData(key) {
    try {
      return await requestWithFailover(async () => {
        const serverUrl = getServerUrl();

        const res = await axios.get(`${serverUrl}/kv/${key}`, {
          headers: getHeaders(),
        });

        return formatResponse(res.data);
      });
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
      return await requestWithFailover(async () => {
        const serverUrl = getServerUrl();
        await axios.post(`${serverUrl}/kv/${key}`, data, {
          headers: getHeaders(),
        });
        return formatResponse(true);
      });
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
      return await requestWithFailover(async () => {
        const serverUrl = getServerUrl();

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

        const res = await axios.get(`${serverUrl}/kv/_keys?${params}`, {
          headers: getHeaders(),
        });

        return formatResponse(res.data);
      });
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

// 导出URL获取函数供其他模块使用
export { getServerUrl };
