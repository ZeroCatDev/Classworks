/**
 * CRDT Engine — 纯函数冲突解决模块
 *
 * 基于向量时钟的无冲突复制数据类型 (CRDT) 实现。
 * 所有函数无副作用，不依赖 IndexedDB 或网络。
 *
 * 合并策略:
 * - 对象: 按字段 LWW (Last-Writer-Wins)，使用 _fieldTs 字段级时间戳
 * - 数组: 按 identity 合并，union 语义
 * - 原始类型: LWW，时间戳相同时 deviceId 字典序决定
 */

// --- 向量时钟操作 ---

/**
 * 创建空的 metadata 对象
 * @param {string} deviceId — 本设备标识符
 * @returns {Object} 初始 metadata
 */
export function createEmptyMeta(deviceId) {
  return {
    vc: { [deviceId]: 0 },
    ts: 0,
    deviceId,
    _fieldTs: {},
    lastSyncedData: null,
    lastSyncedTs: 0,
    lastSyncedVc: { [deviceId]: 0 },
  };
}

/**
 * 递增设备时钟，返回新的 metadata (不可变)
 * @param {Object} meta — 当前 metadata
 * @param {string} deviceId — 本设备标识符
 * @returns {Object} 递增后的新 metadata
 */
export function bumpClock(meta, deviceId) {
  const newVc = { ...meta.vc };
  newVc[deviceId] = (newVc[deviceId] || 0) + 1;
  return {
    ...meta,
    vc: newVc,
    ts: Date.now(),
    deviceId,
  };
}

/**
 * 合并两个向量时钟，取各分量的 max
 * @param {Object} vcA
 * @param {Object} vcB
 * @returns {Object} 合并后的向量时钟
 */
export function mergeClocks(vcA, vcB) {
  const result = { ...vcA };
  for (const [node, count] of Object.entries(vcB)) {
    result[node] = Math.max(result[node] || 0, count);
  }
  return result;
}

/**
 * 比较两个版本的向量时钟
 * @param {Object} metaA
 * @param {Object} metaB
 * @returns {"A_NEWER"|"B_NEWER"|"CONCURRENT"|"EQUAL"}
 */
export function compareVersions(metaA, metaB) {
  const vcA = metaA.vc || {};
  const vcB = metaB.vc || {};

  // 收集所有节点
  const allNodes = new Set([...Object.keys(vcA), ...Object.keys(vcB)]);

  let aGreater = false;
  let bGreater = false;

  for (const node of allNodes) {
    const a = vcA[node] || 0;
    const b = vcB[node] || 0;
    if (a > b) aGreater = true;
    if (b > a) bGreater = true;
    if (aGreater && bGreater) return "CONCURRENT";
  }

  if (!aGreater && !bGreater) return "EQUAL";
  if (aGreater) return "A_NEWER";
  return "B_NEWER";
}

// --- 数据合并 ---

/**
 * 判断是否为纯对象 (非数组、非 null)
 */
function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

/**
 * DJB2 哈希，用于轻量数据比较
 * @param {*} data — JSON 可序列化数据
 * @returns {string} 十六进制哈希字符串
 */
export function computeDataHash(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

/**
 * 合并字段级时间戳
 * @param {Object} fieldTsA
 * @param {Object} fieldTsB
 * @returns {Object}
 */
function mergeFieldTimestamps(fieldTsA, fieldTsB) {
  if (!fieldTsA && !fieldTsB) return {};
  if (!fieldTsA) return { ...fieldTsB };
  if (!fieldTsB) return { ...fieldTsA };

  const result = { ...fieldTsA };
  for (const [path, infoB] of Object.entries(fieldTsB)) {
    const infoA = result[path];
    if (!infoA || infoB.ts > infoA.ts || (infoB.ts === infoA.ts && infoB.deviceId < infoA.deviceId)) {
      result[path] = infoB;
    }
  }
  return result;
}

/**
 * 检测数组的 identity 函数
 * 优先级: id > name > key > JSON.stringify
 */
function detectIdentityFn(arr) {
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  if (isPlainObject(first)) {
    if ("id" in first) return (item) => (isPlainObject(item) ? item.id : JSON.stringify(item));
    if ("name" in first) return (item) => (isPlainObject(item) ? item.name : JSON.stringify(item));
    if ("key" in first) return (item) => (isPlainObject(item) ? item.key : JSON.stringify(item));
  }
  return null;
}

/**
 * 合并两个数组 — union 语义，按 identity 去重
 * @param {Array} local
 * @param {Object} localMeta
 * @param {Array} remote
 * @returns {Array} 合并后的数组
 */
function mergeArrays(local, localMeta, remote) {
  const identityFn =
    detectIdentityFn(local) ||
    detectIdentityFn(remote) ||
    ((item) => JSON.stringify(item));

  const localMap = new Map();
  const remoteMap = new Map();

  local.forEach((item) => {
    const id = identityFn(item);
    if (!localMap.has(id)) localMap.set(id, item);
  });
  remote.forEach((item) => {
    const id = identityFn(item);
    if (!remoteMap.has(id)) remoteMap.set(id, item);
  });

  const result = [];
  const seen = new Set();

  // 保持本地顺序，本地有的以本地为准
  for (const [id, item] of localMap) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }

  // 追加远程独有的
  for (const [id, item] of remoteMap) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(item);
    }
  }

  return result;
}

