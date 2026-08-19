import {keysTotal} from "./metrics.js";
import { prisma } from "./prisma.js";

class KVStore {
    /**
     * 通过设备ID和键名获取值
     * @param {number} deviceId - 设备ID
     * @param {string} key - 键名
     * @returns {object|null} 键对应的值或null
     */
    async get(deviceId, key) {
        const item = await prisma.kVStore.findUnique({
            where: {
                deviceId_key: {
                    deviceId: deviceId,
                    key: key,
                },
            },
        });
        return item ? item.value : null;
    }

    /**
     * 获取键的完整信息（包括元数据）
     * @param {number} deviceId - 设备ID
     * @param {string} key - 键名
     * @returns {object|null} 键的完整信息或null
     */
    async getMetadata(deviceId, key) {
        const item = await prisma.kVStore.findUnique({
            where: {
                deviceId_key: {
                    deviceId: deviceId,
                    key: key,
                },
            },
            select: {
                key: true,
                deviceId: true,
                creatorIp: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!item) return null;

        // 转换为更友好的格式
        return {
            deviceId: item.deviceId,
            key: item.key,
            metadata: {
                creatorIp: item.creatorIp,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            },
        };
    }

    /**
     * 在指定设备下创建或更新键值
     * @param {number} deviceId - 设备ID
     * @param {string} key - 键名
     * @param {object} value - 键值
     * @param {string} creatorIp - 创建者IP，可选
     * @returns {object} 创建或更新的记录
     */
    async upsert(deviceId, key, value, creatorIp = "") {
        const item = await prisma.kVStore.upsert({
            where: {
                deviceId_key: {
                    deviceId: deviceId,
                    key: key,
                },
            },
            update: {
                value,
                ...(creatorIp && {creatorIp}),
            },
            create: {
                deviceId: deviceId,
                key: key,
                value,
                creatorIp,
            },
        });

        // 更新键总数指标
        const totalKeys = await prisma.kVStore.count();
        keysTotal.set(totalKeys);

        // 返回带有设备ID和原始键的结果
        return {
            deviceId,
            key,
            value: item.value,
            creatorIp: item.creatorIp,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    }

    /**
     * 批量创建或更新键值对（优化性能）
     * @param {number} deviceId - 设备ID
     * @param {object} data - 键值对数据 {key1: value1, key2: value2, ...}
     * @param {string} creatorIp - 创建者IP，可选
     * @returns {object} {results: Array, errors: Array}
     */
    async batchUpsert(deviceId, data, creatorIp = "") {
        const results = [];
        const errors = [];

        // 使用事务处理所有操作
        await prisma.$transaction(async (tx) => {
            for (const [key, value] of Object.entries(data)) {
                try {
                    const item = await tx.kVStore.upsert({
                        where: {
                            deviceId_key: {
                                deviceId: deviceId,
                                key: key,
                            },
                        },
                        update: {
                            value,
                            ...(creatorIp && {creatorIp}),
                        },
                        create: {
                            deviceId: deviceId,
                            key: key,
                            value,
                            creatorIp,
                        },
                    });

                    results.push({
                        key: item.key,
                        created: item.createdAt.getTime() === item.updatedAt.getTime(),
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt,
                    });
                } catch (error) {
                    errors.push({
                        key,
                        error: error.message,
                    });
                }
            }
        });

        // 在事务完成后，一次性更新指标
        const totalKeys = await prisma.kVStore.count();
        keysTotal.set(totalKeys);

        return { results, errors };
    }

    /**
     * 通过设备ID和键名删除
     * @param {number} deviceId - 设备ID
     * @param {string} key - 键名
     * @returns {object|null} 删除的记录或null
     */
    async delete(deviceId, key) {
        try {
            const item = await prisma.kVStore.delete({
                where: {
                    deviceId_key: {
                        deviceId: deviceId,
                        key: key,
                    },
                },
            });

            // 更新键总数指标
            const totalKeys = await prisma.kVStore.count();
            keysTotal.set(totalKeys);

            return item ? {...item, deviceId, key} : null;
        } catch (error) {
            // 忽略记录不存在的错误
            if (error.code === "P2025") {
                return null;
            }
            throw error;
        }
    }

    /**
     * 列出指定设备下的所有键名及其元数据
     * @param {number} deviceId - 设备ID
     * @param {object} options - 选项参数
     * @returns {Array} 键名和元数据数组
     */
    async list(deviceId, options = {}) {
        const {sortBy = "key", sortDir = "asc", limit = 100, skip = 0} = options;

        // 构建排序条件
        const orderBy = {};
        orderBy[sortBy] = sortDir.toLowerCase();

        // 查询设备的所有键
        const items = await prisma.kVStore.findMany({
            where: {
                deviceId: deviceId,
            },
            select: {
                deviceId: true,
                key: true,
                creatorIp: true,
                createdAt: true,
                updatedAt: true,
                value: false,
            },
            orderBy,
            take: limit,
            skip: skip,
        });

        // 处理结果
        return items.map((item) => ({
            deviceId: item.deviceId,
            key: item.key,
            metadata: {
                creatorIp: item.creatorIp,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            },
        }));
    }

    /**
     * 获取指定设备下的键名列表（不包括内容）
     * @param {number} deviceId - 设备ID
     * @param {object} options - 查询选项
     * @returns {Array} 键名列表
     */
    async listKeysOnly(deviceId, options = {}) {
        const {sortBy = "key", sortDir = "asc", limit = 100, skip = 0} = options;

        // 构建排序条件
        const orderBy = {};
        orderBy[sortBy] = sortDir.toLowerCase();

        // 查询设备的所有键，只选择键名
        const items = await prisma.kVStore.findMany({
            where: {
                deviceId: deviceId,
            },
            select: {
                key: true,
            },
            orderBy,
            take: limit,
            skip: skip,
        });

        // 只返回键名数组
        return items.map((item) => item.key);
    }

    /**
     * 统计指定设备下的键值对数量
     * @param {number} deviceId - 设备ID
     * @returns {number} 键值对数量
     */
    async count(deviceId) {
        const count = await prisma.kVStore.count({
            where: {
                deviceId: deviceId,
            },
        });
        return count;
    }

    /**
     * 获取指定设备的统计信息
     * @param {number} deviceId - 设备ID
     * @returns {object} 统计信息
     */
    async getStats(deviceId) {
        const [totalKeys, oldestKey, newestKey] = await Promise.all([
            prisma.kVStore.count({
                where: { deviceId },
            }),
            prisma.kVStore.findFirst({
                where: { deviceId },
                orderBy: { createdAt: "asc" },
                select: { createdAt: true, key: true },
            }),
            prisma.kVStore.findFirst({
                where: { deviceId },
                orderBy: { updatedAt: "desc" },
                select: { updatedAt: true, key: true },
            }),
        ]);

        return {
            totalKeys,
            oldestKey: oldestKey?.key,
            oldestCreatedAt: oldestKey?.createdAt,
            newestKey: newestKey?.key,
            newestUpdatedAt: newestKey?.updatedAt,
        };
    }
}

export default new KVStore();
