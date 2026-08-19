/**
 * Socket.IO 管理与事件转发
 *
 * 功能：
 * - 初始化 Socket.IO 并与 HTTP Server 绑定
 * - 前端使用 KV token 加入设备频道（自动映射到对应设备 uuid 房间）
 * - 同一设备的不同 token 会被归入同一频道
 * - 维护在线设备列表
 * - 提供广播 KV 键变更的工具方法
 * - 支持任意类型事件转发：客户端可发送自定义事件类型和JSON内容到其他设备
 * - 记录事件历史：包含时间戳、来源令牌、设备类型、权限等完整元数据
 * - 令牌信息缓存：在连接时预加载令牌详细信息以提高性能
 */

import { Server } from "socket.io";
import { onlineDevicesGauge } from "./metrics.js";
import DeviceDetector from "node-device-detector";
import ClientHints from "node-device-detector/client-hints.js";
import { prisma } from "./prisma.js";

// Socket.IO 单例实例
let io = null;

// 设备检测器实例
const deviceDetector = new DeviceDetector({
    clientIndexes: true,
    deviceIndexes: true,
    deviceAliasCode: false,
});
const clientHints = new ClientHints();

// 在线设备映射：uuid -> Set<socketId>
const onlineMap = new Map();
// 在线 token 映射：token -> Set<socketId> (用于指标统计)
const onlineTokens = new Map();
// 令牌信息缓存：token -> {appId, isReadOnly, deviceType, note, deviceUuid, deviceName}
const tokenInfoCache = new Map();
// 事件历史记录：每个设备最多保存1000条事件记录
const eventHistory = new Map(); // uuid -> Array<EventRecord>
const MAX_EVENT_HISTORY = 1000;

/**
 * 检测设备并生成友好的设备名称
 * @param {string} userAgent 用户代理字符串
 * @param {object} headers HTTP headers对象
 * @returns {string} 生成的设备名称
 */
function detectDeviceName(userAgent, headers = {}) {
    if (!userAgent) return "Unknown Device";

    try {
        const clientHintsData = clientHints.parse(headers);
        const deviceInfo = deviceDetector.detect(userAgent, clientHintsData);
        const botInfo = deviceDetector.parseBot(userAgent);

        // 如果是bot，返回bot名称
        if (botInfo && botInfo.name) {
            return `Bot: ${botInfo.name}`;
        }

        // 构建设备名称
        let deviceName = "";

        if (deviceInfo.device && deviceInfo.device.brand && deviceInfo.device.model) {
            deviceName = `${deviceInfo.device.brand} ${deviceInfo.device.model}`;
        } else if (deviceInfo.os && deviceInfo.os.name) {
            deviceName = deviceInfo.os.name;
            if (deviceInfo.os.version) {
                deviceName += ` ${deviceInfo.os.version}`;
            }
        }

        // 添加客户端信息
        if (deviceInfo.client && deviceInfo.client.name) {
            deviceName += deviceName ? ` (${deviceInfo.client.name}` : deviceInfo.client.name;
            if (deviceInfo.client.version) {
                deviceName += ` ${deviceInfo.client.version}`;
            }
            if (deviceName.includes("(")) {
                deviceName += ")";
            }
        }

        return deviceName || "Unknown Device";
    } catch (error) {
        console.warn("Device detection error:", error);
        return "Unknown Device";
    }
}

/**
 * 初始化 Socket.IO
 * @param {import('http').Server} server HTTP Server 实例
 */
