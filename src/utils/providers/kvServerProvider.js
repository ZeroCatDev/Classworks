import axios from "@/axios/axios";
import { formatResponse, formatError } from "../dataProvider";
import { getSetting, setSetting } from "../settings";

// Helper function to get request headers with site key and password if available
const getHeaders = () => {
  const headers = { Accept: "application/json" };
  const siteKey = getSetting("server.siteKey");
  const password = getSetting("namespace.password");

  if (siteKey) {
    headers["x-site-key"] = siteKey;
  }
  if (password) {
    headers["x-namespace-password"] = password;
  }

  return headers;
};

export const kvServerProvider = {
  async loadNamespaceInfo() {
    try {
      const serverUrl = getSetting("server.domain");
      const machineId = getSetting("device.uuid");

      const res = await axios.get(`${serverUrl}/${machineId}/_info`, {
        headers: getHeaders(),
      });

      const { name, accessType } = res.data;

      // 如果name为null，使用班级号作为名称并更新
      if (name === null) {
        const classNumber = getSetting("server.classNumber");
        await this.updateNamespaceInfo({ name: classNumber });
        // 重新加载命名空间信息
        return await this.loadNamespaceInfo();
      }

      // 更新本地访问权限设置
      if (accessType) {
        setSetting("namespace.accessType", accessType);
      }

      return formatResponse(res);
    } catch (error) {
      return formatError(
        error.response?.data?.message || "获取命名空间信息失败",
        "NAMESPACE_ERROR"
      );
    }
  },

  async updateNamespaceInfo(data) {
    try {
      const serverUrl = getSetting("server.domain");
      const machineId = getSetting("device.uuid");

      const res = await axios.put(`${serverUrl}/${machineId}/_info`, data, {
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

  async updatePassword(newPassword, oldPassword, passwordHint = null) {
    try {
      const serverUrl = getSetting("server.domain");
      const machineId = getSetting("device.uuid");

      const res = await axios.post(
        `${serverUrl}/${machineId}/_password`,
        {
          password: newPassword,
          oldPassword,
          passwordHint,
        },
        {
          headers: getHeaders(),
        }
      );

      if (res.status === 200) {
        // 更新本地存储的密码
        setSetting("namespace.password", newPassword || "");
      }

      return res;
    } catch (error) {
      return formatError(
        error.response?.data?.message || "更新密码失败",
        "PASSWORD_ERROR"
      );
    }
  },

  async deletePassword() {
    try {
      const serverUrl = getSetting("server.domain");
      const machineId = getSetting("device.uuid");

      const res = await axios.delete(`${serverUrl}/${machineId}/_password`, {
        headers: getHeaders(),
      });
      setSetting("namespace.password", "");
      return res;
    } catch (error) {
      return formatError(
        error.response?.data?.message || "删除密码失败",
        "PASSWORD_ERROR"
      );
    }
  },

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
      console.log(error);
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
      const serverUrl = getSetting("server.domain");
      const machineId = getSetting("device.uuid");
      
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
      
      const res = await axios.get(`${serverUrl}/${machineId}/_keys?${params}`, {
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