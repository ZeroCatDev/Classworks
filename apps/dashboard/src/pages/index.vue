<script setup>
import {ref, computed, onMounted} from 'vue'
import {apiClient} from '@/lib/api'
import {deviceStore} from '@/lib/deviceStore'
import {useAccountStore} from '@/stores/account'
import {useOAuthCallback} from '@/composables/useOAuthCallback'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Badge} from '@/components/ui/badge'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Key,
  Shield,
  RefreshCw,
  Copy,
  CheckCircle2,
  Settings,
  Package,
  Clock,
  AlertCircle,
  Lock,
  Info,
  User,
  LogOut,
  Layers,
  ChevronDown,
  TestTube2,
  Edit
} from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/dropdown-menu/DropdownMenu.vue'
import DropdownItem from '@/components/ui/dropdown-menu/DropdownItem.vue'
import AppCard from '@/components/AppCard.vue'
import TokenList from '@/components/TokenList.vue'
import LoginDialog from '@/components/LoginDialog.vue'
import DeviceRegisterDialog from '@/components/DeviceRegisterDialog.vue'
import DeviceSwitcher from '@/components/DeviceSwitcher.vue'
import EditDeviceNameDialog from '@/components/EditDeviceNameDialog.vue'
import EditNamespaceDialog from '@/components/EditNamespaceDialog.vue'
import FeatureNavigation from '@/components/FeatureNavigation.vue'
import {toast} from 'vue-sonner'

const deviceUuid = ref('')
const tokens = ref([])
const isLoading = ref(false)
const copied = ref(null)
const deviceInfo = ref(null) // 存储设备信息
const deviceAccount = ref(null) // 设备账户信息
const accountStore = useAccountStore()
const appInfoCache = ref({}) // 缓存应用信息

// Dialogs
const showAuthorizeDialog = ref(false)
const showRevokeDialog = ref(false)
const showRegisterDialog = ref(false)

const showLoginDialog = ref(false)
const showEditNameDialog = ref(false)
const showEditNamespaceDialog = ref(false)
const showUserMenu = ref(false)
const deviceRequired = ref(false) // 标记是否必须注册设备
const selectedToken = ref(null)
const showTokenDialog = ref(false)

// Form data
const appIdToAuthorize = ref('')

const authNote = ref('')


// 使用OAuth回调处理
const {handleOAuthCallback} = useOAuthCallback()


// 检查 namespace 是否等于 UUID（需要提示用户修改）
const namespaceEqualsUuid = computed(() => {
  return deviceInfo.value && deviceInfo.value.namespace === deviceInfo.value.uuid
})

// 为 TokenList 扁平化数据并附带 appName
const flatTokenList = computed(() => {
  return tokens.value.map(t => ({
    ...t,
    appName: appInfoCache.value[t.appId]?.name || null,
  }))
})

// 按应用分组以用于“应用卡片 + 下方小列表”布局
const groupedTokens = computed(() => {
  const groups = {}
  for (const t of tokens.value) {
    const id = t.appId
    if (!groups[id]) groups[id] = {appId: id, tokens: []}
    groups[id].tokens.push(t)
  }
  return Object.values(groups)
})

// 加载设备信息
const loadDeviceInfo = async () => {
  try {
    const info = await apiClient.getDeviceInfo(deviceUuid.value)
    deviceInfo.value = info
  } catch (error) {
    console.log('Failed to load device info:', error)
    deviceInfo.value = null
  }
}


const loadTokens = async () => {
  if (!deviceUuid.value) return

  isLoading.value = true
  try {
    const response = await apiClient.getDeviceTokens(deviceUuid.value)
    tokens.value = response.tokens || []

    // 预加载应用信息
    for (const token of tokens.value) {
      if (!appInfoCache.value[token.appId]) {
        try {
          const appResponse = await fetch(`https://api.zcservice.houlang.cloud/oauth/applications/${token.appId}`)
          if (appResponse.ok) {
            appInfoCache.value[token.appId] = await appResponse.json()
          }
        } catch (err) {
          console.error(`Failed to load app info for ${token.appId}:`, err)
        }
      }
    }
  } catch (error) {
    console.error('Failed to load tokens:', error)
    if (error.message.includes('设备不存在')) {
      tokens.value = []
    }
  } finally {
    isLoading.value = false
  }
}

