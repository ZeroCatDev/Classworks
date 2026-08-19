import {createApp} from 'vue'
import {createRouter, createWebHistory} from 'vue-router'
import {createPinia} from 'pinia'
import {routes} from 'vue-router/auto-routes'
import {tokenStore} from './lib/tokenStore'
import {deviceStore} from './lib/deviceStore'
import './style.css'
import App from './App.vue'

// 检查 URL 参数中的 uuid 并设置到本地存储
const urlParams = new URLSearchParams(window.location.search)
const urlUuid = urlParams.get('uuid')
if (urlUuid) {
    deviceStore.setDeviceUuid(urlUuid)
    // 清除 URL 中的 uuid 参数
    urlParams.delete('uuid')
    const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname
    window.history.replaceState({}, '', newUrl)
}

const pinia = createPinia()

const router = createRouter({
    history: createWebHistory(),
    routes,
})

// Navigation guard for authentication
router.beforeEach((to, _from, next) => {
    const requiresAuth = to.meta?.requiresAuth
    const activeToken = tokenStore.getActiveToken()

    if (requiresAuth && !activeToken) {
        next({path: '/'})
    } else {
        next()
    }
})

const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')
