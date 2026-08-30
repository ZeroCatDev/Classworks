<template>
  <!-- 统一姓名设置对话框（学生 / 教师） -->
  <v-dialog v-model="showDialog" max-width="720" persistent>
    <v-card>
      <v-card-title>{{ dialogTitle }}</v-card-title>
      <v-card-text>
        <!-- 学生模式 -->
        <template v-if="isStudentToken">
          <div class="mb-2">请从列表中选择您的姓名：</div>
          <v-autocomplete
            v-model="selectedName"
            :items="studentList"
            clearable
            hide-details
            item-title="name"
            item-value="name"
            label="学生姓名"
            placeholder="选择您的姓名"
          />
          <div v-if="studentList.length > 0" class="mt-2 text-caption text-medium-emphasis">
            共 {{ studentList.length }} 位学生
          </div>
        </template>

        <!-- 教师模式 -->
        <template v-else-if="isTeacherToken">
          <!-- 名称输入框 -->
          <v-text-field
            v-model="teacherForm.name"
            label="教师姓名"
            placeholder="输入姓名或从下方建议中选择"
            clearable
          />
          <!-- 建议列表 -->
          <div class="mt-2 mb-4">
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="teacher in filteredTeacherSuggestions"
                :key="teacher.name"
                size="small"
                @click="selectTeacherFromSuggestion(teacher)"
              >
                {{ teacher.name }}
                <span v-if="teacher.isHeadTeacher" class="ms-1 text-error"> 👨‍🏫 </span>
              </v-chip>
            </div>
          </div>

          <!-- 班主任开关 -->
          <v-switch
            v-model="teacherForm.isHeadTeacher"
            inset
            color="primary"
            :label="teacherForm.isHeadTeacher ? '班主任' : '非班主任'"
          />

          <!-- 任教科目 -->
          <v-combobox
            v-model="teacherForm.subjects"
            multiple
            chips
            clearable
            label="任教科目"
            hint="可直接输入并回车添加多个科目"
            persistent-hint
          />
        </template>

        <v-alert v-if="error" class="mt-3" type="error" variant="tonal">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="skipSetting"> 稍后设置 </v-btn>
        <v-spacer />
        <v-btn
          v-if="isStudentToken"
          :disabled="!selectedName || saving"
          :loading="saving"
          color="primary"
          @click="saveStudentName"
        >
          确认
        </v-btn>
        <v-btn
          v-else-if="isTeacherToken"
          :disabled="!teacherForm.name || saving"
          :loading="saving"
          color="primary"
          @click="saveTeacherName"
        >
          确认
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 顶栏学生姓名显示（通过插槽暴露给父组件） -->
  <slot
    :is-student="isStudentToken"
    :open-dialog="openDialog"
    :student-name="currentStudentName"
    :teacher-name="currentTeacherName"
    name="header-display"
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

// 教师相关状态
const teacherList = ref([])
const selectedTeacherName = ref('')
const currentTeacherName = ref('')
const teacherForm = ref({ name: '', isHeadTeacher: false, subjects: [] })

const isStudentToken = computed(() => tokenInfo.value?.deviceType === 'student')
const isTeacherToken = computed(() => tokenInfo.value?.deviceType === 'teacher')
const isReadOnly = computed(() => tokenInfo.value?.isReadOnly === true)
const displayName = computed(() => tokenInfo.value?.note || '设置名称')
const hasToken = computed(() => !!kvToken.value)
const kvToken = computed(() => getSetting('server.kvToken'))
const provider = computed(() => getSetting('server.provider'))
const isKvProvider = computed(
  () => provider.value === 'kv-server' || provider.value === 'classworkscloud',
)
const dialogTitle = computed(() =>
  isStudentToken.value ? '设置学生姓名' : isTeacherToken.value ? '设置教师姓名' : '设置姓名',
)
// 教师建议列表（显示所有教师）
const filteredTeacherSuggestions = computed(() => teacherList.value)

