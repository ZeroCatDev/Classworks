<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { deviceStore, generateUUID } from '@/lib/deviceStore'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import LoginDialog from '@/components/LoginDialog.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Shuffle, Download, Plus, AlertTriangle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'openLogin'])

const accountStore = useAccountStore()

const newUuid = ref('')
const deviceName = ref('')
const bindToAccount = ref(false)
const accountDevices = ref([])
const historyDevices = ref([])
const manualUuid = ref('')
const loadingDevices = ref(false)
const activeTab = ref('load') // 'load' | 'history' | 'register'
const showLoginDialog = ref(false) // 登录对话框状态

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// 监听对话框打开，自动加载账户设备（如果已登录）
watch(isOpen, (newVal) => {
  if (newVal && accountStore.isAuthenticated && activeTab.value === 'load') {
    loadAccountDevices()
  }
  if (newVal && activeTab.value === 'history') {
    loadHistoryDevices()
  }
  // 切换到注册选项卡时，自动生成UUID
  if (newVal && activeTab.value === 'register' && !newUuid.value) {
    generateRandomUuid()
  }
  // 对话框打开且当前为注册页时，根据登录状态默认勾选绑定
  if (newVal && activeTab.value === 'register' && accountStore.isAuthenticated) {
    bindToAccount.value = true
  }
})

// 监听选项卡切换
watch(activeTab, (newVal) => {
  if (newVal === 'load' && accountStore.isAuthenticated && isOpen.value) {
    loadAccountDevices()
  }
  if (newVal === 'history' && isOpen.value) {
    loadHistoryDevices()
  }
  if (newVal === 'register' && !newUuid.value) {
    generateRandomUuid()
  }
  // 进入注册页时，根据当前登录状态设置“绑定到账户”的默认勾选
  if (newVal === 'register') {
    bindToAccount.value = accountStore.isAuthenticated
  }
})

// 监听是否登录，自动设置绑定选项
watch(
  () => accountStore.isAuthenticated,
  (isAuth) => {
    if (isAuth && activeTab.value === 'register') {
      bindToAccount.value = true
    } else if (!isAuth) {
      bindToAccount.value = false
    }
  },
)

// 生成随机UUID
const generateRandomUuid = () => {
  newUuid.value = generateUUID()
}

// 处理打开登录对话框
const handleOpenLogin = () => {
  showLoginDialog.value = true
}

// 处理登录成功
const handleLoginSuccess = async (token) => {
  // 关闭登录对话框
  showLoginDialog.value = false
  // 处理登录成功逻辑
  await accountStore.login(token)
  // 自动加载账户设备
  if (activeTab.value === 'load') {
    await loadAccountDevices()
  } else {
    // 在注册模式下自动选中绑定账户
    bindToAccount.value = true
  }
}

// 加载账户绑定的设备
const loadAccountDevices = async () => {
  if (!accountStore.isAuthenticated) {
    return
  }

  loadingDevices.value = true
  try {
    const response = await apiClient.getAccountDevices()
    accountDevices.value = response.data || []

    if (accountDevices.value.length === 0) {
      toast.info('您的账户暂未绑定任何设备')
    }
  } catch (error) {
    toast.error('加载设备列表失败：' + error.message)
  } finally {
    loadingDevices.value = false
  }
}

// 加载选中的设备
const loadDevice = (device) => {
  deviceStore.setDeviceUuid(device.uuid)
  // 写入历史
  deviceStore.addDeviceToHistory({ uuid: device.uuid, name: device.name })
  isOpen.value = false
  emit('confirm')
  resetForm()
  toast.success(`已切换到设备: ${device.name || device.uuid}`)
}

// 手动输入UUID加载
const loadByUuid = () => {
  const id = manualUuid.value?.trim()
  if (!id) {
    toast.error('请输入设备 UUID')
    return
  }
  // 可选：基本格式校验（宽松处理，避免误判合法UUID）
  const ok = /^[0-9a-fA-F-]{8,}$/.test(id)
  if (!ok) {
    toast.error('UUID 格式不正确')
    return
  }
  deviceStore.setDeviceUuid(id)
  deviceStore.addDeviceToHistory({ uuid: id })
  isOpen.value = false
  emit('confirm')
  resetForm()
  toast.success(`已切换到设备: ${id}`)
}

