<template>
  <v-dialog
    v-model="dialog"
    fullscreen
    transition="dialog-bottom-transition"
    scrollable
  >
    <v-card>
      <v-toolbar
        dark
        flat
      >
        <v-toolbar-title>
          <v-icon class="mr-2">
            mdi-chat
          </v-icon>
          发送通知
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          @click="close"
        />
      </v-toolbar>

      <v-card-text class="pa-0">
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-card>


                <v-card-text>
                  <v-form>
                    <v-row>
                      <v-col
                        cols="12"
                        md="6"
                      >
                        <v-switch
                          v-model="notificationForm.isUrgent"
                          label="强调通知"
                          color="red"
                          inset
                        >
                        </v-switch>
                        <v-checkbox
                          v-model="notificationForm.isPersistent"
                          label="常驻展示"
                          color="primary"
                          hide-details
                          class="mt-0"
                        ></v-checkbox>
                      </v-col>
                      <v-col cols="12">
                        <v-textarea
                          v-model="notificationForm.message"
                          label="通知内容"
                          outlined
                          rows="3"
                          placeholder="请输入强调通知的内容..."
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
                    {{ notificationForm.isUrgent ? '发送强调通知' : '发送通知' }}
                  </v-btn>

                  <v-spacer />


                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>

          <v-row class="mt-4">
            <v-col cols="12">
              <v-card>
                <v-card-title>
                  <v-icon class="mr-2">mdi-pin</v-icon>
                  常驻通知管理
                </v-card-title>
                <v-card-text>
                  <div v-if="persistentNotifications.length === 0" class="text-center text-grey py-4">
                    暂无常驻通知
                  </div>
                  <v-list v-else>
                    <v-list-item
                      v-for="item in persistentNotifications"
                      :key="item.id"
                      :title="item.message"
                      :subtitle="formatTime(item.timestamp)"
                      lines="two"
                    >
                      <template v-slot:prepend>
                        <v-icon :color="item.isUrgent ? 'error' : 'primary'">
                          {{ item.isUrgent ? 'mdi-alert-circle' : 'mdi-information' }}
                        </v-icon>
                      </template>
                      <template v-slot:append>
                        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditDialog(item)"></v-btn>
                        <v-btn icon="mdi-delete" variant="text" color="error" size="small" @click="deletePersistentNotification(item.id)"></v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

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
                      <v-card
                        :color="getMainCardColor(message.receipts)"
                        class="mb-2"
                      >
                        <v-card-text>
                          <div class="d-flex align-center mb-2">
                            <span class="font-weight-medium">
                              {{ message.isUrgent ? '强调通知' : '通知' }}
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

                      <div v-if="hasAnyReceipts(message.receipts)">
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
                                {{ device.deviceType=="classroom"?"教室设备上的应用":device.deviceType }}
                              </span>
                            </div>
                            <div class="text-caption text-grey mt-1">
                              已显示于 {{ formatDeviceTime(device.timestamp) }}
                            </div>
                          </v-card-text>
                        </v-card>

                      </div>
                      <div v-else> <v-card

                        color="info-lighten-4"
                        variant="outlined"
                        class="mb-1"
                        size="small"
                        title="无设备在线"
                      >
                        <v-card-text>
                          如果数秒后任然显示这个提示，则可能没有任何设备在线接收通知。
                        </v-card-text>
                      </v-card></div>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>

    <ChatWidget />
    <EventSender ref="eventSender" />

    <v-dialog v-model="editDialog" max-width="500" :fullscreen="$vuetify.display.xs">
      <v-card>
        <v-toolbar flat density="compact">
          <v-toolbar-title>编辑常驻通知</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="editDialog = false"></v-btn>
        </v-toolbar>
        <v-card-text>
          <v-form>
            <v-textarea
              v-model="editForm.message"
              label="通知内容"
              rows="3"
              auto-grow
            ></v-textarea>
            <v-switch
              v-model="editForm.isUrgent"
              label="强调通知"
              color="error"
              hide-details
            ></v-switch>
            <v-checkbox
              v-model="editForm.resend"
              label="保存并重新发送通知"
              hint="勾选后将作为新通知发送给所有在线设备"
              persistent-hint
            ></v-checkbox>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="editDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="savingEdit" @click="saveEdit">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteConfirmDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">确认删除</v-card-title>
        <v-card-text>
          确定要删除这条常驻通知吗？此操作无法撤销。<br/>
          <span class="text-error font-weight-bold">注意：此操作将从所有在线设备上立即撤回该消息。</span>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="deleteConfirmDialog = false">取消</v-btn>
          <v-btn color="error" variant="text" @click="executeDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
import ChatWidget from '@/components/ChatWidget.vue'
import EventSender from '@/components/EventSender.vue'
import { on as socketOn } from '@/utils/socketClient'
import dataProvider from '@/utils/dataProvider'

