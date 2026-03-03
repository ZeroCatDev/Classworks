/**
 * Sentry 异步初始化模块
 *
 * 从 main.js 中抽离，在 Vue app 挂载后异步加载，
 * 避免 @sentry/vue (~60KB gzip) 阻塞首屏渲染。
 */
import * as Sentry from '@sentry/vue'
import { getVisitorId } from './visitorId'

// 保存 feedback integration 实例的引用
let feedbackIntegration = null

/**
 * 异步初始化 Sentry（在 app mount 后调用）
 * @param {import('vue').App} app - Vue app 实例
 * @param {import('vue-router').Router} router - Vue Router 实例
 */
export function initSentry(app, router) {
  Sentry.init({
    app,
    dsn: 'https://dc34ab47426f49c0925445f0d87b7007@report.houlang.cloud/6',
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      feedbackIntegration = Sentry.feedbackIntegration({
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
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      'localhost',
      /^https?:\/\/cs\.(houlang\.cloud|houlangs\.com)/,
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enableLogs: true,
    beforeSend(event) {
      return event
    },
  })

  // 异步设置用户 fingerprint
  getVisitorId()
    .then((visitorId) => {
      Sentry.setUser({ id: visitorId, username: visitorId })
      Sentry.setTag('fingerprint', visitorId)
      console.log('Sentry 用户标识已设置:', visitorId)
    })
    .catch((error) => {
      console.warn('设置 Sentry 用户标识失败:', error)
    })

  // 注册全局函数：打开反馈表单
  window.openSentryFeedback = () => {
    try {
      if (!feedbackIntegration) {
        console.warn('Sentry Feedback integration 未初始化')
        return false
      }
      if (typeof feedbackIntegration.createWidget === 'function') {
        const widget = feedbackIntegration.createWidget()
        if (widget && typeof widget.open === 'function') {
          widget.open()
          console.log('Sentry Feedback 对话框已打开')
          return true
        }
      }
      if (typeof feedbackIntegration.openDialog === 'function') {
        feedbackIntegration.openDialog()
        console.log('Sentry Feedback 对话框已打开')
        return true
      }
      console.warn('无法找到打开 Feedback 的方法')
      console.log('可用方法:', Object.keys(feedbackIntegration))
      return false
    } catch (error) {
      console.error('打开 Sentry Feedback 时出错:', error)
      return false
    }
  }

  // 注册全局函数：手动启动录制
  window.startSentryReplay = () => {
    try {
      const client = Sentry.getClient()
      if (!client) {
        console.warn('Sentry 客户端未初始化')
        return false
      }
      const integrations = client.getOptions().integrations || []
      const replayIntegration = integrations.find(
        (integration) => integration && integration.name === 'Replay'
      )
      if (replayIntegration && typeof replayIntegration.start === 'function') {
        replayIntegration.start()
        console.log('Sentry Replay 已手动启动')
        return true
      }
      console.warn('无法找到 Sentry Replay integration')
      return false
    } catch (error) {
      console.error('启动 Sentry Replay 时出错:', error)
      return false
    }
  }
}
