<template>
  <v-dialog
    v-model="visible"
    max-width="800"
    persistent
    transition="dialog-transition"
    class="urgent-notification-dialog"
  >
    <v-card class="urgent-notification-card" :color="urgencyColor" elevation="24">
      <v-card-text>
        <div class="urgent-title mb-6">
          {{ currentNotification?.content?.message || '无内容' }}
        </div>
        <div class="urgent-subtitle mb-6">
          {{ senderName }} {{ deviceType }} {{ formatTime(currentNotification?.timestamp) }}
        </div>

        <!-- 多通知导航 -->
        <div v-if="hasMultipleNotifications" class="navigation-controls mt-6">
          <v-card variant="flat" color="rgba(255,255,255,0.1)">
            <v-card-text class="text-center">
              <div class="notification-counter mb-3">
                <v-chip color="white" variant="flat" size="small">
                  {{ notificationCountText }}
                </v-chip>
              </div>
              <div class="navigation-buttons">
                <v-btn
                  :disabled="currentIndex === 0"
                  color="white"
                  variant="outlined"
                  size="small"
                  @click="previousNotification"
                >
                  <v-icon> mdi-chevron-left </v-icon>
                  上一个
                </v-btn>
                <v-btn
                  :disabled="currentIndex === notificationQueue.length - 1"
                  color="white"
                  variant="outlined"
                  size="small"
                  class="ml-2"
                  @click="nextNotification"
                >
                  下一个
                  <v-icon> mdi-chevron-right </v-icon>
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>

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
import EventSender from '@/components/EventSender.vue'
import { getSetting } from '@/utils/settings.js'
import { playSound, stopSound } from '@/utils/soundList.js'

