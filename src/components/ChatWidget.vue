<template>
  <!-- Floating toggle button -->
  <div
    v-if="showToggleButton"
    :style="toggleStyle"
    class="chat-toggle"
  >
    <v-btn
      color="primary"
      icon
      variant="flat"
      @click="open()"
    >
      <v-badge
        :content="unreadCount || undefined"
        :model-value="unreadCount > 0"
        color="error"
        overlap
      >
        <v-icon>
          mdi-chat
        </v-icon>
      </v-badge>
    </v-btn>
  </div>

  <!-- Chat panel -->
  <div
    v-show="visible"
    :style="panelStyle"
    class="chat-panel"
  >
    <v-card
      border
      class="chat-card"
      elevation="8"
    >
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">
          mdi-chat-processing
        </v-icon>
        <span class="text-subtitle-1">设备聊天室</span>
        <v-spacer />
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
        <v-btn
          icon
          variant="text"
          @click="close()"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="chat-body">
        <div
          ref="listRef"
          class="messages"
        >
          <template
            v-for="msg in decoratedMessages"
            :key="msg._id"
          >
            <div
              v-if="msg._type === 'divider'"
              class="divider-row"
            >
              <v-divider class="my-2" />
              <div class="divider-text">
                今天 - 上次访问
              </div>
              <v-divider class="my-2" />
            </div>
            <div
              v-else
              :class="{ self: msg.self }"
              class="message-row"
            >
              <div class="avatar">
                <v-avatar
                  :color="msg.self ? 'primary' : 'grey'"
                  size="24"
                >
                  <v-icon size="small">
                    {{ msg.self ? 'mdi-account' : 'mdi-account-outline' }}
                  </v-icon>
                </v-avatar>
              </div>
              <div class="bubble">
                <div class="text">
                  {{ msg.text }}
                </div>
                <div class="meta">
                  {{ formatTime(msg.at) }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="chat-input">
        <v-btn
          class="mr-1"
          icon
          variant="text"
          @click="insertEmoji('😄')"
        >
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
        <v-btn
          :disabled="!canSend"
          class="ml-2"
          color="primary"
          @click="send"
        >
          <v-icon start>
            mdi-send
          </v-icon>
          发送
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script>
import {getSetting} from '@/utils/settings'
import {getSocket, joinToken, on as socketOn} from '@/utils/socketClient'

export default {
  name: 'ChatWidget',
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
      messages: [],
      lastVisit: null,
      unreadCount: 0,
      connected: false,
      socketId: '',
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
      const idx = this.messages.findIndex(m => m.at && new Date(m.at).getTime() >= new Date(this.lastVisit).getTime())
      if (idx <= 0) return this.messages
      const before = this.messages.slice(0, idx)
      const after = this.messages.slice(idx)
      return [
        ...before,
        {_id: 'divider', _type: 'divider'},
        ...after,
      ]
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

    // Listen chat messages
    this.offMessage = socketOn('chat:message', (msg) => {
      this.pushMessage(msg)
    })

    // If initially visible, run open logic
    if (this.visible) this.onOpen()
  },
  beforeUnmount() {
    if (this.offMessage) this.offMessage()
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
      const s = getSocket()
      s.emit('chat:send', val)
      this.text = ''
    },
    pushMessage(msg) {
      const entry = {
        _id: `${msg.at || Date.now()}-${Math.random()}`,
        text: typeof msg?.text === 'string' ? msg.text : (msg?.text || ''),
        at: msg.at || new Date().toISOString(),
        senderId: msg.senderId,
        self: !!(msg.senderId && msg.senderId === this.socketId),
      }
      // ignore empty
      if (!entry.text) return
      this.messages.push(entry)
      // unread when hidden
      if (!this.visible) this.unreadCount++
      this.$nextTick(() => this.scrollToBottom())
      // trim
      if (this.messages.length > 500) this.messages.shift()
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
      const el = this.$refs.listRef
      if (!el) return
      try {
        el.scrollTop = el.scrollHeight
      } catch (e) {
        void e
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
</style>
