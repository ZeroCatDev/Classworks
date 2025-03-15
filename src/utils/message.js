import logDB from './db';
import { getSetting } from './settings';

const messages = [];
let snackbarCallback = null;
let logCallback = null;

const MessageType = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning'
};

const defaultOptions = {
  timeout: 3000,
  showSnackbar: true,
  addToLog: true
};

async function createMessage(type, title, content = '', options = {}) {
  const msgOptions = { ...defaultOptions, ...options };
  const message = {
    id: Date.now() + Math.random(),
    type,
    title,
    content: content.substring(0, 500),
    timestamp: new Date()
  };

  if (msgOptions.addToLog) {
    try {
      await logDB.addLog(message);
      messages.unshift(message);
      while (messages.length > getSetting('message.maxActiveMessages')) {
        messages.pop();
      }
      logCallback?.(messages);
    } catch (error) {
      console.error('保存日志失败:', error);
    }
  }

  if (msgOptions.showSnackbar) {
    snackbarCallback?.(message);
  }

  return message;
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

export default {
  install: (app) => {
    app.config.globalProperties.$message = {
      success: (title, content, options) => createMessage(MessageType.SUCCESS, title, content, options),
      error: (title, content, options) => createMessage(MessageType.ERROR, title, content, options),
      info: (title, content, options) => createMessage(MessageType.INFO, title, content, options),
      warning: (title, content, options) => createMessage(MessageType.WARNING, title, content, options),
    };
  },
  onSnackbar: (callback) => { snackbarCallback = callback; },
  onLog: (callback) => { logCallback = callback; },
  getMessages: async () => {
    try {
      return await logDB.getLogs();
    } catch (error) {
      console.error('获取日志失败:', error);
      return [...messages];
    }
  },
  clearMessages: async () => {
    try {
      await logDB.clearLogs();
      messages.length = 0;
      logCallback?.(messages);
    } catch (error) {
      console.error('清除日志失败:', error);
    }
  },
  MessageType,
  markAsRead: () => {}, // 移除标记已读功能
  deleteMessage: async (messageId) => {
    try {
      await logDB.deleteLog(messageId);
      const index = messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        messages.splice(index, 1);
      }
      logCallback?.(messages);
    } catch (error) {
      console.error('删除消息失败:', error);
    }
  },
  getUnreadCount: () => 0, // 移除未读计数
  debounce,
};
