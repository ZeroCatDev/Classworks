import axios from '@/axios/axios';
import { formatResponse, formatError } from '../dataProvider';
import { getSetting } from '../settings';

// Helper function to get request headers with site key if available
const getHeaders = () => {
    const headers = { Accept: "application/json" };
    const siteKey = getSetting("server.siteKey");

    if (siteKey) {
        headers['x-site-key'] = siteKey;
    }

    return headers;
};

export const serverProvider = {
    async loadData(key, date) {
        try {
            const res = await axios.get(`${key}/homework?date=${date}`, {
                headers: getHeaders()
            });
            if (res.data?.status === false) {
                return formatError(res.data.msg || "获取数据失败", "SERVER_ERROR");
            }
            return formatResponse(res.data);
        } catch (error) {
            return formatError(
                error.response?.data?.message || "服务器连接失败",
                "NETWORK_ERROR"
            );
        }
    },

    async saveData(key, data, date) {
        try {
            // 添加date参数到URL
            const url = date ? `${key}/homework?date=${date}` : `${key}/homework`;
            await axios.post(url, data, {
                headers: getHeaders()
            });
            return formatResponse(null, "保存成功");
        } catch (error) {
            return formatError(
                error.response?.data?.message || "保存失败",
                "SAVE_ERROR"
            );
        }
    },

    async loadConfig(key) {
        try {
            const res = await axios.get(`${key}/config`, {
                headers: getHeaders()
            });
            if (res.data?.status === false) {
                return formatError(res.data.msg || "获取配置失败", "SERVER_ERROR");
            }
            return formatResponse(res.data);
        } catch (error) {
            return formatError(
                error.response?.data?.message || "服务器连接失败",
                "NETWORK_ERROR"
            );
        }
    },

    async saveConfig(key, config) {
        try {
            const res = await axios.put(`${key}/config`, config, {
                headers: getHeaders()
            });
            if (res.data?.status === false) {
                return formatError(res.data.msg || "保存失败", "SAVE_ERROR");
            }
            return formatResponse(null, "保存成功");
        } catch (error) {
            return formatError(
                error.response?.data?.message || "保存失败",
                "SAVE_ERROR"
            );
        }
    }
};
