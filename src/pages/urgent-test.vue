<template>
  <div class="urgent-test-page">
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2">
                mdi-alert-octagon
              </v-icon>
              紧急通知测试页面
            </v-card-title>

            <v-card-text>
              <v-form>
                <v-row>
                  <v-col
                    cols="12"
                    md="6"
                  >
                    <v-switch
                      v-model="notificationForm.isUrgent"
                      label="加急通知"
                      color="red"
                      inset
                    >
                      <template #prepend>
                        <v-icon :color="notificationForm.isUrgent ? 'red' : 'grey'">
                          {{ notificationForm.isUrgent ? 'mdi-alert-circle' : 'mdi-information' }}
                        </v-icon>
                      </template>
                    </v-switch>
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="notificationForm.message"
                      label="通知内容"
                      outlined
                      rows="3"
                      placeholder="请输入紧急通知的内容..."
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>

            <v-card-actions class="px-6 pb-6">
              <v-btn
                :color="notificationForm.isUrgent ? 'red' : 'blue'"
                :disabled="!notificationForm.message.trim()"
                :loading="sending"
                size="large"
                variant="elevated"
                @click="sendNotification"
              >
                <v-icon left>
                  {{ notificationForm.isUrgent ? 'mdi-alert-circle' : 'mdi-information' }}
                </v-icon>
                {{ notificationForm.isUrgent ? '发送紧急通知' : '发送通知' }}
              </v-btn>

              <v-spacer />

              <v-btn
                color="grey"
                variant="outlined"
                @click="resetForm"
              >
                重置表单
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- 消息发送历史 -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2">
                mdi-history
              </v-icon>
              消息记录
              <v-spacer />
            </v-card-title>
            <v-card-text>
              <div
                v-if="sentMessages.length === 0"
                class="text-center text-grey py-8"
              >
                <v-icon
                  size="64"
                  color="grey-lighten-2"
                >
                  mdi-message-outline
                </v-icon>
                <div class="mt-2">
                  暂无发送记录
                </div>
              </div>
              <v-row v-else>
                <v-col
                  v-for="message in sentMessages.slice().reverse()"
                  :key="message.id"
                  cols="12"
                  md="6"
                  lg="4"
                >
                  <!-- 主消息卡片 -->
                  <v-card
                    :color="getMainCardColor(message.receipts)"
                    class="mb-2"
                  >
                    <v-card-text>
                      <div class="d-flex align-center mb-2">
                        <span class="font-weight-medium">
                          {{ message.isUrgent ? '紧急通知' : '普通通知' }}
                        </span>
                        <v-spacer />
                        <span class="text-caption font-weight-medium">
                          {{ getReceiptStatus(message.receipts) }}
                        </span>
                      </div>

                      <div
                        class="text-body-2 mb-3"
                        style="max-height: 60px; overflow: hidden;"
                      >
                        {{ message.message }}
                      </div>

                      <div class="text-caption">
                        <div>发送时间：{{ formatTime(message.timestamp) }}</div>
                        <div>事件ID：{{ message.id }}</div>
                        <div>通知ID：{{ message.notificationId }}</div>
                      </div>
                    </v-card-text>
                  </v-card>

                  <!-- 设备回执小卡片 -->
                  <div v-if="hasAnyReceipts(message.receipts)">
                    <!-- 已读设备 -->
                    <v-card
                      v-for="device in message.receipts.read"
                      :key="`${device.senderId}-read`"
                      color="success"
                      class="mb-1"
                      size="small"
                    >
                      <v-card-text class="pa-2">
                        <div class="align-center">

                          <span class="text-body-2 font-weight-medium">{{ device.deviceName }}  </span>
  <br/>

                          {{ device.deviceType }}

                        </div>
                        <div class="text-caption mt-1">
                          已读于 {{ formatDeviceTime(device.timestamp) }}
                        </div>

                      </v-card-text>
                    </v-card>

                    <!-- 已显示设备（排除已读的设备） -->
                    <v-card
                      v-for="device in getDisplayedOnlyDevices(message.receipts)"
                      :key="`${device.senderId}-displayed`"
                      color="info-lighten-4"
                      variant="outlined"
                      class="mb-1"
                      size="small"
                    >
                      <v-card-text class="pa-2">
                        <div class="align-center">

                          <span class="text-body-2 font-weight-medium">{{ device.deviceName }}</span>
                          <v-spacer />
                          <span class="text-caption text-grey">
                            {{ device.deviceType }}
                          </span>
                        </div>
                        <div class="text-caption text-grey mt-1">
                          已显示于 {{ formatDeviceTime(device.timestamp) }}
                        </div>
                      </v-card-text>
                    </v-card>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <ChatWidget />
    <EventSender ref="eventSender" />
  </div>
