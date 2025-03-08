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

const STORAGE_KEY = 'homeworkpage_messages';
const MAX_MESSAGES = 100; // 最大消息数量
const MAX_STORAGE_SIZE = 1024 * 1024; // 1MB 存储限制

// 加载保存的消息
function loadStoredMessages() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      messages.push(...JSON.parse(stored));
    }
  } catch (error) {
    console.error('加载消息历史失败:', error);
  }
}

// 清理旧消息
function cleanOldMessages() {
  if (messages.length > MAX_MESSAGES) {
    messages.splice(MAX_MESSAGES);
  }
}

// 检查存储大小
function checkStorageSize(data) {
  try {
    const size = new Blob([data]).size;
    return size <= MAX_STORAGE_SIZE;
  } catch (error) {
    console.error('检查存储大小失败:', error);
    return false;
  }
}

// 保存消息到localStorage
function saveMessages() {
  try {
    cleanOldMessages();
    const data = JSON.stringify(messages);

    if (!checkStorageSize(data)) {
      // 如果数据太大，删除一半的旧消息
      messages.splice(Math.floor(messages.length / 2));
      return saveMessages();
    }

    localStorage.setItem(STORAGE_KEY, data);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // 如果存储空间不足，清理一些旧消息再试
      messages.splice(Math.floor(messages.length / 2));
      return saveMessages();
    }
    console.error('保存消息历史失败:', error);
  }
}

function createMessage(type, title, content = '', options = {}) {
  const msgOptions = { ...defaultOptions, ...options };
  const message = {
    id: Date.now() + Math.random(),
    type,
    title,
    content: content.substring(0, 500), // 限制内容长度
    timestamp: new Date(),
    read: false
  };

  if (msgOptions.addToLog) {
    messages.unshift(message); // 新消息添加到开头
    cleanOldMessages();
    saveMessages();
    logCallback?.(messages);
  }

  if (msgOptions.showSnackbar) {
    snackbarCallback?.(message);
  }

  return message;
}

// 添加防抖函数实现
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
  getMessages: () => [...messages],
  clearMessages: () => {
    messages.length = 0;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('清除消息历史失败:', error);
    }
  },
  MessageType,
  markAsRead: (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.read = true;
      saveMessages();
      logCallback?.(messages);
    }
  },
  deleteMessage: (messageId) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages.splice(index, 1);
      saveMessages();
      logCallback?.(messages);
    }
  },
  getUnreadCount: () => messages.filter(m => !m.read).length,
  initialize: () => {
    loadStoredMessages();
  },
  debounce,  // 导出防抖函数
};