// 检查是否需要设置姓名（学生/教师）
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
        Authorization: `Bearer ${kvToken.value}`,
      },
    })

    tokenInfo.value = tokenResponse.data

    // 学生设备处理
    if (tokenInfo.value.deviceType === 'student') {
      currentStudentName.value = tokenInfo.value.note || ''

      const listResponse = await axios.get(`${serverUrl}/kv/classworks-list-main`, {
        headers: { Authorization: `Bearer ${kvToken.value}` },
      })
      const list = listResponse.data.value || []
      studentList.value = Array.isArray(list) ? list : []

      if (studentList.value.length > 0) {
        const currentNote = tokenInfo.value.note || ''
        const nameExists = studentList.value.some((s) => s.name === currentNote)
        if (!currentNote || !nameExists) {
          showDialog.value = true
          selectedName.value = ''
        }
      }
      return
    }

    // 教师设备处理
    if (tokenInfo.value.deviceType === 'teacher') {
      currentTeacherName.value = tokenInfo.value.note || ''

      try {
        const listResponse = await axios.get(`${serverUrl}/kv/classworks-list-teacher`, {
          headers: { Authorization: `Bearer ${kvToken.value}` },
        })
        const list = listResponse.data.value || []
        teacherList.value = Array.isArray(list) ? list : []
      } catch (err) {
        // 如果列表不存在（404），初始化为空数组
        if (err?.response?.status === 404) {
          console.log('教师列表不存在，初始化为空')
          teacherList.value = []
        } else {
          console.error('加载教师列表失败:', err)
          teacherList.value = []
        }
      }

      if (teacherList.value.length > 0) {
        const currentNote = tokenInfo.value.note || ''
        const nameExists = teacherList.value.some((t) => t.name === currentNote)
        if (!currentNote || !nameExists) {
          showDialog.value = true
          selectedTeacherName.value = ''
        }
      }
      return
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

    const response = await axios.post(`${serverUrl}/apps/tokens/${token}/set-student-name`, {
      name: selectedName.value,
    })

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

// 保存教师姓名
const saveTeacherName = async () => {
  if (!teacherForm.value.name || saving.value) return
  error.value = ''
  saving.value = true

  try {
    const serverUrl = getSetting('server.domain')
    const token = kvToken.value

    // 构建教师数据
    const entry = {
      name: teacherForm.value.name.trim(),
      isHeadTeacher: !!teacherForm.value.isHeadTeacher,
      subjects: Array.isArray(teacherForm.value.subjects)
        ? teacherForm.value.subjects
            .filter((s) => s && String(s).trim())
            .map((s) => String(s).trim())
        : [],
    }

    // 先更新本地列表
    const idx = teacherList.value.findIndex((t) => t.name === entry.name)
    if (idx >= 0) {
      teacherList.value[idx] = entry
    } else {
      teacherList.value.push(entry)
    }

    // 保存列表到 KV
    const res = await dataProvider.saveData('classworks-list-teacher', teacherList.value)
    if (res?.success === false) {
      throw new Error(res?.error?.message || '保存列表失败')
    }

    // 设置教师名称
    const response = await axios.post(`${serverUrl}/apps/tokens/${token}/set-teacher-name`, {
      name: entry.name,
    })

    if (response.data.success) {
      currentTeacherName.value = entry.name
      showDialog.value = false
      await checkStudentNameStatus()
      emit('token-info-updated')
    }
  } catch (err) {
    const status = err?.response?.status
    if (status === 400) {
      error.value = '该名称不在教师列表中，请选择正确的姓名'
    } else if (status === 403) {
      error.value = '只有教师类型的 Token 可以设置姓名'
    } else if (status === 404) {
      error.value = '设备未设置教师列表或 Token 不存在'
    } else {
      error.value = err?.response?.data?.error?.message || err?.message || '设置失败，请稍后重试'
    }
  } finally {
    saving.value = false
  }
}

// 从建议中选择教师，自动填充班主任和科目
const selectTeacherFromSuggestion = (teacher) => {
  teacherForm.value.name = teacher.name
  teacherForm.value.isHeadTeacher = teacher.isHeadTeacher || false
  teacherForm.value.subjects = Array.isArray(teacher.subjects) ? [...teacher.subjects] : []
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

  if (isStudentToken.value) {
    const resp = await dataProvider.loadData('classworks-list-main')
    studentList.value = Array.isArray(resp?.value) ? resp.value : Array.isArray(resp) ? resp : []
    if (studentList.value.length === 0) {
      console.log('Student list is empty, trying to load...')
      await checkStudentNameStatus()
      selectedName.value = currentStudentName.value
      showDialog.value = true
    } else {
      selectedName.value = currentStudentName.value
      showDialog.value = true
    }
    return
  }

  if (isTeacherToken.value) {
    try {
      const resp = await dataProvider.loadData('classworks-list-teacher')
      teacherList.value = Array.isArray(resp?.value) ? resp.value : Array.isArray(resp) ? resp : []
    } catch {
      // 如果列表不存在，初始化为空
      console.log('教师列表不存在或加载失败，允许手动创建')
      teacherList.value = []
    }
    // 重置教师表单
    teacherForm.value = { name: currentTeacherName.value, isHeadTeacher: false, subjects: [] }
    // 如果当前有教师名称，尝试从列表中读取班主任和科目信息
    if (currentTeacherName.value) {
      const found = teacherList.value.find((t) => t.name === currentTeacherName.value)
      if (found) {
        teacherForm.value.isHeadTeacher = found.isHeadTeacher || false
        teacherForm.value.subjects = Array.isArray(found.subjects) ? [...found.subjects] : []
      }
    }
    showDialog.value = true
    console.log('Dialog opened (teacher), showDialog:', showDialog.value)
    return
  }

  console.log('Not a student/teacher token, cannot open dialog')
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
watch(
  tokenInfo,
  () => {
    emit('token-info-updated')
  },
  { deep: true },
)

// 初始化
onMounted(() => {
  checkStudentNameStatus()
})

// 暴露方法和状态给父组件
defineExpose({
  checkStudentNameStatus,
  openDialog,
  currentStudentName,
  currentTeacherName,
  isStudentToken,
  isTeacherToken,
  isReadOnly,
  displayName,
  hasToken,
  tokenInfo,
})
</script>

<style scoped>
/* 组件样式 */
</style>
