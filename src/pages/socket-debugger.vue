<template>
  <v-container fluid>
    <v-row>
      <!-- 标题栏 -->
      <v-col cols="12">
        <v-card border>
          <v-card-title class="d-flex align-center">
            <v-icon
              class="mr-2"
              color="primary"
            >
              mdi-network
            </v-icon>
            Socket.IO 连接调试器
            <v-spacer />
            <v-chip
              :color="connectionStatus.color"
              size="small"
            >
              {{ connectionStatus.text }}
            </v-chip>
          </v-card-title>
        </v-card>
      </v-col>

      <!-- 连接信息卡片 -->
      <v-col
        cols="12"
        md="6"
      >
        <v-card border>
          <v-card-title>连接信息</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-server</v-icon>
                </template>
                <v-list-item-title>服务器地址</v-list-item-title>
                <v-list-item-subtitle>{{ serverUrl }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-identifier</v-icon>
                </template>
                <v-list-item-title>Socket ID</v-list-item-title>
                <v-list-item-subtitle>{{ socketId || '未连接' }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-transit-connection-variant</v-icon>
                </template>
                <v-list-item-title>传输方式</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip
                    size="x-small"
                    :color="transportColor"
                  >
                    {{ transport || '未知' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-clock-outline</v-icon>
                </template>
                <v-list-item-title>连接时长</v-list-item-title>
                <v-list-item-subtitle>{{ connectionDuration }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-refresh</v-icon>
                </template>
                <v-list-item-title>重连次数</v-list-item-title>
                <v-list-item-subtitle>{{ reconnectCount }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-calendar-clock</v-icon>
                </template>
                <v-list-item-title>上次连接</v-list-item-title>
                <v-list-item-subtitle>{{ lastConnectedTime || '从未连接' }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-divider class="my-4" />

            <div class="d-flex flex-wrap gap-2">
              <v-btn
                color="primary"
                prepend-icon="mdi-connection"
                :disabled="isConnected"
                @click="handleConnect"
              >
                连接
              </v-btn>
              <v-btn
                color="error"
                prepend-icon="mdi-connection"
                :disabled="!isConnected"
                @click="handleDisconnect"
              >
                断开
              </v-btn>
              <v-btn
                color="warning"
                prepend-icon="mdi-refresh"
                @click="handleReconnect"
              >
                重连
              </v-btn>
              <v-btn
                color="info"
                prepend-icon="mdi-delete-sweep"
                @click="clearLogs"
              >
                清空日志
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 统计信息卡片 -->
      <v-col
        cols="12"
        md="6"
      >
        <v-card border>
          <v-card-title>统计信息</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <v-card
                  variant="tonal"
                  color="success"
                >
                  <v-card-text class="text-center">
                    <div class="text-h4">
                      {{ stats.eventsReceived }}
                    </div>
                    <div class="text-caption">
                      接收事件
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card
                  variant="tonal"
                  color="primary"
                >
                  <v-card-text class="text-center">
                    <div class="text-h4">
                      {{ stats.eventsSent }}
                    </div>
                    <div class="text-caption">
                      发送事件
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card
                  variant="tonal"
                  color="warning"
                >
                  <v-card-text class="text-center">
                    <div class="text-h4">
                      {{ stats.errors }}
                    </div>
                    <div class="text-caption">
                      错误次数
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card
                  variant="tonal"
                  color="info"
                >
                  <v-card-text class="text-center">
                    <div class="text-h4">
                      {{ stats.reconnects }}
                    </div>
                    <div class="text-caption">
                      重连次数
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>平均延迟</v-list-item-title>
                <v-list-item-subtitle>{{ stats.avgLatency }} ms</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>上次 Ping</v-list-item-title>
                <v-list-item-subtitle>{{ stats.lastPing }} ms</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>数据传输</v-list-item-title>
                <v-list-item-subtitle>
                  ↑ {{ formatBytes(stats.bytesSent) }} / ↓ {{ formatBytes(stats.bytesReceived) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 事件监控 -->
      <v-col
        cols="12"
        md="6"
      >
        <v-card border>
          <v-card-title>
            事件监控
            <v-chip
              class="ml-2"
              size="small"
            >
              {{ activeListeners.size }} 个监听器
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-list
              density="compact"
              max-height="300"
              style="overflow-y: auto"
            >
              <v-list-item v-if="activeListeners.size === 0">
                <v-list-item-title class="text-center text-disabled">
                  暂无活动监听器
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                v-for="listener in Array.from(activeListeners)"
                :key="listener"
              >
                <template #prepend>
                  <v-icon size="small">
                    mdi-eye
                  </v-icon>
                </template>
                <v-list-item-title>{{ listener }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 自定义事件发送 -->
      <v-col
        cols="12"
        md="6"
      >
        <v-card border>
          <v-card-title>发送自定义事件</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="customEvent.name"
              label="事件名称"
              prepend-icon="mdi-tag"
              density="compact"
              class="mb-2"
            />
            <v-textarea
              v-model="customEvent.data"
              label="数据 (JSON)"
              prepend-icon="mdi-code-json"
              rows="4"
              density="compact"
              class="mb-2"
            />
            <v-btn
              block
              color="primary"
              prepend-icon="mdi-send"
              :disabled="!isConnected || !customEvent.name"
              @click="sendCustomEvent"
            >
              发送事件
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 连接日志 -->
      <v-col cols="12">
        <v-card border>
          <v-card-title class="d-flex align-center">
            连接日志
            <v-spacer />
            <v-switch
              v-model="autoScroll"
              label="自动滚动"
              density="compact"
              hide-details
              class="mr-4"
            />
            <v-btn
              size="small"
              variant="text"
              prepend-icon="mdi-download"
              @click="exportLogs"
            >
              导出
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div
              ref="logContainer"
              class="log-container"
              style="height: 400px; overflow-y: auto; background: #1e1e1e; border-radius: 4px; padding: 12px;"
            >
              <div
                v-for="(log, index) in logs"
                :key="index"
                class="log-entry"
                :class="`log-${log.type}`"
              >
                <span class="log-time">[{{ log.time }}]</span>
                <span class="log-type">[{{ log.type.toUpperCase() }}]</span>
                <span class="log-message">{{ log.message }}</span>
                <pre
                  v-if="log.data"
                  class="log-data"
                >{{ log.data }}</pre>
              </div>
              <div
                v-if="logs.length === 0"
                class="text-center text-disabled pa-8"
              >
                暂无日志
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 诊断工具 -->
      <v-col cols="12">
        <v-card border>
          <v-card-title>连接诊断</v-card-title>
          <v-card-text>
            <v-row>
              <v-col
                cols="12"
                md="4"
              >
                <v-btn
                  block
                  color="info"
                  prepend-icon="mdi-test-tube"
                  @click="testConnection"
                >
                  测试连接
                </v-btn>
              </v-col>
              <v-col
                cols="12"
                md="4"
              >
                <v-btn
                  block
                  color="success"
                  prepend-icon="mdi-timer"
                  :disabled="!isConnected"
                  @click="measureLatency"
                >
                  测量延迟
                </v-btn>
              </v-col>
              <v-col
                cols="12"
                md="4"
              >
                <v-btn
                  block
                  color="warning"
                  prepend-icon="mdi-alert"
                  @click="simulateError"
                >
                  模拟错误
                </v-btn>
              </v-col>
            </v-row>

            <v-alert
              v-if="diagnosticResult"
              :type="diagnosticResult.type"
              class="mt-4"
              closable
              @click:close="diagnosticResult = null"
            >
              {{ diagnosticResult.message }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { getSocket, getServerUrl, disconnect, on, off } from '@/utils/socketClient';

// 状态数据
const serverUrl = ref(getServerUrl());
const isConnected = ref(false);
const socketId = ref('');
const transport = ref('');
const reconnectCount = ref(0);
const lastConnectedTime = ref('');
const connectionStartTime = ref(null);
const connectionDuration = ref('00:00:00');
const autoScroll = ref(true);

// 统计数据
const stats = ref({
  eventsReceived: 0,
  eventsSent: 0,
  errors: 0,
  reconnects: 0,
  avgLatency: 0,
  lastPing: 0,
  bytesSent: 0,
  bytesReceived: 0,
});

// 日志和监听器
const logs = ref([]);
const activeListeners = ref(new Set());
const logContainer = ref(null);

// 自定义事件
const customEvent = ref({
  name: '',
  data: '{}',
});

// 诊断结果
const diagnosticResult = ref(null);

// 计算属性
const connectionStatus = computed(() => {
  if (isConnected.value) {
    return { text: '已连接', color: 'success' };
  }
  return { text: '未连接', color: 'error' };
});

const transportColor = computed(() => {
  if (transport.value === 'websocket') return 'success';
  if (transport.value === 'polling') return 'warning';
  return 'grey';
});

// 日志函数
function addLog(type, message, data = null) {
  const now = new Date();
  const time = now.toLocaleTimeString('zh-CN', { hour12: false });
  logs.value.push({ type, message, data, time });

  // 限制日志数量
  if (logs.value.length > 500) {
    logs.value.shift();
  }

  if (autoScroll.value) {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    });
  }
}

function clearLogs() {
  logs.value = [];
  addLog('info', '日志已清空');
}

// 格式化字节
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 更新连接时长
let durationInterval = null;
function updateConnectionDuration() {
  if (connectionStartTime.value) {
    const now = Date.now();
    const diff = now - connectionStartTime.value;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    connectionDuration.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else {
    connectionDuration.value = '00:00:00';
  }
}

// 存储事件处理器引用,用于清理
let eventHandlers = null;

// Socket 事件处理
function setupSocketListeners() {
  const socket = getSocket();

  // 如果已有事件处理器,先清理
  if (eventHandlers) {
    cleanupSocketListeners();
  }

  // 连接事件
  const onConnect = () => {
    isConnected.value = true;
    socketId.value = socket.id;
    transport.value = socket.io?.engine?.transport?.name || 'unknown';
    connectionStartTime.value = Date.now();
    lastConnectedTime.value = new Date().toLocaleString('zh-CN');
    addLog('success', '已连接到服务器', { socketId: socket.id, transport: transport.value });

    if (!durationInterval) {
      durationInterval = setInterval(updateConnectionDuration, 1000);
    }
  };

  const onDisconnect = (reason) => {
    isConnected.value = false;
    socketId.value = '';
    transport.value = '';
    connectionStartTime.value = null;
    addLog('warning', '连接已断开', { reason });

    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
  };

  const onConnectError = (error) => {
    stats.value.errors++;
    addLog('error', '连接错误', { message: error.message, type: error.type });
  };

  const onReconnect = (attempt) => {
    stats.value.reconnects++;
    reconnectCount.value++;
    addLog('info', `重连成功 (尝试 #${attempt})`);
  };

  const onReconnectAttempt = (attempt) => {
    addLog('info', `正在尝试重连 #${attempt}...`);
  };

  const onReconnectError = (error) => {
    stats.value.errors++;
    addLog('error', '重连失败', { message: error.message });
  };

  const onReconnectFailed = () => {
    stats.value.errors++;
    addLog('error', '重连彻底失败');
  };

  const onPing = () => {
    addLog('debug', 'Ping 发送');
  };

  const onPong = (latency) => {
    stats.value.lastPing = latency;
    const prevAvg = stats.value.avgLatency;
    stats.value.avgLatency = prevAvg === 0 ? latency : Math.round((prevAvg * 0.8 + latency * 0.2));
    addLog('debug', `Pong 接收 (${latency}ms)`);
  };

  const onUpgrade = (newTransport) => {
    transport.value = newTransport.name;
    addLog('success', `传输已升级到 ${newTransport.name}`);
  };

  // 保存事件处理器引用
  eventHandlers = {
    socket,
    onConnect,
    onDisconnect,
    onConnectError,
    onReconnect,
    onReconnectAttempt,
    onReconnectError,
    onReconnectFailed,
    onPing,
    onPong,
    onUpgrade,
  };

  // 绑定事件
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('connect_error', onConnectError);
  socket.io.on('reconnect', onReconnect);
  socket.io.on('reconnect_attempt', onReconnectAttempt);
  socket.io.on('reconnect_error', onReconnectError);
  socket.io.on('reconnect_failed', onReconnectFailed);
  socket.io.on('ping', onPing);
  socket.io.on('pong', onPong);

  // 监听传输升级
  if (socket.io?.engine) {
    socket.io.engine.on('upgrade', onUpgrade);
  }

  // 更新活动监听器列表
  activeListeners.value = new Set(Object.keys(socket._callbacks || {}).map(k => k.replace('$', '')));

  // 初始状态
  if (socket.connected) {
    onConnect();
  }
}

// 清理 Socket 事件监听器
function cleanupSocketListeners() {
  if (!eventHandlers) return;

  const { socket, onConnect, onDisconnect, onConnectError, onReconnect,
          onReconnectAttempt, onReconnectError, onReconnectFailed, onPing, onPong, onUpgrade } = eventHandlers;

  try {
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('connect_error', onConnectError);
    socket.io.off('reconnect', onReconnect);
    socket.io.off('reconnect_attempt', onReconnectAttempt);
    socket.io.off('reconnect_error', onReconnectError);
    socket.io.off('reconnect_failed', onReconnectFailed);
    socket.io.off('ping', onPing);
    socket.io.off('pong', onPong);

    if (socket.io?.engine) {
      socket.io.engine.off('upgrade', onUpgrade);
    }
  } catch (e) {
    // 忽略清理错误
  }

  eventHandlers = null;
}

// 连接控制
function handleConnect() {
  try {
    const socket = getSocket();
    socket.connect();
    addLog('info', '正在连接...');
  } catch (error) {
    addLog('error', '连接失败', { message: error.message });
  }
}

function handleDisconnect() {
  try {
    disconnect();
    addLog('info', '已手动断开连接');
  } catch (error) {
    addLog('error', '断开连接失败', { message: error.message });
  }
}

function handleReconnect() {
  try {
    disconnect();
    setTimeout(() => {
      // 重新初始化并设置监听器
      setupSocketListeners();
      handleConnect();
    }, 100);
  } catch (error) {
    addLog('error', '重连失败', { message: error.message });
  }
}

// 发送自定义事件
function sendCustomEvent() {
  try {
    const socket = getSocket();
    let data;
    try {
      data = JSON.parse(customEvent.value.data);
    } catch {
      data = customEvent.value.data;
    }

    socket.emit(customEvent.value.name, data);
    stats.value.eventsSent++;
    stats.value.bytesSent += JSON.stringify(data).length;
    addLog('info', `已发送事件: ${customEvent.value.name}`, data);
  } catch (error) {
    addLog('error', '发送事件失败', { message: error.message });
  }
}

// 诊断工具
function testConnection() {
  diagnosticResult.value = null;
  addLog('info', '开始连接测试...');

  const socket = getSocket();
  const timeout = setTimeout(() => {
    diagnosticResult.value = {
      type: 'error',
      message: '连接测试超时 (20秒)',
    };
    addLog('error', '连接测试超时');
  }, 20000);

  if (socket.connected) {
    clearTimeout(timeout);
    diagnosticResult.value = {
      type: 'success',
      message: `连接正常! Socket ID: ${socket.id}, 传输: ${transport.value}`,
    };
    addLog('success', '连接测试通过');
  } else {
    socket.once('connect', () => {
      clearTimeout(timeout);
      diagnosticResult.value = {
        type: 'success',
        message: '连接测试成功!',
      };
      addLog('success', '连接测试通过');
    });

    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      diagnosticResult.value = {
        type: 'error',
        message: `连接失败: ${error.message}`,
      };
      addLog('error', '连接测试失败', { message: error.message });
    });
  }
}

function measureLatency() {
  const socket = getSocket();
  const start = Date.now();

  socket.emit('ping', () => {
    const latency = Date.now() - start;
    diagnosticResult.value = {
      type: 'info',
      message: `测量延迟: ${latency}ms`,
    };
    addLog('info', `延迟测量结果: ${latency}ms`);
  });
}

function simulateError() {
  addLog('warning', '模拟错误场景...');
  const socket = getSocket();

  // 发送一个不存在的事件
  socket.emit('nonexistent-event-test', { test: true });

  diagnosticResult.value = {
    type: 'info',
    message: '已发送测试事件到服务器,请检查服务器响应',
  };
}

// 导出日志
function exportLogs() {
  const content = logs.value
    .map(log => `[${log.time}] [${log.type.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`)
    .join('\n\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `socket-logs-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  addLog('success', '日志已导出');
}

// 生命周期
onMounted(() => {
  setupSocketListeners();
  addLog('info', 'Socket 调试器已初始化');
});

onUnmounted(() => {
  cleanupSocketListeners();
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
});
</script>

<style scoped>
.log-container {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-entry {
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 4px;
}

.log-time {
  color: #858585;
  margin-right: 8px;
}

.log-type {
  font-weight: bold;
  margin-right: 8px;
}

.log-success .log-type {
  color: #4caf50;
}

.log-error .log-type {
  color: #f44336;
}

.log-warning .log-type {
  color: #ff9800;
}

.log-info .log-type {
  color: #2196f3;
}

.log-debug .log-type {
  color: #9e9e9e;
}

.log-message {
  color: #e0e0e0;
}

.log-data {
  margin-top: 4px;
  margin-left: 24px;
  padding: 8px;
  background: #2d2d2d;
  border-radius: 4px;
  color: #b0b0b0;
  font-size: 11px;
  overflow-x: auto;
}

.gap-2 {
  gap: 8px;
}
</style>
