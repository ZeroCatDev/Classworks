import axios from "axios";
import { getSetting } from '@/utils/settings';

// 基本配置
const axiosInstance = axios.create({
  // 可以在这里添加基础配置，例如超时时间等
  timeout: 10000,
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  (requestConfig) => {
    // 确保每次请求时都获取最新的 siteKey
    const siteKey = getSetting('server.siteKey');
    if (siteKey) {
      requestConfig.headers["x-site-key"] = siteKey;
    }
    return requestConfig;
  },
  (error) => {
    console.log(error);
    return Promise.reject(error);
  }
);

export default axiosInstance;