// 获取应用名称的辅助函数
const getAppName = (appId) => {
  return appInfoCache.value[appId]?.name || `应用 ${appId}`
}

const authorizeApp = async () => {
  if (!appIdToAuthorize.value) return

  try {
    const options = {
      note: authNote.value || '授权访问',
    }

    // 账户已登录时无需显式传 token，axios 会自动注入 Authorization

    // 调用授权接口
    await apiClient.authorizeApp(
        appIdToAuthorize.value,
        deviceUuid.value,
        options
    )

    showAuthorizeDialog.value = false
    appIdToAuthorize.value = ''
    authNote.value = ''

    await loadTokens()
    toast.success('授权成功')
  } catch (error) {
    toast.error('授权失败：' + error.message)
  }
}

const confirmRevoke = (token) => {
  selectedToken.value = token
  showRevokeDialog.value = true
}

const revokeToken = async () => {
  if (!selectedToken.value) return

  try {
    // 使用安装记录ID撤销授权
    await apiClient.revokeDeviceToken(
        deviceUuid.value,
        selectedToken.value.id,
        accountStore.isAuthenticated ? accountStore.token : null
    )
    showRevokeDialog.value = false
    selectedToken.value = null
    await loadTokens()
    toast.success('撤销成功')
  } catch (error) {
    toast.error('撤销失败：' + error.message)
  }
}

