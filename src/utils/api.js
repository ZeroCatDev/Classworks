import axios from "@/axios/axios";
import { getSetting } from "@/utils/settings";

// Helper function to check if provider is valid for API calls
const isValidProvider = () => {
  const provider = getSetting("server.provider");
  return provider === "kv-server" || provider === "classworkscloud";
};

// Helper function to get request headers with site key and namespace password
const getHeaders = () => {
  const headers = { Accept: "application/json" };
  const siteKey = getSetting("server.siteKey");
  const namespacePassword = getSetting("namespace.password");

  if (siteKey) {
    headers["x-site-key"] = siteKey;
  }
  if (namespacePassword) {
    headers["x-namespace-password"] = namespacePassword;
  }

  return headers;
};

/**
 * Get namespace info from the server
 * @returns {Promise<Object>} Response data containing namespace info
 */
export const getNamespaceInfo = async () => {
  if (!isValidProvider()) {
    throw new Error("当前数据提供者不支持此操作");
  }

  const serverUrl = getSetting("server.domain");
  const machineId = getSetting("device.uuid");

  try {
    const response = await axios.get(`${serverUrl}/${machineId}/_info`, {
      headers: getHeaders(),
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "获取命名空间信息失败");
  }
};

/**
 * Update namespace password
 * @param {string} oldPassword - Current password (if exists)
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} Response data
 */
export const updateNamespacePassword = async (oldPassword, newPassword) => {
  if (!isValidProvider()) {
    throw new Error("当前数据提供者不支持此操作");
  }

  const serverUrl = getSetting("server.domain");
  const machineId = getSetting("device.uuid");

  try {
    const response = await axios.put(
      `${serverUrl}/${machineId}/_infopassword`,
      {
        oldPassword,
        newPassword,
      },
      {
        headers: getHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "更新命名空间密码失败");
  }
};