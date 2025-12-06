/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import {registerPlugins} from '@/plugins'
import {createPinia} from 'pinia'

const pinia = createPinia()

// Components
import App from './App.vue'
import GlobalMessage from '@/components/GlobalMessage.vue'

// Composables
import {createApp} from 'vue'
//import TDesign from 'tdesign-vue-next'
//import 'tdesign-vue-next/es/style/index.css'
//import '@examaware-cs/player/dist/player.css'

import messageService from './utils/message';
import { getVisitorId } from './utils/visitorId';

const app = createApp(App)

registerPlugins(app)
//app.use(TDesign)
app.use(messageService);
app.use(pinia)

app.component('GlobalMessage', GlobalMessage)

app.mount('#app')

// 异步加载 Clarity 以提升初始加载速度
if (document.readyState === 'complete') {
  loadClarity();
} else {
  window.addEventListener('load', loadClarity, { once: true });
}

async function loadClarity() {
  try {
    const Clarity = (await import('@microsoft/clarity')).default;
    const projectId = "rhp8uqoc3l";
    Clarity.init(projectId);

    // 获取并设置访客标识
    const visitorId = await getVisitorId();
    console.log('Visitor ID:', visitorId);
    Clarity.identify(visitorId);
    Clarity.setTag('fingerprintjs', visitorId);
  } catch (error) {
    console.warn('Clarity 加载或标识设置失败:', error);
  }
}

// 移除首屏 CSS 加载覆盖层(在 Vue 挂载完成后)
try {
  const removeLoader = () => {
    document.body.classList.add('app-loaded');
    const el = document.getElementById('app-loader');
    if (!el) return;
    // 与 CSS 过渡对齐，稍等再移除节点，避免闪烁
    setTimeout(() => el.remove(), 220);
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    removeLoader();
  } else {
    window.addEventListener('DOMContentLoaded', removeLoader, {once: true});
  }
} catch {
  // 安全失败：即便移除失败也不影响应用
}
