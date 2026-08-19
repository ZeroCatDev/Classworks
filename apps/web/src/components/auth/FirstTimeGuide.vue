<template>
  <v-card class="guide-card">
    <!-- 进度指示器 -->
    <v-progress-linear
      :model-value="(currentStep / totalSteps) * 100"
      color="primary"
      height="6"
    />

    <v-card-text class="pa-8">
      <!-- 步骤 1: 欢迎 -->
      <div
        v-show="currentStep === 1"
        class="step-content"
      >
        <div class="text-center mb-6">
          <v-icon
            class="mb-4"
            color="primary"
            size="80"
          >
            mdi-hand-wave
          </v-icon>
          <h2 class="text-h4 mb-3">
            欢迎使用 Classworks
          </h2>
          <p class="text-body-1 text-medium-emphasis">
            适用于班级大屏的作业板小工具
          </p>
        </div>
      </div>

      <!-- 步骤 2: Classworks 和 KV 的关系图 -->
      <div
        v-show="currentStep === 2"
        class="step-content"
      >
        <h3 class="text-h5 mb-6 text-center">
          Classworks 和 Classworks KV 的关系
        </h3>

        <v-card
          class="pa-6 mb-6"
          color="primary"
          variant="tonal"
        >
          <div class="relationship-diagram">
            <!-- Classworks 应用 -->
            <div class="diagram-item">
              <v-card
                class="pa-4"
                color="blue-darken-1"
                elevation="8"
              >
                <div class="text-center">
                  <v-icon
                    color="white"
                    size="60"
                  >
                    mdi-laptop
                  </v-icon>
                  <h4 class="text-h6 text-white mt-2">
                    Classworks
                  </h4>
                  <p class="text-caption text-white mt-1">
                    作业板应用
                  </p>
                </div>
              </v-card>

              <div class="diagram-description mt-3">
                <v-chip
                  class="mb-2"
                  color="blue"
                  size="small"
                  variant="flat"
                >
                  前端应用
                </v-chip>
                <div class="text-body-2">
                  • 显示作业内容<br>
                  • 管理班级信息<br>
                  • 提供用户界面
                </div>
              </div>
            </div>

            <!-- 连接线 -->
            <div class="diagram-connector">
              <v-icon
                color="primary"
                size="40"
              >
                mdi-swap-horizontal
              </v-icon>
              <div class="text-caption font-weight-bold mt-2">
                数据同步
              </div>
            </div>

            <!-- Classworks KV -->
            <div class="diagram-item">
              <v-card
                class="pa-4"
                color="green-darken-1"
                elevation="8"
              >
                <div class="text-center">
                  <v-icon
                    color="white"
                    size="60"
                  >
                    mdi-cloud-sync
                  </v-icon>
                  <h4 class="text-h6 text-white mt-2">
                    Classworks KV
                  </h4>
                  <p class="text-caption text-white mt-1">
                    云端数据库
                  </p>
                </div>
              </v-card>

              <div class="diagram-description mt-3">
                <v-chip
                  class="mb-2"
                  color="green"
                  size="small"
                  variant="flat"
                >
                  后端服务
                </v-chip>
                <div class="text-body-2">
                  • 存储作业数据<br>
                  • 多设备同步<br>
                  • 权限管理
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </div>

      <!-- 步骤 3: 询问使用场景 -->
      <div
        v-show="currentStep === 3"
        class="step-content"
      >
        <h3 class="text-h5 mb-6 text-center">
          你需要在多个设备上查看作业吗？
        </h3>

        <v-card
          class="mb-6 pa-4"
          color="info"
          variant="tonal"
        >
          <div class="text-body-2">
            比如：在家里电脑、手机上查看，或者多个教室设备共享数据
          </div>
        </v-card>

        <div class="button-group">
          <v-btn
            block
            class="mb-4 py-6"
            color="primary"
            size="x-large"
            variant="elevated"
            @click="selectStorageType('cloud')"
          >
            <div class="d-flex flex-column align-center py-2">
              <v-icon
                class="mb-2"
                size="40"
              >
                mdi-cloud-check
              </v-icon>
              <span class="text-h6">需要，使用云同步</span>
              <span class="text-caption mt-1">多设备访问</span>
            </div>
          </v-btn>

          <v-btn
            block
            class="py-6"
            size="x-large"
            variant="outlined"
            @click="selectStorageType('local')"
          >
            <div class="d-flex flex-column align-center py-2">
              <v-icon
                class="mb-2"
                size="40"
              >
                mdi-laptop
              </v-icon>
              <span class="text-h6">不需要，只用这台设备</span>
              <span class="text-caption mt-1">本地存储</span>
            </div>
          </v-btn>
        </div>
      </div>

      <!-- 步骤 4a: 本地存储确认 -->
      <div
        v-show="currentStep === 4 && storageType === 'local'"
        class="step-content"
      >
        <div class="text-center mb-6">
          <v-icon
            class="mb-4"
            color="success"
            size="80"
          >
            mdi-check-circle
          </v-icon>
          <h3 class="text-h5 mb-4">
            您可以使用本地模式
          </h3>
          <v-card
            class="pa-4 text-left"
            variant="tonal"
          >
            <div class="text-body-1 mb-2">
              此数据将存储在您的浏览器中，如果您的浏览器不支持IndexedDB，可能会出现问题。如果您经常清除浏览器数据，请谨慎使用本地模式。
            </div>
            <div class="text-body-1 mb-2">
              在刚才地方点击使用本地模式的按钮使用。
            </div>
          </v-card>
        </div>
      </div>

      <!-- 步骤 4b: 云存储说明 -->
      <div
        v-show="currentStep === 4 && storageType === 'cloud'"
        class="step-content"
      >
        <div class="text-center mb-6">
          <v-icon
            class="mb-4"
            color="primary"
            size="80"
          >
            mdi-cloud-cog
          </v-icon>
          <h3 class="text-h5 mb-4">
            需要先设置云端账号
          </h3>
        </div>

        <v-card
          class="pa-6 mb-6"
          variant="tonal"
        >
          <div class="d-flex flex-column flex-sm-row align-center">
            <div class="flex-grow-1">
              <h4 class="text-h6 font-weight-bold mb-2">
                自动注册设备
              </h4>
              <p class="text-body-2 mb-3 text-medium-emphasis">
                通过引导式流程自动创建设备、获取令牌并完成初始化。适合首次体验或快速部署多终端。
              </p>
              <v-btn
                color="primary"
                prepend-icon="mdi-flash"
                size="large"
                variant="elevated"
                @click="goToProgressiveStep"
              >
                自动注册
              </v-btn>
            </div>
          </div>
        </v-card>
        <div class="mb-6">
          也可以手动前往 Classworks KV 控制台获取认证信息：
        </div>
        <v-card
          :color=" kvserverurl=='https://kv.houlang.cloud'? 'primary' : 'error' "
          :variant="kvserverurl=='https://kv.houlang.cloud'? 'elevated' : 'outlined'"
          class="pa-6  mb-6"
          @click="openKVSite"
        >
          <v-icon
            class="mb-3"
            size="48"
          >
            mdi-open-in-new
          </v-icon>

          <h4 class="text-h6  font-weight-bold">
            请访问 {{ kvserverurl=='https://kv.houlang.cloud'? 'Classworks KV' : '自定义的 Classworks KV 实例 ' }} 控制台
          </h4>
          <div class="text-h5 mb-6">
            {{ kvserverurl }}
          </div>
          <h6 class="text-subtitle-2">
            {{ kvserverurl=='https://kv.houlang.cloud'? '此实例由 Classworks KV 官方提供' : '此链接由您的实例、预配代码或管理员管理，当前可能不是 Classworks KV 官方的实例地址。' }}
          </h6>
        </v-card>


        <!-- 常见问题 -->
        <v-expansion-panels
          class="mt-6"
          variant="accordion"
        >
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon
                  class="mr-3"
                  color="warning"
                >
                  mdi-help-circle
                </v-icon>
                <span class="text-subtitle-1 font-weight-medium">我以前已经使用过 Classworks KV？</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-card
                class="pa-4"
                color="success"
                variant="tonal"
              >
                <div class="text-body-2 mb-2">
                  如果您之前已经使用过 Classworks KV，可以直接使用您的 <strong>UUID（命名空间）</strong> 和
                  <strong>设置的密码</strong> 进行认证。
                </div>
                <div class="text-body-2">
                  返回上一页，点击"已注册"按钮，输入您的认证信息即可登录。
                </div>
              </v-card>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon
                  class="mr-3"
                  color="info"
                >
                  mdi-help-circle
                </v-icon>
                <span class="text-subtitle-1 font-weight-medium">我如何配置不同类型的设备？</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-card
                class="pa-4"
                color="info"
                variant="tonal"
              >
                <div class="text-body-2 mb-2">
                  不同的密码对应不同的设备类型，这将由 <strong>管理员管理</strong>。
                </div>
                <div class="text-body-2 mb-2">
                  例如：
                </div>
                <ul class="text-body-2 ml-4">
                  <li class="mb-1">
                    班级大屏使用一个密码
                  </li>
                  <li class="mb-1">
                    教师设备使用另一个密码
                  </li>
                  <li>学生设备使用不同的密码</li>
                </ul>
                <div class="text-body-2 mt-3">
                  请联系您的管理员获取对应设备类型的密码。
                </div>
              </v-card>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- 步骤 5: 渐进式注册完整流程 -->
      <div
        v-show="currentStep === 5"
        class="step-content"
      >
        <div class="text-center mb-6">
          <v-avatar
            class="mb-4"
            color="primary"
            size="80"
            variant="tonal"
          >
            <v-icon size="48">
              mdi-rocket-launch
            </v-icon>
          </v-avatar>
          <h3 class="text-h5 font-weight-bold mb-2">
            渐进式注册
          </h3>
          <p class="text-body-2 text-medium-emphasis">
            您可以暂时不配置 Classworks KV
          </p>
        </div>

        <v-progress-linear
          :model-value="progressValue"
          class="mb-6"
          color="primary"
          height="8"
          rounded
        />


        <v-row>
          <v-col
            cols="12"
          >
            <v-card
              :color="statusColor"
              variant="tonal"
            >
              <v-card-item>
                <div class="d-flex align-center mb-3">
                  <v-icon
                    :color="statusColor"
                    class="mr-2"
                    size="32"
                  >
                    {{ statusIcon }}
                  </v-icon>
                  <div class="text-h6 font-weight-medium">
                    {{ statusTitle }}
                  </div>
                </div>
                <div
                  v-if="deviceInfo"
                  class="text-body-2 mb-2"
                >
                  <div class="mb-2">
                    <strong>设备名称：</strong>{{ deviceInfo.deviceName }}
                  </div>
                  <div>
                    <strong>设备 UUID：</strong>
                    <code class="device-code">{{ deviceInfo.uuid }}</code>
                  </div>
                </div>
                <div
                  v-if="progressiveStatus === 'error'"
                  class="text-body-2 text-error"
                >
                  {{ progressiveError }}
                </div>
              </v-card-item>
            </v-card>
          </v-col>

          <v-col
            cols="12"
          >
            <v-card variant="outlined">
              <v-card-item>
                <div class="text-subtitle-2 font-weight-medium mb-3">
                  过程日志
                </div>
                <div class="log-box">
                  <div
                    v-for="(log, i) in logs"
                    :key="i"
                    class="text-caption log-line"
                  >
                    {{ log.time }} · {{ log.message }}
                  </div>
                  <div
                    v-if="!logs.length"
                    class="text-caption text-medium-emphasis"
                  >
                    等待开始…
                  </div>
                </div>
              </v-card-item>
            </v-card>
          </v-col>
        </v-row>

        <div class="d-flex flex-wrap gap-2 mt-4">
          <v-btn
            v-if="progressiveStatus === 'idle'"
            color="primary"
            prepend-icon="mdi-play"
            size="large"
            @click="startProgressiveRegister"
          >
            开始创建
          </v-btn>

          <v-btn
            v-if="progressiveStatus === 'error'"
            color="error"
            prepend-icon="mdi-refresh"
            variant="outlined"
            @click="retryProgressiveRegister"
          >
            重试
          </v-btn>

          <v-btn
            v-if="progressiveStatus === 'registering'"
            :loading="true"
            color="primary"
            prepend-icon="mdi-progress-clock"
            variant="tonal"
          >
            正在执行…
          </v-btn>

          <v-btn
            v-if="progressiveStatus === 'success'"
            color="success"
            prepend-icon="mdi-check-circle"
            size="large"
            variant="elevated"
            @click="applyTokenAndClose"
          >
            应用令牌并关闭
          </v-btn>

          <v-btn
            v-if="progressiveStatus === 'success'"
            color="primary"
            prepend-icon="mdi-open-in-new"
            size="large"
            variant="outlined"
            @click="openAuthPage"
          >
            前往绑定账户
          </v-btn>
        </div>
      </div>
    </v-card-text>

    <!-- 底部操作按钮 -->
    <v-card-actions class="pa-6 pt-0">
      <v-btn
        v-if="currentStep > 1"
        size="large"
        variant="text"
        @click="prevStep"
      >
        <v-icon start>
          mdi-chevron-left
        </v-icon>
        上一步
      </v-btn>
      <v-spacer />
      <v-btn
        v-if="currentStep < totalSteps && currentStep !== 4"
        :disabled="currentStep === 3 && !storageType"
        color="primary"
        size="large"
        variant="elevated"
        @click="nextStep"
      >
        下一步
        <v-icon end>
          mdi-chevron-right
        </v-icon>
      </v-btn>
      <v-btn
        v-if="currentStep === totalSteps || currentStep === 4"
        color="primary"
        size="large"
        variant="elevated"
        @click="finish"
      >
        关闭
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import {ref, computed} from 'vue'
import {getSetting, setSetting} from '@/utils/settings'
import axios from '@/axios/axios'
import {v4 as uuidv4} from 'uuid'

