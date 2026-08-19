<script setup>
import {ref, watch} from 'vue'
import {apiClient} from '@/lib/api'
import {deviceStore} from '@/lib/deviceStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Loader2, Eye, EyeOff} from 'lucide-vue-next'
import {toast} from 'vue-sonner'

const props = defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    default: '设备认证'
  },
  description: {
    type: String,
    default: '请输入设备 UUID'
  },
  closable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const isLoading = ref(false)

const deviceUuid = ref('')


// 监听对话框打开，自动填充 UUID
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    const uuid = deviceStore.getDeviceUuid()
    if (uuid) {
      deviceUuid.value = uuid
    }
  }
})

// 关闭对话框
const closeDialog = () => {
  if (props.closable) {
    emit('update:modelValue', false)
  }
}

// 验证并登录
const handleAuth = async () => {
  if (!deviceUuid.value) {
    toast.error('请输入设备 UUID')
    return
  }

  isLoading.value = true
  try {
    // 尝试通过 UUID 验证设备
    const deviceInfo = await apiClient.getDeviceInfo(deviceUuid.value)

    // 验证成功，保存到 deviceStore
    deviceStore.setDeviceUuid(deviceUuid.value)

    toast.success('认证成功')
    emit('success', deviceUuid.value, deviceInfo)
  } catch (error) {
    toast.error('认证失败：' + error.message)
  } finally {
    isLoading.value = false
  }
}


</script>

<template>
  <Dialog :open="modelValue" @update:open="(val) => closable && emit('update:modelValue', val)">
    <DialogContent :closable="closable" class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- UUID 输入 -->
        <div class="space-y-2">
          <Label for="device-uuid">设备 UUID *</Label>
          <Input
              id="device-uuid"
              v-model="deviceUuid"
              placeholder="输入设备 UUID"
              @keyup.enter="handleAuth"
          />
        </div>


      </div>

      <DialogFooter>
        <Button
            v-if="closable"
            :disabled="isLoading"
            type="button"
            variant="outline"
            @click="closeDialog"
        >
          取消
        </Button>
        <Button
            :disabled="isLoading"
            type="button"
            @click="handleAuth"
        >
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin"/>
          确认
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
