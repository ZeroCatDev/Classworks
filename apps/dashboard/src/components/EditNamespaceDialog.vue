<script setup>
import {ref, watch} from 'vue'
import {apiClient} from '@/lib/api'
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
import {Loader2} from 'lucide-vue-next'
import {toast} from 'vue-sonner'

const props = defineProps({
  modelValue: Boolean,
  deviceUuid: String,
  currentNamespace: String,
  accountToken: String,
})

const emit = defineEmits(['update:modelValue', 'success'])

const isLoading = ref(false)
const namespace = ref('')

// 监听对话框打开状态
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    namespace.value = props.currentNamespace || ''
  }
})

// 关闭对话框
const closeDialog = () => {
  emit('update:modelValue', false)
}

// 保存 namespace
const saveNamespace = async () => {
  // 验证
  const trimmedNamespace = namespace.value.trim()
  if (!trimmedNamespace) {
    toast.error('命名空间不能为空')
    return
  }

  // 如果与当前值相同，不需要更新
  if (trimmedNamespace === props.currentNamespace) {
    toast.info('命名空间未修改')
    closeDialog()
    return
  }

  isLoading.value = true
  try {
    await apiClient.updateDeviceNamespace(
        props.deviceUuid,
        props.accountToken,
        trimmedNamespace
    )
    toast.success('命名空间更新成功')
    emit('success', trimmedNamespace)
    closeDialog()
  } catch (error) {
    if (error.message.includes('409') || error.message.includes('已被使用')) {
      toast.error('该命名空间已被其他设备使用，请使用其他名称')
    } else {
      toast.error('更新失败：' + error.message)
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog :open="modelValue" @update:open="(val) => emit('update:modelValue', val)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>编辑命名空间</DialogTitle>
        <DialogDescription>
          修改设备的命名空间，用于自动授权登录时识别设备
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="namespace">
            命名空间
            <span class="text-xs text-muted-foreground ml-2">
              (必填)
            </span>
          </Label>
          <Input
              id="namespace"
              v-model="namespace"
              autocomplete="off"
              placeholder="例如: class-2024-grade1"
              type="text"
          />
          <p class="text-xs text-muted-foreground">
            命名空间用于自动授权接口，必须全局唯一
          </p>
        </div>

        <!-- 提示信息 -->
        <div class="rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
          <p class="font-medium mb-1">💡 提示：</p>
          <ul class="space-y-1 list-disc list-inside">
            <li>命名空间在所有设备中必须唯一</li>
            <li>建议使用有意义的名称，如班级、房间号等</li>
            <li>修改后，使用旧命名空间的自动登录将失效</li>
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button
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
            @click="saveNamespace"
        >
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin"/>
          保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