const emit = defineEmits(['close', 'success'])
const kvserverurl = getSetting('server.authDomain')
const currentStep = ref(1)
const totalSteps = 5
const storageType = ref('')

// 渐进式注册相关状态
const progressiveStatus = ref('idle') // 'idle' | 'registering' | 'success' | 'error'
const progressiveError = ref('')
const deviceInfo = ref(null)
const tokenData = ref(null) // 保存获取到的 token 数据
const logs = ref([])
const stepStates = ref({1: false, 2: false, 3: false, 4: false})

const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const selectStorageType = (type) => {
  storageType.value = type
  nextStep()
}

const finish = () => {
  emit('close')
}

const openKVSite = () => {
  window.open(kvserverurl, '_blank')
}

// 渐进式注册相关方法
const goToProgressiveStep = () => {
  currentStep.value = 5
}

// 计算属性
const progressValue = computed(() => {
  const done = Object.values(stepStates.value).filter(Boolean).length
  return (done / 4) * 100
})

const statusColor = computed(() => {
  return progressiveStatus.value === 'success'
    ? 'success'
    : progressiveStatus.value === 'error'
      ? 'error'
      : 'primary'
})

const statusIcon = computed(() => {
  return progressiveStatus.value === 'success'
    ? 'mdi-check-circle'
    : progressiveStatus.value === 'error'
      ? 'mdi-alert-circle'
      : progressiveStatus.value === 'registering'
        ? 'mdi-progress-clock'
        : 'mdi-rocket-launch'
})

