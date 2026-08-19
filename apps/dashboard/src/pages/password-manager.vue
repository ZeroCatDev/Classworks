<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {deviceStore} from '@/lib/deviceStore'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {
  ArrowLeft,
  AlertTriangle,
  Settings,
  Shield,
  Key
} from 'lucide-vue-next'
import DeviceRegisterDialog from '@/components/DeviceRegisterDialog.vue'
import EditDeviceNameDialog from '@/components/EditDeviceNameDialog.vue'

const router = useRouter()
const deviceUuid = ref('')

// Dialog states
const showRegisterDialog = ref(false)
const showEditNameDialog = ref(false)
const deviceRequired = ref(false)

// 返回首页
const goBack = () => {
  router.push('/')
}

// 更新设备UUID回调
const updateUuid = () => {
  showRegisterDialog.value = false
  deviceUuid.value = deviceStore.getDeviceUuid()
}

// 设备名称更新成功回调
const handleDeviceNameUpdated = () => {
  // 刷新页面或显示成功消息
}

onMounted(async () => {
  // 检查是否存在设备UUID
  const existingUuid = deviceStore.getDeviceUuid()
  if (!existingUuid) {
    deviceRequired.value = true
    showRegisterDialog.value = true
  } else {
    deviceUuid.value = existingUuid
  }
})


</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
    <!-- Header -->
    <div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Button size="icon" variant="ghost" @click="goBack">
              <ArrowLeft class="h-5 w-5"/>
            </Button>
            <div>
              <h1 class="text-xl font-bold">高级设置</h1>
              <p class="text-sm text-muted-foreground">设备管理与安全设置</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-8 max-w-4xl">
      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="mb-6">
        <div
            class="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400"/>
          <span class="text-green-800 dark:text-green-200">{{ successMessage }}</span>
        </div>
      </div>

      <div v-if="errorMessage" class="mb-6">
        <div
            class="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400"/>
          <span class="text-red-800 dark:text-red-200">{{ errorMessage }}</span>
        </div>
      </div>

      <!-- Device Info Card -->
      <Card class="mb-6 border-2">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="rounded-lg bg-primary/10 p-2">
                <Smartphone class="h-6 w-6 text-primary"/>
              </div>
              <div>
                <CardTitle>设备信息</CardTitle>
                <CardDescription>设备标识和基本信息</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <!-- Device Name -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <Label class="text-sm font-medium">设备名称</Label>
                <Button
                    class="h-7"
                    size="sm"
                    variant="ghost"
                    @click="showEditNameDialog = true"
                >
                  <Edit class="h-3 w-3 mr-1"/>
                  编辑
                </Button>
              </div>
              <div class="p-3 rounded-lg bg-muted/50">
                <p class="text-sm">{{ deviceInfo?.name || '未命名设备' }}</p>
              </div>
            </div>

            <!-- Device UUID -->
            <div>
              <Label class="text-sm font-medium mb-2 block">设备 UUID</Label>
              <div class="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <code class="flex-1 text-sm font-mono break-all">{{ deviceUuid }}</code>
                <Button
                    class="h-8 w-8 flex-shrink-0"
                    size="icon"
                    title="复制 UUID"
                    variant="ghost"
                    @click="copyToClipboard(deviceUuid, 'uuid')"
                >
                  <CheckCircle2 v-if="copied === 'uuid'" class="h-4 w-4 text-green-500"/>
                  <Copy v-else class="h-4 w-4"/>
                </Button>
              </div>
              <p class="text-xs text-muted-foreground mt-1">设备的唯一标识符，用于系统识别</p>
            </div>

            <!-- Namespace -->
            <div>
              <Label class="text-sm font-medium mb-2 block">命名空间</Label>
              <div class="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <code class="flex-1 text-sm font-mono break-all">{{ deviceInfo?.namespace || deviceUuid }}</code>
                <Button
                    class="h-8 w-8 flex-shrink-0"
                    size="icon"
                    title="复制命名空间"
                    variant="ghost"
                    @click="copyToClipboard(deviceInfo?.namespace || deviceUuid, 'namespace')"
                >
                  <CheckCircle2 v-if="copied === 'namespace'" class="h-4 w-4 text-green-500"/>
                  <Copy v-else class="h-4 w-4"/>
                </Button>
              </div>
              <p class="text-xs text-muted-foreground mt-1">用于自动授权登录的设备标识</p>
            </div>
          </div>
        </CardContent>
      </Card>


      <!-- 设备管理部分 -->
      <h2 class="text-xl font-semibold mt-12 mb-4">设备管理</h2>

      <!-- 设备重置卡片 -->
      <Card class="mb-6 ">
        <CardHeader>
          <CardTitle class="text-lg flex items-center gap-2">
            <Smartphone class="h-5 w-5"/>
            更换设备
          </CardTitle>
          <CardDescription>
            更换新的设备标识。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">

            <Button
                class="w-full flex items-center justify-center gap-2"
                variant="destructive"
                @click="showResetDeviceDialog = true"
            >
              <RefreshCw class="h-4 w-4"/>
              更换设备
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>


    <!-- 设备重置弹框 -->
    <DeviceRegisterDialog
        v-model="showResetDeviceDialog"
        @confirm="handleDeviceReset"
        @update:model-value="val => showResetDeviceDialog = val"
    />

    <!-- 必需注册弹框 -->
    <DeviceRegisterDialog
        v-model="showRegisterDialog"
        :required="deviceRequired"
        @confirm="updateUuid"
    />

    <!-- 设备名称编辑弹框 -->
    <EditDeviceNameDialog
        v-model="showEditNameDialog"
        :current-name="deviceInfo?.deviceName || ''"
        :device-uuid="deviceUuid"
        @success="handleDeviceNameUpdated"
    />
  </div>
</template>