export default {
  name: 'UrgentNotification',
  components: {
    EventSender,
  },
  data() {
    return {
      visible: false,
      notificationQueue: [], // 通知队列
      currentIndex: 0, // 当前显示的通知索引
      autoCloseTimer: null,
      urgentSoundTimer: null,
      currentAudio: null, // 当前播放的音频对象
    }
  },
  computed: {
    // 当前显示的通知
    currentNotification() {
      return this.notificationQueue[this.currentIndex] || null
    },
    // 队列中是否有通知
    hasNotifications() {
      return this.notificationQueue.length > 0
    },
    // 是否有多个通知
    hasMultipleNotifications() {
      return this.notificationQueue.length > 1
    },
    // 通知计数文本
    notificationCountText() {
      if (!this.hasMultipleNotifications) return ''
      return `${this.currentIndex + 1} / ${this.notificationQueue.length}`
    },
    isUrgent() {
      return this.currentNotification?.content?.isUrgent || false
    },
    urgencyColor() {
      return this.isUrgent ? 'red darken-2' : 'blue darken-2'
    },
    iconColor() {
      return 'white'
    },
    urgencyIcon() {
      return this.isUrgent ? 'mdi-alert-circle-outline' : 'mdi-information-outline'
    },
    urgencyTitle() {
      return this.isUrgent ? '🚨 紧急通知' : '📢 通知消息'
    },
    senderName() {
      const senderInfo =
        this.currentNotification?.senderInfo || this.currentNotification?.content?.senderInfo
      if (!senderInfo) return '未知发送者'

      return senderInfo.deviceName || senderInfo.deviceType || '未知设备'
    },
    deviceType() {
      const senderInfo =
        this.currentNotification?.senderInfo || this.currentNotification?.content?.senderInfo
      if (senderInfo?.deviceType == 'teacher') return '教师'
      if (senderInfo?.deviceType == 'student') return '学生'
      if (senderInfo?.deviceType == 'classroom') return '教室'
      return senderInfo?.deviceType || '未知类型'
    },
    targetDevices() {
      return this.currentNotification?.content?.targetDevices || []
    },
  },
  beforeUnmount() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer)
    }
    if (this.urgentSoundTimer) {
      clearInterval(this.urgentSoundTimer)
    }
    // 停止音频播放
    this.stopNotificationSound()
  },
  methods: {
    show(notificationData) {
      // 检查是否已存在相同的通知（避免重复）
      const existingIndex = this.notificationQueue.findIndex(
        (n) => n.content?.notificationId === notificationData.content?.notificationId,
      )

      if (existingIndex !== -1) {
        console.log('通知已存在，跳过添加')
        return
      }

      // 添加到队列
      this.notificationQueue.push(notificationData)

      // 如果当前没有显示通知，显示第一个
      if (!this.visible) {
        this.currentIndex = this.notificationQueue.length - 1 // 显示最新的通知
        this.visible = true
        this.sendDisplayedReceipt()
        this.playNotificationSound()

        // 发送浏览器通知
        this.sendBrowserNotification(notificationData)

        // 如果是加急通知，启动定时音效
        if (this.isUrgent) {
          this.startUrgentSound()
        }
      } else {
        // 如果已经有通知在显示，新通知是紧急的话优先显示
        if (notificationData.content?.isUrgent && !this.isUrgent) {
          this.currentIndex = this.notificationQueue.length - 1
          this.sendDisplayedReceipt()
          this.playNotificationSound()
          this.sendBrowserNotification(notificationData)
          this.startUrgentSound()
        } else {
          // 即使不立即显示，也发送浏览器通知
          this.sendBrowserNotification(notificationData)
        }
      }
    },
    close() {
      // 只在用户主动关闭时发送已读回执
      try {
        this.sendReadReceipt()
        console.log('已发送已读回执')
      } catch (error) {
        console.warn('发送已读回执失败:', error)
      }

      // 显示已读消息提示，便于设备端重新查看
      if (this.currentNotification?.content?.message) {
        const notificationType = this.isUrgent ? '紧急通知' : '通知'
        if (this.isUrgent) {
          this.$message?.error(notificationType, `${this.currentNotification.content.message}`)
        } else {
          this.$message?.info(notificationType, `${this.currentNotification.content.message}`)
        }
      }

      // 从队列中移除当前通知
      if (this.notificationQueue.length > 0) {
        this.notificationQueue.splice(this.currentIndex, 1)

        // 调整当前索引
        if (this.currentIndex >= this.notificationQueue.length) {
          this.currentIndex = Math.max(0, this.notificationQueue.length - 1)
        }

        // 如果还有通知，显示下一个；否则关闭
        if (this.notificationQueue.length > 0) {
          this.sendDisplayedReceipt()
          // 如果新的当前通知是紧急的，启动音效
          if (this.isUrgent) {
            this.startUrgentSound()
          } else {
            this.stopUrgentSound()
          }
        } else {
          this.closeWithoutRead()
        }
      }
    },
    // 关闭通知但不发送已读回执（用于程序异常或强制关闭）
    closeWithoutRead() {
      // 立即关闭弹框
      this.visible = false
      this.notificationQueue = []
      this.currentIndex = 0

      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer)
        this.autoCloseTimer = null
      }

      this.stopUrgentSound()
    },
    formatTime(timestamp) {
      if (!timestamp) return ''

      try {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now - date

        // 如果是今天
        if (diff < 24 * 60 * 60 * 1000) {
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          return `${hours}:${minutes}`
        } else {
          // 如果不是今天，显示日期
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${month}/${day}`
        }
      } catch {
        return '无效时间'
      }
    },
    getDeviceTypeLabel(deviceType) {
      const labels = {
        classroom: '教室设备',
        student: '学生设备',
        teacher: '教师设备',
        admin: '管理员设备',
        system: '系统设备',
      }
      return labels[deviceType] || deviceType
    },
    playNotificationSound() {
      try {
        // 停止之前的音频
        this.stopNotificationSound()

        // 根据通知类型选择铃声
        const soundFile = this.isUrgent
          ? getSetting('notification.urgentSound')
          : getSetting('notification.singleSound')

        // 使用配置的铃声文件
        this.currentAudio = playSound(soundFile, false)

        if (!this.currentAudio) {
          // 如果播放失败，使用备用蜂鸣音
          this.playFallbackSound()
        }
      } catch (error) {
        console.warn('无法播放通知音效:', error)
        this.playFallbackSound()
      }
    },
    // 备用蜂鸣音（原有的实现）
    playFallbackSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // 统一的音效配置
        oscillator.frequency.value = 1000 // 1kHz
        oscillator.type = 'sine'
        gainNode.gain.value = 0.3

        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.3) // 300ms
      } catch (error) {
        console.warn('无法播放备用音效:', error)
      }
    },
    // 停止通知音效
    stopNotificationSound() {
      if (this.currentAudio) {
        stopSound(this.currentAudio)
        this.currentAudio = null
      }
    },
    // 发送显示回执
    sendDisplayedReceipt() {
      try {
        if (this.$refs.eventSender && this.currentNotification?.eventId) {
          this.$refs.eventSender.sendDisplayedReceipt(
            {},
            this.currentNotification.content.notificationId,
          )
          console.log('已发送显示回执:', this.currentNotification.eventId)
        }
      } catch (error) {
        console.warn('发送显示回执失败:', error)
      }
    },
    // 发送已读回执
    sendReadReceipt() {
      try {
        if (this.$refs.eventSender && this.currentNotification?.eventId) {
          this.$refs.eventSender.sendReadReceipt(
            {},
            this.currentNotification.content.notificationId,
          )
          console.log('已发送已读回执:', this.currentNotification.eventId)
        }
      } catch (error) {
        console.warn('发送已读回执失败:', error)
      }
    },
    // 导航到上一个通知
    previousNotification() {
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.sendDisplayedReceipt()

        // 根据新通知的紧急程度调整音效
        if (this.isUrgent) {
          this.startUrgentSound()
        } else {
          this.stopUrgentSound()
        }
      }
    },
    // 导航到下一个通知
    nextNotification() {
      if (this.currentIndex < this.notificationQueue.length - 1) {
        this.currentIndex++
        this.sendDisplayedReceipt()

        // 根据新通知的紧急程度调整音效
        if (this.isUrgent) {
          this.startUrgentSound()
        } else {
          this.stopUrgentSound()
        }
      }
    },
    // 启动加急通知的定时音效
    startUrgentSound() {
      this.stopUrgentSound() // 先清除之前的定时器

      // 停止之前的音频
      this.stopNotificationSound()

      // 播放循环铃声
      const soundFile = getSetting('notification.urgentSound')
      this.currentAudio = playSound(soundFile, true) // 循环播放

      if (!this.currentAudio) {
        // 如果播放失败，使用备用方案：每秒播放一次提示音
        this.urgentSoundTimer = setInterval(() => {
          if (this.visible && this.isUrgent) {
            this.playFallbackSound()
          } else {
            this.stopUrgentSound()
          }
        }, 1000)
      }
    },
    // 停止加急音效
    stopUrgentSound() {
      if (this.urgentSoundTimer) {
        clearInterval(this.urgentSoundTimer)
        this.urgentSoundTimer = null
      }
      this.stopNotificationSound()
    },
    // 发送浏览器通知
    async sendBrowserNotification(notificationData) {
      // 检查浏览器是否支持通知API
      if (!('Notification' in window)) {
        console.warn('浏览器不支持通知API')
        return
      }

      // 请求通知权限
      try {
        let permission = Notification.permission

        if (permission === 'default') {
          permission = await Notification.requestPermission()
        }

        if (permission !== 'granted') {
          console.warn('用户未授予通知权限')
          return
        }

        // 构建通知内容
        const message = notificationData.content?.message || '新通知'
        const senderInfo = notificationData.senderInfo || notificationData.content?.senderInfo
        const senderName = senderInfo?.deviceName || senderInfo?.deviceType || '未知发送者'
        const isUrgent = notificationData.content?.isUrgent || false

        // 创建浏览器通知
        const notification = new Notification(isUrgent ? '🚨 紧急通知' : '📢 通知消息', {
          body: `${message}\n\n来自: ${senderName}`,
          icon: '/pwa/image/icon-192.png', // 使用应用图标
          badge: '/pwa/image/icon-192.png',
          tag: notificationData.content?.notificationId || `notification-${Date.now()}`,
          requireInteraction: isUrgent, // 紧急通知需要用户交互
          silent: false, // 使用系统默认声音
          vibrate: isUrgent ? [200, 100, 200, 100, 200] : [200], // 震动模式
          timestamp: notificationData.timestamp || Date.now(),
        })

        // 点击通知时聚焦到窗口
        notification.onclick = () => {
          window.focus()
          notification.close()
        }

        // 自动关闭非紧急通知
        if (!isUrgent) {
          setTimeout(() => {
            notification.close()
          }, 10000) // 10秒后自动关闭
        }
      } catch (error) {
        console.error('发送浏览器通知失败:', error)
      }
    },
  },
}
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
  animation:
    urgentPulse 2s infinite,
    slideIn 0.5s ease-out;
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

.urgent-subtitle {
  font-size: 2rem;
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

.navigation-controls {
  backdrop-filter: blur(10px);
}

.notification-counter {
  color: white;
  font-weight: 600;
}

.navigation-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
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