const statusTitle = computed(() => {
  return progressiveStatus.value === 'success'
    ? '完成！设备已创建'
    : progressiveStatus.value === 'error'
      ? '创建失败'
      : progressiveStatus.value === 'registering'
        ? '正在执行…'
        : '准备开始'
})

const addLog = (message) => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  logs.value.push({time: `${hh}:${mm}:${ss}`, message})
}


const generateDeviceName = () => {
  return `Classworks`
}

// 主流程
const startProgressiveRegister = async () => {
  if (progressiveStatus.value === 'registering') return

  progressiveStatus.value = 'registering'
  progressiveError.value = ''
  logs.value = []
  stepStates.value = {1: false, 2: false, 3: false, 4: false}

  try {
    addLog('正在生成设备信息…')
    const uuid = uuidv4()
    const deviceName = generateDeviceName()
    const serverUrl = getSetting('server.domain')
    stepStates.value[1] = true

    addLog('向服务器注册设备…')
    const response = await axios.post(`${serverUrl}/devices`, {uuid, deviceName})
    void response
    stepStates.value[2] = true

    // 保存设备信息
    deviceInfo.value = {uuid, deviceName, createdAt: new Date().toISOString(), registered: true}
    localStorage.setItem('Classworks_progressive_device', JSON.stringify(deviceInfo.value))

    addLog('获取访问令牌…')
    try {
      const tokenResp = await axios.post(`${serverUrl}/apps/auth/token`, {
        namespace: uuid,
        password: '',
        appId: 'd158067f53627d2b98babe8bffd2fd7d',
      })
      if (tokenResp.data && tokenResp.data.token) {
        // 保存 token 数据供后续使用
        tokenData.value = tokenResp.data
        setSetting('server.kvToken', tokenResp.data.token)

        // 如果返回了 device 信息，保存 uuid
        if (tokenResp.data.device?.uuid) {
          setSetting('device.uuid', tokenResp.data.device.uuid)
        }

        addLog('已获取 Token 并写入配置')
      } else {
        addLog('未返回 Token，您可以稍后在授权页完成配置')
      }
    } catch (tokenErr) {
      console.warn('自动获取 Token 失败:', tokenErr)
      addLog('自动获取 Token 失败，可在授权页手动完成')
    }
    stepStates.value[3] = true

    addLog('完成！您可以应用令牌或前往授权页面继续配置')
    stepStates.value[4] = true
    progressiveStatus.value = 'success'
  } catch (error) {
    console.error('设备注册失败:', error)
    progressiveError.value = error.response?.data?.message || error.message || '网络连接失败'
    addLog('失败：' + progressiveError.value)
    progressiveStatus.value = 'error'
  }
}