export function initSocket(server) {
    if (io) return io;


    io = new Server(server, {
        cors: {
            origin: "*",
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            allowedHeaders: ["*"],
            credentials: false
        },
        // 传输方式回退策略：优先使用WebSocket,回退到轮询
        transports: ["polling", "websocket"],
    });

    io.on("connection", (socket) => {
        // 初始化每个连接所加入的设备房间集合
        socket.data.deviceUuids = new Set();

        // 仅允许通过 query.token/apptoken 加入
        const qToken = socket.handshake?.query?.token || socket.handshake?.query?.apptoken;
        if (qToken && typeof qToken === "string") {
            joinByToken(socket, qToken).catch(() => {
            });
        }

        // 客户端使用 KV token 加入房间
        socket.on("join-token", (payload) => {
            const token = payload?.token || payload?.apptoken;
            if (typeof token === "string" && token.length > 0) {
                joinByToken(socket, token).catch(() => {
                });
            }
        });

        // 客户端使用 token 离开房间
        socket.on("leave-token", async (payload) => {
            try {
                const token = payload?.token || payload?.apptoken;
                if (typeof token !== "string" || token.length === 0) return;
                const appInstall = await prisma.appInstall.findUnique({
                    where: { token },
                    include: { device: { select: { uuid: true } } },
                });
                const uuid = appInstall?.device?.uuid;
                if (uuid) {
                    leaveDeviceRoom(socket, uuid);
                    // 移除 token 连接跟踪
                    removeTokenConnection(token, socket.id);
                    if (socket.data.tokens) socket.data.tokens.delete(token);
                }
            } catch {
                // ignore
            }
        });

        // 离开所有已加入的设备房间
        socket.on("leave-all", () => {
            const uuids = Array.from(socket.data.deviceUuids || []);
            uuids.forEach((u) => leaveDeviceRoom(socket, u));
        });

        // 获取事件历史记录
        socket.on("get-event-history", (data) => {
            try {
                const { limit = 50, offset = 0 } = data || {};
                const uuids = Array.from(socket.data.deviceUuids || []);

                if (uuids.length === 0) {
                    socket.emit("event-history-error", { reason: "not_joined_any_device" });
                    return;
                }

                // 返回所有加入设备的事件历史
                const historyData = {};
                uuids.forEach((uuid) => {
                    historyData[uuid] = getEventHistory(uuid, limit, offset);
                });

                socket.emit("event-history", {
                    devices: historyData,
                    timestamp: new Date().toISOString(),
                    requestedBy: {
                        deviceType: socket.data.tokenInfo?.deviceType,
                        deviceName: socket.data.tokenInfo?.deviceName,
                        isReadOnly: socket.data.tokenInfo?.isReadOnly
                    }
                });

            } catch (err) {
                console.error("get-event-history error:", err);
                socket.emit("event-history-error", { reason: "internal_error" });
            }
        });

        // 通用事件转发：允许发送任意类型事件到其他设备
        socket.on("send-event", (data) => {
            try {
                // 验证数据结构
                if (!data || typeof data !== "object") {
                    socket.emit("event-error", { reason: "invalid_data_format" });
                    return;
                }

                const { type, content } = data;

                // 验证事件类型
                if (typeof type !== "string" || type.trim().length === 0) {
                    socket.emit("event-error", { reason: "invalid_event_type" });
                    return;
                }

                // 验证内容格式（必须是对象或null）
                if (content !== null && (typeof content !== "object" || Array.isArray(content))) {
                    socket.emit("event-error", { reason: "content_must_be_object_or_null" });
                    return;
                }

                // 获取当前socket所在的设备房间
                const uuids = Array.from(socket.data.deviceUuids || []);
                if (uuids.length === 0) {
                    socket.emit("event-error", { reason: "not_joined_any_device" });
                    return;
                }

                // 检查只读权限
                const tokenInfo = socket.data.tokenInfo;
                if (tokenInfo?.isReadOnly) {
                    socket.emit("event-error", { reason: "readonly_token_cannot_send_events" });
                    return;
                }

                // 限制序列化后内容大小，避免滥用
                const MAX_SIZE = 10240; // 10KB
                const serializedContent = JSON.stringify(content);
                if (serializedContent.length > MAX_SIZE) {
                    socket.emit("event-error", { reason: "content_too_large", maxSize: MAX_SIZE });
                    return;
                }

                const timestamp = new Date().toISOString();
                const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // 构建完整的事件载荷，包含发送者信息
                const eventPayload = {
                    eventId,
                    content,
                    timestamp,
                    senderId: socket.id,
                    senderInfo: {
                        appId: tokenInfo?.appId,
                        deviceType: tokenInfo?.deviceType,
                        deviceName: tokenInfo?.note,
                        isReadOnly: tokenInfo?.isReadOnly || false,
                        note: tokenInfo?.note
                    }
                };

                // 记录事件到历史记录（包含type用于历史记录）
                const historyPayload = {
                    ...eventPayload,
                    type: type.trim()
                };
                uuids.forEach((uuid) => {
                    recordEventHistory(uuid, historyPayload);
                });

                // 直接使用事件名称发送到所有相关设备房间（排除发送者所在的socket）
                uuids.forEach((uuid) => {
                    socket.to(uuid).emit(type.trim(), eventPayload);
                });

                // 发送确认回执给发送者
                socket.emit("event-sent", {
                    eventId: eventPayload.eventId,
                    eventName: type.trim(),
                    timestamp: eventPayload.timestamp,
                    targetDevices: uuids.length,
                    senderInfo: eventPayload.senderInfo
                });

            } catch (err) {
                console.error("send-event error:", err);
                socket.emit("event-error", { reason: "internal_error" });
            }
        });

        socket.on("disconnect", () => {
            const uuids = Array.from(socket.data.deviceUuids || []);
            uuids.forEach((u) => removeOnline(u, socket.id));

            // 清理 token 连接跟踪
            const tokens = Array.from(socket.data.tokens || []);
            tokens.forEach((token) => removeTokenConnection(token, socket.id));

            // 清理socket相关缓存
            if (socket.data.currentToken) {
                // 如果这是该token的最后一个连接,考虑清理缓存
                const tokenSet = onlineTokens.get(socket.data.currentToken);
                if (!tokenSet || tokenSet.size === 0) {
                    // 可以选择保留缓存一段时间,这里暂时保留
                    // tokenInfoCache.delete(socket.data.currentToken);
                }
            }
        });
    });

    return io;
}

