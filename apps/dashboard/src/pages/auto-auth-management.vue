<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account'
import { deviceStore } from '@/lib/deviceStore'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Shield,
  RefreshCw,
  Trash2,
  Edit,
  Plus,
  ArrowLeft,
  Lock,
  LockOpen,
  GraduationCap,
  User,
  Users,
  Monitor,
  AlertCircle,
  Copy,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AutoAuthConfigDialog from '@/components/AutoAuthConfigDialog.vue'
import EditNamespaceDialog from '@/components/EditNamespaceDialog.vue'
import LoginDialog from '@/components/LoginDialog.vue'

const router = useRouter()
const accountStore = useAccountStore()

const deviceUuid = ref('')
const deviceInfo = ref(null)
const configs = ref([])
const isLoading = ref(false)
const showLoginDialog = ref(false)
const showConfigDialog = ref(false)
const showDeleteDialog = ref(false)
const showNamespaceDialog = ref(false)
const currentConfig = ref(null)
const editingConfig = ref(null)

// 设备类型图标映射
const deviceTypeIcons = {
  teacher: GraduationCap,
  student: User,
  classroom: Monitor,
  parent: Users,
}

// 设备类型标签映射
const deviceTypeLabels = {
  teacher: '教师',
  student: '学生',
  classroom: '班级一体机',
  parent: '家长',
}

// 获取设备类型图标
const getDeviceTypeIcon = (type) => {
  return deviceTypeIcons[type] || Shield
}

// 获取设备类型标签
const getDeviceTypeLabel = (type) => {
  return deviceTypeLabels[type] || '未指定'
}

// 检查是否已登录
const isAuthenticated = computed(() => accountStore.isAuthenticated)

// 登录成功处理
const handleLoginSuccess = async (token) => {
  showLoginDialog.value = false
  await accountStore.login(token)
  await checkDeviceAndLoad()
}

// 检查设备并加载配置
const checkDeviceAndLoad = async () => {
  if (!accountStore.isAuthenticated) {
    return
  }

  // 获取当前设备 UUID
  const uuid = deviceStore.getDeviceUuid()
  if (!uuid) {
    toast.error('请先选择或注册一个设备')
    router.push('/')
    return
  }

  deviceUuid.value = uuid

  // 加载设备信息
  try {
    deviceInfo.value = await apiClient.getDeviceInfo(uuid)
    console.log(deviceInfo.value)
    console.log(accountStore.profile)
    // 检查设备是否绑定到当前账户
    if (
      !deviceInfo.value.account ||
      !deviceInfo.value.account.id ||
      deviceInfo.value.account.id !== accountStore.profile.id
    ) {
      toast.error('该设备未绑定到您的账户', {
        description: '请先在主页绑定设备到您的账户',
      })
      router.push('/')
      return
    }

    // 加载配置
    await loadConfigs()
  } catch (error) {
    toast.error('加载设备信息失败：' + error.message)
    router.push('/')
  }
}

// 加载自动授权配置列表
const loadConfigs = async () => {
  if (!deviceUuid.value || !accountStore.token) {
    return
  }

  isLoading.value = true
  try {
    const response = await apiClient.getAutoAuthConfigs(deviceUuid.value, accountStore.token)
    configs.value = response.configs || []
  } catch (error) {
    toast.error('加载配置失败：' + error.message)
  } finally {
    isLoading.value = false
  }
}

// 创建新配置
const createConfig = () => {
  editingConfig.value = null
  showConfigDialog.value = true
}

// 编辑配置
const editConfig = (config) => {
  editingConfig.value = config
  showConfigDialog.value = true
}

// 确认删除配置
const confirmDelete = (config) => {
  currentConfig.value = config
  showDeleteDialog.value = true
}

// 删除配置
const deleteConfig = async () => {
  if (!currentConfig.value) return

  try {
    await apiClient.deleteAutoAuthConfig(
      deviceUuid.value,
      accountStore.token,
      currentConfig.value.id,
    )
    toast.success('配置已删除')
    showDeleteDialog.value = false
    currentConfig.value = null
    await loadConfigs()
  } catch (error) {
    toast.error('删除失败：' + error.message)
  }
}

