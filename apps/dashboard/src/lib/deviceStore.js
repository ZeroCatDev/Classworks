// 生成 UUID v4
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// 设备 UUID 管理 - 使用多种缓存策略确保UUID不丢失
export const deviceStore = {
    // 存储键名
    STORAGE_KEY: 'device_uuid',
    BACKUP_KEY: 'device_uuid_backup',
    SESSION_KEY: 'device_uuid_session',
    HISTORY_KEY: 'device_history', // 本地历史设备记录

    // 获取当前设备 UUID（从多个存储位置尝试读取）
    getDeviceUuid() {
        // 1. 首先从 localStorage 获取
        let uuid = localStorage.getItem(this.STORAGE_KEY)

        // 2. 如果没有，尝试从备份位置获取
        if (!uuid) {
            uuid = localStorage.getItem(this.BACKUP_KEY)
            if (uuid) {
                // 恢复到主存储位置
                this.setDeviceUuid(uuid)
            }
        }

        // 3. 如果还没有，尝试从 sessionStorage 获取
        if (!uuid) {
            uuid = sessionStorage.getItem(this.SESSION_KEY)
            if (uuid) {
                // 恢复到主存储位置
                this.setDeviceUuid(uuid)
            }
        }

        // 4. 如果还没有，尝试从 cookie 获取（如果有的话）
        if (!uuid) {
            uuid = this.getFromCookie()
            if (uuid) {
                // 恢复到所有存储位置
                this.setDeviceUuid(uuid)
            }
        }

        return uuid
    },

    // 设置设备 UUID（同时存储到多个位置）
    setDeviceUuid(uuid) {
        // 1. 存储到 localStorage 主位置
        localStorage.setItem(this.STORAGE_KEY, uuid)

        // 2. 存储到备份位置
        localStorage.setItem(this.BACKUP_KEY, uuid)

        // 3. 存储到 sessionStorage
        sessionStorage.setItem(this.SESSION_KEY, uuid)

        // 4. 存储到 cookie（设置较长的过期时间）
        this.saveToCookie(uuid)

        // 5. 尝试存储到 IndexedDB（异步）
        this.saveToIndexedDB(uuid)
    },

    // 生成并保存新的设备 UUID
    generateAndSave() {
        const uuid = generateUUID()
        this.setDeviceUuid(uuid)
        return uuid
    },

    // 获取或生成设备 UUID
    getOrGenerate() {
        let uuid = this.getDeviceUuid()
        if (!uuid) {
            uuid = this.generateAndSave()
        } else {
            // 确保UUID被保存到所有位置
            this.setDeviceUuid(uuid)
        }
        return uuid
    },

    // 清除设备 UUID（从所有存储位置清除）
    clear() {
        localStorage.removeItem(this.STORAGE_KEY)
        localStorage.removeItem(this.BACKUP_KEY)
        sessionStorage.removeItem(this.SESSION_KEY)
        this.clearCookie()
        this.clearIndexedDB()
    },

    // Cookie 操作
    saveToCookie(uuid) {
        try {
            const expires = new Date()
            expires.setFullYear(expires.getFullYear() + 10) // 10年过期
            document.cookie = `device_uuid=${uuid}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
        } catch (e) {
            console.log('Failed to save UUID to cookie:', e)
        }
    },

    getFromCookie() {
        try {
            const match = document.cookie.match(/(?:^|; )device_uuid=([^;]*)/)
            return match ? match[1] : null
        } catch (e) {
            console.log('Failed to get UUID from cookie:', e)
            return null
        }
    },

    clearCookie() {
        try {
            document.cookie = 'device_uuid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        } catch (e) {
            console.log('Failed to clear UUID cookie:', e)
        }
    },

    // IndexedDB 操作（异步，作为额外的备份）
    async saveToIndexedDB(uuid) {
        try {
            const db = await this.openDB()
            const transaction = db.transaction(['device'], 'readwrite')
            const store = transaction.objectStore('device')
            await store.put({id: 'uuid', value: uuid})
        } catch (e) {
            console.log('Failed to save UUID to IndexedDB:', e)
        }
    },

    async getFromIndexedDB() {
        try {
            const db = await this.openDB()
            const transaction = db.transaction(['device'], 'readonly')
            const store = transaction.objectStore('device')
            const result = await store.get('uuid')
            return result?.value || null
        } catch (e) {
            console.log('Failed to get UUID from IndexedDB:', e)
            return null
        }
    },

    async clearIndexedDB() {
        try {
            const db = await this.openDB()
            const transaction = db.transaction(['device'], 'readwrite')
            const store = transaction.objectStore('device')
            await store.delete('uuid')
        } catch (e) {
            console.log('Failed to clear UUID from IndexedDB:', e)
        }
    },

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ClassworksKV', 1)

            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains('device')) {
                    db.createObjectStore('device', {keyPath: 'id'})
                }
            }
        })
    },

    // 尝试从 IndexedDB 恢复 UUID（在初始化时调用）
    async tryRestoreFromIndexedDB() {
        const uuid = await this.getFromIndexedDB()
        if (uuid && !this.getDeviceUuid()) {
            this.setDeviceUuid(uuid)
        }
    }
}

// 在页面加载时尝试从 IndexedDB 恢复
if (typeof window !== 'undefined') {
    deviceStore.tryRestoreFromIndexedDB()
}

// 为 deviceStore 扩展历史设备管理功能
// 记录结构：{ uuid: string, name?: string, lastUsedAt: number }
deviceStore.getDeviceHistory = function () {
    try {
        const raw = localStorage.getItem(this.HISTORY_KEY)
        const list = raw ? JSON.parse(raw) : []
        if (!Array.isArray(list)) return []
        // 排序：最近使用在前
        return list.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
    } catch {
        return []
    }
}

deviceStore.addDeviceToHistory = function (device) {
    try {
        if (!device || !device.uuid) return
        const maxItems = 20
        const now = Date.now()
        const list = this.getDeviceHistory()
        const idx = list.findIndex(d => d.uuid === device.uuid)
        const entry = {
            uuid: device.uuid,
            name: device.name || device.deviceName || '',
            lastUsedAt: now
        }
        if (idx >= 0) {
            // 更新名称和时间
            list[idx] = {...list[idx], ...entry}
        } else {
            list.unshift(entry)
        }
        // 去重（按 uuid）并截断
        const uniqMap = new Map()
        for (const item of list) {
            if (!uniqMap.has(item.uuid)) uniqMap.set(item.uuid, item)
        }
        const next = Array.from(uniqMap.values()).slice(0, maxItems)
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(next))
    } catch {
        // ignore
    }
}

deviceStore.removeDeviceFromHistory = function (uuid) {
    try {
        const list = this.getDeviceHistory().filter(d => d.uuid !== uuid)
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(list))
    } catch {
        // ignore
    }
}

deviceStore.clearDeviceHistory = function () {
    try {
        localStorage.removeItem(this.HISTORY_KEY)
    } catch {
        // ignore
    }
}
