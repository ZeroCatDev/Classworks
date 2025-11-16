import axios from "axios";
import {getSetting} from "@/utils/settings";
import {parseRateLimit} from "ratelimit-header-parser";
import RateLimitModal from "@/components/RateLimitModal.vue";
import {Base64} from "js-base64";

// 基本配置
const axiosInstance = axios.create({
  // 可以在这里添加基础配置，例如超时时间等
  timeout: 10000,
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  (requestConfig) => {
    const provider = getSetting("server.provider");

    // 只有在 kv-server 或 classworkscloud 模式下才添加请求头
    if (provider === "kv-server" || provider === "classworkscloud") {
      // 优先使用新的 kvToken
      const kvToken = getSetting("server.kvToken");
      if (kvToken) {
        requestConfig.headers["x-app-token"] = kvToken;
      } else {
        // 向后兼容旧的 siteKey
        const siteKey = getSetting("server.siteKey");
        if (siteKey) {
          requestConfig.headers["x-site-key"] = Base64.encode(siteKey);
        }
      }
    }

    return requestConfig;
  },
  (error) => {
    console.log(error);
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理限速响应 (HTTP 429)
    if (error.response && error.response.status === 429) {
      try {
        // 解析限速头信息
        const rateLimitInfo = parseRateLimit(error.response);

        if (rateLimitInfo) {
          // 显示限速弹窗，直接传递重置时间
          RateLimitModal.show(
            rateLimitInfo.reset,
            error.config.url,
            error.config.method.toUpperCase()
          );
        }
      } catch (parseError) {
        console.error("解析限速头信息失败:", parseError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