/** 返回 Socket.IO 实例 */
export function getIO() {
    return io;
}

/**
 * 让 socket 加入设备房间并记录在线
 * @param {import('socket.io').Socket} socket
 * @param {string} uuid
 */
function joinDeviceRoom(socket, uuid) {
    socket.join(uuid);
    if (!socket.data.deviceUuids) socket.data.deviceUuids = new Set();
    socket.data.deviceUuids.add(uuid);
    // 记录在线
    const set = onlineMap.get(uuid) || new Set();
    set.add(socket.id);
    onlineMap.set(uuid, set);
    // 可选：通知加入
    io.to(uuid).emit("device-joined", { uuid, connections: set.size });
}

/**
 * 跟踪 token 连接用于指标统计
 * @param {import('socket.io').Socket} socket
 * @param {string} token
 */
function trackTokenConnection(socket, token) {
    if (!socket.data.tokens) socket.data.tokens = new Set();
    socket.data.tokens.add(token);

    // 记录 token 连接
    const set = onlineTokens.get(token) || new Set();
    set.add(socket.id);
    onlineTokens.set(token, set);

    // 更新在线设备数指标（基于不同的 token 数量）
    onlineDevicesGauge.set(onlineTokens.size);
}

/**
 * 让 socket 离开设备房间并更新在线表
 * @param {import('socket.io').Socket} socket
 * @param {string} uuid
 */
function leaveDeviceRoom(socket, uuid) {
    socket.leave(uuid);
    if (socket.data.deviceUuids) socket.data.deviceUuids.delete(uuid);
    removeOnline(uuid, socket.id);
}

function removeOnline(uuid, socketId) {
    const set = onlineMap.get(uuid);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) {
        onlineMap.delete(uuid);
    } else {
        onlineMap.set(uuid, set);
    }
}

/**
 * 移除 token 连接跟踪
 * @param {string} token
 * @param {string} socketId
 */
function removeTokenConnection(token, socketId) {
    const set = onlineTokens.get(token);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) {
        onlineTokens.delete(token);
    } else {
        onlineTokens.set(token, set);
    }
    // 更新在线设备数指标（基于不同的 token 数量）
    onlineDevicesGauge.set(onlineTokens.size);
}

/**
 * 广播某设备下 KV 键已变更
 * @param {string} uuid 设备 uuid
 * @param {object} payload { key, action: 'upsert'|'delete'|'batch', updatedAt?, created? }
 */
export function broadcastKeyChanged(uuid, payload) {
    if (!io || !uuid) return;

    // 发送KV变更事件
    const timestamp = new Date().toISOString();
    const eventId = `kv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const eventPayload = {
        eventId,
        content: payload,
        timestamp,
        senderId: "realtime",
        senderInfo: {
            appId: "5c2a54d553951a37b47066ead68c8642",
            deviceType: "server",
            deviceName: "realtime",
            isReadOnly: false,
            note: "Database realtime sync"
        }
    };

    // 记录到事件历史（包含type用于历史记录）
    const historyPayload = {
        ...eventPayload,
        type: "kv-key-changed"
    };
    recordEventHistory(uuid, historyPayload);

    // 直接发送kv-key-changed事件
    io.to(uuid).emit("kv-key-changed", eventPayload);
}

/**
 * 向指定设备广播自定义事件
 * @param {string} uuid 设备 uuid
 * @param {string} type 事件类型
 * @param {object|null} content 事件内容（JSON对象或null）
 * @param {string} [senderId] 发送者ID（可选）
 */
export function broadcastDeviceEvent(uuid, type, content = null, senderId = "system") {
    if (!io || !uuid || typeof type !== "string" || type.trim().length === 0) return;

    // 验证内容格式
    if (content !== null && (typeof content !== "object" || Array.isArray(content))) {
        console.warn("broadcastDeviceEvent: content must be object or null");
        return;
    }

    const timestamp = new Date().toISOString();
    const eventId = `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const eventPayload = {
        eventId,
        content,
        timestamp,
        senderId,
        senderInfo: {
            appId: "system",
            deviceType: "system",
            deviceName: "System",
            isReadOnly: false,
            note: "System broadcast"
        }
    };

    // 记录系统事件到历史（包含type用于历史记录）
    const historyPayload = {
        ...eventPayload,
        type: type.trim()
    };
    recordEventHistory(uuid, historyPayload);

    io.to(uuid).emit(type.trim(), eventPayload);
}