/**
 * 合并两个对象 — 按字段 LWW
 * @param {Object} local
 * @param {Object} localMeta
 * @param {Object} remote
 * @param {Object} remoteMeta
 * @returns {Object}
 */
function mergeObjects(local, localMeta, remote, remoteMeta) {
  const result = {};
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const key of allKeys) {
    const localHas = key in local;
    const remoteHas = key in remote;

    if (localHas && !remoteHas) {
      result[key] = local[key];
    } else if (!localHas && remoteHas) {
      result[key] = remote[key];
    } else {
      // 两边都有 — 用字段级时间戳决定
      const localFieldInfo = localMeta._fieldTs?.[key] || {
        ts: localMeta.ts,
        deviceId: localMeta.deviceId,
      };
      const remoteFieldInfo = remoteMeta._fieldTs?.[key] || {
        ts: remoteMeta.ts,
        deviceId: remoteMeta.deviceId,
      };

      if (localFieldInfo.ts > remoteFieldInfo.ts) {
        result[key] = local[key];
      } else if (remoteFieldInfo.ts > localFieldInfo.ts) {
        result[key] = remote[key];
      } else {
        // 时间戳相同 — deviceId 字典序决定
        result[key] =
          localFieldInfo.deviceId <= remoteFieldInfo.deviceId
            ? local[key]
            : remote[key];
      }
    }
  }

  return result;
}

/**
 * CRDT 合并入口 — 根据数据类型选择合并策略
 *
 * @param {*} localData — 本地数据
 * @param {Object} localMeta — 本地 metadata (含 vc, ts, deviceId, _fieldTs)
 * @param {*} remoteData — 远程数据
 * @param {Object} remoteMeta — 远程 metadata
 * @returns {{ data: *, meta: Object }} 合并后的数据和 metadata
 */
export function mergeValues(localData, localMeta, remoteData, remoteMeta) {
  const mergedVc = mergeClocks(localMeta.vc || {}, remoteMeta.vc || {});
  const mergedTs = Math.max(localMeta.ts || 0, remoteMeta.ts || 0);
  const mergedFieldTs = mergeFieldTimestamps(
    localMeta._fieldTs,
    remoteMeta._fieldTs,
  );

  let mergedData;

  if (isPlainObject(localData) && isPlainObject(remoteData)) {
    mergedData = mergeObjects(
      localData,
      localMeta,
      remoteData,
      remoteMeta,
    );
  } else if (Array.isArray(localData) && Array.isArray(remoteData)) {
    mergedData = mergeArrays(localData, localMeta, remoteData);
  } else if (
    typeof localData === typeof remoteData &&
    typeof localData !== "object"
  ) {
    // 原始类型: LWW
    if ((localMeta.ts || 0) > (remoteMeta.ts || 0)) {
      mergedData = localData;
    } else if ((remoteMeta.ts || 0) > (localMeta.ts || 0)) {
      mergedData = remoteData;
    } else {
      mergedData =
        (localMeta.deviceId || "") <= (remoteMeta.deviceId || "")
          ? localData
          : remoteData;
    }
  } else {
    // 类型不同 — LWW
    mergedData = (localMeta.ts || 0) >= (remoteMeta.ts || 0) ? localData : remoteData;
  }

  return {
    data: mergedData,
    meta: {
      vc: mergedVc,
      ts: mergedTs,
      deviceId: mergedTs === (localMeta.ts || 0) ? localMeta.deviceId : remoteMeta.deviceId,
      _fieldTs: mergedFieldTs,
      lastSyncedData: remoteMeta.lastSyncedData ?? localMeta.lastSyncedData ?? null,
      lastSyncedTs: Math.max(localMeta.lastSyncedTs || 0, remoteMeta.lastSyncedTs || 0),
      lastSyncedVc: mergedVc,
    },
  };
}
