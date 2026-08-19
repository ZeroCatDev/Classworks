import {onMounted, onUnmounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useAccountStore} from '@/stores/account'
import {toast} from 'vue-sonner'

/**
 * 处理OAuth回调
 * 检查URL参数中是否有OAuth回调信息
 */
export function useOAuthCallback() {
    const route = useRoute()
    const router = useRouter()
    const accountStore = useAccountStore()

    const handleOAuthCallback = async () => {
        const {token, provider, color, success, error} = route.query
        // 新版参数：access_token / refresh_token / expires_in / providerName / providerColor
        const access_token = route.query.access_token || token
        const refresh_token = route.query.refresh_token || null
        const providerName = route.query.providerName || provider
        const providerColor = route.query.providerColor || color

        // 检查是否是OAuth回调
        if (!success && !error) {
            return
        }

        // 处理成功回调
        if (success === 'true' && access_token) {
            try {
                // 保存到 Store（同时写入 localStorage）
                accountStore.setTokens(access_token, refresh_token)
                if (providerName) localStorage.setItem('auth_provider', providerName)
                if (providerColor) localStorage.setItem('auth_provider_color', providerColor)

                // 登录到store（加载资料、设备）
                await accountStore.login(access_token)

                // 显示成功提示
                toast.success('登录成功', {
                    description: `已通过 ${provider} 登录`,
                })

                // 清除URL参数
                router.replace({query: {}})

                // 触发storage事件，通知其他窗口
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'auth_token',
                    newValue: access_token,
                    url: window.location.href
                }))
                if (refresh_token) {
                    window.dispatchEvent(new StorageEvent('storage', {
                        key: 'auth_refresh_token',
                        newValue: refresh_token,
                        url: window.location.href
                    }))
                }

                // 如果是在新窗口中打开的OAuth回调，自动关闭窗口
                if (window.opener) {
                    // 通知父窗口登录成功
                    window.opener.postMessage({
                        type: 'oauth_success',
                        token: access_token,
                        provider: providerName,
                    }, window.location.origin)

                    // 延迟关闭窗口，确保消息已发送
                    setTimeout(() => {
                        window.close()
                    }, 1000)
                }

            } catch (err) {
                toast.error('登录失败', {
                    description: err.message || '处理登录信息时出错'
                })
            }
        }

        // 处理错误回调
        if (success === 'false' || error) {
            const errorMessages = {
                'invalid_state': 'State验证失败，可能存在安全风险',
                'access_denied': '用户拒绝了授权请求',
                'temporarily_unavailable': '服务暂时不可用，请稍后重试'
            }

            const errorMsg = errorMessages[error] || error || '登录过程中出现错误'

            toast.error('登录失败', {
                description: errorMsg
            })

            // 清除URL参数
            router.replace({query: {}})

            // 如果是在新窗口中打开的OAuth回调，自动关闭窗口
            if (window.opener) {
                // 通知父窗口登录失败
                window.opener.postMessage({
                    type: 'oauth_error',
                    error: errorMsg
                }, window.location.origin)

                // 延迟关闭窗口
                setTimeout(() => {
                    window.close()
                }, 1000)
            }
        }
    }

    onMounted(() => {
        handleOAuthCallback()
    })

    // 监听storage事件，处理其他标签页的登录
    const handleStorageChange = (e) => {
        if (e.key === 'auth_token' && e.newValue) {
            // 其他标签页已登录，刷新当前页面的状态
            accountStore.login(e.newValue)
        }
        if (e.key === 'auth_refresh_token' && e.newValue) {
            accountStore.setTokens(accountStore.token, e.newValue)
        }
    }

    onMounted(() => {
        window.addEventListener('storage', handleStorageChange)
    })

    onUnmounted(() => {
        window.removeEventListener('storage', handleStorageChange)
    })

    return {
        handleOAuthCallback
    }
}