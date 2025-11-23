<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-transit-connection-variant</v-icon>
            Socket.IO 新事件系统测试
          </v-card-title>
          <v-card-text>
            <p class="text-body-2 mb-4">
              此页面用于测试新的通用事件转发系统，支持聊天、KV变化等各种事件类型。
            </p>

            <!-- 连接状态 -->
            <v-alert
              :type="connected ? 'success' : 'error'"
              :text="`连接状态: ${connected ? '已连接' : '未连接'} | Socket ID: ${socketId || '-'}`"
              class="mb-4"
            />

            <!-- 发送测试事件 -->
            <v-card outlined class="mb-4">
              <v-card-title class="text-h6">发送测试事件</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="testEventType"
                      :items="eventTypes"
                      label="事件类型"
                      outlined
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="testContent"
                      label="事件内容"
                      outlined
                      placeholder="输入测试内容"
                    />
                  </v-col>
                </v-row>
                <v-btn
                  :disabled="!testEventType || !testContent.trim()"
                  color="primary"
                  @click="sendTestEvent"
                >
                  <v-icon start>mdi-send</v-icon>
                  发送测试事件
                </v-btn>
              </v-card-text>
            </v-card>

            <!-- 事件统计 -->
            <v-row class="mb-4">
              <v-col cols="12" md="3">
                <v-card color="primary" dark>
                  <v-card-text>
                    <div class="text-h4">{{ eventStats.total }}</div>
                    <div>总事件数</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card color="success" dark>
                  <v-card-text>
                    <div class="text-h4">{{ eventStats.chat }}</div>
                    <div>聊天事件</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card color="info" dark>
                  <v-card-text>
                    <div class="text-h4">{{ eventStats.kvChanged }}</div>
                    <div>KV变化事件</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card color="warning" dark>
                  <v-card-text>
                    <div class="text-h4">{{ eventStats.other }}</div>
                    <div>其他事件</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- 实时事件日志 -->
            <v-card outlined>
              <v-card-title>
                实时事件日志
                <v-spacer/>
                <v-btn
                  size="small"
                  variant="text"
                  @click="clearEvents"
                >
                  <v-icon>mdi-delete</v-icon>
                  清空
                </v-btn>
              </v-card-title>
              <v-card-text>
                <div class="event-log">
                  <div
                    v-for="(event, index) in recentEvents"
                    :key="index"
                    class="event-item mb-3"
                  >
                    <v-card
                      :color="getEventColor(event.type)"
                      variant="outlined"
                    >
                      <v-card-text class="pa-3">
                        <div class="d-flex align-center mb-2">
                          <v-chip
                            :color="getEventColor(event.type)"
                            size="small"
                            variant="flat"
                          >
                            {{ event.type }}
                          </v-chip>
                          <v-spacer/>
                          <span class="text-caption">{{ formatTime(event.timestamp) }}</span>
                        </div>

                        <div v-if="event.senderInfo" class="mb-2">
                          <strong>发送者:</strong> {{ formatDeviceInfo(event.senderInfo) }}
                          <v-chip
                            v-if="isRealtimeEvent(event)"
                            color="purple"
                            size="x-small"
                            class="ml-2"
                          >
                            实时同步
                          </v-chip>
                        </div>

                        <div class="mb-2">
                          <strong>内容:</strong>
                        </div>
                        <pre class="text-caption">{{ JSON.stringify(event.content, null, 2) }}</pre>

                        <div v-if="event.eventId" class="text-caption mt-2 text-grey">
                          事件ID: {{ event.eventId }}
                        </div>
                      </v-card-text>
                    </v-card>
                  </div>

                  <div v-if="recentEvents.length === 0" class="text-center text-grey pa-4">
                    暂无事件
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { getSocket, on as socketOn, joinToken } from '@/utils/socketClient'
import {
  sendEvent,
  DeviceEventTypes,
  formatDeviceInfo,
  isRealtimeEvent,
  createDeviceEventHandler,
  sendChatMessage
} from '@/utils/deviceEvents'
import { getSetting } from '@/utils/settings'

// 响应式数据
const connected = ref(false)
const socketId = ref('')
const testEventType = ref('chat')
const testContent = ref('')
const recentEvents = ref([])

// 事件统计
const eventStats = reactive({
  total: 0,
  chat: 0,
  kvChanged: 0,
  other: 0
})

// 事件类型选项
const eventTypes = [
  { title: '聊天消息', value: 'chat' },
  { title: 'KV变化', value: 'kv-key-changed' },
  { title: '自定义事件', value: 'custom-event' }
]

// 清理函数
let cleanupFunctions = []

// 计算属性
const formattedEvents = computed(() => {
  return recentEvents.value.map(event => ({
    ...event,
    formattedTime: formatTime(event.timestamp),
    formattedSender: event.senderInfo ? formatDeviceInfo(event.senderInfo) : '未知'
  }))
})

