import axios from "@/axios/axios";
import {getSetting} from "@/utils/settings";
import {tryWithRotation, isRotationEnabled} from "@/utils/serverRotation";

// Helper function to check if provider is valid for API calls
const isValidProvider = () => {
  const provider = getSetting("server.provider");
  return provider === "kv-server" || provider === "classworkscloud";
};

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
 * Get namespace info from the server
 * @returns {Promise<Object>} Response data containing namespace info
 */
export const getNamespaceInfo = async () => {
  if (!isValidProvider()) {
    throw new Error("当前数据提供者不支持此操作");
  }

  try {
    // Use rotation for classworkscloud provider
    if (isRotationEnabled()) {
      const response = await tryWithRotation(async (serverUrl) => {
        return await axios.get(`${serverUrl}/kv/_info`, {
          headers: getHeaders(),
        });
      });
      return response.data;
    }

    const serverUrl = getSetting("server.domain");
    const response = await axios.get(`${serverUrl}/kv/_info`, {
      headers: getHeaders(),
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "获取命名空间信息失败");
  }
};
