// 请求通知权限
async function requestNotificationPermission() {
  if (Notification && Notification.requestPermission) {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("通知权限已授予");
      return true;
    } else {
      console.warn("通知权限被拒绝");
      return false;
    }
  } else {
    console.warn("浏览器不支持通知权限请求");
    return false;
  }
}

/**
 * 请求持久性存储权限
 * @returns {Promise<boolean>} 是否成功启用持久性存储
 */
async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
    return false;
  } catch (error) {
    console.warn("请求持久性存储失败:", error);
    return false;
  }
}

/**
 * 初始化存储权限
 */
async function initializeStorage() {
  const notificationGranted = await requestNotificationPermission();
  if (notificationGranted && getSetting("storage.persistOnLoad")) {
    const persisted = await requestPersistentStorage();
    console.log(`持久性存储状态: ${persisted ? "已启用" : "未启用"}`);
  }
}

// 在页面加载时初始化
window.addEventListener("load", initializeStorage);

/**
 * 配置项定义
 * @typedef {Object} SettingDefinition
 * @property {string} type - 配置项类型 ('boolean' | 'number' | 'string')
 * @property {any} default - 默认值
 * @property {Function} [validate] - 可选的验证函数
 * @property {string} [description] - 配置项描述
 * @property {string} [legacyKey] - 旧版本localStorage键名(用于迁移)
 * @property {boolean} [requireDeveloper] - 是否需要开发者选项启用
 * @property {string} [icon] - 设置项的图标
 */

// 存储所有设置的localStorage键名
const SETTINGS_STORAGE_KEY = "Classworks_settings";

/**
 * 所有配置项的定义
 * @type {Object.<string, SettingDefinition>}
 */
