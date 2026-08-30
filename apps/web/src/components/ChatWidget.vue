<template>
  <!-- Floating toggle button -->
  <div v-if="showToggleButton" :style="toggleStyle" class="chat-toggle">
    <v-btn color="primary" icon variant="flat" @click="open()">
      <v-badge
        :content="unreadCount || undefined"
        :model-value="unreadCount > 0"
        color="error"
        overlap
      >
        <v-icon> mdi-chat </v-icon>
      </v-badge>
    </v-btn>
  </div>

  <!-- Chat panel -->
  <div v-show="visible" :style="panelStyle" class="chat-panel">
    <v-card border class="chat-card" elevation="8">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2"> mdi-chat-processing </v-icon>
        <span class="text-subtitle-1">{{ modeTitle }}</span>
        <v-spacer />
        <!-- 模式切换按钮 -->
        <v-btn-toggle v-model="currentMode" class="mr-2" mandatory size="small" variant="outlined">
          <v-btn value="chat" size="small">
            <v-icon>mdi-chat</v-icon>
          </v-btn>
          <v-btn value="events" size="small">
            <v-icon>mdi-format-list-bulleted</v-icon>
          </v-btn>
        </v-btn-toggle>
        <v-tooltip location="top">
          <template #activator="{ props }">
            <v-chip
              :color="connected ? 'success' : 'grey'"
              size="x-small"
              v-bind="props"
              variant="tonal"
            >
              {{ connected ? '已连接' : '未连接' }}
            </v-chip>
          </template>
          <span>Socket {{ socketId || '-' }}</span>
        </v-tooltip>
        <v-btn icon variant="text" @click="close()">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="chat-body">
        <!-- 聊天模式 -->
        <div v-if="currentMode === 'chat'" ref="listRef" class="messages">
          <template v-for="msg in decoratedMessages" :key="msg._id">
            <div v-if="msg._type === 'divider'" class="divider-row">
              <v-divider class="my-2" />
              <div class="divider-text">今天 - 上次访问</div>
              <v-divider class="my-2" />
            </div>
            <div v-else :class="{ self: msg.self }" class="message-row">
              <div class="avatar">
                <v-avatar :color="msg.self ? 'primary' : 'grey'" size="24">
                  <v-icon size="small">
                    {{ msg.self ? 'mdi-account' : 'mdi-account-outline' }}
                  </v-icon>
                </v-avatar>
              </div>
              <div class="bubble">
                <div v-if="!msg.self && msg.deviceName" class="sender-name">
                  {{ msg.deviceName }}
                </div>
                <div class="text">
                  {{ msg.text }}
                </div>
                <div class="meta">
                  <span v-if="msg.self && msg.deviceName" class="device-name">
                    {{ msg.deviceName }} •
                  </span>
                  {{ formatTime(msg.at) }}
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 事件模式 -->
        <div v-else class="events-container">
          <!-- 事件统计 -->
          <div class="event-stats mb-3">
            <v-row dense>
              <v-col cols="4">
                <v-card color="success" dark size="small">
                  <v-card-text class="text-center pa-2">
                    <div class="text-h6">
                      {{ eventStats.chat }}
                    </div>
                    <div class="text-caption">聊天</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="4">
                <v-card color="info" dark size="small">
                  <v-card-text class="text-center pa-2">
                    <div class="text-h6">
                      {{ eventStats.kvChanged }}
                    </div>
                    <div class="text-caption">KV变化</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="4">
                <v-card color="warning" dark size="small">
                  <v-card-text class="text-center pa-2">
                    <div class="text-h6">
                      {{ eventStats.other }}
                    </div>
                    <div class="text-caption">其他</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- 事件列表 -->
          <div class="events-list">
            <div v-for="event in paginatedEvents" :key="event._id" class="event-item mb-2">
              <v-card :color="getEventColor(event.type)" size="small" variant="outlined">
                <v-card-text class="pa-2">
                  <div class="d-flex align-center mb-1">
                    <v-chip :color="getEventColor(event.type)" size="x-small">
                      {{ getEventTypeLabel(event.type) }}
                    </v-chip>
                    <v-spacer />
                    <span class="text-caption">{{ formatTime(event.timestamp || event.at) }}</span>
                  </div>

                  <div v-if="event.senderInfo" class="mb-1 text-caption">
                    <strong>发送者:</strong> {{ formatDeviceInfo(event.senderInfo) }}
                  </div>

                  <div class="event-content">
                    <template v-if="event.type === 'chat' || event.type === 'chat:message'">
                      <div class="chat-content">
                        {{ event.content?.text || event.text }}
                      </div>
                    </template>
                    <template v-else>
                      <pre class="text-caption event-data">{{
                        JSON.stringify(event.content || event, null, 1)
                      }}</pre>
                    </template>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <div v-if="allEvents.length === 0" class="text-center text-grey pa-4">暂无事件</div>
          </div>

          <!-- 分页控件 -->
          <div v-if="totalPages > 1" class="pagination mt-2">
            <v-pagination
              v-model="currentPage"
              :length="totalPages"
              :total-visible="3"
              size="small"
            />
          </div>
        </div>
      </v-card-text>

      <v-divider v-if="currentMode === 'chat'" />

      <v-card-actions v-if="currentMode === 'chat'" class="chat-input">
        <v-btn class="mr-1" icon variant="text" @click="insertEmoji('😄')">
          <v-icon>mdi-emoticon-outline</v-icon>
        </v-btn>
        <v-textarea
          ref="inputRef"
          v-model="text"
          auto-grow
          class="flex-grow-1"
          hide-details
          placeholder="输入消息"
          rows="1"
          variant="solo"
          @keydown.enter.prevent="handleEnter"
          @keydown.shift.enter.stop
        />
        <v-btn :disabled="!canSend" class="ml-2" color="primary" @click="send">
          <v-icon start> mdi-send </v-icon>
          发送
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>

  <!-- 紧急通知组件 -->
  <UrgentNotification ref="urgentNotification" />
