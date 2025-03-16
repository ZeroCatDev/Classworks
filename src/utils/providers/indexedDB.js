import { openDB } from 'idb';
import { formatResponse, formatError } from '../dataProvider';
import { defaultConfig, defaultHomework } from '../defaults/defaultData';

const DB_NAME = "HomeworkDB";
const DB_VERSION = 1;

const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("homework")) {
                db.createObjectStore("homework");
            }
            if (!db.objectStoreNames.contains("config")) {
                db.createObjectStore("config");
            }
        },
    });
};

export const indexedDBProvider = {
    async loadData(key, date) {
        try {
            const classNumber = key.split("/").pop();
            if (!classNumber) {
                return formatError("请先设置班号", "CONFIG_ERROR");
            }

            const db = await initDB();
            const storageKey = `homework_${classNumber}_${date}`;
            const data = await db.get("homework", storageKey);

            if (!data) {
                const today = new Date().toISOString().split("T")[0];
                if (date === today) {
                    return formatResponse(defaultHomework);
                }
                return formatError("数据不存在", "NOT_FOUND");
            }

            return formatResponse(JSON.parse(data));
        } catch (error) {
            return formatError("读取IndexedDB数据失败：" + error);
        }
    },

    async saveData(key, data, date) {
        try {
            const classNumber = key.split("/").pop();
            if (!classNumber) {
                return formatError("请先设置班号", "CONFIG_ERROR");
            }

            const db = await initDB();
            const storageKey = `homework_${classNumber}_${date}`;
            await db.put("homework", JSON.stringify(data), storageKey);
            return formatResponse(null, "保存成功");
        } catch (error) {
            return formatError("保存IndexedDB数据失败：" + error);
        }
    },

    async loadConfig(key) {
        try {
            const classNumber = key.split("/").pop();
            if (!classNumber) {
                return formatError("请先设置班号", "CONFIG_ERROR");
            }

            const db = await initDB();
            const storageKey = `config_${classNumber}`;
            const config = await db.get("config", storageKey);

            if (!config) {
                return formatResponse(defaultConfig);
            }

            return formatResponse(JSON.parse(config));
        } catch (error) {
            return formatError("读取IndexedDB配置失败：" + error);
        }
    },

    async saveConfig(key, config) {
        try {
            const classNumber = key.split("/").pop();
            if (!classNumber) {
                return formatError("请先设置班号", "CONFIG_ERROR");
            }

            const db = await initDB();
            const storageKey = `config_${classNumber}`;
            await db.put("config", JSON.stringify(config), storageKey);
            return formatResponse(null, "保存成功");
        } catch (error) {
            return formatError("保存IndexedDB配置失败：" + error);
        }
    }
};