const settingsDefinitions = {
  // 存储设置
  "storage.persistOnLoad": {
    type: "boolean",
    default: true,
    description: "是否在页面加载时自动请求持久性存储",
    icon: "mdi-database-sync",
  },

  // 显示设置
  "display.emptySubjectDisplay": {
    type: "string",
    default: "card", // 修改默认值为 'button'
    validate: (value) => ["card", "button"].includes(value),
    description: "空科目的显示方式",
    icon: "mdi-card-outline",
  },
  "display.dynamicSort": {
    type: "boolean",
    default: true,
    description: "是否启用动态排序",
    icon: "mdi-sort-variant",
    // 启用后会根据内容自动调整卡片顺序，提供更好的视觉体验
  },
  "display.showRandomButton": {
    type: "boolean",
    default: false,
    description: "是否显示随机点人按钮",
    icon: "mdi-shuffle-variant",
    // 控制是否显示随机排序按钮，可用于随机调整卡片顺序
  },
  "display.showFullscreenButton": {
    type: "boolean",
    default: true,
    description: "是否显示全屏按钮",
    icon: "mdi-fullscreen",
    // 控制是否显示进入全屏模式的按钮
  },
  "display.cardHoverEffect": {
    type: "boolean",
    default: true,
    description: "是否启用卡片悬浮效果",
    icon: "mdi-gesture-tap",
    // 启用后鼠标悬停在卡片上时会显示视觉反馈效果
  },
  "display.enhancedTouchMode": {
    type: "boolean",
    default: true,
    description: "是否启用增强触摸模式",
    icon: "mdi-gesture-tap-button",
  },
  "display.showAntiScreenBurnCard": {
    type: "boolean",
    default: false,
    description: "是否显示防烧屏忽悠卡片",
    icon: "mdi-monitor-shimmer",
  },

  // 服务器设置（合并了数据提供者设置）
  "server.domain": {
    type: "string",
    default: "",
    validate: (value) => {
      // 如果不是服务器模式或值为空，直接通过
      if (!value) return true;
      // 验证URL格式
      try {
        new URL(value);
        return true;
      } catch (e) {
        console.error("域名格式无效:", e);
        return false;
      }
    },
    description: "后端服务器域名",
    icon: "mdi-web",
    // 设置后端服务器的域名，用于从远程服务器获取数据
  },
  "server.classNumber": {
    type: "string",
    default: "高三八班",
    //validate: (value) => /^[A-Za-z0-9]*$/.test(value),
    validate: (value) => /.*/.test(value),
    description: "班级编号",
    icon: "mdi-account-group",
    // 设置班级标识，用于区分不同班级的数据
  },
  "server.provider": {
    type: "string",
    default: "indexedDB",
    validate: (value) => ["server", "indexedDB"].includes(value),
    description: "数据提供者",
    icon: "mdi-database",
    // 选择数据存储方式：使用本地IndexedDB或远程服务器
  },

  // 刷新设置
  "refresh.auto": {
    type: "boolean",
    default: false,
    description: "是否启用自动刷新",
    icon: "mdi-refresh-auto",
    // 启用后将按设定的时间间隔自动刷新数据
  },
  "refresh.interval": {
    type: "number",
    default: 300,
    validate: (value) => value >= 10 && value <= 3600,
    description: "自动刷新间隔（秒）",
    icon: "mdi-timer-outline",
    // 设置自动刷新的时间间隔，范围10-3600秒
  },

  // 字体设置
  "font.size": {
    type: "number",
    default: 28,
    validate: (value) => value >= 16 && value <= 100,
    description: "字体大小",
    icon: "mdi-format-size",
  },

  // 编辑设置
  "edit.autoSave": {
    type: "boolean",
    default: true,
    description: "是否启用自动保存",
    icon: "mdi-content-save-outline",
    // 启用后编辑内容时会自动保存更改，无需手动点击保存按钮
  },
  "edit.blockNonTodayAutoSave": {
    // 添加新选项
    type: "boolean",
    default: true,
    description: "禁止自动保存非当天数据",
    icon: "mdi-calendar-lock",
    // 启用后只有当天的数据会自动保存，防止意外修改历史数据
  },
  "edit.refreshBeforeEdit": {
    type: "boolean",
    default: true,
    description: "编辑前是否自动刷新",
    icon: "mdi-refresh",
    // 启用后在开始编辑前会自动刷新数据，确保编辑的是最新内容
  },
  "edit.confirmNonTodaySave": {
    // 添加新选项
    type: "boolean",
    default: true,
    description: "保存非当天数据需确认",
    icon: "mdi-calendar-alert",
  },

  // 开发者选项
  "developer.enabled": {
    type: "boolean",
    default: false,
    description: "是否启用开发者选项",
    icon: "mdi-developer-board",
    // 启用后可以访问高级开发者功能和设置项
  },
  "developer.showDebugConfig": {
    type: "boolean",
    default: false,
    description: "是否显示调试配置",
    icon: "mdi-bug-outline",
    // 启用后在控制台显示详细的配置信息和设置变更日志
  },
  "developer.disableMessageLog": {
    // 添加新的设置项
    type: "boolean",
    default: false,
    description: "禁用消息日志记录",
    requireDeveloper: true,
    icon: "mdi-message-off-outline",
    // 启用后将不再记录应用消息到日志，可减少内存占用
  },

  // 消息设置
  "message.showSidebar": {
    type: "boolean",
    default: true,
    description: "是否显示消息记录侧栏",
    requireDeveloper: true, // 添加标记
    icon: "mdi-message-text-outline",
    // 控制是否显示消息历史记录侧栏，需要开发者模式
  },
  "message.maxActiveMessages": {
    type: "number",
    default: 5,
    validate: (value) => value >= 1 && value <= 10,
    description: "同时显示的最大消息数量",
    requireDeveloper: true,
    icon: "mdi-message-badge-outline",
    // 控制界面上同时显示的最大消息数量，范围1-10条
  },
  "message.timeout": {
    type: "number",
    default: 5000,
    validate: (value) => value >= 1000 && value <= 30000,
    description: "消息自动关闭时间(毫秒)",
    requireDeveloper: true,
    icon: "mdi-timer-sand",
    // 设置消息自动消失的时间，范围1000-30000毫秒
  },
  "message.saveHistory": {
    type: "boolean",
    default: true,
    description: "是否保存消息历史记录",
    requireDeveloper: true,
    icon: "mdi-history",
    // 启用后将保存消息历史记录，可在侧栏中查看
  },

  // 主题设置
  "theme.mode": {
    type: "string",
    default: "dark",
    validate: (value) => ["light", "dark"].includes(value),
    description: "主题模式",
    icon: "mdi-theme-light-dark",
    // 设置应用的主题模式，可选亮色或暗色主题
  },

  // 随机点名设置
  "randomPicker.enabled": {
    type: "boolean",
    default: true,
    description: "是否启用随机点名功能",
    icon: "mdi-account-question",
  },
  "randomPicker.animation": {
    type: "boolean",
    default: true,
    description: "是否启用随机点名动画效果",
    icon: "mdi-animation-play",
  },
  "randomPicker.defaultCount": {
    type: "number",
    default: 1,
    validate: (value) => value >= 1 && value <= 10,
    description: "默认抽取人数",
    icon: "mdi-counter",
  },
  "randomPicker.excludeAbsent": {
    type: "boolean",
    default: true,
    description: "是否排除请假学生",
    icon: "mdi-account-off",
  },
  "randomPicker.excludeLate": {
    type: "boolean",
    default: false,
    description: "是否排除迟到学生",
    icon: "mdi-clock-alert",
  },
  "randomPicker.excludeExcluded": {
    type: "boolean",
    default: true,
    description: "是否排除不参与学生",
    icon: "mdi-account-cancel",
  },
};

