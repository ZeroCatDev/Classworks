/**
 * 设备事件处理工具
 * 提供新旧事件格式之间的转换和标准化处理
 */

import { sendEvent } from '@/utils/socketClient'

/**
 * 设备事件类型常量
 */
export const DeviceEventTypes = {
  CHAT: 'chat',
  KV_KEY_CHANGED: 'kv-key-changed',
  URGENT_NOTICE: 'urgent-notice',
  NOTIFICATION: 'notification'
}

/**
 * 实时同步发送者信息
 */
export const RealtimeSenderInfo = {
  appId: "5c2a54d553951a37b47066ead68c8642",
  deviceType: "server",
  deviceName: "realtime",
  isReadOnly: false,
  note: "Database realtime sync"
}

/**
 * 发送聊天消息
 * @param {string} text - 消息文本
 */
export function sendChatMessage(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('消息文本不能为空')
  }

  sendEvent(DeviceEventTypes.CHAT, {
    text: text.trim()
  })
}

/**
 * 发送紧急通知
 * @param {string} urgency - 紧急程度 (info|warning|error|critical)
 * @param {string} message - 通知内容
 * @param {Array} targetDevices - 目标设备类型数组
 * @param {Object} senderInfo - 发送者信息
 */
export function sendUrgentNotice(urgency, message, targetDevices, senderInfo) {
  if (!message || typeof message !== 'string') {
    throw new Error('通知内容不能为空')
  }

  if (!Array.isArray(targetDevices) || targetDevices.length === 0) {
    throw new Error('目标设备类型不能为空')
  }

  const validUrgencies = ['info', 'warning', 'error', 'critical']
  if (!validUrgencies.includes(urgency)) {
    throw new Error('无效的紧急程度')
  }

  sendEvent(DeviceEventTypes.URGENT_NOTICE, {
    urgency,
    message: message.trim(),
    targetDevices,
    senderInfo
  })
}

/**
 * 创建直接聊天事件处理器
 * @param {Function} handler - 聊天事件处理函数
 * @returns {Function} 包装后的处理函数
 */
export function createChatEventHandler(handler) {
  return (eventData) => {
    if (!eventData || !handler) return

    try {
      // 新格式：直接聊天事件数据
      if (eventData.content && eventData.content.text) {
        const chatMsg = {
          text: eventData.content.text,
          senderId: eventData.senderId,
          at: eventData.timestamp,
          uuid: eventData.senderId,
          senderInfo: eventData.senderInfo
        }
        handler(chatMsg, eventData)
      }
    } catch (error) {
      console.error('处理聊天事件失败:', error)
    }
  }
}

/**
 * 处理设备事件，提供统一的事件处理接口
 * @param {Object} eventData - 设备事件数据
 * @param {Object} handlers - 事件处理器映射
 */
export function handleDeviceEvent(eventData, handlers = {}) {
  if (!eventData || !eventData.type) {
    console.warn('无效的设备事件数据:', eventData)
    return
  }

  const handler = handlers[eventData.type]
  if (typeof handler === 'function') {
    try {
      handler(eventData)
    } catch (error) {
      console.error(`处理设备事件 ${eventData.type} 时出错:`, error)
    }
  }
}

/**
 * 转换聊天事件为旧格式消息
 * @param {Object} eventData - 设备事件数据
 * @returns {Object} 旧格式的聊天消息
 */
export function convertChatEventToLegacy(eventData) {
  if (eventData.type !== DeviceEventTypes.CHAT) {
    throw new Error('不是聊天事件')
  }

  return {
    text: eventData.content?.text || '',
    senderId: eventData.senderId,
    at: eventData.timestamp,
    uuid: eventData.uuid,
    senderInfo: eventData.senderInfo
  }
}

/**
 * 转换 KV 变化事件为旧格式
 * @param {Object} eventData - 设备事件数据
 * @returns {Object} 旧格式的 KV 变化数据
 */
export function convertKvEventToLegacy(eventData) {
  if (eventData.type !== DeviceEventTypes.KV_KEY_CHANGED) {
    throw new Error('不是 KV 变化事件')
  }

  return {
    uuid: eventData.uuid,
    key: eventData.content?.key,
    action: eventData.content?.action,
    created: eventData.content?.created,
    updatedAt: eventData.content?.updatedAt,
    deletedAt: eventData.content?.deletedAt,
    batch: eventData.content?.batch
  }
}

/**
 * 转换紧急通知事件为旧格式
 * @param {Object} eventData - 设备事件数据
 * @returns {Object} 旧格式的紧急通知数据
 */
export function convertUrgentNoticeEventToLegacy(eventData) {
  if (eventData.type !== DeviceEventTypes.URGENT_NOTICE) {
    throw new Error('不是紧急通知事件')
  }

  return {
    urgency: eventData.content?.urgency || 'info',
    message: eventData.content?.message || '',
    targetDevices: eventData.content?.targetDevices || [],
    senderId: eventData.senderId,
    senderInfo: eventData.content?.senderInfo || eventData.senderInfo,
    timestamp: eventData.timestamp
  }
}

