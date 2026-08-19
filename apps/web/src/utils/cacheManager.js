/**
 * Cache Manager — 带 TTL 的缓存管理器
 *
 * 封装 IndexedDB 缓存读写 + 过期逻辑。
 * 缓存条目格式: { data, meta, cacheTimestamp, cacheTTL }
 * 存储在 ClassworksDB 的 kv store 中，key 前缀为 _cache:
 */

import { openDB } from "idb";
import { createEmptyMeta } from "./crdtEngine";
import { getSetting } from "./settings";

// Cache key prefix (与旧代码保持一致)
const CACHE_PREFIX = "_cache:";

// 数据库信息
const DB_NAME = "ClassworksDB";

// 默认 TTL: 7 天
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * TTL 配置 — 按 key 模式匹配
 * 顺序匹配，第一个命中的生效
 * 通配符 * 匹配任意字符
 */
const TTL_CONFIG = [
  { pattern: "*", ttl: DEFAULT_TTL },
];

// --- 内部辅助 ---

/**
 * 初始化数据库连接
 */
async function getDB() {
  return openDB(DB_NAME, undefined, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv");
      }
      if (!db.objectStoreNames.contains("system")) {
        db.createObjectStore("system");
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue");
      }
    },
  });
}

/**
 * 简单 glob 匹配 (* 匹配任意字符)
 * @param {string} pattern
 * @param {string} str
 * @returns {boolean}
 */
function globMatch(pattern, str) {
  const regexStr = "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$";
  return new RegExp(regexStr).test(str);
}

/**
 * 判断缓存条目是否为旧格式 (无 meta 字段)
 * @param {*} entry
 * @returns {boolean}
 */
function isLegacyEntry(entry) {
  return entry && typeof entry === "object" && !("meta" in entry) && !("cacheTimestamp" in entry);
}

/**
 * 判断缓存条目是否为新格式
 * @param {*} entry
 * @returns {boolean}
 */
function isNewFormatEntry(entry) {
  return entry && typeof entry === "object" && "meta" in entry && "cacheTimestamp" in entry;
}

// --- 导出 API ---

/**
 * 根据 key 匹配 TTL 配置
 * @param {string} key — 数据 key (不含 _cache: 前缀)
 * @returns {number} TTL 毫秒数
 */
export function getTTLForKey(key) {
  for (const { pattern, ttl } of TTL_CONFIG) {
    if (globMatch(pattern, key)) {
      return ttl;
    }
  }
  return DEFAULT_TTL;
}

/**
 * 读取缓存条目
 * - 过期则自动删除并返回 null
 * - 旧格式自动迁移到新格式
 *
 * @param {string} key — 数据 key (不含前缀)
 * @returns {Promise<{ data: *, meta: Object }|null>}
 */
export async function getCacheEntry(key) {
  try {
    const db = await getDB();
    const cacheKey = CACHE_PREFIX + key;
    const raw = await db.get("kv", cacheKey);

    if (!raw) return null;

    // 尝试解析 JSON
    let entry;
    try {
      entry = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }

    // 旧格式迁移
    if (isLegacyEntry(entry)) {
      const deviceId = getSetting("device.uuid") || "unknown";
      const meta = createEmptyMeta(deviceId);
      meta.ts = Date.now();
      meta.lastSyncedData = entry;

      const migrated = {
        data: entry,
        meta,
        cacheTimestamp: Date.now(),
        cacheTTL: getTTLForKey(key),
      };

      // 写回迁移后的格式
      await db.put("kv", JSON.stringify(migrated), cacheKey);
      return { data: migrated.data, meta: migrated.meta };
    }

    // 新格式 — 检查是否过期
    if (isNewFormatEntry(entry)) {
      const age = Date.now() - entry.cacheTimestamp;
      if (age > entry.cacheTTL) {
        // 过期，删除
        await db.delete("kv", cacheKey);
        return null;
      }
      return { data: entry.data, meta: entry.meta };
    }

    return null;
  } catch (error) {
    console.warn("cacheManager.getCacheEntry 失败:", error);
    return null;
  }
}

/**
 * 写入缓存条目
 * @param {string} key — 数据 key (不含前缀)
 * @param {*} data — 用户数据
 * @param {Object} meta — CRDT metadata
 * @returns {Promise<boolean>}
 */
export async function setCacheEntry(key, data, meta) {
  try {
    const db = await getDB();
    const cacheKey = CACHE_PREFIX + key;
    const entry = {
      data,
      meta,
      cacheTimestamp: Date.now(),
      cacheTTL: getTTLForKey(key),
    };
    await db.put("kv", JSON.stringify(entry), cacheKey);
    return true;
  } catch (error) {
    console.warn("cacheManager.setCacheEntry 失败:", error);
    return false;
  }
}

/**
 * 删除缓存条目
 * @param {string} key — 数据 key (不含前缀)
 * @returns {Promise<boolean>}
 */
export async function deleteCacheEntry(key) {
  try {
    const db = await getDB();
    await db.delete("kv", CACHE_PREFIX + key);
    return true;
  } catch (error) {
    console.warn("cacheManager.deleteCacheEntry 失败:", error);
    return false;
  }
}

/**
 * 检查缓存是否未过期
 * @param {string} key — 数据 key (不含前缀)
 * @returns {Promise<boolean>}
 */
export async function isCacheFresh(key) {
  try {
    const db = await getDB();
    const raw = await db.get("kv", CACHE_PREFIX + key);
    if (!raw) return false;

    let entry;
    try {
      entry = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return false;
    }

    if (!isNewFormatEntry(entry)) return false;

    return Date.now() - entry.cacheTimestamp <= entry.cacheTTL;
  } catch {
    return false;
  }
}

/**
 * 清理所有过期的 _cache: 条目
 * 在启动时和同步完成后调用
 * @returns {Promise<number>} 删除的条目数
 */
export async function cleanupExpiredEntries() {
  let cleaned = 0;
  try {
    const db = await getDB();
    const tx = db.transaction("kv", "readwrite");
    const store = tx.objectStore("kv");
    const allKeys = await store.getAllKeys();

    for (const storeKey of allKeys) {
      if (!storeKey.startsWith(CACHE_PREFIX)) continue;

      const raw = await store.get(storeKey);
      if (!raw) continue;

      let entry;
      try {
        entry = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        continue;
      }

      if (isNewFormatEntry(entry)) {
        const age = Date.now() - entry.cacheTimestamp;
        if (age > entry.cacheTTL) {
          await store.delete(storeKey);
          cleaned++;
        }
      }
    }

    await tx.done;
  } catch (error) {
    console.warn("cacheManager.cleanupExpiredEntries 失败:", error);
  }
  return cleaned;
}

/**
 * 获取缓存前缀 (供外部使用)
 */
export { CACHE_PREFIX };