// 内存中缓存的设置值
let settingsCache = null;

/**
 * 从localStorage加载所有设置
 * @returns {Object} 所有设置的值
 */
function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      settingsCache = JSON.parse(stored);
    } else {
      // 首次使用或迁移旧数据
      settingsCache = migrateFromLegacy();
    }
  } catch (error) {
    console.error("加载设置失败:", error);
    settingsCache = {};
  }

  // 确保所有设置项都有值（使用默认值填充）
  for (const [key, definition] of Object.entries(settingsDefinitions)) {
    if (!(key in settingsCache)) {
      settingsCache[key] = definition.default;
    }
  }

  return settingsCache;
}

/**
 * 从旧版本的localStorage迁移数据
 */
function migrateFromLegacy() {
  const LEGACY_SETTINGS_KEY = "homeworkpage_settings";
  const LEGACY_MESSAGE_KEY = "homeworkpage_messages";

  // 尝试从旧版本的设置中迁移
  const legacySettings = localStorage.getItem(LEGACY_SETTINGS_KEY);
  if (legacySettings) {
    try {
      const settings = JSON.parse(legacySettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      // 可选：删除旧的设置
      localStorage.removeItem(LEGACY_SETTINGS_KEY);
      return settings;
    } catch (error) {
      console.error("迁移旧设置失败:", error);
    }
  }
  // 尝试从旧版本的message中迁移
  const legacyMessages = localStorage.getItem(LEGACY_MESSAGE_KEY);
  if (legacyMessages) {
    try {
      const messages = JSON.parse(legacyMessages);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(messages));
      // 可选：删除旧的message
      localStorage.removeItem(LEGACY_MESSAGE_KEY);
      return messages; // 返回迁移后的消息
    } catch (error) {
      console.error("迁移旧消息失败:", error);
    }
  }

  // 如果没有旧设置或迁移失败，返回空对象
  return {};
}

/**
 * 保存所有设置到localStorage
 */
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsCache));
  } catch (error) {
    console.error("保存设置失败:", error);
  }
}

/**
 * 获取设置项的值
 * @param {string} key - 设置项键名
 * @returns {any} 设置项的值
 */
function getSetting(key) {
  if (!settingsCache) {
    loadSettings();
  }

  const definition = settingsDefinitions[key];
  if (!definition) {
    console.warn(`未定义的设置项: ${key}`);
    return null;
  }

  // 确保开发者相关设置正确处理
  if (definition.requireDeveloper) {
    const devEnabled = settingsCache["developer.enabled"];
    if (!devEnabled) {
      return definition.default;
    }
  }

  const value = settingsCache[key];
  return value !== undefined ? value : definition.default;
}

