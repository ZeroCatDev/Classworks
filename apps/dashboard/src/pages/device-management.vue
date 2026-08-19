<script setup>
import {ref, computed, onMounted} from 'vue'
import {useAccountStore} from '@/stores/account'
import {useRouter} from 'vue-router'
import {apiClient} from '@/lib/api'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Smartphone,
  RefreshCw,
  Trash2,
  Edit,
  Lock,
  User,
  ArrowLeft
} from 'lucide-vue-next'
import {toast} from 'vue-sonner'
import EditDeviceNameDialog from '@/components/EditDeviceNameDialog.vue'

const router = useRouter()
const accountStore = useAccountStore()

const devices = ref([])
const isLoading = ref(false)
const showEditNameDialog = ref(false)
const showDeleteDialog = ref(false)
const currentDevice = ref(null)

// 加载设备列表
const loadDevices = async () => {
  if (!accountStore.isAuthenticated) {
    router.push('/')
    return
  }

  isLoading.value = true
  try {
    const response = await apiClient.getAccountDevices()
    devices.value = response.data || []
  } catch (error) {
    toast.error('加载设备列表失败：' + error.message)
  } finally {
    isLoading.value = false
  }
}

// 打开解绑确认对话框
const confirmUnbind = (device) => {
  currentDevice.value = device
  showDeleteDialog.value = true
}

// 解绑设备
const unbindDevice = async () => {
  if (!currentDevice.value) return

  try {
    await apiClient.unbindDeviceFromAccount(currentDevice.value.uuid)
    toast.success('设备已解绑')
    showDeleteDialog.value = false
    currentDevice.value = null
    await loadDevices()
  } catch (error) {
    toast.error('解绑失败：' + error.message)
  }
}

// 编辑设备名称
const editDeviceName = (device) => {
  currentDevice.value = device
  showEditNameDialog.value = true
}

// 设备名称更新成功
const handleDeviceNameUpdated = async () => {
  await loadDevices()
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  loadDevices()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
    <!-- Header -->
    <div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <Button
                size="icon"
                variant="ghost"
                @click="router.push('/')"
            >
              <ArrowLeft class="h-5 w-5"/>
            </Button>
            <div>
              <h1 class="text-2xl font-bold">设备管理</h1>
              <p class="text-sm text-muted-foreground">管理您账户下的所有设备</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Badge class="px-3 py-1" variant="secondary">
              <User class="h-3 w-3 mr-1.5"/>
              {{ accountStore.userName }}
            </Badge>
            <Button
                :disabled="isLoading"
                size="icon"
                variant="outline"
                @click="loadDevices"
            >
              <RefreshCw :class="{ 'animate-spin': isLoading }" class="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-8 max-w-7xl">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="text-center py-12">
        <RefreshCw class="h-8 w-8 animate-spin mx-auto text-muted-foreground"/>
        <p class="mt-4 text-muted-foreground">加载中...</p>
      </div>

      <!-- 空状态 -->
      <Card v-else-if="devices.length === 0" class="border-dashed">
        <CardContent class="flex flex-col items-center justify-center py-12">
          <Smartphone class="h-16 w-16 text-muted-foreground/50 mb-4"/>
          <p class="text-lg font-medium text-muted-foreground mb-2">暂无绑定设备</p>
          <p class="text-sm text-muted-foreground mb-4">您可以在主页面注册并绑定新设备</p>
          <Button variant="outline" @click="router.push('/')">
            返回主页
          </Button>
        </CardContent>
      </Card>

      <!-- 设备列表 -->
      <div v-else>
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm text-muted-foreground">
            共 {{ devices.length }} 个设备
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
              v-for="device in devices"
              :key="device.uuid"
              class="hover:shadow-lg transition-shadow"
          >
            <CardHeader class="pb-3">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <CardTitle class="text-lg">
                    {{ device.name || '未命名设备' }}
                  </CardTitle>
                  <CardDescription class="mt-1">
                    <code class="text-xs">{{ device.uuid }}</code>
                  </CardDescription>
                </div>
                <Smartphone class="h-5 w-5 text-muted-foreground flex-shrink-0"/>
              </div>
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="text-sm text-muted-foreground">
                创建时间: {{ formatDate(device.createdAt) }}
              </div>

              <div class="flex flex-wrap gap-2">
                <Button
                    class="flex-1"
                    size="sm"
                    variant="outline"
                    @click="editDeviceName(device)"
                >
                  <Edit class="h-3 w-3 mr-1"/>
                  重命名
                </Button>

              </div>

              <Button
                  class="w-full"
                  size="sm"
                  variant="destructive"
                  @click="confirmUnbind(device)"
              >
                <Trash2 class="h-3 w-3 mr-1"/>
                解绑设备
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <!-- 编辑设备名称弹框 -->
    <EditDeviceNameDialog
        v-if="currentDevice"
        v-model="showEditNameDialog"
        :current-name="currentDevice.name || ''"
        :device-uuid="currentDevice.uuid"
        :has-password="false"
        @success="handleDeviceNameUpdated"
    />


    <!-- 解绑确认对话框 -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认解绑设备</AlertDialogTitle>
          <AlertDialogDescription>
            确定要解绑设备 "{{ currentDevice?.name || currentDevice?.uuid }}" 吗？
            此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="unbindDevice">
            确认解绑
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
