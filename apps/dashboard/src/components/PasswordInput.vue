<script setup>
import {ref, computed, watch, onMounted} from 'vue'
import {apiClient} from '@/lib/api'
import {deviceStore} from '@/lib/deviceStore'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Button} from '@/components/ui/button'
import {
  HelpCircle,
  Info,
  AlertCircle
} from 'lucide-vue-next'

const props = defineProps({
  // 基础属性
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: '密码'
  },
  placeholder: {
    type: String,
    default: '输入密码'
  },
  id: {
    type: String,
    default: () => `password-${Math.random().toString(36).substr(2, 9)}`
  },

  // 功能属性
  showHint: {
    type: Boolean,
    default: true
  },

  // 密码提示相关
  deviceUuid: {
    type: String,
    default: null
  },
  customHint: {
    type: String,
    default: ''
  },

  // 验证相关
  required: {
    type: Boolean,
    default: false
  },
  confirmPassword: {
    type: String,
    default: ''
  },

  // 样式相关
  error: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 状态
const passwordHint = ref('')
const showHintPopup = ref(false)
const isLoading = ref(false)
const localValue = ref(props.modelValue)

// 获取设备UUID
const effectiveDeviceUuid = computed(() => {
  return props.deviceUuid || deviceStore.getDeviceUuid()
})


// 验证状态
const validationState = computed(() => {
  const errors = []

  if (props.required && !localValue.value) {
    errors.push('密码不能为空')
  }

  if (props.confirmPassword && localValue.value && localValue.value !== props.confirmPassword) {
    errors.push('两次输入的密码不一致')
  }

  if (props.error) {
    errors.push(props.error)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
})

// 加载密码提示
const loadPasswordHint = async () => {
  if (!props.showHint || props.customHint) {
    passwordHint.value = props.customHint
    return
  }

  if (!effectiveDeviceUuid.value) return

  isLoading.value = true

  try {
    // 首先尝试从设备信息API获取
    const deviceInfo = await apiClient.getDeviceInfo(effectiveDeviceUuid.value)
    if (deviceInfo.passwordHint) {
      passwordHint.value = deviceInfo.passwordHint
    } else {
      // 如果设备信息中没有，尝试从专门的密码提示API获取
      const data = await apiClient.getPasswordHint(effectiveDeviceUuid.value)
      if (data.hint) {
        passwordHint.value = data.hint
      }
    }
  } catch (error) {
    console.log('Failed to load password hint:', error)
    // 不再使用localStorage作为后备
  } finally {
    isLoading.value = false
  }
}


// 处理输入变化
const handleInput = (event) => {
  localValue.value = event.target.value
  emit('update:modelValue', localValue.value)
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal
})

// 监听自定义提示变化
watch(() => props.customHint, (newVal) => {
  if (newVal) {
    passwordHint.value = newVal
  }
})

onMounted(() => {
  loadPasswordHint()
})
</script>

<template>
  <div class="space-y-2">
    <!-- 标签行 -->
    <div v-if="label" class="flex items-center justify-between">
      <Label :for="id" class="text-sm font-medium">
        {{ label }}
        <span v-if="required" class="text-red-500 ml-0.5">*</span>
      </Label>

      <!-- 密码提示按钮 -->
      <button
          v-if="showHint && passwordHint"
          class="group relative"
          type="button"
          @click="showHintPopup = !showHintPopup"
      >
        <div class="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
          <HelpCircle class="h-3.5 w-3.5"/>
          <span>密码提示</span>
        </div>

        <!-- 密码提示弹出框 -->
        <div
            v-if="showHintPopup"
            class="absolute right-0 top-6 z-50 w-64 animate-in fade-in slide-in-from-top-1"
        >
          <div class="rounded-lg border bg-popover p-3 shadow-lg">
            <div class="flex items-start gap-2">
              <Info class="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0"/>
              <div class="space-y-1">
                <p class="text-xs font-medium">密码提示</p>
                <p class="text-xs text-muted-foreground">{{ passwordHint }}</p>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>

    <!-- 密码输入框 -->
    <div class="relative">
      <div class="relative">
        <Input
            :id="id"
            :class="{
            'border-red-500': !validationState.isValid && localValue
          }"
            :disabled="disabled"
            :placeholder="placeholder"
            :value="localValue"
            type="text"
            @input="handleInput"
        />

        <!-- 可见性切换按钮（已移除） -->
      </div>

      <!-- 内联密码提示（紧凑模式） -->
      <div
          v-if="showHint && passwordHint && !showHintPopup && !localValue"
          class="absolute left-0 -bottom-5 text-xs text-muted-foreground flex items-center gap-1"
      >
        <HelpCircle class="h-3 w-3"/>
        <span class="truncate max-w-[200px]">{{ passwordHint }}</span>
      </div>
    </div>


    <!-- 错误信息 -->
    <div v-if="!validationState.isValid && localValue" class="space-y-1">
      <div
          v-for="(error, index) in validationState.errors"
          :key="index"
          class="flex items-center gap-1.5 text-xs text-red-500"
      >
        <AlertCircle class="h-3 w-3"/>
        <span>{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 添加动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeIn 0.2s ease-out;
}
</style>