<template>
  <v-alert
    v-if="isReadOnly"
    type="warning"
    variant="tonal"
    prominent
    closable
    class="readonly-warning"
    @click:close="dismissed = true"
  >
    <template #prepend>
      <v-icon icon="mdi-lock-alert" />
    </template>
    <v-alert-title>当前使用只读 Token</v-alert-title>
    <div class="text-body-2">
      您当前的访问令牌为只读权限，无法修改数据。如需编辑权限，请联系管理员或重新授权。
    </div>
    <template v-if="tokenInfo">
      <div class="mt-2 text-caption">
        <div>
          <strong>设备类型：</strong>{{ deviceTypeLabel }}
        </div>
        <div v-if="tokenInfo.note">
          <strong>备注：</strong>{{ tokenInfo.note }}
        </div>
        <div v-if="tokenInfo.device">
          <strong>设备：</strong>{{ tokenInfo.device.name }} ({{ tokenInfo.device.namespace }})
        </div>
      </div>
    </template>
  </v-alert>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getSetting } from '@/utils/settings'
import axios from '@/axios/axios'

const props = defineProps({
  autoCheck: {
    type: Boolean,
    default: true
  }
})

const tokenInfo = ref(null)
const loading = ref(false)
const dismissed = ref(false)

const isReadOnly = computed(() => {
  return !dismissed.value && tokenInfo.value?.isReadOnly === true
})

const deviceTypeLabel = computed(() => {
  const typeMap = {
    student: '学生',
    teacher: '教师',
    admin: '管理员',
    readonly: '只读',
  }
  return typeMap[tokenInfo.value?.deviceType] || tokenInfo.value?.deviceType || '未知'
})

const checkTokenPermission = async () => {
  const provider = getSetting('server.provider')
  const isKvProvider = provider === 'kv-server' || provider === 'classworkscloud'

  if (!isKvProvider) {
    return
  }

  const kvToken = getSetting('server.kvToken')
  if (!kvToken) {
    return
  }

  loading.value = true
  try {
    const serverUrl = getSetting('server.domain')
    if (!serverUrl) return

    const response = await axios.get(`${serverUrl}/kv/_token`, {
      headers: {
        Authorization: `Bearer ${kvToken}`
      }
    })

    if (response.data) {
      tokenInfo.value = response.data
    }
  } catch (err) {
    console.error('获取 Token 信息失败:', err)
  } finally {
    loading.value = false
  }
}

// 监听设置变化
const kvToken = computed(() => getSetting('server.kvToken'))
watch(kvToken, () => {
  if (props.autoCheck) {
    checkTokenPermission()
  }
})

onMounted(() => {
  if (props.autoCheck) {
    checkTokenPermission()
  }
})

// 暴露方法供外部调用
defineExpose({
  checkTokenPermission,
  tokenInfo,
  isReadOnly
})
</script>

<style scoped>
.readonly-warning {
  margin: 16px;
  border-left: 4px solid rgb(var(--v-theme-warning));
}
</style>