export default {
  name: 'UrgentTestDialog',
  components: {
    ChatWidget,
    EventSender
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      sending: false,
      notificationForm: {
        isUrgent: false,
        message: '',
        isPersistent: false
      },
      sentMessages: [],
      receiptCleanup: [],
      persistentNotifications: [],
      editDialog: false,
      editForm: {
        id: null,
        message: '',
        isUrgent: false,
        resend: false
      },
      savingEdit: false,
      deleteConfirmDialog: false,
      itemToDelete: null,
    }
  },
  computed: {
    dialog: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    }
  },
  mounted() {
    this.setupEventListeners()
    this.loadPersistentNotifications()
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
        const messageContent = this.notificationForm.message
        const isUrgent = this.notificationForm.isUrgent
        const isPersistent = this.notificationForm.isPersistent

        const result = await this.$refs.eventSender.sendNotification(
          messageContent,
          isUrgent,
          [],
          { deviceName: '测试设备', deviceType: 'system', isReadOnly: false },
          notificationId
        )

        const eventId = result?.eventId || `msg-${Date.now()}`

        this.sentMessages.push({
          id: eventId,
          notificationId: notificationId,
          message: messageContent,
          isUrgent: isUrgent,
          timestamp: new Date().toISOString(),
          receipts: {
            displayed: [],
            read: []
          }
        })

        // 处理常驻通知
        if (isPersistent) {
          try {
            const listKey = 'notification-list'
            const existingData = await dataProvider.loadData(listKey)
            let list = []
            if (existingData && Array.isArray(existingData)) {
              list = existingData
            } else if (existingData && existingData.success !== false && Array.isArray(existingData.data)) {
              // list = existingData.data
              list = existingData.data
            }

            const newNotification = {
              id: notificationId,
              message: messageContent,
              isUrgent: isUrgent,
              timestamp: new Date().toISOString()
            }

            list.unshift(newNotification)
            await dataProvider.saveData(listKey, list)
            // 更新本地列表
            this.persistentNotifications = list
            console.log('常驻通知已保存')
          } catch (e) {
            console.error('保存常驻通知失败', e)
          }
        }

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
        message: '',
        isPersistent: false
      }
    },

    close() {
      this.dialog = false
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
    },

    openEditDialog(notification) {
      this.editForm = {
        id: notification.id,
        message: notification.message,
        isUrgent: notification.isUrgent || false,
        resend: false,
        timestamp: notification.timestamp
      }
      this.editDialog = true
    },

    async saveEdit() {
      if (!this.editForm.message.trim()) return

      this.savingEdit = true
      try {
        // 更新列表
        const index = this.persistentNotifications.findIndex(n => n.id === this.editForm.id)
        if (index !== -1) {
          this.persistentNotifications[index] = {
            ...this.persistentNotifications[index],
            message: this.editForm.message,
            isUrgent: this.editForm.isUrgent,
            // 如果重新发送，更新时间戳？或者保持原样？通常编辑后更新时间戳比较合理
            timestamp: new Date().toISOString()
          }

          await dataProvider.saveData('notification-list', this.persistentNotifications)

          // 如果需要重新发送
          if (this.editForm.resend) {
            const notificationId = this.editForm.id
            const messageContent = this.editForm.message
            const isUrgent = this.editForm.isUrgent

            const result = await this.$refs.eventSender.sendNotification(
              messageContent,
              isUrgent,
              [],
              { deviceName: '测试设备', deviceType: 'system', isReadOnly: false },
              notificationId
            )

            const eventId = result?.eventId || `msg-${Date.now()}`

            // 添加到发送记录
            this.sentMessages.push({
              id: eventId,
              notificationId: notificationId,
              message: messageContent,
              isUrgent: isUrgent,
              timestamp: new Date().toISOString(),
              receipts: {
                displayed: [],
                read: []
              }
            })
          }

          this.editDialog = false
          this.$message?.success('已更新')
        }
      } catch (e) {
        console.error('保存失败', e)
        this.$message?.error('保存失败')
      } finally {
        this.savingEdit = false
      }
    },

    async loadPersistentNotifications() {
      try {
        const res = await dataProvider.loadData('notification-list')
        if (res && Array.isArray(res)) {
          this.persistentNotifications = res
        } else if (res && res.success !== false && Array.isArray(res.data)) {
          this.persistentNotifications = res.data
        } else {
          this.persistentNotifications = []
        }
      } catch (e) {
        console.error('加载常驻通知失败', e)
      }
    },

    async deleteNotification(notificationId) {
      const confirmed = confirm('确定要删除这个通知吗？')
      if (!confirmed) return

      try {
        // 从 sentMessages 中删除
        this.sentMessages = this.sentMessages.filter(msg => msg.id !== notificationId)

        // 从常驻通知列表中删除
        this.persistentNotifications = this.persistentNotifications.filter(notif => notif.id !== notificationId)

        // TODO: 调用接口删除通知（如果有的话）

        console.log('通知已删除，通知ID:', notificationId)
      } catch (error) {
        console.error('删除通知失败:', error)
      }
    },

    deletePersistentNotification(id) {
      this.itemToDelete = id
      this.deleteConfirmDialog = true
    },

    async executeDelete() {
      if (!this.itemToDelete) return

      const id = this.itemToDelete
      this.deleteConfirmDialog = false
      this.itemToDelete = null

      try {
        // 1. 从本地/数据库列表中删除
        this.persistentNotifications = this.persistentNotifications.filter(n => n.id !== id)
        await dataProvider.saveData('notification-list', this.persistentNotifications)

        // 2. [新增] 发送撤回指令给所有设备
        if (this.$refs.eventSender) {
          await this.$refs.eventSender.sendEvent('notification-revoke', {
            notificationId: id,
            timestamp: new Date().toISOString()
          });
          console.log(`已发送撤回指令: ${id}`);
        }

        this.$message?.success('已删除并撤回通知')
      } catch (e) {
        console.error('删除失败', e)
        this.$message?.error('删除失败')
      }
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
