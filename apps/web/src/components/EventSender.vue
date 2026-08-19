<template>
  <div style="display: none">
    <!-- 这是一个无界面的功能组件，用于封装事件发送 -->
  </div>
</template>

<script>
import { sendEvent } from "@/utils/socketClient";

export default {
  name: "EventSender",
  emits: ["sent", "error"],
  methods: {
    /**
     * 发送事件
     * @param {string} eventName - 事件名称
     * @param {Object} content - 事件内容
     * @returns {Promise} 发送结果
     */
    async sendEvent(eventName, content = {}) {
      try {
        sendEvent(eventName, content);

        this.$emit("sent", {
          eventName,
          content,
          timestamp: new Date().toISOString(),
          success: true,
        });

        // 返回可能的 eventId 和 notificationId，方便调用者关联回执
        return {
          success: true,
          eventId: content?.eventId || null,
          notificationId: content?.notificationId || null
        };
      } catch (error) {
        console.error("发送事件失败:", error);

        this.$emit("error", {
          eventName,
          content,
          error: error.message,
          timestamp: new Date().toISOString(),
          success: false,
        });

        return { success: false, error: error.message };
      }
    },

    /**
     * 发送通知事件（简化接口）
     * @param {string} message - 通知内容
     * @param {boolean} isUrgent - 是否加急
     * @param {Array} targetDevices - 目标设备
     * @param {Object} senderInfo - 发送者信息
     * @param {string} notificationId - 32位通知ID（可选）
     */
    async sendNotification(
      message,
      isUrgent = false,
      targetDevices = [],
      senderInfo = {},
      notificationId = null
    ) {
      // 生成一个客户端事件 ID，便于在接收回执时进行映射
      const eventId = `evt-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      return this.sendEvent("notification", {
        eventId,
        notificationId,
        message,
        isUrgent,
        targetDevices,
        senderInfo,
      });
    },

    /**
     * 发送回执事件
     * @param {string} originalEventId - 原事件ID
     * @param {string} status - 回执状态 (displayed|read)
     * @param {Object} deviceInfo - 设备信息
     * @param {string} notificationId - 原通知ID（可选）
     */
    async sendReceipt(originalEventId, status, deviceInfo = {}, notificationId = null) {
      const eventId = `rcpt-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      return this.sendEvent("notification-receipt", {
        eventId,
        originalEventId,
        notificationId,
        status,
        deviceInfo,
      });
    },

    /**
     * 单独发送"已显示"回执事件
     * @param {Object} deviceInfo 设备信息
     * @param {string} notificationId 原通知ID
     */
    async sendDisplayedReceipt(deviceInfo = {}, notificationId = null) {
      const eventId = `disp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      return this.sendEvent("notification-displayed", {
        eventId,
        notificationId,
        deviceInfo,
      });
    },
    /**
     * 单独发送"已读"回执事件
     * @param {Object} deviceInfo 设备信息
     * @param {string} notificationId 原通知ID
     */
    async sendReadReceipt(deviceInfo = {}, notificationId = null) {
      const eventId = `read-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      return this.sendEvent("notification-read", {
        eventId,
        notificationId,
        deviceInfo,
      });
    },
  },
};
</script>
