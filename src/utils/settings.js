/**
 * 配置项定义
 * @typedef {Object} SettingDefinition
 * @property {string} type - 配置项类型 ('boolean' | 'number' | 'string')
 * @property {any} default - 默认值
 * @property {Function} [validate] - 可选的验证函数
 * @property {string} [description] - 配置项描述
 * @property {string} [legacyKey] - 旧版本localStorage键名(用于迁移)
 */

// 存储所有设置的localStorage键名
const SETTINGS_STORAGE_KEY = 'homeworkpage_settings';

/**
 * 所有配置项的定义
 * @type {Object.<string, SettingDefinition>}
 */
const settingsDefinitions = {
  // 显示设置
  // 'display.showEmptySubjects': {
  //   type: 'boolean',
  //   default: true,
  //   description: '是否在主界面显示没有作业内容的科目'
  // },
  'display.emptySubjectDisplay': {
    type: 'string',
    default: 'card',
    validate: value => ['card', 'button'].includes(value),
    description: '空科目的显示方式：卡片或按钮'
  },
  'display.dynamicSort': {
    type: 'boolean',
    default: true,
    description: '是否启用动态排序以优化显示效果'
  },
  
  // 服务器设置
  'server.domain': {
    type: 'string',
    default: '',
    validate: value => !value || /^https?:\/\//.test(value),
    description: '后端服务器域名'
  },
  'server.classNumber': {
    type: 'string',
    default: '',
    validate: value => /^[A-Za-z0-9]*$/.test(value),
    description: '班级编号'
  },

  // 刷新设置
  'refresh.auto': {
    type: 'boolean',
    default: false,
    description: '是否启用自动刷新'
  },
  'refresh.interval': {
    type: 'number',
    default: 300,
    validate: value => value >= 10 && value <= 3600,
    description: '自动刷新间隔（秒）'
  },

  // 字体设置
  'font.size': {
    type: 'number',
    default: 28,
    validate: value => value >= 16 && value <= 100,
    description: '字体大小（像素）'
  },

  // 编辑设置
  'edit.autoSave': {
    type: 'boolean',
    default: false,
    description: '是否启用自动保存'
  },
  'edit.refreshBeforeEdit': {
    type: 'boolean',
    default: false,
    description: '编辑前是否自动刷新'
  }
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
    console.error('加载设置失败:', error);
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
  const settings = {};
  const legacyKeyMap = {
    'server.domain': 'backendServerDomain',
    'server.classNumber': 'classNumber',
    'refresh.auto': 'autoRefresh',
    'refresh.interval': 'refreshInterval',
    'font.size': 'fontSize',
    'edit.autoSave': 'autoSave',
    'edit.refreshBeforeEdit': 'refreshBeforeEdit',
    'display.emptySubjectDisplay': 'emptySubjectDisplay',
    'display.dynamicSort': 'dynamicSort'
  };

  // 迁移旧数据
  for (const [newKey, oldKey] of Object.entries(legacyKeyMap)) {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue !== null) {
      const definition = settingsDefinitions[newKey];
      switch (definition.type) {
        case 'boolean':
          settings[newKey] = oldValue === 'true';
          break;
        case 'number':
          settings[newKey] = Number(oldValue);
          break;
        default:
          settings[newKey] = oldValue;
      }
      // 可选：删除旧的localStorage项
      // localStorage.removeItem(oldKey);
    }
  }

  // 保存迁移后的数据
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

/**
 * 保存所有设置到localStorage
 */
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsCache));
  } catch (error) {
    console.error('保存设置失败:', error);
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

  const value = settingsCache[key];
  return value !== undefined ? value : definition.default;
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

  try {
    // 类型转换
    if (typeof value !== definition.type) {
      value = definition.type === 'boolean' ? Boolean(value) :
              definition.type === 'number' ? Number(value) : String(value);
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
  
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

// 初始化设置
loadSettings();

export {
  settingsDefinitions,
  getSetting,
  setSetting,
  resetSetting,
  resetAllSettings,
  watchSettings
}; 