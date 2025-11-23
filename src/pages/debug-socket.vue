<template>
  <v-container>
    <v-row>
      <v-col
        cols="12"
        md="6"
      >
        <v-card
          border
          class="mb-4"
        >
          <v-card-title>连接信息</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Server URL</v-list-item-title>
                <v-list-item-subtitle>{{ serverUrl }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>当前 KV Token</v-list-item-title>
                <v-list-item-subtitle>{{ currentToken || '(未配置)' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>连接状态</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip
                    :color="connected ? 'success' : 'error'"
                    class="mr-2"
                    size="small"
                  >
                    {{ connected ? 'connected' : 'disconnected' }}
                  </v-chip>
                  <span v-if="socketId">id: {{ socketId }}</span>
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>已加入 Token</v-list-item-title>
                <v-list-item-subtitle>{{ joinedToken || '-' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>当前数据键</v-list-item-title>
                <v-list-item-subtitle>{{ currentDataKey }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-divider class="my-4"/>
            <v-row>
              <v-col
                cols="12"
                md="8"
              >
                <v-text-field
                  v-model="manualToken"
                  clearable
                  label="手动加入 Token (留空使用配置的 Token)"
                />
              </v-col>
              <v-col
                class="d-flex align-center"
                cols="12"
                md="4"
              >
                <v-btn
                  class="mr-2"
                  color="primary"
                  @click="handleJoinToken(manualToken || currentToken)"
                >
                  加入
                </v-btn>
                <v-btn
                  :disabled="!joinedToken"
                  class="mr-2"
                  color="warning"
                  @click="handleLeaveToken(joinedToken)"
                >
                  离开当前
                </v-btn>
                <v-btn
                  color="error"
                  variant="tonal"
                  @click="handleLeaveAll"
                >
                  离开全部
                </v-btn>
              </v-col>
            </v-row>
            <v-divider class="my-4"/>
            <v-row>
              <v-col cols="12">
                <v-card border color="primary" variant="tonal">
                  <v-card-title class="text-subtitle-1">聊天室消息</v-card-title>
                  <v-card-text>
                    <v-textarea
                      v-model="chatInput"
                      auto-grow
                      clearable
                      label="发送到当前已加入的设备频道"
                      rows="2"
                    />
                    <div class="d-flex">
                      <v-spacer/>
                      <v-btn
                        :disabled="!canSendChat"
                        color="primary"
                        @click="sendChat"
                      >
                        发送聊天
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-btn
                  color="secondary"
                  variant="tonal"
                  @click="reconnect"
                >
                  重新连接
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card border>
          <v-card-title>在线设备</v-card-title>
          <v-card-text>
            <v-btn
              class="mb-3"
              color="primary"
              @click="fetchOnline"
            >
              刷新在线列表
            </v-btn>
            <v-list
              v-if="onlineDevices.length"
              density="compact"
            >
              <v-list-item
                v-for="dev in onlineDevices"
                :key="dev.uuid"
              >
                <template #prepend>
                  <v-avatar
                    :color="dev.connections > 0 ? 'success' : 'grey'"
                    size="24"
                  />
                </template>
                <v-list-item-title>{{ dev.name || '(未命名)' }}</v-list-item-title>
                <v-list-item-subtitle>{{ dev.uuid }} · 连接数 {{ dev.connections }}</v-list-item-subtitle>
                <template #append>
                  <v-btn
                    size="small"
                    variant="text"
                    @click="handleSelectDevice(dev)"
                  >
                    选择
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <div
              v-else
              class="text-grey"
            >
              暂无数据
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="6"
      >
        <v-card border>
          <v-card-title class="d-flex align-center">
            事件日志
            <v-spacer/>
            <v-btn
              color="error"
              size="small"
              variant="text"
              @click="clearLogs"
            >
              清空
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                v-for="(log, idx) in logs"
                :key="idx"
              >
                <v-list-item-title>
                  <span class="text-caption text-grey">{{ log.time }}</span>
                  <span class="ml-2">{{ log.event }}</span>
                </v-list-item-title>
                <v-list-item-text>
                  <pre
                    class="mb-2"
                    style="white-space: pre-wrap"
                  >{{ log.payload }}</pre>
                </v-list-item-text>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, computed} from 'vue'
import {getSetting} from '@/utils/settings'
import {
  getSocket,
  on as socketOn,
  joinToken,
  leaveToken,
  leaveAll,
  getServerUrl
} from '@/utils/socketClient'
import {sendChatMessage, DeviceEventTypes, formatDeviceInfo} from '@/utils/deviceEvents'

const currentToken = ref(getSetting('server.kvToken') || '')
const manualToken = ref('')
const joinedToken = ref('')
const connected = ref(false)
const socketId = ref('')
const logs = ref([])
const onlineDevices = ref([])
const chatInput = ref('')

const serverUrl = computed(() => getServerUrl())

const currentDataKey = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `classworks-data-${y}${m}${d}`
})

function pushLog(event, payload) {
  const time = new Date().toLocaleTimeString()
  logs.value.unshift({
    time,
    event,
    payload: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
  })
  if (logs.value.length > 200) logs.value.pop()
}

function wireSocketBaseEvents() {
  const s = getSocket()
  connected.value = !!s.connected
  socketId.value = s.id || ''

  s.on('connect', () => {
    connected.value = true
    socketId.value = s.id || ''
    pushLog('connect', {id: s.id})
    // re-join with token if set
    if (joinedToken.value) joinToken(joinedToken.value)
  })
  s.on('disconnect', (reason) => {
    connected.value = false
    pushLog('disconnect', {reason})
  })
  s.on('connect_error', (err) => pushLog('connect_error', {message: err?.message}))
  s.on('reconnect_attempt', (n) => pushLog('reconnect_attempt', {attempt: n}))
  s.on('reconnect', (n) => pushLog('reconnect', {attempt: n}))
}

function wireBusinessEvents() {
  // key changes
  socketOn('kv-key-changed', (msg) => {
    pushLog('kv-key-changed', msg)
  })
  // device joined count broadcast
  socketOn('device-joined', (msg) => {
    pushLog('device-joined', msg)
  })
  // join success
  socketOn('joined', (msg) => {
    pushLog('joined', msg)
  })
  // join error
  socketOn('join-error', (msg) => {
    pushLog('join-error', msg)
  })
  // chat message (旧接口)
  socketOn('chat:message', (msg) => {
    pushLog('chat:message', msg)
  })
  // device events (新通用事件接口)
  socketOn('device-event', (eventData) => {
    pushLog('device-event', eventData)
  })
}

function handleJoinToken(token) {
  try {
    if (!token) {
      pushLog('join-error', 'Token 为空')
      return
    }
    joinToken(token)
    joinedToken.value = token
    pushLog('join-token', {token})
  } catch (e) {
    pushLog('join-token-error', String(e))
  }
}

function handleLeaveToken(token) {
  try {
    leaveToken(token)
    if (joinedToken.value === token) joinedToken.value = ''
    pushLog('leave-token', {token})
  } catch (e) {
    pushLog('leave-token-error', String(e))
  }
}

function handleLeaveAll() {
  try {
    leaveAll()
    joinedToken.value = ''
    pushLog('leave-all', {})
  } catch (e) {
    pushLog('leave-all-error', String(e))
  }
}

function reconnect() {
  try {
    const s = getSocket()
    s.connect()
  } catch (e) {
    pushLog('reconnect-error', String(e))
  }
}

const canSendChat = computed(() => {
  const text = chatInput.value?.trim() || ''
  return !!(text && (joinedToken.value || currentToken.value))
})

function sendChat() {
  try {
    const text = (chatInput.value || '').trim()
    if (!text) return
    // 使用新的通用事件接口发送聊天消息
    sendChatMessage(text)
    pushLog('send-event', {type: DeviceEventTypes.CHAT, content: {text}})
    chatInput.value = ''
  } catch (e) {
    pushLog('chat:error', String(e))
  }
}

function handleSelectDevice(dev) {
  // For now, just show a message that we need the token
  pushLog('select-device', {
    message: '请输入该设备对应的 KV Token 以加入频道',
    device: dev
  })
}

async function fetchOnline() {
  try {
    const resp = await fetch(`${serverUrl.value}/devices/online`)
    const data = await resp.json()
    onlineDevices.value = Array.isArray(data?.devices) ? data.devices : []
    pushLog('fetch-online', {count: onlineDevices.value.length})
  } catch (e) {
    pushLog('fetch-online-error', String(e))
  }
}

function clearLogs() {
  logs.value = []
}

onMounted(() => {
  // init socket + base events
  getSocket()
  wireSocketBaseEvents()
  wireBusinessEvents()

  // auto join with current token if present
  if (currentToken.value) {
    handleJoinToken(currentToken.value)
  }

  // prime online list
  fetchOnline()
})

onBeforeUnmount(() => {
  try {
    if (joinedToken.value) leaveToken(joinedToken.value)
  } catch (e) {
    void e
  }
})
</script>