/**
 * 转换通知事件为旧格式
 * @param {Object} eventData - 设备事件数据
 * @returns {Object} 旧格式的通知数据
 */
export function convertNotificationEventToLegacy(eventData) {
  if (eventData.type !== DeviceEventTypes.NOTIFICATION) {
    throw new Error('不是通知事件')
  }

  return {
    message: eventData.content?.message || '',
    isUrgent: eventData.content?.isUrgent || false,
    targetDevices: eventData.content?.targetDevices || [],
    senderId: eventData.senderId,
    senderInfo: eventData.content?.senderInfo || eventData.senderInfo,
    timestamp: eventData.timestamp,
    eventId: eventData.eventId
  }
}

/**
 * 判断是否为实时同步事件
 * @param {Object} eventData - 设备事件数据
 * @returns {boolean} 是否为实时同步事件
 */
export function isRealtimeEvent(eventData) {
  return eventData?.senderInfo?.appId === RealtimeSenderInfo.appId &&
         eventData?.senderInfo?.deviceName === RealtimeSenderInfo.deviceName
}

/**
 * 格式化设备信息显示
 * @param {Object} senderInfo - 发送者信息
 * @returns {string} 格式化后的设备信息
 */
export function formatDeviceInfo(senderInfo) {
  if (!senderInfo) return '未知设备'

  if (senderInfo.deviceName === 'realtime') {
    return '实时同步'
  }

  return `${senderInfo.deviceName || '未知设备'} (${senderInfo.deviceType || '未知类型'})`
}

/**
 * 创建标准化的事件处理器
 * @param {Object} options - 配置选项
 * @returns {Function} 事件处理函数
 */
export function createDeviceEventHandler(options = {}) {
  const {
    onChat,
    onKvChanged,
    onUrgentNotice,
    onNotification,
    onOtherEvent,
    enableLegacySupport = true
  } = options

  return (eventData) => {
    handleDeviceEvent(eventData, {
      [DeviceEventTypes.CHAT]: (data) => {
        if (onChat) {
          const chatMsg = enableLegacySupport ?
            convertChatEventToLegacy(data) : data
          onChat(chatMsg, data)
        }
      },
      [DeviceEventTypes.KV_KEY_CHANGED]: (data) => {
        if (onKvChanged) {
          const kvMsg = enableLegacySupport ?
            convertKvEventToLegacy(data) : data
          onKvChanged(kvMsg, data)
        }
      },
      [DeviceEventTypes.URGENT_NOTICE]: (data) => {
        if (onUrgentNotice) {
          const urgentMsg = enableLegacySupport ?
            convertUrgentNoticeEventToLegacy(data) : data
          onUrgentNotice(urgentMsg, data)
        }
      },
      [DeviceEventTypes.NOTIFICATION]: (data) => {
        if (onNotification) {
          const notificationMsg = enableLegacySupport ?
            convertNotificationEventToLegacy(data) : data
          onNotification(notificationMsg, data)
        }
      }
    })

    // 处理其他类型的事件
    if (onOtherEvent &&
        eventData.type !== DeviceEventTypes.CHAT &&
        eventData.type !== DeviceEventTypes.KV_KEY_CHANGED &&
        eventData.type !== DeviceEventTypes.URGENT_NOTICE &&
        eventData.type !== DeviceEventTypes.NOTIFICATION) {
      onOtherEvent(eventData)
    }
  }
}

/**
 * 创建直接 KV 事件处理器（新格式）
 * @param {Function} handler - KV 事件处理函数
 * @returns {Function} 包装后的处理函数
 */
export function createKvEventHandler(handler) {
  return (eventData) => {
    if (!eventData || !handler) return

    try {
      // 新格式直接传递事件数据
      if (eventData.content) {
        // 转换为旧格式兼容
        const legacyData = {
          uuid: eventData.senderId || 'realtime',
          key: eventData.content.key,
          action: eventData.content.action,
          created: eventData.content.created,
          updatedAt: eventData.content.updatedAt || eventData.timestamp,
          deletedAt: eventData.content.deletedAt,
          batch: eventData.content.batch
        }
        handler(legacyData)
      } else {
        // 旧格式直接传递
        handler(eventData)
      }
    } catch (error) {
      console.error('处理 KV 事件失败:', error)
    }
  }
}

export default {
  DeviceEventTypes,
  RealtimeSenderInfo,
  sendChatMessage,
  handleDeviceEvent,
  convertChatEventToLegacy,
  convertKvEventToLegacy,
  isRealtimeEvent,
  formatDeviceInfo,
  createDeviceEventHandler
}
