<template>
  <v-card class="auth-card">
    <v-card-text class="pa-8">
      <div class="text-center mb-6">
        <v-icon
          size="80"
          color="success"
          class="mb-4"
        >
          mdi-account-key
        </v-icon>
        <h2 class="text-h4 mb-3">
          设备认证
        </h2>
        <p class="text-body-1 text-medium-emphasis">
          输入你在 Classworks KV 获取的认证信息
        </p>
      </div>

      <v-card
        variant="tonal"
        color="info"
        class="pa-4 mb-6"
      >
        <div class="text-body-2">
          <v-icon
            size="20"
            class="mr-2"
          >
            mdi-information
          </v-icon>
         对于已有UUID的用户，您应当使用UUID与您的密码登录。
        </div>
      </v-card>

      <div class="form-section">
        <v-text-field
          v-model="form.namespace"
          label="命名空间"
          class="mb-4"
          variant="outlined"
          hide-details="auto"
          prepend-inner-icon="mdi-identifier"
        >

        </v-text-field>

        <v-text-field
          v-model="form.password"
          label="认证码"
          type="text"
          variant="outlined"
          prepend-inner-icon="mdi-lock-outline"
        >

        </v-text-field>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="error = ''"
        >
          {{ error }}
        </v-alert>
      </div>
    </v-card-text>

    <v-card-actions class="pa-6 pt-0">
      <v-btn
        v-if="showCancel"
        size="large"
        variant="text"
        @click="$emit('cancel')"
      >
        取消
      </v-btn>
      <v-spacer />
      <v-btn
        :disabled="!form.namespace || authenticating"
        :loading="authenticating"
        size="x-large"
        color="primary"
        variant="elevated"
        class="px-8"
        @click="authenticate"
      >
        <v-icon
          start
          size="24"
        >
          mdi-login
        </v-icon>
        <span class="text-h6">认证并登录</span>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { getSetting, setSetting } from '@/utils/settings'
import axios from '@/axios/axios'

defineProps({
  showCancel: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['success', 'cancel'])

const form = ref({
  namespace: '',
  password: ''
})
const authenticating = ref(false)
const error = ref('')

const authenticate = async () => {
  if (!form.value.namespace || authenticating.value) return
  error.value = ''
  authenticating.value = true

  try {
    const serverUrl = getSetting('server.domain')
    if (!serverUrl) throw new Error('未配置服务器域名')

    // 验证设备并获取 token
    const response = await axios.post(`${serverUrl}/apps/auth/token`, {
      namespace: form.value.namespace,
      password: form.value.password || undefined,
      appId: "d158067f53627d2b98babe8bffd2fd7d"
    })

    if (!response.data.success) {
      throw new Error('设备验证失败')
    }

    const tokenData = response.data

    // 保存 Token
    setSetting('server.kvToken', tokenData.token)

    // 如果返回了 device 信息，保存 uuid
    if (tokenData.device?.uuid) {
      setSetting('device.uuid', tokenData.device.uuid)
    }

    emit('success', tokenData)

  } catch (err) {
    const status = err?.response?.status
    if (status === 401 || status === 403) {
      error.value = '密码错误或无权限访问'
    } else if (status === 404) {
      error.value = '设备不存在,请检查 namespace 是否正确'
    } else {
      error.value = err?.response?.data?.error?.message || err?.message || '认证失败,请稍后重试'
    }
  } finally {
    authenticating.value = false
  }
}

// 暴露清空表单的方法
defineExpose({
  reset: () => {
    form.value = { namespace: '', password: '' }
    error.value = ''
  }
})
</script>

<style scoped>
.auth-card {
  max-width: 100%;
  min-height: 500px;
}

.form-section {
  max-width: 600px;
  margin: 0 auto;
}

/* 触屏优化 */
.v-btn {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.v-btn.v-btn--size-x-large {
  min-height: 60px;
}
</style>