</template>

<script>
import { getSetting } from '@/utils/settings'
import { getSocket, joinToken, on as socketOn } from '@/utils/socketClient'
import { sendChatMessage, createDeviceEventHandler, formatDeviceInfo } from '@/utils/deviceEvents'
import UrgentNotification from '@/components/UrgentNotification.vue'

export default {
  name: 'ChatWidget',
  components: {
    UrgentNotification,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    showButton: {
      type: Boolean,
      default: true,
    },
    offset: {
      type: Number,
      default: 16,
    },
    width: {
      type: Number,
      default: 380,
    },
    height: {
      type: Number,
      default: 520,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      visible: this.modelValue,
      text: '',
      messages: [], // 聊天消息
      allEvents: [], // 所有事件
      lastVisit: null,
      unreadCount: 0,
      connected: false,
      socketId: '',
      // 分页和显示模式
      currentMode: 'chat', // 'chat' 或 'events'
      currentPage: 1,
      itemsPerPage: 20,
      loading: false,
      // 组件状态
      isDestroying: false,
      // 事件统计
      eventStats: {
        chat: 0,
        kvChanged: 0,
        other: 0,
      },
      // 事件监听器清理函数
      cleanupFunctions: [],
    }
  },
  computed: {
    panelStyle() {
      return {
        right: this.offset + 'px',
        bottom: this.offset + 'px',
        width: this.width + 'px',
        height: this.height + 'px',
      }
    },
    toggleStyle() {
      return {
        right: this.offset + 'px',
        bottom: this.offset + 'px',
      }
    },
    canSend() {
      const token = getSetting('server.kvToken')
      return !!(token && this.text.trim())
    },
    showToggleButton() {
      return this.$props.showButton && !this.visible
    },
    decoratedMessages() {
      // Insert divider between lastVisit and now
      if (!this.lastVisit) return this.messages
      const idx = this.messages.findIndex(
        (m) => m.at && new Date(m.at).getTime() >= new Date(this.lastVisit).getTime(),
      )
      if (idx <= 0) return this.messages
      const before = this.messages.slice(0, idx)
      const after = this.messages.slice(idx)
      return [...before, { _id: 'divider', _type: 'divider' }, ...after]
    },
    // 当前显示的内容（根据模式）
    currentDisplayItems() {
      if (this.currentMode === 'chat') {
        return this.decoratedMessages
      } else {
        return this.paginatedEvents
      }
    },
    // 分页后的事件
    paginatedEvents() {
      if (this.isDestroying || !this.allEvents) return []
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.allEvents.slice(start, end)
    },
    // 总页数
    totalPages() {
      if (this.isDestroying || !this.allEvents) return 1
      return Math.ceil(this.allEvents.length / this.itemsPerPage)
    },
    // 模式标签
    modeTitle() {
      return this.currentMode === 'chat' ? '设备聊天室' : '所有事件'
    },
  },
  watch: {
    modelValue(val) {
      this.visible = val
      if (val) {
        this.onOpen()
      }
    },
  },
  mounted() {
    try {
      const stored = localStorage.getItem('chat.lastVisit')
      if (stored) this.lastVisit = stored
    } catch (e) {
      void e
    }

    // Prepare socket
    const s = getSocket()
    this.connected = !!s.connected
    this.socketId = s.id || ''

    s.on('connect', () => {
      this.connected = true
      this.socketId = s.id || ''
    })
    s.on('disconnect', () => {
      this.connected = false
    })

    // Auto join by token if exists
    const token = getSetting('server.kvToken')
    if (token) joinToken(token)

    // 创建安全的事件处理器
    const createSafeHandler = (handler) => {
      return (...args) => {
        if (this.isDestroying) return
        try {
          handler(...args)
        } catch (error) {
          console.error('ChatWidget 事件处理错误:', error)
        }
      }
    }

    // Listen chat messages (旧接口兼容)
    const offMessage = socketOn(
      'chat:message',
      createSafeHandler((msg) => {
        this.pushMessage(msg)
        this.addEvent({
          _id: `legacy-chat-${Date.now()}-${Math.random()}`,
          type: 'chat:message',
          content: msg,
          timestamp: msg.at || new Date().toISOString(),
          senderId: msg.senderId,
          uuid: msg.uuid,
          senderInfo: msg.senderInfo,
        })
      }),
    )

    // Listen direct chat events (新的直接聊天事件)
    const offDirectChat = socketOn(
      'chat',
      createSafeHandler((eventData) => {
        if (eventData && eventData.content && eventData.content.text) {
          // 处理新格式的直接聊天事件
          const chatMsg = {
            text: eventData.content.text,
            senderId: eventData.senderId,
            at: eventData.timestamp,
            uuid: eventData.senderId, // 使用 senderId 作为 uuid
            senderInfo: eventData.senderInfo,
          }

          this.pushMessage(chatMsg)
          this.addEvent({
            _id: eventData.eventId || `chat-${Date.now()}-${Math.random()}`,
            type: 'chat',
            content: eventData.content,
            timestamp: eventData.timestamp,
            eventId: eventData.eventId,
            senderId: eventData.senderId,
            senderInfo: eventData.senderInfo,
          })
        }
      }),
    )

    // Listen device events (通用事件接口 - 保留兼容)
    this.deviceEventHandler = createDeviceEventHandler({
      onChat: createSafeHandler((chatMsg, originalEvent) => {
        this.pushMessage(chatMsg)
        this.addEvent(originalEvent)
      }),
      onKvChanged: createSafeHandler((kvMsg, originalEvent) => {
        this.addEvent(originalEvent)
      }),
      onUrgentNotice: createSafeHandler((urgentData, originalEvent) => {
        // 添加到事件列表
        this.addEvent(originalEvent)
        // 立即显示紧急通知弹窗
        this.showUrgentNotification(originalEvent)
      }),
      onNotification: createSafeHandler((notificationData, originalEvent) => {
        console.log('收到通知事件:', notificationData, originalEvent)
        // 添加到事件列表
        this.addEvent(originalEvent)
        // 立即显示通知弹窗
        this.showUrgentNotification(originalEvent)
      }),
      onOtherEvent: createSafeHandler((eventData) => {
        // 检查是否是通知相关事件
        if (eventData.type === 'urgent-notice' || eventData.type === 'notification') {
          this.showUrgentNotification(eventData)
        }
        this.addEvent(eventData)
      }),
      enableLegacySupport: true,
    })
    const offDeviceEvent = socketOn('device-event', this.deviceEventHandler)

    // 监听 KV 变化事件（支持新旧格式）
    const offKvChanged = socketOn(
      'kv-key-changed',
      createSafeHandler((eventData) => {
        // 新格式：直接事件数据
        if (eventData.content && eventData.timestamp) {
          this.addEvent({
            _id: `kv-${Date.now()}-${Math.random()}`,
            type: 'kv-key-changed',
            content: eventData.content,
            timestamp: eventData.timestamp,
            eventId: eventData.eventId,
            senderId: eventData.senderId,
            senderInfo: eventData.senderInfo,
          })
        } else {
          // 旧格式：兼容处理
          this.addEvent({
            _id: `legacy-kv-${Date.now()}-${Math.random()}`,
            type: 'kv-key-changed',
            content: eventData,
            timestamp: eventData.updatedAt || new Date().toISOString(),
            uuid: eventData.uuid,
          })
        }
      }),
    )

    // 监听紧急通知事件
    const offUrgentNotice = socketOn(
      'urgent-notice',
      createSafeHandler((notificationData) => {
        console.log('收到紧急通知:', notificationData)

        // 添加到事件列表
        this.addEvent({
          _id: `urgent-${Date.now()}-${Math.random()}`,
          type: 'urgent-notice',
          content: notificationData.content || notificationData,
          timestamp: notificationData.timestamp || new Date().toISOString(),
          eventId: notificationData.eventId,
          senderId: notificationData.senderId,
          senderInfo: notificationData.senderInfo,
        })

        // 立即显示紧急通知弹窗
        this.showUrgentNotification(notificationData)
      }),
    )

    // 监听通知事件
    const offNotification = socketOn(
      'notification',
      createSafeHandler((notificationData) => {
        console.log('收到通知事件:', notificationData)

        // 添加到事件列表
        this.addEvent({
          _id: `notification-${Date.now()}-${Math.random()}`,
          type: 'notification',
          content: notificationData.content || notificationData,
          timestamp: notificationData.timestamp || new Date().toISOString(),
          eventId: notificationData.eventId,
          senderId: notificationData.senderId,
          senderInfo: notificationData.senderInfo || notificationData.content?.senderInfo,
        })

        // 立即显示通知弹窗
        this.showUrgentNotification(notificationData)
      }),
    ) // 保存清理函数
    this.cleanupFunctions = [
      offMessage,
      offDirectChat,
      offUrgentNotice,
      offNotification,
      offDeviceEvent,
      offKvChanged,
    ] // If initially visible, run open logic
    if (this.visible) this.onOpen()
  },
  beforeUnmount() {
    // 设置销毁状态
    this.isDestroying = true

    // 清理所有事件监听器
    if (this.cleanupFunctions && Array.isArray(this.cleanupFunctions)) {
      this.cleanupFunctions.forEach((cleanup) => {
        try {
          if (typeof cleanup === 'function') {
            cleanup()
          }
        } catch (error) {
          console.warn('ChatWidget 清理函数执行失败:', error)
        }
      })
    }

    // 兼容旧的清理方式
    try {
      if (this.offMessage) this.offMessage()
      if (this.offDeviceEvent) this.offDeviceEvent()
      if (this.offKvChanged) this.offKvChanged()
    } catch (error) {
      console.warn('ChatWidget 旧清理函数执行失败:', error)
    }

    // 清空数据
    this.cleanupFunctions = []
    this.messages = []
    this.allEvents = []
  },
  methods: {
    open() {
      this.visible = true
      this.$emit('update:modelValue', true)
      this.onOpen()
    },
    close() {
      this.visible = false
      this.$emit('update:modelValue', false)
      try {
        localStorage.setItem('chat.lastVisit', new Date().toISOString())
      } catch (e) {
        void e
      }
      this.unreadCount = 0
    },
    onOpen() {
      // Scroll to bottom on open
      this.$nextTick(() => this.scrollToBottom())
    },
    insertEmoji(ch) {
      this.text += ch
      this.$nextTick(() => {
        if (this.$refs.inputRef?.$el?.querySelector) {
          const ta = this.$refs.inputRef.$el.querySelector('textarea')
          ta?.focus()
        }
      })
    },
    handleEnter(e) {
      if (e.shiftKey) return
      this.send()
    },
    send() {
      const val = this.text.trim()
      if (!val) return

      // 立即添加自己的消息到本地显示
      const selfMsg = {
        _id: `self-${Date.now()}-${Math.random()}`,
        text: val,
        at: new Date().toISOString(),
        senderId: this.socketId,
        self: true,
        senderInfo: {
          deviceName: '我',
          deviceType: 'client',
          isReadOnly: false,
        },
      }
      this.pushMessage(selfMsg)

      // 添加到事件列表
      this.addEvent({
        _id: `self-event-${Date.now()}-${Math.random()}`,
        type: 'chat',
        content: { text: val },
        timestamp: new Date().toISOString(),
        senderId: this.socketId,
        senderInfo: {
          deviceName: '本设备',
          deviceType: 'client',
          isReadOnly: false,
        },
      })

      // 发送到服务器
      sendChatMessage(val)
      this.text = ''
    },
    pushMessage(msg) {
      if (this.isDestroying || !msg) return

      try {
        const entry = {
          _id: `${msg.at || Date.now()}-${Math.random()}`,
          text: typeof msg?.text === 'string' ? msg.text : msg?.text || '',
          at: msg.at || new Date().toISOString(),
          senderId: msg.senderId,
          self: !!(msg.senderId && msg.senderId === this.socketId),
          senderInfo: msg.senderInfo || null, // 保存发送者信息
          deviceName: this.getDeviceName(msg.senderInfo, msg.senderId === this.socketId),
        }
        // ignore empty
        if (!entry.text) return

        this.messages.push(entry)
        // unread when hidden
        if (!this.visible) this.unreadCount++

        // 安全的 nextTick 调用
        this.$nextTick(() => {
          if (!this.isDestroying) {
            this.scrollToBottom()
          }
        })

        // trim
        if (this.messages.length > 500) this.messages.shift()
      } catch (error) {
        console.error('ChatWidget pushMessage 错误:', error)
      }
    },
    formatTime(iso) {
      try {
        const d = new Date(iso)
        const hh = String(d.getHours()).padStart(2, '0')
        const mm = String(d.getMinutes()).padStart(2, '0')
        return `${hh}:${mm}`
      } catch (e) {
        void e
        return ''
      }
    },
    scrollToBottom() {
      if (this.isDestroying) return

      try {
        const el = this.$refs.listRef
        if (!el) return

        // 使用 requestAnimationFrame 确保 DOM 更新完成
        requestAnimationFrame(() => {
          if (!this.isDestroying && el) {
            el.scrollTop = el.scrollHeight
          }
        })
      } catch (error) {
        console.warn('ChatWidget scrollToBottom 错误:', error)
      }
    },
    // 添加事件到列表
    addEvent(eventData) {
      if (this.isDestroying || !eventData) return

      try {
        this.allEvents.unshift(eventData)

        // 更新统计
        if (eventData.type === 'chat' || eventData.type === 'chat:message') {
          this.eventStats.chat++
        } else if (eventData.type === 'kv-key-changed') {
          this.eventStats.kvChanged++
        } else {
          this.eventStats.other++
        }

        // 限制事件数量
        if (this.allEvents.length > 200) {
          this.allEvents = this.allEvents.slice(0, 200)
        }
      } catch (error) {
        console.error('ChatWidget addEvent 错误:', error)
      }
    },
    // 获取事件颜色
    getEventColor(eventType) {
      switch (eventType) {
        case 'chat':
        case 'chat:message':
          return 'success'
        case 'kv-key-changed':
          return 'info'
        default:
          return 'warning'
      }
    },
    // 获取事件类型标签
    getEventTypeLabel(eventType) {
      switch (eventType) {
        case 'chat':
        case 'chat:message':
          return '聊天'
        case 'kv-key-changed':
          return 'KV变化'
        default:
          return eventType
      }
    },
    // 格式化设备信息 - 暴露导入的函数给模板使用
    formatDeviceInfo(senderInfo) {
      return formatDeviceInfo(senderInfo)
    },
    // 获取设备名称用于显示
    getDeviceName(senderInfo, isSelf = false) {
      if (isSelf) {
        return '我'
      }

      if (!senderInfo) {
        return '未知设备'
      }

      // 实时同步事件
      if (senderInfo.deviceName === 'realtime') {
        return '系统'
      }

      // 使用设备名称或设备类型
      return senderInfo.deviceName || senderInfo.deviceType || '未知设备'
    },
    // 显示紧急通知
    showUrgentNotification(notificationData) {
      try {
        if (this.$refs.urgentNotification) {
          this.$refs.urgentNotification.show(notificationData)
        } else {
          console.warn('紧急通知组件未找到')
        }
      } catch (error) {
        console.error('显示紧急通知失败:', error)
      }
    },
  },
}
</script>

