import axios from '@/axios/axios';
import { formatResponse, formatError } from '../dataProvider';
import { openDB } from 'idb';
import { getSetting } from '../settings';

// Constants for key names
const CONFIG_KEY = 'classworks-config';
const DATA_KEY_PREFIX = 'classworks-data-';

// Database initialization for local storage
const DB_NAME = "ClassworksDB";
const DB_VERSION = 2;

// Helper function to get request headers with site key if available
const getHeaders = () => {
    const headers = { Accept: "application/json" };
    const siteKey = getSetting("server.siteKey");

    if (siteKey) {
        headers['x-site-key'] = siteKey;
    }

    return headers;
};

// Removed migrateToKvStorage function - now handled by the dedicated migration tool

const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Create or update stores as needed
            if (!db.objectStoreNames.contains("kv")) {
                db.createObjectStore("kv");
            }

            // Add a system store for machine ID and other system settings
            if (!db.objectStoreNames.contains("system")) {
                db.createObjectStore("system");
            }
        },
    });
};

// Format date as YYYYMMDD for keys
const formatDateForKey = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

export const kvProvider = {
    // Local storage provider
    local: {
        async loadData(date) {
            try {
                const formattedDate = formatDateForKey(date);
                const key = `${DATA_KEY_PREFIX}${formattedDate}`;

                const db = await initDB();
                const data = await db.get("kv", key);

                if (!data) {
                    const today = new Date().toISOString().split("T")[0];
                    if (date === today) {
                        // Return default data for today
                        return formatResponse({
                            homework: {},
                            attendance: {
                                absent: [],
                                late: []
                            }
                        });
                    }
                    return formatError("数据不存在", "NOT_FOUND");
                }

                return formatResponse(JSON.parse(data));
            } catch (error) {
                return formatError("读取本地数据失败：" + error);
            }
        },

        async saveData(data, date) {
            try {
                const formattedDate = formatDateForKey(date);
                const key = `${DATA_KEY_PREFIX}${formattedDate}`;

                const db = await initDB();
                await db.put("kv", JSON.stringify(data), key);
                return formatResponse(null, "保存成功");
            } catch (error) {
                return formatError("保存本地数据失败：" + error);
            }
        },

        async loadConfig() {
            try {
                const db = await initDB();
                const config = await db.get("kv", CONFIG_KEY);

                if (!config) {
                    return formatResponse({
                        studentList: [
                            "Classworks可以管理学生列表",
                            '你可以点击设置，在其中找到"学生列表"',
                            "在添加学生处输入学生姓名，点击添加",
                            "或者点击高级编辑，从Excel表格中复制数据并粘贴进来",
                        ],
                    });
                }

                return formatResponse(JSON.parse(config));
            } catch (error) {
                return formatError("读取本地配置失败：" + error);
            }
        },

        async saveConfig(config) {
            try {
                const db = await initDB();
                await db.put("kv", JSON.stringify(config), CONFIG_KEY);
                return formatResponse(null, "保存成功");
            } catch (error) {
                return formatError("保存本地配置失败：" + error);
            }
        }
    },

    // Server storage provider
    server: {
        async loadData(classNumber, date) {
            try {
                const serverUrl = getSetting("server.domain");
                const machineId = getSetting("device.uuid");
                const formattedDate = formatDateForKey(date);
                const key = `${DATA_KEY_PREFIX}${formattedDate}`;

                const res = await axios.get(`${serverUrl}/${machineId}/${key}`, {
                    headers: getHeaders()
                });

                return formatResponse(res.data);
            } catch (error) {
                if (error.response?.status === 404) {
                    const today = new Date().toISOString().split("T")[0];
                    if (date === today) {
                        // Return default data for today
                        return formatResponse({
                            homework: {},
                            attendance: {
                                absent: [],
                                late: []
                            }
                        });
                    }
                    return formatError("数据不存在", "NOT_FOUND");
                }

                return formatError(
                    error.response?.data?.message || "服务器连接失败",
                    "NETWORK_ERROR"
                );
            }
        },

        async saveData(classNumber, data, date) {
            try {
                const serverUrl = getSetting("server.domain");
                const machineId = getSetting("device.uuid");
                const formattedDate = formatDateForKey(date);
                const key = `${DATA_KEY_PREFIX}${formattedDate}`;

                await axios.post(`${serverUrl}/${machineId}/${key}`, data, {
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

        async loadConfig() {
            try {
                const serverUrl = getSetting("server.domain");
                const machineId = getSetting("device.uuid");
                const res = await axios.get(`${serverUrl}/${machineId}/${CONFIG_KEY}`, {
                    headers: getHeaders()
                });

                return formatResponse(res.data);
            } catch (error) {
                if (error.response?.status === 404) {
                    return formatResponse({
                        studentList: [
                            "Classworks可以管理学生列表",
                            '你可以点击设置，在其中找到"学生列表"',
                            "在添加学生处输入学生姓名，点击添加",
                            "或者点击高级编辑，从Excel表格中复制数据并粘贴进来",
                        ],
                    });
                }

                return formatError(
                    error.response?.data?.message || "服务器连接失败",
                    "NETWORK_ERROR"
                );
            }
        },

        async saveConfig(config) {
            try {
                const serverUrl = getSetting("server.domain");
                const machineId = getSetting("device.uuid");
                await axios.post(`${serverUrl}/${machineId}/${CONFIG_KEY}`, config, {
                    headers: getHeaders()
                });
                return formatResponse(null, "保存成功");
            } catch (error) {
                return formatError(
                    error.response?.data?.message || "保存失败",
                    "SAVE_ERROR"
                );
            }
        }
    }
};

