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

  async updatePassword(newPassword, oldPassword) {
    try {
      const serverUrl = getSetting("server.domain");
      const machineId = getSetting("device.uuid");

      const res = await axios.post(
        `${serverUrl}/${machineId}/_password`,
        {
          newPassword,
          oldPassword,
        },
        {
          headers: getHeaders(),
        }
      );

      if (res.status == 200) {
        setSetting("namespace.password", newPassword);
      }

      return formatResponse(res);
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

      if (res.status === 200) {
        setSetting("namespace.password", null); // 清除本地存储的密码
      }

      return formatResponse(res);
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
};