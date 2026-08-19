import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import {apiClient} from '@/lib/api'
import {setAuthHandlers} from '@/lib/axios'

export const useAccountStore = defineStore('account', () => {
    // 状态
    // 访问令牌（兼容旧 key: auth_token）
    const token = ref(localStorage.getItem('auth_token') || localStorage.getItem('auth_access_token') || null)
    const refreshToken = ref(localStorage.getItem('auth_refresh_token') || null)
    const accessExpiresAt = ref(Number(localStorage.getItem('auth_access_exp') || 0) || 0) // ms 时间戳
    const profile = ref(null)
    const devices = ref([])
    const loading = ref(false)
    const providerName = ref(localStorage.getItem('auth_provider') || '')
    const providerColor = ref(localStorage.getItem('auth_provider_color') || '')
    let proactiveTimer = null

    // 计算属性
    const isAuthenticated = computed(() => !!token.value)
    const userName = computed(() => profile.value?.name || '')
    const userAvatar = computed(() => profile.value?.avatarUrl || '')
    const userId = computed(() => profile.value?.id || null)
    const userProviderDisplay = computed(() => profile.value?.providerInfo?.displayName || profile.value?.providerInfo?.name || providerName.value || profile.value?.provider || '')
    const userProviderColor = computed(() => profile.value?.providerInfo?.color || providerColor.value || '')

    // 工具：解析 JWT 过期时间（秒时间戳），返回 ms
    function decodeJwtExpMs(jwt) {
        try {
            const [, payload] = jwt.split('.')
            if (!payload) return 0
            const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
            if (!json?.exp) return 0
            return Number(json.exp) * 1000
        } catch {
            return 0
        }
    }

    function clearProactiveTimer() {
        if (proactiveTimer) {
            clearTimeout(proactiveTimer)
            proactiveTimer = null
        }
    }

    function scheduleProactiveRefresh() {
        clearProactiveTimer()
        if (!token.value) return
        const expMs = accessExpiresAt.value || decodeJwtExpMs(token.value)
        if (!expMs) return
        const now = Date.now()
        // 提前 2 分钟刷新，最小 5 秒
        const lead = 2 * 60 * 1000
        let delay = expMs - now - lead
        if (delay < 5000) delay = 5000
        proactiveTimer = setTimeout(() => {
            refreshNow().catch(() => {
            })
        }, delay)
    }

    // 方法
    const setToken = (newToken) => {
        token.value = newToken
        if (newToken) {
            localStorage.setItem('auth_token', newToken)
            localStorage.setItem('auth_access_token', newToken)
            accessExpiresAt.value = decodeJwtExpMs(newToken) || 0
            if (accessExpiresAt.value) localStorage.setItem('auth_access_exp', String(accessExpiresAt.value))
            scheduleProactiveRefresh()
        } else {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_access_token')
            localStorage.removeItem('auth_access_exp')
            localStorage.removeItem('auth_refresh_token')
            localStorage.removeItem('auth_provider')
            localStorage.removeItem('auth_provider_color')
            providerName.value = ''
            providerColor.value = ''
            refreshToken.value = null
            accessExpiresAt.value = 0
            clearProactiveTimer()
        }
    }

    const setTokens = (access, refresh) => {
        if (access) setToken(access)
        if (refresh) {
            refreshToken.value = refresh
            localStorage.setItem('auth_refresh_token', refresh)
        }
    }

    const loadProfile = async () => {
        if (!token.value) return

        loading.value = true
        try {
            const response = await apiClient.getAccountProfile()
            profile.value = response.data
            // 若后端返回 providerInfo，则回填前端展示字段
            const p = profile.value?.providerInfo
            if (p) {
                providerName.value = p.displayName || p.name || profile.value?.provider || providerName.value
                providerColor.value = p.color || providerColor.value
                localStorage.setItem('auth_provider', providerName.value)
                if (providerColor.value) localStorage.setItem('auth_provider_color', providerColor.value)
            }
        } catch (error) {
            console.error('Failed to load profile:', error)
        } finally {
            loading.value = false
        }
    }

    const loadDevices = async () => {
        if (!token.value) return

        try {
            const response = await apiClient.getAccountDevices()
            devices.value = response.data || []
            return devices.value
        } catch (error) {
            console.error('Failed to load devices:', error)
            return []
        }
    }

    const bindDevice = async (deviceUuid) => {
        if (!token.value) throw new Error('未登录')

        const response = await apiClient.bindDevice(deviceUuid)
        // 重新加载设备列表
        await loadDevices()
        return response
    }

    const unbindDevice = async (deviceUuid) => {
        if (!token.value) throw new Error('未登录')

        const response = await apiClient.unbindDevice(deviceUuid)
        // 重新加载设备列表
        await loadDevices()
        return response
    }

    const login = async (authToken) => {
        setToken(authToken)
        await loadProfile()
        await loadDevices()
    }

    const logout = () => {
        token.value = null
        profile.value = null
        devices.value = []
        setToken(null)
    }

    // 刷新访问令牌（按需刷新）
    const refreshNow = async () => {
        if (!refreshToken.value) throw new Error('No refresh token')
        const res = await apiClient.refreshAccessToken(refreshToken.value)
        // 期望结构：{ success, data: { access_token, expires_in, account? } }
        const newAccess = res?.data?.access_token || res?.access_token || res?.token || null
        if (!newAccess) throw new Error(res?.message || '刷新失败')
        setToken(newAccess)
        return newAccess
    }

    // 初始化注入 axios 认证处理
    setAuthHandlers({
        getAccessToken: () => token.value,
        getRefreshToken: () => refreshToken.value,
        setAccessToken: (t) => setToken(t),
        refreshAccessToken: () => refreshNow(),
        onAuthFailure: () => logout(),
    })

    // 初始化：迁移旧存储并设置定时刷新
    if (token.value) {
        // 若未存储过期时间，尝试从JWT解析
        if (!accessExpiresAt.value) {
            accessExpiresAt.value = decodeJwtExpMs(token.value) || 0
            if (accessExpiresAt.value) localStorage.setItem('auth_access_exp', String(accessExpiresAt.value))
        }
        scheduleProactiveRefresh()
        loadProfile()
        loadDevices()
    }

    return {
        // 状态
        token,
        refreshToken,
        profile,
        devices,
        loading,
        providerName,
        providerColor,
        // 计算属性
        isAuthenticated,
        userName,
        userAvatar,
        userId,
        userProviderDisplay,
        userProviderColor,
        // 方法
        setToken,
        setTokens,
        loadProfile,
        loadDevices,
        bindDevice,
        unbindDevice,
        login,
        logout,
        refreshNow,
    }
})