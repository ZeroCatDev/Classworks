<script setup>
import {ref, computed, watch} from 'vue'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {Checkbox} from '@/components/ui/checkbox'
import {Loader2} from 'lucide-vue-next'
import {toast} from 'vue-sonner'

const props = defineProps({
  modelValue: Boolean,
  deviceUuid: String,
  accountToken: String, // 改为使用 accountToken
  config: Object, // 如果是编辑模式，传入现有配置
})

const emit = defineEmits(['update:modelValue', 'success'])

const isLoading = ref(false)

// 表单数据
const formData = ref({
  password: '',
  deviceType: null,
  isReadOnly: false,
})

// 是否为编辑模式
const isEditMode = computed(() => !!props.config)

// 对话框标题
const dialogTitle = computed(() => {
  return isEditMode.value ? '编辑自动授权配置' : '创建自动授权配置'
})

// 设备类型选项
const deviceTypeOptions = [
  {value: 'teacher', label: '教师'},
  {value: 'student', label: '学生'},
  {value: 'classroom', label: '班级一体机'},
  {value: 'parent', label: '家长'},
  {value: null, label: '未指定'},
]

// 监听对话框打开状态，重置表单
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    if (isEditMode.value) {
      // 编辑模式：加载现有配置，显示原密码
      formData.value = {
        password: props.config.password || '', // 显示原密码（明文），如果是哈希则为空
        deviceType: props.config.deviceType,
        isReadOnly: props.config.isReadOnly ?? false, // 确保有默认值
      }
    } else {
      // 创建模式：重置表单
      formData.value = {
        password: '',
        deviceType: null,
        isReadOnly: false,
      }
    }
  }
})

// 关闭对话框
const closeDialog = () => {
  emit('update:modelValue', false)
}

// 保存配置
const saveConfig = async () => {
  // 基本验证
  if (formData.value.deviceType === undefined) {
    toast.error('请选择设备类型')
    return
  }

  isLoading.value = true
  try {
    if (isEditMode.value) {
      // 更新配置
      const updates = {
        deviceType: formData.value.deviceType,
        isReadOnly: formData.value.isReadOnly,
        // 编辑模式：总是更新密码字段（留空表示设为无密码）
        password: formData.value.password || null,
      }

      await apiClient.updateAutoAuthConfig(
          props.deviceUuid,
          props.accountToken,
          props.config.id,
          updates
      )
      toast.success('配置更新成功')
    } else {
      // 创建配置
      const config = {
        deviceType: formData.value.deviceType,
        isReadOnly: formData.value.isReadOnly,
      }
      // 如果填写了密码，则添加密码字段
      if (formData.value.password) {
        config.password = formData.value.password
      }

      await apiClient.createAutoAuthConfig(
          props.deviceUuid,
          props.accountToken,
          config
      )
      toast.success('配置创建成功')
    }

    emit('success')
    closeDialog()
  } catch (error) {
    toast.error(isEditMode.value ? '更新失败：' + error.message : '创建失败：' + error.message)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog :open="modelValue" @update:open="(val) => emit('update:modelValue', val)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription>
          {{ isEditMode ? '修改自动授权配置的设置' : '创建新的自动授权配置' }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- 密码输入 -->
        <div class="space-y-2">
          <Label for="password">
            授权密码
            <span class="text-xs text-muted-foreground ml-2">
              (可选)
            </span>
          </Label>
          <Input
              id="password"
              v-model="formData.password"
              :placeholder="isEditMode ? '留空表示无密码授权' : '留空表示无密码授权'"
              autocomplete="new-password"
              type="text"
          />
          <p class="text-xs text-muted-foreground">
            {{ isEditMode ? '留空表示设为无密码' : '设备使用此密码可以自动获取访问授权' }}
          </p>
        </div>

        <!-- 设备类型选择 -->
        <div class="space-y-2">
          <Label for="deviceType">设备类型</Label>
          <Select v-model="formData.deviceType">
            <SelectTrigger id="deviceType">
              <SelectValue placeholder="选择设备类型"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                  v-for="option in deviceTypeOptions"
                  :key="option.value"
                  :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">
            标识使用此配置授权的设备类型
          </p>
        </div>

        <!-- 只读权限 -->
        <div class="flex items-center space-x-2">
          <Checkbox
              id="isReadOnly"
              v-model="formData.isReadOnly"
          />
          <Label
              class="text-sm font-normal cursor-pointer"
              for="isReadOnly"
          >
            只读权限（仅允许读取数据，不能修改）
          </Label>
        </div>

        <!-- 提示信息 -->
        <div class="rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
          <p class="font-medium mb-1">💡 提示：</p>
          <ul class="space-y-1 list-disc list-inside">
            <li>同一设备的授权密码必须唯一</li>
            <li>无密码配置允许任何人通过 namespace 访问</li>
            <li>只读权限适用于家长、访客等场景</li>
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
            @click="saveConfig"
        >
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin"/>
          {{ isEditMode ? '保存' : '创建' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
