// 生成随机设备码
export function generateDeviceCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const segments = []

    for (let i = 0; i < 4; i++) {
        let segment = ''
        for (let j = 0; j < 4; j++) {
            segment += chars[Math.floor(Math.random() * chars.length)]
        }
        segments.push(segment)
    }

    return segments.join('-')
}

// Token 管理
export const tokenStore = {
    // 获取所有 token
    getTokens() {
        const tokens = localStorage.getItem('kv_tokens')
        return tokens ? JSON.parse(tokens) : []
    },

    // 添加 token
    addToken(token, appName = '') {
        const tokens = this.getTokens()
        const newToken = {
            id: Date.now().toString(),
            token,
            appName,
            deviceCode: generateDeviceCode(),
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        }
        tokens.push(newToken)
        localStorage.setItem('kv_tokens', JSON.stringify(tokens))
        return newToken
    },

    // 删除 token
    removeToken(id) {
        const tokens = this.getTokens().filter(t => t.id !== id)
        localStorage.setItem('kv_tokens', JSON.stringify(tokens))
    },

    // 更新 token
    updateToken(id, updates) {
        const tokens = this.getTokens().map(t =>
            t.id === id ? {...t, ...updates} : t
        )
        localStorage.setItem('kv_tokens', JSON.stringify(tokens))
    },

    // 获取当前活跃的 token
    getActiveToken() {
        const activeId = localStorage.getItem('kv_active_token')
        if (!activeId) return null
        return this.getTokens().find(t => t.id === activeId)
    },

    // 设置活跃 token
    setActiveToken(id) {
        localStorage.setItem('kv_active_token', id)
    }
}
