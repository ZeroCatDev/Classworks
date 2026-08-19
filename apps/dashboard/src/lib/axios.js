import axios from 'axios'
import {deviceStore} from './deviceStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030'
const SITE_KEY = import.meta.env.VITE_SITE_KEY || ''

// 创建 axios 实例
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'x-site-key': SITE_KEY,
    },
})

// ===== 认证相关 Hooks（由账户 Store 注入）=====
let authHandlers = {
    // 可选：返回访问令牌
    getAccessToken: () => null,
    // 可选：返回刷新令牌
    getRefreshToken: () => null,
    // 可选：仅更新访问令牌
    setAccessToken: (_t) => {
    },
    // 可选：执行刷新动作，返回新的访问令牌
    refreshAccessToken: null,
    // 可选：当刷新失败时回调（例如触发登出）
    onAuthFailure: () => {
    },
}

// 对外方法：由外部（如 Pinia store）注入实际的处理函数
export function setAuthHandlers(handlers) {
    authHandlers = {...authHandlers, ...(handlers || {})}
}

// 请求拦截器
axiosInstance.interceptors.request.use(
    (config) => {
        try {
            // 为非刷新接口自动附加 Authorization 头
            const isRefreshRequest = typeof config.url === 'string' && /\/accounts\/refresh(\b|\/|\?)/.test(config.url)
            const skipAuth = config.__skipAuth === true || isRefreshRequest
            if (!skipAuth && authHandlers?.getAccessToken) {
                const token = authHandlers.getAccessToken()
                if (token) {
                    config.headers = config.headers || {}
                    config.headers['Authorization'] = `Bearer ${token}`
                }
            }
        } catch {
            // ignore
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 设备注册去重（避免并发重复注册）
const registrationLocks = new Map()

function getHeaderIgnoreCase(headers = {}, key) {
    if (!headers) return undefined
    const lowerKey = key.toLowerCase()
    for (const k of Object.keys(headers)) {
        if (k.toLowerCase() === lowerKey) return headers[k]
    }
    return undefined
}

function extractUuidFromUrl(url = '') {
    try {
        const path = url || ''
        // /apps/devices/{uuid}/...
        let m = path.match(/\/apps\/devices\/([0-9a-fA-F-]{8,})/)
        if (m) return m[1]
        // /devices/{uuid}/...
        m = path.match(/\/devices\/([0-9a-fA-F-]{8,})/)
        if (m) return m[1]
        // /accounts/device/{uuid}
        m = path.match(/\/accounts\/device\/([0-9a-fA-F-]{8,})/)
        if (m) return m[1]

        // query ?uuid=...
        const qIndex = path.indexOf('?')
        if (qIndex >= 0) {
            const usp = new URLSearchParams(path.slice(qIndex + 1))
            const q = usp.get('uuid')
            if (q) return q
        }
    } catch (e) {
        // ignore
    }
    return undefined
}

async function ensureDeviceRegistered(uuid, authHeader) {
    if (!uuid) return false
    if (registrationLocks.has(uuid)) {
        try {
            await registrationLocks.get(uuid)
            return true
        } catch {
            return false
        }
    }
    const deviceName = '未命名设备'
    const headers = {}
    if (authHeader) headers['Authorization'] = authHeader

    const p = axiosInstance.post(
        '/devices',
        {uuid, deviceName},
        {
            headers, // 避免递归触发注册重试
            skipDeviceRegistrationRetry: true,
            __isRegistrationRequest: true
        }
    )
    registrationLocks.set(uuid, p)
    try {
        await p
        // 保存UUID到本地存储，确保后续可用
        try {
            deviceStore.setDeviceUuid(uuid)
        } catch {
        }
        return true
    } catch (e) {
        return false
    } finally {
        registrationLocks.delete(uuid)
    }
}

// 刷新中的 Promise（用于合并并发 401 刷新）
let refreshingPromise = null

// 响应拦截器（含自动换发、自动注册并重试、401 刷新）
axiosInstance.interceptors.response.use(
    (response) => {
        // 如果服务端主动通过响应头下发新访问令牌，更新本地
        try {
            const headers = response?.headers || {}
            const newToken = getHeaderIgnoreCase(headers, 'X-New-Access-Token')
            if (newToken && authHandlers?.setAccessToken) {
                authHandlers.setAccessToken(newToken)
            }
        } catch {
        }
        return response.data
    },
    async (error) => {
        const config = error.config || {}
        const resp = error.response
        const status = resp?.status
        const skip = config.skipDeviceRegistrationRetry || config.__isRegistrationRequest
        const backendMessage = resp?.data?.message
        const message = backendMessage || error.message || 'Unknown error'

        // 优先处理 401：尝试使用刷新令牌换发
        if (status === 401 && !config.__retriedAfterRefresh) {
            try {
                // 若没有刷新能力或没有刷新令牌，则直接走失败逻辑
                if (!authHandlers?.refreshAccessToken || !authHandlers?.getRefreshToken || !authHandlers.getRefreshToken()) {
                    // 无法刷新，触发认证失败回调并退出
                    try {
                        authHandlers?.onAuthFailure && authHandlers.onAuthFailure(new Error('NO_REFRESH_TOKEN'))
                    } catch {
                    }
                    throw new Error('NO_REFRESH_TOKEN')
                }

                // 合并并发刷新
                if (!refreshingPromise) {
                    refreshingPromise = authHandlers.refreshAccessToken()
                        .catch((e) => {
                            // 刷新失败，触发失败处理
                            try {
                                authHandlers?.onAuthFailure && authHandlers.onAuthFailure(e)
                            } catch {
                            }
                            throw e
                        })
                        .finally(() => {
                            refreshingPromise = null
                        })
                }

                await refreshingPromise
                // 刷新成功后重试一次原请求
                config.__retriedAfterRefresh = true
                // 由请求拦截器负责附加新 Authorization，无需手动改 headers
                return await axiosInstance.request(config)
            } catch (refreshErr) {
                // 刷新失败，触发认证失败并返回原始错误信息
                try {
                    authHandlers?.onAuthFailure && authHandlers.onAuthFailure(refreshErr)
                } catch {
                }
                return Promise.reject(new Error(message))
            }
        }

        // 明确的权限问题同样触发登出（例如服务端使用 403 表示 Token 无效或权限已失效）
        if (status === 403 && resp?.data?.code === 'AUTH_JWT_EXPIRED') {
            try {
                authHandlers?.onAuthFailure && authHandlers.onAuthFailure(new Error(message || 'FORBIDDEN'))
            } catch {
            }
            return Promise.reject(new Error(message || 'FORBIDDEN'))
        }

        // 仅在后端提示设备不存在时尝试注册并重试，且保证只重试一次
        if (!skip && !config.__retriedAfterRegistration && typeof backendMessage === 'string' && backendMessage.startsWith('设备不存在')) {
            // 从 headers / url / body 提取 uuid
            const uuidFromHeader = getHeaderIgnoreCase(config.headers, 'x-device-uuid')
            const uuidFromUrl = extractUuidFromUrl(config.url)
            let uuid = uuidFromHeader || uuidFromUrl || deviceStore.getDeviceUuid()
            if (!uuid && config.data) {
                try {
                    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
                    if (body && typeof body === 'object' && body.uuid) uuid = body.uuid
                } catch {
                }
            }

            // 可能需要账户授权头
            const authHeader = getHeaderIgnoreCase(config.headers, 'Authorization')

            if (uuid) {
                const ok = await ensureDeviceRegistered(uuid, authHeader)
                if (ok) {
                    try {
                        config.__retriedAfterRegistration = true
                        // 原样重试
                        const retryResp = await axiosInstance.request(config)
                        return retryResp
                    } catch (retryErr) {
                        const retryMsg = retryErr?.response?.data?.message || retryErr.message || message
                        return Promise.reject(new Error(retryMsg))
                    }
                }
            }
        }

        // 其他错误：附带信息抛出
        return Promise.reject(new Error(message))
    }
)

export default axiosInstance