const copyToClipboard = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = id
    setTimeout(() => {
      copied.value = null
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

const updateUuid = (newUuid = null) => {
  if (newUuid) {
    deviceUuid.value = newUuid
  } else {
    deviceUuid.value = deviceStore.getDeviceUuid()
  }

  // 记录到历史
  if (deviceUuid.value) {
    deviceStore.addDeviceToHistory({
      uuid: deviceUuid.value,
      name: deviceInfo.value?.name || deviceInfo.value?.deviceName
    })
  }

  loadDeviceInfo()
  loadDeviceAccount()
  loadTokens()
}


const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 加载设备账户信息
const loadDeviceAccount = async () => {
  if (!deviceUuid.value) return

  try {
    const response = await apiClient.getDeviceAccount(deviceUuid.value)
    deviceAccount.value = response.data
  } catch (error) {
    console.log('Failed to load device account:', error)
    deviceAccount.value = null
  }
}

// 登录成功回调
const handleLoginSuccess = async (token) => {
  showLoginDialog.value = false
  await accountStore.login(token)
  await loadDeviceAccount()

  // 如果当前设备未绑定，提示是否绑定
  if (!deviceAccount.value) {
    toast('登录成功', {
      description: '您可以将当前设备绑定到账户'
    })
  }

  // 登录完成后，根据需要决定是否继续显示设备弹框

  // 如果设备已经注册，即使是必需模式也不再显示设备弹框
  if (deviceUuid.value) {
    deviceRequired.value = false
  } else if (deviceRequired.value) {
    // 如果仍然需要设备，再次显示设备管理弹框
    showRegisterDialog.value = true
  }
}

// 退出登录
const handleLogout = () => {
  accountStore.logout()
  deviceAccount.value = null
  toast('已退出登录')
}

// 绑定当前设备到账户
const bindCurrentDevice = async () => {
  if (!accountStore.isAuthenticated) {
    toast.error('请先登录')
    showLoginDialog.value = true
    return
  }

  try {
    await apiClient.bindDeviceToAccount(deviceUuid.value)
    await loadDeviceInfo()
    toast.success('设备已绑定到您的账户')
  } catch (error) {
    // 如果设备不存在，先注册再绑定
    if (error.message.includes('设备不存在')) {
      try {
        await apiClient.registerDevice(
            deviceUuid.value,
            deviceInfo.value?.deviceName || null
        )
        await apiClient.bindDeviceToAccount(deviceUuid.value)
        await loadDeviceInfo()
        toast.success('设备已注册并绑定到您的账户')
      } catch (retryError) {
        toast.error('绑定失败：' + retryError.message)
      }
    } else {
      toast.error('绑定失败：' + error.message)
    }
  }
}

// 解绑当前设备
const unbindCurrentDevice = async () => {
  if (!accountStore.isAuthenticated) {
    toast.error('请先登录')
    return
  }

  try {
    await apiClient.unbindDeviceFromAccount(deviceUuid.value)
    await loadDeviceInfo()
    toast.success('设备已解绑')
  } catch (error) {
    toast.error('解绑失败：' + error.message)
  }
}

// 更新设备名称成功回调
const handleDeviceNameUpdated = async (newName) => {
  await loadDeviceInfo()
}

// 设备注册成功回调
const handleDeviceRegistered = () => {
  showRegisterDialog.value = false
  updateUuid()
}

// 更新 namespace 成功回调
const handleNamespaceUpdated = async (newNamespace) => {
  if (deviceInfo.value) {
    deviceInfo.value.namespace = newNamespace
  }
  toast.success('命名空间已更新')
}

onMounted(async () => {
  // 检查是否存在设备UUID
  const existingUuid = deviceStore.getDeviceUuid()
  if (!existingUuid) {
    deviceRequired.value = true
    // 如果没有设备UUID，显示设备管理弹框
    showRegisterDialog.value = true
  } else {
    deviceUuid.value = existingUuid

    // 先加载设备信息
    await loadDeviceInfo()

    // 加载设备账户信息
    await loadDeviceAccount()


    // 加载tokens
    await loadTokens()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
    <!-- Header -->
    <div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <!--<div class="rounded-lg bg-gradient-to-br from-primary to-primary/80 p-2.5 shadow-lg">
              <Shield class="h-6 w-6 text-primary-foreground" />
            </div>-->
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Classworks KV
              </h1>
              <p class="text-sm text-muted-foreground">文档形键值数据库</p>
            </div>
            <!-- 分隔线 -->
            <div class="h-8 w-px bg-border"></div>
            <!-- Vercel风格设备切换器 -->
            <DeviceSwitcher
                :device-info="deviceInfo"
                :device-uuid="deviceUuid"
                @device-changed="updateUuid"
            />
          </div>
          <div class="flex items-center gap-2">
            <!-- 账户状态 -->
            <template v-if="accountStore.isAuthenticated">
              <DropdownMenu v-model:open="showUserMenu" class="z-50">
                <template #trigger="{ toggle, open }">
                  <Button
                      class="flex items-center gap-2"
                      size="sm"
                      variant="ghost"
                      @click="toggle"
                  >
                    <img
                        v-if="accountStore.userAvatar"
                        :alt="accountStore.userName"
                        :src="accountStore.userAvatar"
                        class="w-5 h-5 rounded-full"
                    >
                    <User v-else class="h-4 w-4"/>
                    <span class="hidden sm:inline">{{ accountStore.userName }}</span>
                    <span
v-if="accountStore.profile?.providerInfo"
                          :style="{
                            backgroundColor: (accountStore.profile.providerInfo.color || '#999') + '22',
                            color: accountStore.profile.providerInfo.color || 'inherit',
                            border: `1px solid ${(accountStore.profile.providerInfo.color || '#999')}55`
                          }"
                          class="hidden md:inline px-1.5 py-0.5 rounded text-[10px]"
                    >
                      {{ accountStore.profile.providerInfo.displayName }}
                    </span>
                    <ChevronDown :class="{ 'rotate-180': open }" class="h-3.5 w-3.5"/>
                  </Button>
                </template>
                <DropdownItem
:href="accountStore.profile.providerInfo.website" :style="{
                  backgroundColor: (accountStore.profile.providerInfo.color || '#999') + '22',
                  color: accountStore.profile.providerInfo.color || 'inherit',
                  border: `1px solid ${(accountStore.profile.providerInfo.color || '#999')}55`
                }" target="_blank">
                  <Layers class="h-4 w-4"/>
                  账户渠道：{{ accountStore.profile.providerInfo.displayName }}
                </DropdownItem>

                <DropdownItem @click="$router.push('/device-management')">
                  <Layers class="h-4 w-4"/>
                  设备管理
                </DropdownItem>

                <DropdownItem @click="$router.push('/auto-auth-management')">
                  <Shield class="h-4 w-4"/>
                  自动授权配置
                </DropdownItem>
                <DropdownItem @click="$router.push('/auto-auth-test')">
                  <TestTube2 class="h-4 w-4"/>
                  API 测试工具
                </DropdownItem>
                <DropdownItem
class="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                              @click="handleLogout">
                  <LogOut class="h-4 w-4"/>
                  退出登录
                </DropdownItem>
              </DropdownMenu>
            </template>
            <Button
                v-else
                size="sm"
                variant="outline"
                @click="showLoginDialog = true"
            >
              <User class="h-4 w-4 mr-2"/>
              登录
            </Button>


            <Button
                :disabled="isLoading"
                size="icon"
                variant="outline"
                @click="loadTokens"
            >
              <RefreshCw :class="{ 'animate-spin': isLoading }" class="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-8 max-w-7xl">
      <!-- Namespace 提示卡片 - 如果 namespace 等于 UUID -->
      <Card
v-if="namespaceEqualsUuid"
            class="mb-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent class="py-4">
          <div class="flex items-start gap-3">
            <AlertCircle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0"/>
            <div class="flex-1">
              <p class="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                建议自定义命名空间
              </p>
              <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                您的命名空间当前使用设备 UUID，建议修改为更有意义的名称（如班级名、房间号等），方便自动授权时识别。
              </p>
              <Button
                  v-if="accountStore.isAuthenticated"
                  class="bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  size="sm"
                  variant="outline"
                  @click="showEditNamespaceDialog = true"
              >
                <Settings class="h-3 w-3 mr-2"/>
                立即修改
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Device Info Card -->
      <Card class="mb-8 border-2 shadow-xl bg-gradient-to-br from-card to-card/95">
        <CardHeader class="pb-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="rounded-lg bg-primary/10 p-2">
                <Layers class="h-5 w-5 text-primary"/>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <CardTitle class="text-lg">
                    {{ deviceInfo?.name || '设备' }}
                  </CardTitle>
                  <Button
                      v-if="accountStore.isAuthenticated"
                      class="h-6 w-6 p-0"
                      size="sm"
                      variant="ghost"
                      @click="showEditNameDialog = true"
                  >
                    <Edit class="h-3 w-3"/>
                  </Button>
                </div>
                <CardDescription>设备命名空间标识符</CardDescription>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">


              <!-- 设备账户绑定状态 -->
              <Badge v-if="deviceInfo?.account" class="px-3 py-1" variant="secondary">
                <User class="h-3 w-3 mr-1.5"/>
                {{ deviceInfo.account.name }}
              </Badge>
              <Button
                  v-else-if="accountStore.isAuthenticated"
                  size="sm"
                  variant="outline"
                  @click="bindCurrentDevice"
              >
                <User class="h-4 w-4 mr-2"/>
                绑定到账户
              </Button>

              <Button
                  size="sm"
                  variant="outline"
                  @click="$router.push('/auto-auth-management')"
              >
                <Shield class="h-4 w-4 mr-1"/>
                自动授权
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <!-- Namespace Display (主要显示) -->
            <div class="relative group">
              <div
                  class="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50"/>
              <div class="relative">
                <div class="flex items-center justify-between mb-2">
                  <Label class="text-sm font-medium">命名空间</Label>
                  <Button
                      v-if="accountStore.isAuthenticated"
                      class="h-7"
                      size="sm"
                      variant="ghost"
                      @click="showEditNamespaceDialog = true"
                  >
                    <Settings class="h-3 w-3 mr-1"/>
                    编辑
                  </Button>
                </div>
                <div class="flex items-center gap-2 p-4 bg-gradient-to-r from-muted/80 to-muted/60 rounded-lg border">
                  <code class="flex-1 text-sm font-mono tracking-wider select-all">
                    {{ deviceInfo?.namespace || deviceUuid }}
                  </code>
                  <Button
                      class="h-8 w-8"
                      size="icon"
                      title="复制命名空间"
                      variant="ghost"
                      @click="copyToClipboard(deviceInfo?.namespace || deviceUuid, 'namespace')"
                  >
                    <CheckCircle2 v-if="copied === 'namespace'" class="h-4 w-4 text-green-500 animate-in zoom-in-50"/>
                    <Copy v-else class="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="p-3 rounded-lg bg-muted/50 text-center">
                <div class="text-2xl font-bold text-primary">{{ new Set(tokens.map(t => t.appId)).size }}</div>
                <div class="text-xs text-muted-foreground">应用数</div>
              </div>
              <div class="p-3 rounded-lg bg-muted/50 text-center">
                <div class="text-2xl font-bold text-primary">{{ tokens.length }}</div>
                <div class="text-xs text-muted-foreground">令牌数</div>
              </div>

            </div>


          </div>
        </CardContent>
      </Card>


      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">已授权应用</h2>
        <Button class="gap-2" @click="showAuthorizeDialog = true">
          <Plus class="h-4 w-4"/>
          授权新应用
        </Button>
      </div>


      <div v-if="isLoading" class="text-center py-12">
        <RefreshCw class="h-8 w-8 animate-spin mx-auto text-muted-foreground"/>
        <p class="mt-4 text-muted-foreground">加载中...</p>
      </div>


      <Card v-else-if="tokens.length === 0" class="border-dashed">
        <CardContent class="flex flex-col items-center justify-center py-12">
          <Package class="h-16 w-16 text-muted-foreground/50 mb-4"/>
          <p class="text-lg font-medium text-muted-foreground mb-2">暂无授权应用</p>
          <p class="text-sm text-muted-foreground mb-4">点击上方按钮授权您的第一个应用</p>
          <Button variant="outline" @click="showAuthorizeDialog = true">
            <Plus class="h-4 w-4 mr-2"/>
            授权应用
          </Button>
        </CardContent>
      </Card>
      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
            v-for="group in groupedTokens"
            :key="group.appId"
            class="space-y-4"
        >
          <AppCard :app-id="group.appId"/>

          <TokenList
              :copied-id="copied"
              :items="group.tokens.map(t => ({
                  id: t.id,
                  token: t.token,
                  appId: t.appId,
                  appName: appInfoCache[t.appId]?.name || null,
                  note: t.note,
                  installedAt: t.installedAt,
                }))"
              :loading="isLoading"
              :show-app-column="false"
              compact
              sort-by-time
              @copy="(item) => copyToClipboard(item.token, item.token)"
              @open="(item) => { selectedToken = item; showTokenDialog = true }"
              @revoke="confirmRevoke"
          />

        </div>
      </div>

      <!-- 功能导航 -->
      <div class="mt-12">
        <FeatureNavigation/>
      </div>


      <Dialog v-model:open="showAuthorizeDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>授权新应用</DialogTitle>
            <DialogDescription>
              为应用生成新的访问令牌
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="appId">应用 ID</Label>
              <Input
                  id="appId"
                  v-model="appIdToAuthorize"
                  placeholder="输入应用 ID"
              />
            </div>
            <div class="space-y-2">
              <Label for="note">备注（可选）</Label>
              <Input
                  id="note"
                  v-model="authNote"
                  placeholder="为此授权添加备注"
              />
            </div>
            <p v-if="accountStore.isAuthenticated" class="text-xs text-muted-foreground mt-2">
              已登录绑定账户，无需输入密码
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showAuthorizeDialog = false">
              取消
            </Button>
            <Button @click="authorizeApp">
              授权
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog v-model:open="showRevokeDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销授权</DialogTitle>
            <DialogDescription>
              确定要撤销此令牌的授权吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <div v-if="selectedToken" class="py-4 space-y-4">
            <div class="p-4 bg-muted rounded-lg space-y-2">
              <div class="text-sm">
                <span class="font-medium">应用: </span>
                {{ getAppName(selectedToken.appId) }}
              </div>
              <div class="text-sm">
                <span class="font-medium">令牌: </span>
                <code class="text-xs">{{ selectedToken.token.slice(0, 16) }}...</code>
              </div>
            </div>


          </div>
          <DialogFooter>
            <Button variant="outline" @click="showRevokeDialog = false">
              取消
            </Button>
            <Button variant="destructive" @click="revokeToken">
              确认撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- 令牌详情弹框 -->
      <Dialog v-model:open="showTokenDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>令牌详情</DialogTitle>
            <DialogDescription>
              查看并对该令牌执行操作
            </DialogDescription>
          </DialogHeader>
          <div v-if="selectedToken" class="space-y-3 py-2">
            <div class="text-sm">
              <span class="font-medium">备注：</span>
              <span>{{ selectedToken.note || '—' }}</span>
            </div>
            <div class="text-sm">
              <span class="font-medium">应用名称：</span>
              <span>{{ selectedToken.appName }}</span>
            </div>
            <div class="text-sm">
              <span class="font-medium">应用ID：</span>
              <span>{{ selectedToken.appId }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium">令牌：</span>
              <code class="text-xs font-mono break-all">{{ selectedToken.token.slice(0, 8) }}...</code>
              <Button
                  class="h-7 w-7 ml-auto"
                  size="sm"
                  variant="ghost"
                  @click="copyToClipboard(selectedToken.token, selectedToken.token)"
              >
                <CheckCircle2 v-if="copied === selectedToken.token" class="h-3.5 w-3.5 text-green-500"/>
                <Copy v-else class="h-3.5 w-3.5"/>
              </Button>
            </div>
            <div class="text-sm text-muted-foreground flex items-center gap-2">
              <Clock class="h-4 w-4"/>
              <span>{{ formatDate(selectedToken.installedAt) }}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showTokenDialog = false">关闭</Button>
            <Button variant="destructive" @click="() => { showTokenDialog = false; confirmRevoke(selectedToken) }">
              撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>

    <!-- 登录弹框 -->
    <LoginDialog
        v-model="showLoginDialog"
        :on-success="handleLoginSuccess"
        @update:model-value="val => {
        if (!val && deviceRequired.value) {
          showRegisterDialog.value = true
        }
      }"
    />    <!-- 设备注册弹框 -->
    <DeviceRegisterDialog
        v-model="showRegisterDialog"
        :required="deviceRequired"
        @confirm="handleDeviceRegistered"
    />

    <!-- 设备名称编辑弹框 -->
    <EditDeviceNameDialog
        v-model="showEditNameDialog"
        :current-name="deviceInfo?.deviceName || ''"
        :device-uuid="deviceUuid"
        @success="handleDeviceNameUpdated"
    />

    <!-- 命名空间编辑弹框 -->
    <EditNamespaceDialog
        v-if="accountStore.isAuthenticated && deviceInfo"
        v-model="showEditNamespaceDialog"
        :account-token="accountStore.token"
        :current-namespace="deviceInfo.namespace"
        :device-uuid="deviceUuid"
        @success="handleNamespaceUpdated"
    />
  </div>
</template>