// 注册新设备
const registerDevice = async () => {
  if (!newUuid.value.trim()) {
    toast.error('请输入或生成UUID')
    return
  }

  if (!deviceName.value.trim()) {
    toast.error('请输入设备名称')
    return
  }

  try {
    // 1. 保存UUID到本地
    deviceStore.setDeviceUuid(newUuid.value.trim())
    // 写入历史
    deviceStore.addDeviceToHistory({ uuid: newUuid.value.trim(), name: deviceName.value.trim() })

    // 2. 调用设备注册接口（会自动在云端创建设备）
    await apiClient.registerDevice(newUuid.value.trim(), deviceName.value.trim())

    // 3. 如果选择绑定到账户，现在可以安全地绑定
    if (bindToAccount.value && accountStore.isAuthenticated) {
      try {
        await apiClient.bindDeviceToAccount(newUuid.value.trim())
      } catch (error) {
        console.warn('设备绑定失败：', error.message)
        toast.warning('设备注册成功，但绑定到账户失败')
      }
    }

    toast.success(`设备注册成功！UUID: ${newUuid.value.trim()}`)
    isOpen.value = false
    emit('confirm')
    resetForm()

    const message = bindToAccount.value ? '设备已注册并绑定到您的账户' : '设备已注册'
    toast.success(message)
  } catch (error) {
    toast.error('注册失败：' + error.message)
  }
}

// 重置表单
const resetForm = () => {
  newUuid.value = ''
  deviceName.value = ''
  bindToAccount.value = accountStore.isAuthenticated
  accountDevices.value = []
  activeTab.value = 'load'
  manualUuid.value = ''
}

// 处理弹框关闭
const handleClose = () => {
  // 在required模式下不允许关闭
  if (props.required) {
    toast.error('请先注册或加载设备')
    return
  }
  resetForm()
  isOpen.value = false
}

// 处理ESC键按下，在必须模式下阻止关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.required) {
    e.preventDefault()
    e.stopPropagation()
    toast.error('请先注册或加载设备')
  }
}

// 在组件挂载和卸载时添加/移除事件监听
onMounted(() => {
  document.addEventListener('keydown', handleKeydown, true)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown, true)
})

// 加载本地历史设备
const loadHistoryDevices = () => {
  historyDevices.value = deviceStore.getDeviceHistory()
}
</script>