<style scoped>
.chat-toggle {
  position: fixed;
  z-index: 1100;
}

.chat-panel {
  position: fixed;
  z-index: 1101;
}

.chat-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-body {
  padding: 8px 12px;
  height: calc(100% - 120px);
}

.messages {
  height: 100%;
  overflow: auto;
}

.message-row {
  display: flex;
  align-items: flex-end;
  margin: 8px 0;
}

.message-row.self {
  flex-direction: row-reverse;
}

.message-row .avatar {
  width: 28px;
  display: flex;
  justify-content: center;
}

.message-row .bubble {
  max-width: 70%;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 6px 10px;
  margin: 0 8px;
}

.message-row.self .bubble {
  background: rgba(33, 150, 243, 0.15);
}

.bubble .text {
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble .meta {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 2px;
  text-align: right;
}

.bubble .sender-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2px;
  font-weight: 500;
}

.message-row.self .bubble .sender-name {
  color: rgba(33, 150, 243, 0.8);
}

.device-name {
  font-weight: 500;
  opacity: 0.8;
}

.divider-row {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.divider-text {
  margin: 4px 0;
}

.chat-input {
  padding: 8px;
}

/* 事件相关样式 */
.events-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.events-list {
  flex-grow: 1;
  overflow-y: auto;
  max-height: calc(100% - 120px);
}

.event-item {
  transition: all 0.2s ease;
}

.event-item:hover {
  transform: translateX(2px);
}

.event-content {
  max-width: 100%;
}

.chat-content {
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-word;
}

.event-data {
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 4px;
  font-size: 10px;
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.pagination {
  display: flex;
  justify-content: center;
}

.event-stats {
  flex-shrink: 0;
}
</style>
