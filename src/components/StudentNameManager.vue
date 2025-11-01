<template>
  <!-- 学生姓名选择对话框 -->
  <v-dialog
    v-model="showDialog"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title>设置学生姓名</v-card-title>
      <v-card-text>
        <div class="mb-2">
          请从列表中选择您的姓名：
        </div>
        <v-autocomplete
          v-model="selectedName"
          :items="studentList"
          item-title="name"
          item-value="name"
          label="学生姓名"
          placeholder="选择您的姓名"
          clearable
          hide-details
        />
        <div
          v-if="studentList.length > 0"
          class="mt-2 text-caption text-medium-emphasis"
        >
          共 {{ studentList.length }} 位学生
        </div>
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mt-3"
        >
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn
          variant="text"
          @click="skipSetting"
        >
          稍后设置
        </v-btn>
        <v-spacer />
        <v-btn
          :disabled="!selectedName || saving"
          :loading="saving"
          color="primary"
          @click="saveStudentName"
        >
          确认
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 顶栏学生姓名显示（通过插槽暴露给父组件） -->
  <slot
    name="header-display"
    :student-name="currentStudentName"
    :is-student="isStudentToken"
    :open-dialog="openDialog"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getSetting, watchSettings } from '@/utils/settings'
import axios from '@/axios/axios'
import dataProvider from '@/utils/dataProvider'
const emit = defineEmits(['token-info-updated'])

const showDialog = ref(false)
const selectedName = ref('')
const studentList = ref([])
const currentStudentName = ref('')
const saving = ref(false)
const error = ref('')
const tokenInfo = ref(null)

const isStudentToken = computed(() => tokenInfo.value?.deviceType === 'student')
const isReadOnly = computed(() => tokenInfo.value?.isReadOnly === true)
const displayName = computed(() => tokenInfo.value?.note || '设置名称')
const hasToken = computed(() => !!kvToken.value)
const kvToken = computed(() => getSetting('server.kvToken'))
const provider = computed(() => getSetting('server.provider'))
const isKvProvider = computed(() => provider.value === 'kv-server' || provider.value === 'classworkscloud')

// 检查是否需要设置学生姓名
const checkStudentNameStatus = async () => {
  if (!isKvProvider.value || !kvToken.value) {
    return
  }

  try {
    const serverUrl = getSetting('server.domain')
    if (!serverUrl) return

    // 获取 Token 信息
    const tokenResponse = await axios.get(`${serverUrl}/kv/_token`, {
      headers: {
        Authorization: `Bearer ${kvToken.value}`
      }
    })

    tokenInfo.value = tokenResponse.data

    // 如果不是学生类型，不需要处理
    if (tokenInfo.value.deviceType !== 'student') {
      return
    }

    // 保存当前学生姓名
    currentStudentName.value = tokenInfo.value.note || ''

    // 获取学生列表
    const listResponse = await axios.get(`${serverUrl}/kv/classworks-list-main`, {
      headers: {
        Authorization: `Bearer ${kvToken.value}`
      }
    })

    const list = listResponse.data.value || []
    studentList.value = Array.isArray(list) ? list : []

    // 如果学生列表为空，不需要提示
    if (studentList.value.length === 0) {
      return
    }

    // 检查当前姓名是否在学生列表中
    const currentNote = tokenInfo.value.note || ''
    const nameExists = studentList.value.some(student => student.name === currentNote)

    // 如果姓名为空或不在列表中，显示对话框
    if (!currentNote || !nameExists) {
      showDialog.value = true
      selectedName.value = ''
    }

  } catch (err) {
    console.error('检查学生姓名状态失败:', err)
  }
}

// 保存学生姓名
const saveStudentName = async () => {
  if (!selectedName.value || saving.value) return
  error.value = ''
  saving.value = true

  try {
    const serverUrl = getSetting('server.domain')
    const token = kvToken.value

    const response = await axios.post(
      `${serverUrl}/apps/tokens/${token}/set-student-name`,
      {
        name: selectedName.value
      }
    )

    if (response.data.success) {
      currentStudentName.value = selectedName.value
      showDialog.value = false
      // 刷新 token 信息
      await checkStudentNameStatus()
      // 通知父组件更新显示
      emit('token-info-updated')
    }
  } catch (err) {
    const status = err?.response?.status
    if (status === 400) {
      error.value = '该名称不在学生列表中，请选择正确的姓名'
    } else if (status === 403) {
      error.value = '只有学生类型的 Token 可以设置姓名'
    } else if (status === 404) {
      error.value = '设备未设置学生列表或 Token 不存在'
    } else {
      error.value = err?.response?.data?.error?.message || err?.message || '设置失败，请稍后重试'
    }
  } finally {
    saving.value = false
  }
}

// 跳过设置
const skipSetting = () => {
  showDialog.value = false
}

// 手动打开对话框（用于编辑）
const openDialog = async () => {
  console.log('StudentNameManager.openDialog called')
  console.log('isStudentToken:', isStudentToken.value)
  console.log('studentList.length:', studentList.value.length)
  console.log('currentStudentName:', currentStudentName.value)

  if (!isStudentToken.value) {
    console.log('Not a student token, cannot open dialog')
    return
  }
  studentList.value = await dataProvider.loadData('classworks-list-main')
  // 如果是学生 token，即使列表为空也应该打开对话框
  // 可能是列表还在加载中
  if (studentList.value.length === 0) {
    console.log('Student list is empty, trying to load...')
    // 重新加载学生列表
    checkStudentNameStatus().then(() => {
      if (studentList.value.length > 0) {
        selectedName.value = currentStudentName.value
        showDialog.value = true
      } else {
        console.warn('Student list is still empty after reload')
      }
    })
  } else {
    selectedName.value = currentStudentName.value
    showDialog.value = true
    console.log('Dialog opened, showDialog:', showDialog.value)
  }
}

// 监听 token 变化
watch(kvToken, () => {
  checkStudentNameStatus()
})

// 监听设置变化
watchSettings(() => {
  checkStudentNameStatus()
})

// 监听 tokenInfo 变化，通知父组件
watch(tokenInfo, () => {
  emit('token-info-updated')
}, { deep: true })

// 初始化
onMounted(() => {
  checkStudentNameStatus()
})

// 暴露方法和状态给父组件
defineExpose({
  checkStudentNameStatus,
  openDialog,
  currentStudentName,
  isStudentToken,
  isReadOnly,
  displayName,
  hasToken,
  tokenInfo
})
</script>

<style scoped>
/* 组件样式 */
</style>