// 修改 logSettingsChange 函数，优化检查逻辑
function logSettingsChange(key, oldValue, newValue) {
  // 确保设置已加载
  if (!settingsCache) {
    loadSettings();
  }

  const shouldLog =
    settingsCache["developer.enabled"] &&
    settingsCache["developer.showDebugConfig"];

  if (shouldLog) {
    console.log(`[Settings] ${key}:`, {
      old: oldValue,
      new: newValue,
      time: new Date().toLocaleTimeString(),
    });
  }
}

/**
 * 设置配置项的值
 * @param {string} key - 设置项键名
 * @param {any} value - 要设置的值
 * @returns {boolean} 是否设置成功
 */
function setSetting(key, value) {
  const definition = settingsDefinitions[key];
  if (!definition) {
    console.warn(`未定义的设置项: ${key}`);
    return false;
  }

  // 添加对开发者选项依赖的检查
  if (definition.requireDeveloper && !settingsCache["developer.enabled"]) {
    console.warn(`设置项 ${key} 需要启用开发者选项`);
    return false;
  }

  try {
    const oldValue = settingsCache[key];
    // 类型转换
    if (typeof value !== definition.type) {
      value =
        definition.type === "boolean"
          ? Boolean(value)
          : definition.type === "number"
          ? Number(value)
          : String(value);
    }

    // 验证
    if (definition.validate && !definition.validate(value)) {
      console.warn(`设置项 ${key} 的值无效`);
      return false;
    }

    if (!settingsCache) {
      loadSettings();
    }

    settingsCache[key] = value;
    saveSettings();
    logSettingsChange(key, oldValue, value);

    // 为了保持向后兼容，同时更新旧的localStorage键
    const legacyKey = definition.legacyKey;
    if (legacyKey) {
      localStorage.setItem(legacyKey, value.toString());
    }

    return true;
  } catch (error) {
    console.error(`设置配置项 ${key} 失败:`, error);
    return false;
  }
}

/**
 * 重置指定设置项到默认值
 * @param {string} key - 设置项键名
 */
function resetSetting(key) {
  const definition = settingsDefinitions[key];
  if (!definition) {
    console.warn(`未定义的设置项: ${key}`);
    return;
  }

  if (!settingsCache) {
    loadSettings();
  }

  settingsCache[key] = definition.default;
  saveSettings();
}

/**
 * 重置所有设置项到默认值
 */
function resetAllSettings() {
  settingsCache = {};
  for (const [key, definition] of Object.entries(settingsDefinitions)) {
    settingsCache[key] = definition.default;
  }
  saveSettings();
}

/**
 * 监听设置变化
 * @param {Function} callback - 当设置改变时调用的回调函数
 * @returns {Function} 取消监听的函数
 */
function watchSettings(callback) {
  const handler = (event) => {
    if (event.key === SETTINGS_STORAGE_KEY) {
      settingsCache = JSON.parse(event.newValue);
      callback(settingsCache);
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

// 初始化设置
loadSettings();

/**
 * 获取设置项的定义
 * @param {string} key - 设置项键名
 * @returns {SettingDefinition|null} 设置项的定义或null
 */
function getSettingDefinition(key) {
  return settingsDefinitions[key] || null;
}

/**
 * 将当前配置导出为简单的键值对对象
 * @returns {Object} 包含所有设置的键值对对象
 */
function exportSettingsAsKeyValue() {
  if (!settingsCache) {
    loadSettings();
  }
  
  // 创建一个新对象，避免直接返回引用
  const exportedSettings = {};
  
  // 遍历所有设置项
  for (const key in settingsDefinitions) {
    // 获取当前值（确保使用getSetting以应用所有规则，如开发者选项依赖）
    exportedSettings[key] = getSetting(key);
  }
  
  return exportedSettings;
}

export {
  settingsDefinitions,
  getSetting,
  setSetting,
  resetSetting,
  resetAllSettings,
  watchSettings,
  getSettingDefinition,
  exportSettingsAsKeyValue
};
