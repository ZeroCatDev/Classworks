<template>
  <v-dialog
    v-model="visible"
    max-width="800"
    persistent
    transition="dialog-transition"
    class="urgent-notification-dialog"
  >
    <v-card
      class="urgent-notification-card"
      :color="urgencyColor"
      elevation="24"
    >
      <v-card-text>
        <div class="urgent-title mb-6">
          {{ notification?.content?.message || "无内容" }}
        </div>

        <!-- 发送者信息（使用 Vuetify Card） -->
        <v-card variant="flat" color="white">
          <v-card-title>发送者信息</v-card-title>
          <v-card-text>
            <v-chip
              class="mr-2 mb-2"
              color="primary"
              variant="outlined"
              size="small"
            >
              <v-icon left size="16"> mdi-account </v-icon>
              {{ senderName }}
            </v-chip>
            <v-chip
              class="mr-2 mb-2"
              color="info"
              variant="outlined"
              size="small"
            >
              <v-icon left size="16"> mdi-devices </v-icon>
              {{ deviceType }}
            </v-chip>
            <v-chip
              class="mb-2"
              color="success"
              variant="outlined"
              size="small"
            >
              <v-icon left size="16"> mdi-clock </v-icon>
              {{ formatTime(notification?.timestamp) }}
            </v-chip>
          </v-card-text>
        </v-card>

        <!-- 操作按钮 -->
        <div class="mt-8">
          <v-btn color="white" size="large" variant="flat" @click="close">
            <v-icon left> mdi-check </v-icon>
            我知道了
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- 事件发送器 -->
  <EventSender ref="eventSender" />
</template>

<script>
import EventSender from "@/components/EventSender.vue";

export default {
  name: "UrgentNotification",
  components: {
    EventSender,
  },
  data() {
    return {
      visible: false,
      notification: null,
      autoCloseTimer: null,
      urgentSoundTimer: null,
    };
  },
  computed: {
    isUrgent() {
      return this.notification?.content?.isUrgent || false;
    },
    urgencyColor() {
      return this.isUrgent ? "red darken-2" : "blue darken-2";
    },
    iconColor() {
      return "white";
    },
    urgencyIcon() {
      return this.isUrgent
        ? "mdi-alert-circle-outline"
        : "mdi-information-outline";
    },
    urgencyTitle() {
      return this.isUrgent ? "🚨 紧急通知" : "📢 通知消息";
    },
    senderName() {
      const senderInfo =
        this.notification?.senderInfo || this.notification?.content?.senderInfo;
      if (!senderInfo) return "未知发送者";

      return senderInfo.deviceName || senderInfo.deviceType || "未知设备";
    },
    deviceType() {
      const senderInfo =
        this.notification?.senderInfo || this.notification?.content?.senderInfo;
      return senderInfo?.deviceType || "未知类型";
    },
    targetDevices() {
      return this.notification?.content?.targetDevices || [];
    },
  },
  beforeUnmount() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
    if (this.urgentSoundTimer) {
      clearInterval(this.urgentSoundTimer);
    }
  },
  methods: {
    show(notificationData) {
      this.notification = notificationData;
      this.visible = true;

      // 发送显示回执
      this.sendDisplayedReceipt();

      // 清除之前的自动关闭定时器
      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer);
      }

      // 播放统一的提示音
      this.playNotificationSound();

      // 如果是加急通知，启动定时音效
      if (this.isUrgent) {
        this.startUrgentSound();
      }
    },
    close() {
      // 只在用户主动关闭时发送已读回执
      try {
        this.sendReadReceipt();
        console.log("已发送已读回执");
      } catch (error) {
        console.warn("发送已读回执失败:", error);
      }

      this.closeWithoutRead();
    },
    // 关闭通知但不发送已读回执（用于程序异常或强制关闭）
    closeWithoutRead() {
      // 立即关闭弹框
      this.visible = false;
      this.notification = null;

      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer);
        this.autoCloseTimer = null;
      }

      // 停止加急音效定时器
      if (this.urgentSoundTimer) {
        clearInterval(this.urgentSoundTimer);
        this.urgentSoundTimer = null;
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return "";

      try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // 如果是今天
        if (diff < 24 * 60 * 60 * 1000) {
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${hours}:${minutes}`;
        } else {
          // 如果不是今天，显示日期
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${month}/${day}`;
        }
      } catch {
        return "无效时间";
      }
    },
    getDeviceTypeLabel(deviceType) {
      const labels = {
        classroom: "教室设备",
        student: "学生设备",
        teacher: "教师设备",
        admin: "管理员设备",
        system: "系统设备",
      };
      return labels[deviceType] || deviceType;
    },
    playNotificationSound() {
      try {
        // 统一的通知音效
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 统一的音效配置
        oscillator.frequency.value = 1000; // 1kHz
        oscillator.type = "sine";
        gainNode.gain.value = 0.3;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3); // 300ms
      } catch (error) {
        console.warn("无法播放通知音效:", error);
      }
    },
    // 发送显示回执
    sendDisplayedReceipt() {
      try {
        if (this.$refs.eventSender && this.notification?.eventId) {
          this.$refs.eventSender.sendDisplayedReceipt(
            {},
            this.notification.content.notificationId
          );
          console.log("已发送显示回执:", this.notification.eventId);
        }
      } catch (error) {
        console.warn("发送显示回执失败:", error);
      }
    },
    // 发送已读回执
    sendReadReceipt() {
      try {
        if (this.$refs.eventSender && this.notification?.eventId) {
          this.$refs.eventSender.sendReadReceipt(
            {},
            this.notification.content.notificationId
          );
          console.log("已发送已读回执:", this.notification.eventId);
        }
      } catch (error) {
        console.warn("发送已读回执失败:", error);
      }
    },
    // 启动加急通知的定时音效
    startUrgentSound() {
      // 清除之前的定时器
      if (this.urgentSoundTimer) {
        clearInterval(this.urgentSoundTimer);
      }

      // 每秒播放一次提示音
      this.urgentSoundTimer = setInterval(() => {
        if (this.visible && this.isUrgent) {
          this.playNotificationSound();
        } else {
          // 如果弹框已关闭或不再是加急状态，停止音效
          clearInterval(this.urgentSoundTimer);
          this.urgentSoundTimer = null;
        }
      }, 1000);
    },
  },
};
</script>

<style scoped>
/* Dialog 容器样式 */
:deep(.v-dialog) {
  backdrop-filter: blur(8px);
}

:deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.8) !important;
}

.urgent-notification-card {
  position: relative;
  animation: urgentPulse 2s infinite, slideIn 0.5s ease-out;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
}

.urgency-icon {
  animation: iconPulse 1.5s infinite;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
}

.urgent-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  line-height: 1.2;
}

.notification-content {
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.6;
  padding: 0 20px;
}

.sender-label,
.target-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.sender-details,
.target-devices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* 动画效果 */
@keyframes urgentPulse {
  0%,
  100% {
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 50px rgba(255, 255, 255, 0.6);
  }
}

@keyframes iconPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 600px) {
  .urgent-title {
    font-size: 2rem;
  }

  .notification-content {
    font-size: 1.2rem;
    padding: 0 10px;
  }

  .urgent-notification-card {
    width: 95% !important;
    margin: 20px;
  }
}
</style>
