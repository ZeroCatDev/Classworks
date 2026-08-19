import kvStore from "./kvStore.js";
import { prisma } from "./prisma.js";

// 系统保留UUID用于存储站点信息
const SYSTEM_DEVICE_UUID = "00000000-0000-4000-8000-000000000000";

// 存储 readme 值的内存变量
let readmeValue = null;
let systemDeviceId = null;

// 封装默认 readme 对象
const defaultReadme = {
    title: "Classworks 服务端",
    readme: "暂无 Readme 内容",
};

/**
 * 获取或创建系统设备
 * @returns {Promise<number>} 系统设备ID
 */
async function getSystemDeviceId() {
    if (systemDeviceId) return systemDeviceId;

    let device = await prisma.device.findUnique({
        where: {uuid: SYSTEM_DEVICE_UUID},
        select: {id: true},
    });

    if (!device) {
        device = await prisma.device.create({
            data: {
                uuid: SYSTEM_DEVICE_UUID,
                name: "系统设备",
            },
            select: {id: true},
        });
    }

    systemDeviceId = device.id;
    return systemDeviceId;
}

/**
 * 初始化 readme 值
 * 在应用启动时调用此函数
 */
export const initReadme = async () => {
    try {
        const deviceId = await getSystemDeviceId();
        const storedValue = await kvStore.get(deviceId, "info");

        // 合并默认值与存储值，确保结构完整
        readmeValue = {
            ...defaultReadme,
            ...(storedValue || {}),
        };

        console.log("✅ 站点信息初始化成功");
    } catch (error) {
        console.error("❌ 站点信息初始化失败:", {
            message: error?.message,
            stack: error?.stack,
        });

        // 确保在异常情况下也有默认值
        readmeValue = {...defaultReadme};
    }
};

/**
 * 获取当前的 readme 值
 * @returns {Object} readme 值对象
 */
export const getReadmeValue = () => {
    return readmeValue || {...defaultReadme};
};

/**
 * 更新 readme 值
 * @param {Object} newValue - 新的 readme 值
 * @returns {Promise<void>}
 */
export const updateReadmeValue = async (newValue) => {
    try {
        const deviceId = await getSystemDeviceId();
        await kvStore.upsert(deviceId, "info", newValue);
        readmeValue = {
            ...defaultReadme,
            ...newValue,
        };
        console.log("✅ 站点信息更新成功");
    } catch (error) {
        console.error("❌ 站点信息更新失败:", {
            message: error?.message,
            stack: error?.stack,
        });
        throw error;
    }
};