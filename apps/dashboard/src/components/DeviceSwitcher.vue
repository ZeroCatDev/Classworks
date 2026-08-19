<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import {useAccountStore} from '@/stores/account'
import {deviceStore} from '@/lib/deviceStore'
import {apiClient} from '@/lib/api'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Badge} from '@/components/ui/badge'
import {Separator} from '@/components/ui/separator'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import DropdownMenu from '@/components/ui/dropdown-menu/DropdownMenu.vue'
import DropdownItem from '@/components/ui/dropdown-menu/DropdownItem.vue'
import LoginDialog from '@/components/LoginDialog.vue'
import DeviceRegisterDialog from '@/components/DeviceRegisterDialog.vue'
import {
  ChevronDown,
  Plus,
  Monitor,
  Search,
  Clock,
  User,
  Check,
  Settings,
  Layers
} from 'lucide-vue-next'
import {toast} from 'vue-sonner'

const props = defineProps({
  deviceInfo: {
    type: Object,
    default: null
  },
  deviceUuid: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['device-changed'])

const accountStore = useAccountStore()

// 状态
const showDropdown = ref(false)
const showLoginDialog = ref(false)
const showRegisterDialog = ref(false)
const showManualInputDialog = ref(false)
const searchQuery = ref('')
const manualUuid = ref('')
const isLoading = ref(false)

// 设备列表
const accountDevices = ref([])
const historyDevices = ref([])

// 当前设备的显示信息
const currentDevice = computed(() => {
  if (props.deviceInfo) {
    return {
      name: props.deviceInfo.name || props.deviceInfo.deviceName || '未命名设备',
      namespace: props.deviceInfo.namespace,
      uuid: props.deviceUuid,
      isOwned: !!props.deviceInfo.account
    }
  }
  return {
    name: '未选择设备',
    namespace: props.deviceUuid,
    uuid: props.deviceUuid,
    isOwned: false
  }
})

// 过滤后的账户设备
const filteredAccountDevices = computed(() => {
  if (!searchQuery.value) return accountDevices.value
  const query = searchQuery.value.toLowerCase()
  return accountDevices.value.filter(device =>
      (device.name || '').toLowerCase().includes(query) ||
      device.uuid.toLowerCase().includes(query) ||
      (device.namespace || '').toLowerCase().includes(query)
  )
})

// 过滤后的历史设备
const filteredHistoryDevices = computed(() => {
  if (!searchQuery.value) return historyDevices.value
  const query = searchQuery.value.toLowerCase()
  return historyDevices.value.filter(device =>
      (device.name || '').toLowerCase().includes(query) ||
      device.uuid.toLowerCase().includes(query)
  )
})

// 加载账户设备
const loadAccountDevices = async () => {
  if (!accountStore.isAuthenticated) return

  isLoading.value = true
  try {
    const response = await apiClient.getAccountDevices()
    accountDevices.value = response.data || []
  } catch (error) {
    console.error('Failed to load account devices:', error)
    toast.error('加载设备列表失败')
  } finally {
    isLoading.value = false
  }
}

// 加载历史设备
const loadHistoryDevices = () => {
  historyDevices.value = deviceStore.getDeviceHistory()
}

// 切换设备
const switchToDevice = async (device) => {
  try {
    deviceStore.setDeviceUuid(device.uuid)
    deviceStore.addDeviceToHistory({
      uuid: device.uuid,
      name: device.name || device.deviceName
    })

    showDropdown.value = false
    searchQuery.value = ''

    emit('device-changed', device.uuid)
    toast.success(`已切换到: ${device.name || device.uuid}`)
  } catch (error) {
    toast.error('切换设备失败')
  }
}

// 手动输入UUID
const handleManualInput = () => {
  const uuid = manualUuid.value.trim()
  if (!uuid) {
    toast.error('请输入设备UUID')
    return
  }

  if (!/^[0-9a-fA-F-]{8,}$/.test(uuid)) {
    toast.error('UUID格式不正确')
    return
  }

  switchToDevice({uuid, name: ''})
  showManualInputDialog.value = false
  manualUuid.value = ''
}

// 登录成功回调
const handleLoginSuccess = async (token) => {
  showLoginDialog.value = false
  await accountStore.login(token)
  await loadAccountDevices()
  toast.success('登录成功')
}

// 注册设备成功回调
const handleDeviceRegistered = () => {
  showRegisterDialog.value = false
  loadAccountDevices()
  loadHistoryDevices()
  emit('device-changed')
}

// 监听下拉菜单打开，加载数据
watch(showDropdown, (isOpen) => {
  if (isOpen) {
    loadHistoryDevices()
    if (accountStore.isAuthenticated) {
      loadAccountDevices()
    }
  } else {
    searchQuery.value = ''
  }
})

onMounted(() => {
  loadHistoryDevices()
})
</script>

<template>
  <div class="relative">
    <!-- 设备切换器触发按钮 -->
    <DropdownMenu v-model:open="showDropdown">
      <template #trigger="{ toggle, open }">
        <Button
            class="h-8 px-3  max-w-[300px] justify-start font-normal hover:bg-accent/50 border border-border"
            variant="ghost"
            @click="toggle"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <Monitor class="h-4 w-4 text-muted-foreground flex-shrink-0"/>
            <div class="flex flex-col items-start min-w-0 flex-1">
              <div class="truncate text-sm font-medium max-w-[180px]">
                {{ currentDevice.name }}
              </div>

            </div>
            <div class="flex items-center gap-1 ml-auto">
              <Badge v-if="!currentDevice.isOwned" class="h-4 px-1 text-[10px]" variant="secondary">
                未绑定
              </Badge>
              <ChevronDown
                  :class="{ 'rotate-180': open }"
                  class="h-3 w-3 text-muted-foreground flex-shrink-0 transition-transform duration-200"
              />
            </div>
          </div>
        </Button>
      </template>

      <!-- 下拉菜单内容 -->
      <div class="w-auto p-0">
        <!-- 搜索框 -->
        <div class="p-3 border-b">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input
                v-model="searchQuery"
                class="pl-9 h-8"
                placeholder="搜索设备..."
            />
          </div>
        </div>

        <!-- 当前设备信息 -->
        <div class="p-3 border-b bg-muted/20">
          <div class="text-xs font-medium text-muted-foreground mb-1">当前设备</div>
          <div class="flex items-center gap-2">
            <Monitor class="h-4 w-4 text-primary"/>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">{{ currentDevice.name }}</div>
              <code class="text-xs text-muted-foreground truncate block">
                {{ currentDevice.namespace }}
              </code>
            </div>
            <Check class="h-4 w-4 text-green-500"/>
          </div>
        </div>

        <div class="max-h-80 overflow-y-auto">
          <!-- 账户设备 -->
          <div v-if="accountStore.isAuthenticated">
            <div class="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
              <User class="h-3 w-3"/>
              账户设备
            </div>

            <div v-if="isLoading" class="px-3 py-4 text-center text-sm text-muted-foreground">
              加载中...
            </div>

            <div v-else-if="filteredAccountDevices.length === 0" class="px-3 py-2">
              <div class="text-sm text-muted-foreground text-center py-2">
                {{ searchQuery ? '未找到匹配的设备' : '暂无绑定设备' }}
              </div>
            </div>

            <div v-else>
              <DropdownItem
                  v-for="device in filteredAccountDevices"
                  :key="device.uuid"
                  class="cursor-pointer"
                  @click="switchToDevice(device)"
              >
                <div class="flex items-center gap-2 w-full">
                  <Monitor class="h-4 w-4 text-muted-foreground"/>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">
                      {{ device.name || '未命名设备' }}
                    </div>
                    <div class="text-xs text-muted-foreground truncate">
                      {{ device.namespace}}
                    </div>
                  </div>

                </div>
              </DropdownItem>
            </div>

            <Separator class="my-1"/>
          </div>

          <!-- 历史设备 -->
          <div v-if="filteredHistoryDevices.length > 0">
            <div class="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock class="h-3 w-3"/>
              最近使用
            </div>

            <DropdownItem
                v-for="device in filteredHistoryDevices.slice(0, 5)"
                :key="device.uuid"
                class="cursor-pointer"
                @click="switchToDevice(device)"
            >
              <div class="flex items-center gap-2 w-full">
                <Monitor class="h-4 w-4 text-muted-foreground"/>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate">
                    {{ device.name || '未命名设备' }}
                  </div>
                  <div class="text-xs text-muted-foreground truncate">
                    {{ device.namespace }}
                  </div>
                </div>
              </div>
            </DropdownItem>

            <Separator class="my-1"/>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="p-2 border-t bg-muted/20 space-y-1">
          <DropdownItem
              v-if="!accountStore.isAuthenticated"
              class="cursor-pointer text-primary"
              @click="showLoginDialog = true"
          >
            <User class="h-4 w-4"/>
            登录账户
          </DropdownItem>

          <DropdownItem
              class="cursor-pointer"
              @click="showManualInputDialog = true"
          >
            <Settings class="h-4 w-4"/>
            手动输入UUID
          </DropdownItem>

          <DropdownItem
              class="cursor-pointer text-primary"
              @click="showRegisterDialog = true"
          >
            <Plus class="h-4 w-4"/>
            注册新设备
          </DropdownItem>
          <DropdownItem
              class="cursor-pointer text-primary"
              @click="showRegisterDialog = true"
          >
            <Plus class="h-4 w-4"/>
            高级选项
          </DropdownItem>
        </div>
      </div>
    </DropdownMenu>

    <!-- 手动输入UUID对话框 -->
    <Dialog v-model:open="showManualInputDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>手动输入设备UUID</DialogTitle>
          <DialogDescription>
            输入已存在的设备UUID来快速切换
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <Input
              v-model="manualUuid"
              placeholder="输入设备UUID"
              @keyup.enter="handleManualInput"
          />
        </div>

        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showManualInputDialog = false">
            取消
          </Button>
          <Button :disabled="!manualUuid.trim()" @click="handleManualInput">
            确定
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 登录对话框 -->
    <LoginDialog
        v-model="showLoginDialog"
        :on-success="handleLoginSuccess"
    />

    <!-- 设备注册对话框 -->
    <DeviceRegisterDialog
        v-model="showRegisterDialog"
        @confirm="handleDeviceRegistered"
    />
  </div>
</template>