// 配置保存成功
const handleConfigSaved = async () => {
  await loadConfigs()
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 复制密码
const copyPassword = async (password) => {
  try {
    await navigator.clipboard.writeText(password)
    toast.success('密码已复制到剪贴板')
  } catch (error) {
    toast.error('复制失败')
  }
}

// 编辑 namespace
const editNamespace = () => {
  showNamespaceDialog.value = true
}

// namespace 更新成功
const handleNamespaceUpdated = async (newNamespace) => {
  // 更新本地设备信息
  if (deviceInfo.value) {
    deviceInfo.value.namespace = newNamespace
  }
  toast.success('命名空间已更新')
}

// 返回上一页
const goBack = () => {
  router.push('/')
}

onMounted(async () => {
  // 检查是否已登录
  if (!accountStore.isAuthenticated) {
    toast.error('请先登录账户', {
      description: '管理自动授权配置需要账户登录',
    })
    showLoginDialog.value = true
    return
  }

  // 检查设备并加载配置
  await checkDeviceAndLoad()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
    <!-- Header -->
    <div
      class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10"
    >
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <Button size="icon" variant="ghost" @click="goBack">
              <ArrowLeft class="h-5 w-5" />
            </Button>
            <div>
              <h1 class="text-2xl font-bold flex items-center gap-2">
                <Shield class="h-6 w-6" />
                自动授权配置
              </h1>
              <p class="text-sm text-muted-foreground">管理设备的自动授权规则</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button
              v-if="isAuthenticated"
              :disabled="isLoading"
              size="icon"
              variant="outline"
              @click="loadConfigs"
            >
              <RefreshCw :class="{ 'animate-spin': isLoading }" class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-8 max-w-7xl">
      <!-- 未登录状态提示 -->
      <Card v-if="!isAuthenticated" class="border-yellow-200 dark:border-yellow-800">
        <CardContent class="flex flex-col items-center justify-center py-12">
          <AlertCircle class="h-16 w-16 text-yellow-600 dark:text-yellow-400 mb-4" />
          <p class="text-lg font-medium mb-2">需要账户登录</p>
          <p class="text-sm text-muted-foreground mb-4 text-center max-w-md">
            管理自动授权配置需要登录账户，并且设备必须绑定到您的账户
          </p>
          <div class="flex gap-2">
            <Button @click="showLoginDialog = true">
              <User class="h-4 w-4 mr-2" />
              登录账户
            </Button>
            <Button variant="outline" @click="goBack"> 返回主页 </Button>
          </div>
        </CardContent>
      </Card>

      <!-- 设备信息卡片 -->
      <Card v-if="isAuthenticated && deviceInfo" class="mb-6 border-primary/20">
        <CardHeader>
          <CardTitle class="text-lg">当前设备</CardTitle>
          <CardDescription class="flex items-center gap-2 mt-2">
            <User class="h-3 w-3" />
            已绑定到账户：{{ accountStore.userName }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">设备名称</span>
              <span class="font-medium">{{ deviceInfo.name || '未命名设备' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">命名空间</span>
              <div class="flex items-center gap-2">
                <code class="text-xs bg-muted px-2 py-1 rounded">{{ deviceInfo.namespace }}</code>
                <Button
                  class="h-6 w-6"
                  size="icon"
                  title="编辑命名空间"
                  variant="ghost"
                  @click="editNamespace"
                >
                  <Edit class="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">UUID</span>
              <code class="text-xs bg-muted px-2 py-1 rounded">{{ deviceInfo.uuid }}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 已认证状态下显示配置列表 -->
      <div v-if="isAuthenticated">
        <!-- 操作栏 -->
        <div class="mb-6 flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">共 {{ configs.length }} 个自动授权配置</p>
          </div>
          <Button @click="createConfig">
            <Plus class="h-4 w-4 mr-2" />
            添加配置
          </Button>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="text-center py-12">
          <RefreshCw class="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p class="mt-4 text-muted-foreground">加载中...</p>
        </div>

        <!-- 空状态 -->
        <Card v-else-if="configs.length === 0" class="border-dashed">
          <CardContent class="flex flex-col items-center justify-center py-12">
            <Shield class="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p class="text-lg font-medium text-muted-foreground mb-2">暂无自动授权配置</p>
            <p class="text-sm text-muted-foreground mb-4">创建配置以允许设备自动授权访问</p>
            <Button variant="outline" @click="createConfig">
              <Plus class="h-4 w-4 mr-2" />
              创建第一个配置
            </Button>
          </CardContent>
        </Card>

        <!-- 配置列表 -->
        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            v-for="config in configs"
            :key="config.id"
            class="hover:shadow-lg transition-shadow"
          >
            <CardHeader class="pb-3">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <component
                    :is="getDeviceTypeIcon(config.deviceType)"
                    class="h-5 w-5 text-primary"
                  />
                  <CardTitle class="text-lg">
                    {{ getDeviceTypeLabel(config.deviceType) }}
                  </CardTitle>
                </div>
                <Badge :variant="config.isReadOnly ? 'outline' : 'default'">
                  {{ config.isReadOnly ? '只读' : '读写' }}
                </Badge>
              </div>
              <CardDescription>
                <div class="flex items-center gap-2 text-xs">
                  <component
                    :is="config.password || config.isLegacyHash ? Lock : LockOpen"
                    class="h-3 w-3"
                  />
                  {{
                    config.password
                      ? '需要密码'
                      : config.isLegacyHash
                        ? '需要密码（旧格式）'
                        : '无密码'
                  }}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <!-- 密码信息显示 -->
              <div
                v-if="config.password || config.isLegacyHash"
                class="rounded-lg border bg-muted/50 p-3 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-muted-foreground">授权密码</span>
                  <Badge v-if="config.isLegacyHash" class="text-xs" variant="secondary">
                    旧格式
                  </Badge>
                </div>
                <div v-if="config.password" class="flex items-center gap-2">
                  <code class="text-sm bg-background px-2 py-1 rounded border flex-1">
                    {{ config.password }}
                  </code>
                  <Button
                    class="h-7 w-7"
                    size="icon"
                    variant="ghost"
                    @click="copyPassword(config.password)"
                  >
                    <Copy class="h-3 w-3" />
                  </Button>
                </div>
                <p v-else class="text-xs text-muted-foreground">
                  ⚠️ 哈希格式密码，需要用户首次登录后自动转换为明文
                </p>
              </div>

              <div class="text-xs text-muted-foreground space-y-1">
                <div>创建: {{ formatDate(config.createdAt) }}</div>
                <div v-if="config.updatedAt !== config.createdAt">
                  更新: {{ formatDate(config.updatedAt) }}
                </div>
              </div>

              <div class="flex gap-2">
                <Button class="flex-1" size="sm" variant="outline" @click="editConfig(config)">
                  <Edit class="h-3 w-3 mr-1" />
                  编辑
                </Button>
                <Button
                  class="flex-1"
                  size="sm"
                  variant="destructive"
                  @click="confirmDelete(config)"
                >
                  <Trash2 class="h-3 w-3 mr-1" />
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <!-- 登录对话框 -->
    <LoginDialog v-model="showLoginDialog" :on-success="handleLoginSuccess" />

    <!-- 配置编辑对话框 -->
    <AutoAuthConfigDialog
      v-if="isAuthenticated"
      v-model="showConfigDialog"
      :account-token="accountStore.token"
      :config="editingConfig"
      :device-uuid="deviceUuid"
      @success="handleConfigSaved"
    />

    <!-- 编辑命名空间对话框 -->
    <EditNamespaceDialog
      v-if="isAuthenticated && deviceInfo"
      v-model="showNamespaceDialog"
      :account-token="accountStore.token"
      :current-namespace="deviceInfo.namespace"
      :device-uuid="deviceUuid"
      @success="handleNamespaceUpdated"
    />

    <!-- 删除确认对话框 -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除配置</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除 "{{ currentConfig ? getDeviceTypeLabel(currentConfig.deviceType) : '' }}"
            配置吗？ 此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="deleteConfig"
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
