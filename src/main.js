/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import {registerPlugins} from '@/plugins'
import {createPinia} from 'pinia'
import router from './router'

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

import * as Sentry from "@sentry/vue";

const app = createApp(App)

// 保存 feedback integration 实例的引用
let feedbackIntegration = null;

// 初始化 Sentry，但暂不启用 Replay
Sentry.init({
  app,
  dsn: "https://c7f4eeab1055a53941738c36868bc2df@report.houlang.cloud/4",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration({ router }),
    Sentry.replayIntegration({
      // 默认不自动录制，只在手动触发或发生错误时录制
      maskAllText: false,
      blockAllMedia: false,
    }),
    feedbackIntegration = Sentry.feedbackIntegration({
      // 自动注入反馈按钮，但我们会手动触发
      autoInject: false,
      colorScheme: 'system',
      showBranding: false,
      showName: true,
      showEmail: true,
      isNameRequired: false,
      isEmailRequired: false,
      useSentryUser: {
        name: 'username',
        email: 'email',
      },
      themeDark: {
        submitBackground: '#6200EA',
        submitBackgroundHover: '#7C4DFF',
      },
      themeLight: {
        submitBackground: '#6200EA',
        submitBackgroundHover: '#7C4DFF',
      },
    })
  ],
  // Tracing
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https?:\/\/cs\.(houlang\.cloud|houlangs\.com)/],
  // Session Replay - 关闭自动录制
  replaysSessionSampleRate: 0, // 不自动录制会话
  replaysOnErrorSampleRate: 0, // 不在错误时自动录制（改为手动触发）
  // Logs
  enableLogs: true,
  // 在初始化时设置用户识别的钩子
  beforeSend(event) {
    return event;
  }
});

// 异步设置用户 fingerprint
getVisitorId().then(visitorId => {
  Sentry.setUser({
    id: visitorId,
    username: visitorId,
  });
  Sentry.setTag('fingerprint', visitorId);
  console.log('Sentry 用户标识已设置:', visitorId);
}).catch(error => {
  console.warn('设置 Sentry 用户标识失败:', error);
});

// 导出用于手动打开反馈表单的函数
window.openSentryFeedback = () => {
  try {
    if (!feedbackIntegration) {
      console.warn('Sentry Feedback integration 未初始化');
      return false;
    }

    if (typeof feedbackIntegration.createWidget === 'function') {
      const widget = feedbackIntegration.createWidget();
      if (widget && typeof widget.open === 'function') {
        widget.open();
        console.log('Sentry Feedback 对话框已打开');
        return true;
      }
    }

    if (typeof feedbackIntegration.openDialog === 'function') {
      feedbackIntegration.openDialog();
      console.log('Sentry Feedback 对话框已打开');
      return true;
    }

    console.warn('无法找到打开 Feedback 的方法');
    console.log('可用方法:', Object.keys(feedbackIntegration));
    return false;
  } catch (error) {
    console.error('打开 Sentry Feedback 时出错:', error);
    return false;
  }
};

// 导出用于手动启动录制的函数
window.startSentryReplay = () => {
  try {
    const client = Sentry.getClient();
    if (!client) {
      console.warn('Sentry 客户端未初始化');
      return false;
    }

    // 获取 Replay integration 实例
    const integrations = client.getOptions().integrations || [];
    const replayIntegration = integrations.find(
      integration => integration && integration.name === 'Replay'
    );

    if (replayIntegration && typeof replayIntegration.start === 'function') {
      replayIntegration.start();
      console.log('Sentry Replay 已手动启动');
      return true;
    }

    console.warn('无法找到 Sentry Replay integration');
    return false;
  } catch (error) {
    console.error('启动 Sentry Replay 时出错:', error);
    return false;
  }
};

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