/**
 * 记录事件到历史记录
 * @param {string} uuid 设备UUID
 * @param {object} eventPayload 事件载荷
 */
function recordEventHistory(uuid, eventPayload) {
    if (!eventHistory.has(uuid)) {
        eventHistory.set(uuid, []);
    }

    const history = eventHistory.get(uuid);
    history.push({
        ...eventPayload,
        recordedAt: new Date().toISOString()
    });

    // 保持历史记录在限制范围内
    if (history.length > MAX_EVENT_HISTORY) {
        history.splice(0, history.length - MAX_EVENT_HISTORY);
    }
}

/**
 * 获取设备事件历史记录
 * @param {string} uuid 设备UUID
 * @param {number} [limit=50] 返回记录数量限制
 * @param {number} [offset=0] 偏移量
 * @returns {Array} 事件历史记录
 */
export function getEventHistory(uuid, limit = 50, offset = 0) {
    const history = eventHistory.get(uuid) || [];
    return history.slice(offset, offset + limit);
}

/**
 * 获取令牌信息
 * @param {string} token 令牌
 * @returns {object|null} 令牌信息
 */
export function getTokenInfo(token) {
    return tokenInfoCache.get(token) || null;
}

/**
 * 清理设备相关缓存
 * @param {string} uuid 设备UUID
 */
function cleanupDeviceCache(uuid) {
    // 清理事件历史
    eventHistory.delete(uuid);

    // 清理相关令牌缓存
    for (const [token, info] of tokenInfoCache.entries()) {
        if (info.deviceUuid === uuid) {
            tokenInfoCache.delete(token);
        }
    }
}

/**
 * 获取在线设备列表
 * @returns {Array<{token:string, connections:number}>}
 */
export function getOnlineDevices() {
    const list = [];
    for (const [token, set] of onlineTokens.entries()) {
        list.push({ token, connections: set.size });
    }
    // 默认按连接数降序
    return list.sort((a, b) => b.connections - a.connections);
}

export default {
    initSocket,
    getIO,
    broadcastKeyChanged,
    broadcastDeviceEvent,
    getOnlineDevices,
    getEventHistory,
    getTokenInfo,
};

/**
 * 通过 KV token 让 socket 加入对应设备的房间
 * @param {import('socket.io').Socket} socket
 * @param {string} token
 */
async function joinByToken(socket, token) {
    try {
        const appInstall = await prisma.appInstall.findUnique({
            where: { token },
            include: {
                device: {
                    select: {
                        uuid: true,
                        name: true
                    }
                }
            },
        });

        const uuid = appInstall?.device?.uuid;
        if (uuid && appInstall) {
            // 检测设备信息
            const userAgent = socket.handshake?.headers?.['user-agent'];
            const detectedDeviceName = detectDeviceName(userAgent, socket.handshake?.headers);

            // 拼接设备名称：检测到的设备信息 + token的note
            let finalDeviceName = detectedDeviceName;
            if (appInstall.note && appInstall.note.trim()) {
                finalDeviceName = `${detectedDeviceName} - ${appInstall.note.trim()}`;
            }

            // 缓存令牌信息，使用拼接后的设备名称
            const tokenInfo = {
                appId: appInstall.appId,
                isReadOnly: appInstall.isReadOnly,
                deviceType: appInstall.deviceType,
                note: appInstall.note,
                deviceUuid: uuid,
                deviceName: finalDeviceName, // 使用拼接后的设备名称
                detectedDevice: detectedDeviceName, // 保留检测到的设备信息
                originalNote: appInstall.note, // 保留原始备注
                installedAt: appInstall.installedAt
            };
            tokenInfoCache.set(token, tokenInfo);

            // 在socket上记录当前令牌信息
            socket.data.currentToken = token;
            socket.data.tokenInfo = tokenInfo;

            joinDeviceRoom(socket, uuid);
            // 跟踪 token 连接用于指标统计
            trackTokenConnection(socket, token);
            // 可选：回执
            socket.emit("joined", {
                by: "token",
                uuid,
                token,
                tokenInfo: {
                    isReadOnly: tokenInfo.isReadOnly,
                    deviceType: tokenInfo.deviceType,
                    deviceName: tokenInfo.deviceName,
                    userAgent: userAgent
                }
            });
        } else {
            socket.emit("join-error", { by: "token", reason: "invalid_token" });
        }
    } catch (error) {
        console.error("joinByToken error:", error);
        socket.emit("join-error", { by: "token", reason: "database_error" });
    }
}
