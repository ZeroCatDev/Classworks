/**
 * Smart Sync Manager — 增强同步管理器
 *
 * 替代 dataProvider.js 中内联的 flushSyncQueue。
 * 功能:
 * - 网络恢复时自动刷新同步队列
 * - 任意云端操作成功后，若队列有未同步条目，自动触发全部同步
 * - 同步成功后更新本地缓存的 lastSyncedData/lastSyncedVc 快照
 * - 启动时清理过期缓存
 */

import { kvLocalProvider } from "./providers/kvLocalProvider";
import { kvServerProvider } from "./providers/kvServerProvider";
import { cleanupExpiredEntries, getCacheEntry, setCacheEntry } from "./cacheManager";
import { createEmptyMeta } from "./crdtEngine";
import { getSetting } from "./settings";

let _onlineHandler = null;
let _flushing = false;

/**
 * 刷新同步队列 — 逐条重放，失败则停止
 * @param {Object} [options]
 * @param {boolean} [options.silent=false] — 静默模式，不输出日志
 * @returns {Promise<{ synced: number, failed: number }>}
 */
export async function flushAll(options = {}) {
  if (_flushing) return { synced: 0, failed: 0 };
  _flushing = true;

  let synced = 0;
  let failed = 0;

  try {
    const queueResult = await kvLocalProvider.getSyncQueue();

    if (queueResult.success === false || !Array.isArray(queueResult) || queueResult.length === 0) {
      return { synced: 0, failed: 0 };
    }

    for (const entry of queueResult) {
      try {
        const result = await kvServerProvider.saveData(entry.key, entry.data);

        if (result.success !== false) {
          // 同步成功 — 从队列移除
          await kvLocalProvider.removeFromSyncQueue(entry.key);

          // 更新本地缓存的 lastSynced 快照
          if (entry.meta) {
            const deviceId = getSetting("device.uuid") || "unknown";
            const existingEntry = await getCacheEntry(entry.key);

            if (existingEntry) {
              const meta = { ...existingEntry.meta };
              meta.lastSyncedData = entry.data;
              meta.lastSyncedTs = Date.now();
              meta.lastSyncedVc = { ...meta.vc };
              await setCacheEntry(entry.key, existingEntry.data, meta);
            } else {
              // 缓存条目已过期或不存在，重建
              const meta = entry.meta || createEmptyMeta(deviceId);
              meta.lastSyncedData = entry.data;
              meta.lastSyncedTs = Date.now();
              meta.lastSyncedVc = { ...meta.vc };
              await setCacheEntry(entry.key, entry.data, meta);
            }
          }

          synced++;
        } else {
          // 服务器返回错误 (非网络错误) — 跳过此项继续
          failed++;
          if (!options.silent) {
            console.warn(`smartSync: 跳过 key=${entry.key}, 服务器错误:`, result.error?.message);
          }
        }
      } catch {
        // 网络错误 — 停止处理，下次重试
        failed++;
        break;
      }
    }

    // 清理过期缓存
    if (synced > 0) {
      cleanupExpiredEntries();
    }
  } finally {
    _flushing = false;
  }

  if (!options.silent && synced > 0) {
    console.log(`smartSync: 同步完成，成功 ${synced} 条，失败 ${failed} 条`);
  }

  return { synced, failed };
}

/**
 * 触发条件同步 — 任意云端操作成功后调用
 * 仅在队列中有条目时执行
 * @returns {Promise<void>}
 */
export async function triggerSyncAfterSuccess() {
  try {
    const queueResult = await kvLocalProvider.getSyncQueue();
    if (queueResult.success === false || !Array.isArray(queueResult)) return;
    if (queueResult.length === 0) return;

    // 有未同步条目，触发全部同步
    flushAll({ silent: true });
  } catch {
    // 静默失败
  }
}

/**
 * 初始化智能同步管理器
 * - 注册 online 事件监听
 * - 启动时清理过期缓存
 * - 启动时尝试刷新队列
 */
export function initSmartSync() {
  if (_onlineHandler) return;

  _onlineHandler = () => flushAll();
  window.addEventListener("online", _onlineHandler);

  // 启动时清理过期缓存
  cleanupExpiredEntries();

  // 启动时尝试刷新队列
  if (navigator.onLine) {
    flushAll();
  }
}

/**
 * 销毁智能同步管理器
 * 移除事件监听
 */
export function destroySmartSync() {
  if (_onlineHandler) {
    window.removeEventListener("online", _onlineHandler);
    _onlineHandler = null;
  }
}
