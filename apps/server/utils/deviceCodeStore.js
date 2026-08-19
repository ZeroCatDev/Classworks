/**
 * Device Code Store - 内存存储
 *
 * 用于存储设备授权流程中的临时代码和令牌
 * 格式如: 1234-ABCD
 */

class DeviceCodeStore {
    constructor() {
        // 存储结构: { deviceCode: { token: string, expiresAt: number, createdAt: number } }
        this.store = new Map();

        // 默认过期时间: 15分钟
        this.expirationTime = 15 * 60 * 1000;

        // 定期清理过期数据 (每5分钟)
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    /**
     * 生成设备代码 (格式: 1234-ABCD)
     */
    generateDeviceCode() {
        const part1 = Math.floor(1000 + Math.random() * 9000).toString(); // 4位数字
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4位字母
        return `${part1}-${part2}`;
    }

    /**
     * 创建新的设备代码
     * @returns {string} 生成的设备代码
     */
    create() {
        let deviceCode;

        // 确保生成的代码不重复
        do {
            deviceCode = this.generateDeviceCode();
        } while (this.store.has(deviceCode));

        const now = Date.now();
        this.store.set(deviceCode, {
            token: null,
            expiresAt: now + this.expirationTime,
            createdAt: now,
        });

        return deviceCode;
    }

    /**
     * 绑定令牌到设备代码
     * @param {string} deviceCode - 设备代码
     * @param {string} token - 令牌
     * @returns {boolean} 是否成功绑定
     */
    bindToken(deviceCode, token) {
        const entry = this.store.get(deviceCode);

        if (!entry) {
            return false;
        }

        // 检查是否过期
        if (Date.now() > entry.expiresAt) {
            this.store.delete(deviceCode);
            return false;
        }

        // 绑定令牌
        entry.token = token;
        return true;
    }

    /**
     * 获取设备代码对应的令牌（获取后删除）
     * @param {string} deviceCode - 设备代码
     * @returns {string|null} 令牌，如果不存在或未绑定返回null
     */
    getAndRemove(deviceCode) {
        const entry = this.store.get(deviceCode);

        if (!entry) {
            return null;
        }

        // 检查是否过期
        if (Date.now() > entry.expiresAt) {
            this.store.delete(deviceCode);
            return null;
        }

        // 如果令牌未绑定，返回null但不删除代码
        if (!entry.token) {
            return null;
        }

        // 获取令牌后删除条目
        const token = entry.token;
        this.store.delete(deviceCode);
        return token;
    }

    /**
     * 检查设备代码是否存在且未过期
     * @param {string} deviceCode - 设备代码
     * @returns {boolean}
     */
    exists(deviceCode) {
        const entry = this.store.get(deviceCode);

        if (!entry) {
            return false;
        }

        if (Date.now() > entry.expiresAt) {
            this.store.delete(deviceCode);
            return false;
        }

        return true;
    }

    /**
     * 获取设备代码的状态信息（不删除）
     * @param {string} deviceCode - 设备代码
     * @returns {object|null} 状态信息
     */
    getStatus(deviceCode) {
        const entry = this.store.get(deviceCode);

        if (!entry) {
            return null;
        }

        if (Date.now() > entry.expiresAt) {
            this.store.delete(deviceCode);
            return null;
        }

        return {
            hasToken: !!entry.token,
            expiresAt: entry.expiresAt,
            createdAt: entry.createdAt,
        };
    }

    /**
     * 清理过期的条目
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [deviceCode, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(deviceCode);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`清理了 ${cleanedCount} 个过期的设备代码`);
        }
    }

    /**
     * 获取当前存储的条目数量
     */
    size() {
        return this.store.size;
    }

    /**
     * 清理定时器（用于优雅关闭）
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.store.clear();
    }
}

// 导出单例
const deviceCodeStore = new DeviceCodeStore();

// 优雅关闭处理
process.on('SIGTERM', () => {
    deviceCodeStore.destroy();
});

process.on('SIGINT', () => {
    deviceCodeStore.destroy();
});

export default deviceCodeStore;
