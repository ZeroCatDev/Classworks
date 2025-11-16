import {kvLocalProvider} from "./providers/kvLocalProvider";
import {kvServerProvider} from "./providers/kvServerProvider";
import {getSetting, setSetting} from "./settings";

export const formatResponse = (data) => data;

export const formatError = (message, code = "UNKNOWN_ERROR") => ({
  success: false,
  error: {code, message},
});

// Main data provider with simplified API
export default {
  // Provider API methods
  loadData: async (key) => {
    const provider = getSetting("server.provider");
    const useServer =
      provider === "kv-server" || provider === "classworkscloud";

    if (useServer) {
      return kvServerProvider.loadData(key);
    } else {
      return kvLocalProvider.loadData(key);
    }
  },

  saveData: async (key, data) => {
    const provider = getSetting("server.provider");
    const useServer =
      provider === "kv-server" || provider === "classworkscloud";

    if (useServer) {
      return kvServerProvider.saveData(key, data);
    } else {
      return kvLocalProvider.saveData(key, data);
    }
  },

  /**
   * 获取键名列表
   * @param {Object} options - 查询选项
   * @param {string} options.sortBy - 排序字段，默认为 "key"
   * @param {string} options.sortDir - 排序方向，"asc" 或 "desc"，默认为 "asc"
   * @param {number} options.limit - 每页返回的记录数，默认为 100
   * @param {number} options.skip - 跳过的记录数，默认为 0
   * @returns {Promise<Object>} 包含键名列表和分页信息的响应对象
   *
   * 使用示例:
   * ```javascript
   * // 获取前10个键名
   * const result = await dataProvider.loadKeys({ limit: 10 });
   * if (result.success !== false) {
   *   console.log('键名列表:', result.keys);
   *   console.log('总数:', result.total_rows);
   * }
   *
   * // 获取第二页数据（跳过前10个）
   * const page2 = await dataProvider.loadKeys({ limit: 10, skip: 10 });
   *
   * // 按键名降序排列
   * const sorted = await dataProvider.loadKeys({ sortDir: 'desc' });
   * ```
   *
   * 返回值格式:
   * ```javascript
   * {
   *   keys: ["key1", "key2", "key3"],
   *   total_rows: 150,
   *   current_page: {
   *     limit: 10,
   *     skip: 0,
   *     count: 10
   *   },
   *   load_more: "/api/kv/namespace/_keys?..." // 仅服务器模式
   * }
   * ```
   */
  loadKeys: async (options = {}) => {
    const provider = getSetting("server.provider");
    const useServer =
      provider === "kv-server" || provider === "classworkscloud";

    if (useServer) {
      return kvServerProvider.loadKeys(options);
    } else {
      return kvLocalProvider.loadKeys(options);
    }
  },

  /**
   * 获取键的云端访问地址，并处理本地到云端的数据迁移
   *
   * 功能说明:
   * 1. 如果用户选择本地存储，则将本地键数据读取并存储到云端
   * 2. 如果云端配置为空或错误则自动改成classworksCloudDefaults的配置
   * 3. 根据网站验证情况（私有则添加token，公开或受保护则不需要）拼接键的get路径并返回
   *
   * @param {string} key - 要获取地址的键名
   * @param {Object} options - 选项配置
   * @param {boolean} options.migrateFromLocal - 是否从本地迁移数据到云端，默认为true
   * @param {boolean} options.autoConfigureCloud - 是否自动配置云端默认设置，默认为true
   * @returns {Promise<Object>} 包含键访问地址和操作结果的响应对象
   *
   * 使用示例:
   * ```javascript
   * import dataProvider from '@/utils/dataProvider';
   *
   * // 基本用法：获取键的云端地址并自动迁移本地数据
   * const result = await dataProvider.getKeyCloudUrl('exam_configs');
   * if (result.success) {
   *   console.log('云端访问地址:', result.url);
   *   console.log('是否已迁移数据:', result.migrated);
   *   console.log('是否自动配置:', result.configured);
   * } else {
   *   console.error('获取失败:', result.error.message);
   * }
   *
   * // 仅获取地址，不迁移数据
   * const urlOnly = await dataProvider.getKeyCloudUrl('my_data', {
   *   migrateFromLocal: false
   * });
   *
   * // 不自动配置云端设置
   * const noAutoConfig = await dataProvider.getKeyCloudUrl('my_data', {
   *   autoConfigureCloud: false
   * });
   * ```
   *
   * 传入参数示例:
   * ```javascript
   * // 参数1: key (必需)
   * 'exam_configs'  // 字符串类型的键名
   *
   * // 参数2: options (可选)
   * {
   *   migrateFromLocal: true,      // 是否迁移本地数据
   *   autoConfigureCloud: true     // 是否自动配置云端
   * }
   * ```
   *
   * 返回值格式:
   * ```javascript
   * // 成功时返回:
   * {
   *   success: true,
   *   url: "https://kv.wuyuan.dev/device-uuid-123/exam_configs?token=abc123",  // 私有访问时包含token
   *   migrated: true,              // 是否成功迁移了本地数据
   *   configured: false            // 是否自动配置了云端设置
   * }
   *
   * // 公开访问时返回:
   * {
   *   success: true,
   *   url: "https://kv.wuyuan.dev/device-uuid-123/exam_configs",  // 公开访问不包含token
   *   migrated: false,
   *   configured: true
   * }
   *
   * // 失败时返回:
   * {
   *   success: false,
   *   error: {
   *     code: "CLOUD_URL_ERROR",
   *     message: "获取键云端地址失败"
   *   }
   * }
   * ```
   */
  async getKeyCloudUrl(key, options = {}) {
    const {
      migrateFromLocal = true,
      autoConfigureCloud = true
    } = options;

    try {
      let serverUrl = getSetting("server.domain");
      let siteKey = getSetting("server.siteKey");
      const machineId = getSetting("device.uuid");
      let configured = false;

      // 检查云端配置是否为空或错误，如果是则使用默认配置
      if (!serverUrl || !machineId) {
        if (autoConfigureCloud) {
          // 使用classworksCloudDefaults配置
          const classworksCloudDefaults = {
            "server.domain": import.meta.env.VITE_DEFAULT_KV_SERVER || "https://kv.wuyuan.dev",
            "server.siteKey": "",
          };

          if (!serverUrl) {
            setSetting("server.domain", classworksCloudDefaults["server.domain"]);
            serverUrl = classworksCloudDefaults["server.domain"];
            configured = true;
          }

          if (!siteKey) {
            setSetting("server.siteKey", classworksCloudDefaults["server.siteKey"]);
            siteKey = classworksCloudDefaults["server.siteKey"];
          }

          // 设置provider为classworkscloud
          setSetting("server.provider", "classworkscloud");
        } else {
          return formatError("云端配置无效，请检查服务器域名和设备UUID", "CONFIG_ERROR");
        }
      }

      let migrated = false;

      // 如果需要迁移本地数据到云端
      if (migrateFromLocal) {
        try {
          // 尝试从本地读取数据
          const localData = await kvLocalProvider.loadData(key);

          // 如果本地有数据且不是错误响应
          if (localData && localData.success !== false) {
            // 检查云端是否已有数据
            const cloudData = await kvServerProvider.loadData(key);

            // 如果云端没有数据，则迁移本地数据
            if (cloudData && cloudData.success === false && cloudData.error?.code === "NOT_FOUND") {
              const saveResult = await kvServerProvider.saveData(key, localData);
              if (saveResult && saveResult.success !== false) {
                migrated = true;
                console.log(`已成功将键 ${key} 的数据从本地迁移到云端`);
              }
            }
          }
        } catch (error) {
          console.warn(`迁移键 ${key} 的数据时出错:`, error);
          // 迁移失败不影响URL生成，继续执行
        }
      }
      // 获取认证token
      const authtoken = getSetting("server.kvToken");
      // 构建云端访问URL
      let url = `${serverUrl}/kv/${key}?token=${authtoken}`;


      return {
        success: true,
        url,
        migrated,
        configured
      };

    } catch (error) {
      console.error('获取键云端地址时出错:', error);
      return formatError(
        error.message || "获取键云端地址失败",
        "CLOUD_URL_ERROR"
      );
    }
  },
};


export const ErrorCodes = {
  NOT_FOUND: "数据不存在",
  NETWORK_ERROR: "网络连接失败",
  SERVER_ERROR: "服务器错误",
  SAVE_ERROR: "保存失败",
  CONFIG_ERROR: "配置错误",
  PERMISSION_DENIED: "无权限访问",
  UNAUTHORIZED: "认证失败",
  CLOUD_URL_ERROR: "云端地址获取失败",
  UNKNOWN_ERROR: "未知错误",
};
