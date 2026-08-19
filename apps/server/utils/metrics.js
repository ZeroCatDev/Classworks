import client from 'prom-client';
import { prisma } from './prisma.js';

// 创建自定义注册表（不包含默认指标）
const register = new client.Registry();

// 当前在线设备数（连接了 SocketIO 的设备）
export const onlineDevicesGauge = new client.Gauge({
    name: 'classworks_online_devices_total',
    help: 'Total number of online devices (connected via SocketIO)',
    registers: [register],
});

// 已注册设备总数
export const registeredDevicesTotal = new client.Gauge({
    name: 'classworks_registered_devices_total',
    help: 'Total number of registered devices',
    registers: [register],
});

// 已创建键总数（不区分设备）
export const keysTotal = new client.Gauge({
    name: 'classworks_keys_total',
    help: 'Total number of keys across all devices',
    registers: [register],
});

// 初始化指标数据
export async function initializeMetrics() {
    try {
        // 获取已注册设备总数
        const deviceCount = await prisma.device.count();
        registeredDevicesTotal.set(deviceCount);

        // 获取已创建键总数
        const keyCount = await prisma.kVStore.count();
        keysTotal.set(keyCount);
        console.log('Prometheus metrics initialized - Devices:', deviceCount, 'Keys:', keyCount);
    } catch (error) {
        console.error('Failed to initialize metrics:', error);
    }
}

// 导出注册表用于 /metrics 端点
export {register};