<template>
  <Dialog
    v-model:open="isOpen"
    @update:open="(val) => !val && (props.required ? (isOpen = true) : handleClose())"
  >
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>设备管理</DialogTitle>
        <DialogDescription> 加载账户设备或注册新设备 </DialogDescription>

        <!-- 必需模式的提示 -->
        <div
          v-if="props.required"
          class="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900"
        >
          <div class="flex items-start gap-2">
            <AlertTriangle class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p class="text-sm font-medium text-amber-900 dark:text-amber-100">
                请先注册或加载设备
              </p>
              <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
                您需要注册或加载一个设备才能继续使用。
              </p>
            </div>
          </div>
        </div>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="load">
            <Download class="h-4 w-4 mr-2" />
            加载设备
          </TabsTrigger>
          <TabsTrigger value="history"> 历史记录 </TabsTrigger>
          <TabsTrigger value="register">
            <Plus class="h-4 w-4 mr-2" />
            注册设备
          </TabsTrigger>
        </TabsList>

        <!-- 加载设备选项卡 -->
        <TabsContent class="space-y-4 mt-4" value="load">
          <!-- 账户设备区域 -->
          <div class="space-y-3">
            <div v-if="!accountStore.isAuthenticated" class="text-center py-6">
              <p class="text-muted-foreground mb-3">登录后可查看您账户绑定的设备</p>
              <Button variant="outline" @click="handleOpenLogin"> 登录账户 </Button>
            </div>

            <div v-else>
              <div v-if="loadingDevices" class="text-center py-6">
                <p class="text-muted-foreground">加载中...</p>
              </div>

              <div v-else-if="accountDevices.length === 0" class="text-center py-6">
                <p class="text-muted-foreground mb-3">您的账户暂未绑定任何设备</p>
                <Button variant="outline" @click="activeTab = 'register'">
                  <Plus class="h-4 w-4 mr-2" />
                  注册新设备
                </Button>
              </div>

              <div v-else class="space-y-2 max-h-96 overflow-y-auto">
                <div
                  v-for="device in accountDevices"
                  :key="device.uuid"
                  class="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  @click="loadDevice(device)"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="font-medium text-base">
                        {{ device.name || '未命名设备' }}
                      </div>
                      <code class="text-xs text-muted-foreground block mt-1">
                        {{ device.uuid }}
                      </code>
                      <div class="text-xs text-muted-foreground mt-2">
                        创建时间: {{ new Date(device.createdAt).toLocaleString('zh-CN') }}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" @click.stop="loadDevice(device)">
                      加载
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <!-- 手动输入 UUID 加载 -->
          <div class="space-y-2">
            <Label for="manualUuid">手动输入 UUID</Label>
            <div class="flex gap-2">
              <Input
                id="manualUuid"
                v-model="manualUuid"
                class="flex-1"
                placeholder="输入设备 UUID 直接加载"
                @keyup.enter="loadByUuid"
              />
              <Button :disabled="!manualUuid.trim()" @click="loadByUuid"> 加载 </Button>
            </div>
            <p class="text-xs text-muted-foreground">无需注册或登录即可加载已有设备。</p>
          </div>
        </TabsContent>

        <!-- 注册设备选项卡 -->
        <TabsContent class="space-y-4 mt-4" value="register">
          <div class="space-y-4">
            <!-- UUID输入 -->
            <div class="space-y-2">
              <Label for="registerUuid">设备 UUID</Label>
              <div class="flex gap-2">
                <Input
                  id="registerUuid"
                  v-model="newUuid"
                  class="flex-1"
                  placeholder="自动生成或手动输入UUID"
                />
                <Button
                  size="icon"
                  title="生成随机UUID"
                  variant="outline"
                  @click="generateRandomUuid"
                >
                  <Shuffle class="h-4 w-4" />
                </Button>
              </div>
            </div>

            <!-- 设备名称输入 -->
            <div class="space-y-2">
              <Label for="deviceName">* 设备名称</Label>
              <Input
                id="deviceName"
                v-model="deviceName"
                placeholder="为设备设置一个易于识别的名称"
                required
              />
            </div>

            <Separator />

            <!-- 绑定到账户选项 -->
            <div class="flex items-start space-x-3 p-4 rounded-lg border">
              <Checkbox
                id="bindToAccount"
                v-model:checked="bindToAccount"
                :disabled="!accountStore.isAuthenticated"
              />
              <div class="flex-1">
                <label
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  for="bindToAccount"
                >
                  绑定到账户
                </label>
                <p class="text-xs text-muted-foreground mt-1">
                  {{
                    accountStore.isAuthenticated
                      ? `将此设备绑定到账户 ${accountStore.userName}，绑定后可在其他设备上快速加载`
                      : '登录后可以将设备绑定到您的账户'
                  }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button
              :disabled="props.required"
              :title="props.required ? '必须先注册设备' : '取消'"
              variant="outline"
              @click="handleClose"
            >
              取消
            </Button>
            <Button :disabled="!newUuid.trim() || !deviceName.trim()" @click="registerDevice">
              <Plus class="h-4 w-4 mr-2" />
              注册设备
            </Button>
          </div>
        </TabsContent>

        <!-- 历史设备选项卡 -->
        <TabsContent class="space-y-4 mt-4" value="history">
          <div v-if="historyDevices.length === 0" class="text-center py-8 text-muted-foreground">
            暂无历史设备
          </div>
          <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="device in historyDevices"
              :key="device.uuid"
              class="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
              @click="loadDevice(device)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="font-medium text-base">
                    {{ device.name || '未命名设备' }}
                  </div>
                  <code class="text-xs text-muted-foreground block mt-1">
                    {{ device.uuid }}
                  </code>
                  <div class="text-xs text-muted-foreground mt-2">
                    最近使用: {{ new Date(device.lastUsedAt).toLocaleString('zh-CN') }}
                  </div>
                </div>
                <Button size="sm" variant="ghost" @click.stop="loadDevice(device)"> 加载 </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>

  <!-- 登录对话框 -->
  <LoginDialog v-model="showLoginDialog" :on-success="handleLoginSuccess" />
</template>