// 方法
function sendTestEvent() {
  if (!testEventType.value || !testContent.value.trim()) return

  try {
    if (testEventType.value === 'chat') {
      // 使用专门的聊天发送函数
      sendChatMessage(testContent.value)
    } else {
      // 使用通用事件发送
      const content = testEventType.value === 'kv-key-changed' ?
        {
          key: 'test-key',
          action: 'upsert',
          value: testContent.value
        } :
        { message: testContent.value }

      sendEvent(testEventType.value, content)
    }

    testContent.value = ''
  } catch (error) {
    console.error('发送测试事件失败:', error)
  }
}

function addEvent(eventData) {
  recentEvents.value.unshift(eventData)

  // 更新统计
  eventStats.total++
  if (eventData.type === DeviceEventTypes.CHAT) {
    eventStats.chat++
  } else if (eventData.type === DeviceEventTypes.KV_KEY_CHANGED) {
    eventStats.kvChanged++
  } else {
    eventStats.other++
  }

  // 限制事件数量
  if (recentEvents.value.length > 50) {
    recentEvents.value = recentEvents.value.slice(0, 50)
  }
}

function clearEvents() {
  recentEvents.value = []
  eventStats.total = 0
  eventStats.chat = 0
  eventStats.kvChanged = 0
  eventStats.other = 0
}

function getEventColor(eventType) {
  switch (eventType) {
    case DeviceEventTypes.CHAT:
      return 'success'
    case DeviceEventTypes.KV_KEY_CHANGED:
      return 'info'
    default:
      return 'warning'
  }
}

function formatTime(timestamp) {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return timestamp
  }
}

// 组件生命周期
onMounted(() => {
  // 初始化 socket 连接
  const socket = getSocket()
  connected.value = socket.connected
  socketId.value = socket.id || ''

  // 监听连接状态
  socket.on('connect', () => {
    connected.value = true
    socketId.value = socket.id || ''
  })

  socket.on('disconnect', () => {
    connected.value = false
    socketId.value = ''
  })

  // 自动加入 token 频道
  const token = getSetting('server.kvToken')
  if (token) {
    joinToken(token)
  }

  // 监听旧格式事件（兼容性）
  const offLegacyChat = socketOn('chat:message', (msg) => {
    addEvent({
      type: 'chat:message',
      content: msg,
      timestamp: msg.at || new Date().toISOString(),
      senderId: msg.senderId,
      uuid: msg.uuid,
      eventId: `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    })
  })

  // 监听新的直接聊天事件
  const offDirectChat = socketOn('chat', (eventData) => {
    if (eventData && eventData.content) {
      addEvent({
        type: 'chat',
        content: eventData.content,
        timestamp: eventData.timestamp,
        eventId: eventData.eventId,
        senderId: eventData.senderId,
        senderInfo: eventData.senderInfo
      })
    }
  })

  const offLegacyKv = socketOn('kv-key-changed', (eventData) => {
    // 新格式：直接事件数据
    if (eventData.content && eventData.timestamp) {
      addEvent({
        type: 'kv-key-changed',
        content: eventData.content,
        timestamp: eventData.timestamp,
        eventId: eventData.eventId,
        senderId: eventData.senderId,
        senderInfo: eventData.senderInfo
      })
    } else {
      // 旧格式：兼容处理
      addEvent({
        type: 'kv-key-changed',
        content: eventData,
        timestamp: eventData.updatedAt || new Date().toISOString(),
        uuid: eventData.uuid,
        eventId: `legacy-kv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
    }
  })

  // 监听新格式设备事件
  const deviceEventHandler = createDeviceEventHandler({
    onChat: (chatMsg, originalEvent) => {
      addEvent(originalEvent)
    },
    onKvChanged: (kvMsg, originalEvent) => {
      addEvent(originalEvent)
    },
    onOtherEvent: (eventData) => {
      addEvent(eventData)
    },
    enableLegacySupport: true
  })

  const offDeviceEvent = socketOn('device-event', deviceEventHandler)

  // 保存清理函数
  cleanupFunctions = [
    offLegacyChat,
    offDirectChat,
    offLegacyKv,
    offDeviceEvent
  ]
})

onBeforeUnmount(() => {
  // 清理所有事件监听器
  try {
    cleanupFunctions.forEach(cleanup => {
      try {
        if (typeof cleanup === 'function') {
          cleanup()
        }
      } catch (error) {
        console.warn('事件监听器清理失败:', error)
      }
    })
  } catch (error) {
    console.error('组件清理失败:', error)
  }

  // 清空数据
  cleanupFunctions = []
})
</script>

<style scoped>
.event-log {
  max-height: 600px;
  overflow-y: auto;
}

.event-item {
  transition: all 0.3s ease;
}

.event-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

pre {
  background: rgba(0,0,0,0.05);
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