</template>

<script>
import ChatWidget from '@/components/ChatWidget.vue'
import EventSender from '@/components/EventSender.vue'
import { on as socketOn } from '@/utils/socketClient'

export default {
  name: 'UrgentNotificationTest',
  components: {
    ChatWidget,
    EventSender
  },
  data() {
    return {
      sending: false,
      notificationForm: {
        isUrgent: false,
        message: ''
      },
      sentMessages: [],
      receiptCleanup: []
    }
  },
  mounted() {
    this.setupEventListeners()
  },
  beforeUnmount() {
    this.cleanup()
  },
  methods: {
    generateNotificationId() {
      // 生成32位随机字符串
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let result = ''
      for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    },

    async sendNotification() {
      if (!this.notificationForm.message.trim()) return

      this.sending = true
      try {
        // 生成32位随机通知ID
        const notificationId = this.generateNotificationId()

        const result = await this.$refs.eventSender.sendNotification(
          this.notificationForm.message,
          this.notificationForm.isUrgent,
          [],
          { deviceName: '测试设备', deviceType: 'system', isReadOnly: false },
          notificationId
        )

        const eventId = result?.eventId || `msg-${Date.now()}`

        this.sentMessages.push({
          id: eventId,
          notificationId: notificationId,
          message: this.notificationForm.message,
          isUrgent: this.notificationForm.isUrgent,
          timestamp: new Date().toISOString(),
          receipts: {
            displayed: [],
            read: []
          }
        })

        console.log('通知已发送，事件ID:', eventId, '通知ID:', notificationId)
        this.resetForm()
      } catch (error) {
        console.error('发送通知失败:', error)
      } finally {
        this.sending = false
      }
    },

    resetForm() {
      this.notificationForm = {
        isUrgent: false,
        message: ''
      }
    },

    setupEventListeners() {
      // 监听显示回执
      const cleanup1 = socketOn('notification-displayed', (data) => {
        console.log('收到显示回执:', data)
        this.updateReceipt(data, 'displayed')
      })

      // 监听已读回执
      const cleanup2 = socketOn('notification-read', (data) => {
        console.log('收到已读回执:', data)
        this.updateReceipt(data, 'read')
      })

      this.receiptCleanup.push(cleanup1, cleanup2)
    },

    updateReceipt(data, type) {
      const originalEventId = data.originalEventId
      const notificationId = data.notificationId || data.content?.notificationId

      if (!originalEventId && !notificationId) return

      const message = this.sentMessages.find(msg =>
        msg.id === originalEventId ||
        msg.notificationId === notificationId
      )
      if (message) {
        // 使用 senderInfo 中的设备信息，并包含 senderId
        const deviceInfo = {
          senderId: data.senderId || 'unknown-sender',
          deviceName: data.senderInfo?.deviceName || data.deviceInfo?.deviceName || '未知设备',
          deviceType: data.senderInfo?.deviceType || data.deviceInfo?.deviceType || 'unknown',
          timestamp: new Date().toISOString()
        }

        // 避免重复添加相同设备（按 senderId 判断）
        const exists = message.receipts[type].find(item =>
          item.senderId === deviceInfo.senderId
        )

        if (!exists) {
          message.receipts[type].push(deviceInfo)
          console.log(`更新${type}回执:`, message.id, deviceInfo)
        }
      }
    },

    cleanup() {
      this.receiptCleanup.forEach(cleanup => cleanup())
      this.receiptCleanup = []
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleString('zh-CN')
    },

    getReceiptStatus(receipts) {
      if (receipts.read.length > 0) return '已读'
      if (receipts.displayed.length > 0) return '已显示'
      return '已发送'
    },

    getReceiptColor(receipts) {
      if (receipts.read.length > 0) return 'success'
      if (receipts.displayed.length > 0) return 'info'
      return 'grey'
    },

    formatDeviceTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('zh-CN')
    },

    getMainCardColor(receipts) {
      // 优先显示已读状态（绿色），其次是已显示状态（蓝色）
      if (receipts.read.length > 0) return 'success'
      if (receipts.displayed.length > 0) return 'info'
      return 'grey'
    },

    hasAnyReceipts(receipts) {
      return receipts.read.length > 0 || receipts.displayed.length > 0
    },

    getDisplayedOnlyDevices(receipts) {
      // 返回只显示未读的设备（按 senderId 排除已读的设备）
      const readSenderIds = receipts.read.map(device => device.senderId)
      return receipts.displayed.filter(device =>
        !readSenderIds.includes(device.senderId)
      )
    }
  }
}
</script>

<style scoped>
.gap-1 {
  gap: 4px;
}

.message-history-card .v-chip {
  margin: 1px;
}
</style>
