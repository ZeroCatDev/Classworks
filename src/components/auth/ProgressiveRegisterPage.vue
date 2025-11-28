<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon
        class="mr-2"
        icon="mdi-account-plus"
      />
      渐进式注册
    </v-card-title>

    <v-card-text>
      <div v-if="!isRegistered && !isRegistering">
        <p class="text-body-1 mb-4">
          快速创建设备并开始使用 Classworks 云端功能
        </p>

        <v-alert
          class="mb-4"
          type="info"
          variant="tonal"
        >
          <template #prepend>
            <v-icon icon="mdi-information"/>
          </template>
          系统将自动为您创建设备并获取访问令牌，无需手动配置
        </v-alert>
      </div>

      <!-- 注册进行中 -->
      <div v-else-if="isRegistering">
        <div class="text-center py-4">
          <v-progress-circular
            class="mb-4"
            color="primary"
            indeterminate
            size="48"
          />
          <p class="text-h6 mb-2">
            正在注册设备...
          </p>
          <p class="text-body-2 text-medium-emphasis">
            {{ registrationStep }}
          </p>
        </div>
      </div>

      <!-- 注册成功 -->
      <div v-else-if="isRegistered && deviceInfo">
        <v-alert
          class="mb-4"
          type="success"
          variant="tonal"
        >
          <template #prepend>
            <v-icon icon="mdi-check-circle"/>
          </template>
          设备注册成功！已自动获取访问令牌
        </v-alert>

        <v-list>
          <v-list-item>
            <template #prepend>
              <v-icon icon="mdi-identifier"/>
            </template>
            <v-list-item-title>设备名称</v-list-item-title>
            <v-list-item-subtitle>{{ deviceInfo.deviceName }}</v-list-item-subtitle>
          </v-list-item>

          <v-list-item>
            <template #prepend>
              <v-icon icon="mdi-key"/>
            </template>
            <v-list-item-title>设备 UUID</v-list-item-title>
            <v-list-item-subtitle class="font-mono text-caption">
              {{ deviceInfo.uuid }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <v-alert
          class="mt-4"
          type="info"
          variant="tonal"
        >
          <template #prepend>
            <v-icon icon="mdi-information"/>
          </template>
          您可以点击下方按钮访问云端控制台来设置密码和管理高级功能
        </v-alert>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="errorMessage">
        <v-alert
          class="mb-4"
          type="error"
          variant="tonal"
        >
          <template #prepend>
            <v-icon icon="mdi-alert-circle"/>
          </template>
          {{ errorMessage }}
        </v-alert>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-spacer/>

      <!-- 注册按钮 -->
      <v-btn
        v-if="!isRegistered && !isRegistering"
        :loading="isRegistering"
        color="primary"
        prepend-icon="mdi-plus"
        @click="registerDevice"
      >
        注册设备
      </v-btn>

      <!-- 访问控制台按钮 -->
      <v-btn
        v-if="isRegistered && deviceInfo"
        color="success"
        prepend-icon="mdi-open-in-new"
        @click="openConsole"
      >
        访问控制台
      </v-btn>

      <!-- 重试按钮 -->
      <v-btn
        v-if="errorMessage"
        color="primary"
        prepend-icon="mdi-refresh"
        @click="resetAndRetry"
      >
        重试
      </v-btn>

      <v-btn
        variant="text"
        @click="$emit('close')"
      >
        关闭
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import {ref} from 'vue'
import {getSetting, setSetting} from '@/utils/settings'
import axios from '@/axios/axios'

// 事件定义
const emit = defineEmits(['close', 'success'])

// 本地存储键名
const PROGRESSIVE_DEVICE_KEY = 'Classworks_progressive_device'

// 响应式数据
const isRegistering = ref(false)
const isRegistered = ref(false)
const deviceInfo = ref(null)
const errorMessage = ref('')
const registrationStep = ref('')

// 生成 UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 生成随机设备名称
const generateDeviceName = () => {
  const adjectives = ['快速', '智能', '高效', '便捷', '实用', '简洁', '现代', '专业']
  const nouns = ['设备', '终端', '工作站', '助手', '伴侣']
  const numbers = Math.floor(Math.random() * 999) + 1

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]

  return `${adjective}${noun}${numbers}`
}

// 保存设备信息到本地存储
const saveDeviceInfo = (info) => {
  try {
    localStorage.setItem(PROGRESSIVE_DEVICE_KEY, JSON.stringify(info))
    deviceInfo.value = info
  } catch (error) {
    console.error('保存设备信息失败:', error)
  }
}

// 注册设备
const registerDevice = async () => {
  if (isRegistering.value) return

  isRegistering.value = true
  errorMessage.value = ''
  registrationStep.value = '正在生成设备信息...'

  try {
    const uuid = generateUUID()
    const deviceName = generateDeviceName()
    const serverUrl = getSetting('server.domain')

    registrationStep.value = '正在注册设备到服务器...'
    console.log('开始注册设备:', {uuid, deviceName, serverUrl})

    // 调用设备注册接口
    const response = await axios.post(`${serverUrl}/devices`, {
      uuid,
      deviceName
    })

    console.log('设备注册响应:', response.data)

    // 保存设备信息
    const newDeviceInfo = {
      uuid,
      deviceName,
      createdAt: new Date().toISOString(),
      registered: true
    }

    saveDeviceInfo(newDeviceInfo)

    registrationStep.value = '正在获取访问令牌...'

    // 自动获取 token（使用 uuid 作为 namespace，密码为空）
    await autoLogin(uuid)

    isRegistered.value = true

  } catch (error) {
    console.error('设备注册失败:', error)
    errorMessage.value = error.response?.data?.message || error.message || '网络连接失败'
  } finally {
    isRegistering.value = false
    registrationStep.value = ''
  }
}

// 自动登录获取 token
const autoLogin = async (uuid) => {
  try {
    const serverUrl = getSetting('server.domain')

    // 使用设备认证接口获取 token
    const response = await axios.post(`${serverUrl}/apps/auth/token`, {
      namespace: uuid,
      password: '' // 空密码
    })

    if (response.data && response.data.token) {
      // 设置 token 到配置中
      setSetting('server.kvToken', response.data.token)
      console.log('自动登录成功，token 已设置')

      // 触发成功事件
      emit('success', response.data)
    }
  } catch (error) {
    console.error('自动登录失败:', error)
    throw new Error('获取访问令牌失败: ' + (error.response?.data?.message || error.message))
  }
}

// 打开控制台
const openConsole = () => {
  if (!deviceInfo.value) return

  const authDomain = getSetting('server.authDomain')
  const url = `${authDomain}/?uuid=${encodeURIComponent(deviceInfo.value.uuid)}`

  console.log('打开控制台:', url)
  window.open(url, '_blank')
}

// 重置并重试
const resetAndRetry = () => {
  errorMessage.value = ''
  isRegistered.value = false
  deviceInfo.value = null
  // 清除本地存储
  try {
    localStorage.removeItem(PROGRESSIVE_DEVICE_KEY)
  } catch (error) {
    console.error('清除本地存储失败:', error)
  }
}
</script>

<style scoped>
.font-mono {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