const retryProgressiveRegister = () => {
  progressiveStatus.value = 'idle'
  progressiveError.value = ''
  logs.value = []
  stepStates.value = {1: false, 2: false, 3: false, 4: false}
}

const openAuthPage = () => {
  const info = deviceInfo.value
  if (!info?.uuid) return
  const authDomain = getSetting('server.authDomain')
  const url = `${authDomain}/?uuid=${encodeURIComponent(info.uuid)}&tolinktoaccount=true`
  window.open(url, '_blank')
}

// 应用令牌并关闭（触发 success 事件让父组件更新）
const applyTokenAndClose = () => {
  if (tokenData.value) {
    // 触发 success 事件，传递 token 数据，类似 DeviceAuthDialog
    emit('success', tokenData.value)
  }
  // 关闭引导
  emit('close')
}

</script>

<style scoped>
.guide-card {
  max-width: 100%;
  min-height: 500px;
}

.step-content {
  min-height: 400px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.button-group {
  max-width: 600px;
  margin: 0 auto;
}

.step-item {
  cursor: default;
}

/* 触屏优化 */
.v-btn {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* 大按钮区域便于点击 */
.v-btn.v-btn--size-x-large {
  min-height: 120px;
}

/* 关系图样式 */
.relationship-diagram {
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.diagram-item {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.diagram-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 100px;
}

.diagram-description {
  text-align: center;
}

@media (max-width: 768px) {
  .relationship-diagram {
    flex-direction: column;
    align-items: center;
  }

  .diagram-connector {
    transform: rotate(90deg);
    margin: 20px 0;
  }
}

/* 渐进式注册卡片样式 */
.progressive-register-card {
  transition: all 0.3s ease;
  border: 2px solid transparent !important;
}

.progressive-register-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
}

.progressive-register-card .card-icon-wrapper {
  flex-shrink: 0;
}

.progressive-register-card .card-actions {
  flex-shrink: 0;
}

.progressive-register-card code {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 渐进式注册页面样式 */
.log-box {
  height: 140px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 8px 12px;
}

.log-line + .log-line {
  margin-top: 4px;
}

.device-code {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
}
</style>
