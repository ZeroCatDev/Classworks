import { formatResponse, formatError } from '../dataProvider';

export const localStorageProvider = {
    async loadData(key, date) {
        try {
            const classNumber = key.split("/").pop();
            if (!classNumber) {
                return formatError("请先设置班号", "CONFIG_ERROR");
            }

            const storageKey = `homework_${classNumber}_${date}`;
            const rawData = localStorage.getItem(storageKey);

            if (!rawData) {
                const today = new Date().toISOString().split("T")[0];
                if (date === today) {
                    return formatResponse({
                        homework: {},
                        attendance: { absent: [], late: [] },
                    });
                }
                return formatError("数据不存在", "NOT_FOUND");
            }

            return formatResponse(JSON.parse(rawData));
        } catch (error) {
            return formatError("读取本地数据失败：" + error);
        }
    },

    async saveData(key, data, date) {
        try {
            const classNumber = key.split("/").pop();
            if (!classNumber) {
                return formatError("请先设置班号", "CONFIG_ERROR");
            }

            const storageKey = `homework_${classNumber}_${date}`; // 使用传入的date参数
            localStorage.setItem(storageKey, JSON.stringify(data));
            return formatResponse(null, "保存成功");
        } catch (error) {
            return formatError("保存本地数据失败:" + error);
        }
    },

    async loadConfig(key) {
        try {
            const classNumber = key.split("/").pop();
            if (!classNumber) {
                return formatError("请先设置班号", "CONFIG_ERROR");
            }

            const storageKey = `config_${classNumber}`;
            const rawData = localStorage.getItem(storageKey);

            if (!rawData) {
                return formatResponse({
                    studentList: [],
                    displayOptions: {},
                });
            }

            return formatResponse(JSON.parse(rawData));
        } catch (error) {
            return formatError("读取本地配置失败:" + error);
        }
    },

    async saveConfig(key, config) {
        try {
            const classNumber = key.split("/").pop();
            if (!classNumber) {
                return formatError("请先设置班号", "CONFIG_ERROR");
            }

            const storageKey = `config_${classNumber}`;
            localStorage.setItem(storageKey, JSON.stringify(config));
            return formatResponse(null, "保存成功");
        } catch (error) {
            return formatError("保存本地配置失败:" + error);
        }
    }
};
