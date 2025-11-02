/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'
import { createPinia } from 'pinia'
const pinia = createPinia()

// Components
import App from './App.vue'
import GlobalMessage from '@/components/GlobalMessage.vue'

// Composables
import { createApp } from 'vue'
import Clarity from '@microsoft/clarity';
const projectId = "rhp8uqoc3l"
//import TDesign from 'tdesign-vue-next'
//import 'tdesign-vue-next/es/style/index.css'
//import '@examaware-cs/player/dist/player.css'

Clarity.init(projectId);
import messageService from './utils/message';

const app = createApp(App)

registerPlugins(app)
//app.use(TDesign)
app.use(messageService);
app.use(pinia)

app.component('GlobalMessage', GlobalMessage)

app.mount('#app')

// 移除首屏 CSS 加载覆盖层（在 Vue 挂载完成后）
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
		window.addEventListener('DOMContentLoaded', removeLoader, { once: true });
	}
} catch {
	// 安全失败：即便移除失败也不影响应用
}
