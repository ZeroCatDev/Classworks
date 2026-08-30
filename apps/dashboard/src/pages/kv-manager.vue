<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/lib/api'
import { deviceStore } from '@/lib/deviceStore'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  Upload,
  Trash2,
  Plus,
  Loader2,
  Search,
  RefreshCw,
  Copy,
  Edit,
  Check,
  X,
  Key,
  ShieldCheck,
  Database,
} from 'lucide-vue-next'

// Token 与自动授权
const token = ref(localStorage.getItem('kv_token') || '')
const isTokenSet = computed(() => !!token.value)
const autoAuth = ref({
  namespace: localStorage.getItem('kv_namespace') || '',
  password: '',
  appId: 'c0147d26d087d70113a21de967c452c0',
})
const autoAuthLoading = ref(false)
const deviceUuid = ref('')

// 列表与筛选（仅本地过滤）
const searchText = ref('') // 关键字过滤（本地）
const loading = ref(false)
const error = ref('')
const keys = ref([])
const values = ref({})
const loadingValues = ref({})
const specificKey = ref('') // 加载特定项

// 选择与分页
const selected = ref(new Set())
const page = ref(1)
const pageSize = ref(10)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredKeys.value.length / pageSize.value)),
)
const pagedKeys = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredKeys.value.slice(start, start + pageSize.value)
})

// 过滤后的 keys
const filteredKeys = computed(() => {
  if (!searchText.value.trim()) return keys.value
  const kw = searchText.value.toLowerCase()
  return keys.value.filter((k) => k.toLowerCase().includes(kw))
})

// 对话框：新增/编辑
const editOpen = ref(false)
const isEditing = ref(false)
const formKey = ref('')
const formValue = ref('')
const formError = ref('')

// 预填 namespace：尝试从设备信息中获取
onMounted(async () => {
  deviceUuid.value = deviceStore.getDeviceUuid() || ''
  if (deviceUuid.value) {
    try {
      const info = await apiClient.getDeviceInfo(deviceUuid.value)
      const ns = info.device?.namespace || info.namespace
      if (ns && !autoAuth.value.namespace) {
        autoAuth.value.namespace = ns
        localStorage.setItem('kv_namespace', ns)
      }
    } catch {
      // 忽略
    }
  }
  if (isTokenSet.value) {
    await loadKeys()
  }
})

// 自动授权获取 Token
const acquireToken = async () => {
  if (!autoAuth.value.namespace) {
    toast.error('请输入命名空间')
    return
  }
  autoAuthLoading.value = true
  try {
    const res = await apiClient.getTokenByNamespace(
      autoAuth.value.namespace,
      autoAuth.value.password || undefined,
      autoAuth.value.appId,
    )
    if (res?.token) {
      token.value = res.token
      localStorage.setItem('kv_token', token.value)
      if (autoAuth.value.namespace) localStorage.setItem('kv_namespace', autoAuth.value.namespace)
      if (autoAuth.value.appId) localStorage.setItem('kv_appId', autoAuth.value.appId)
      toast.success('已获取 Token')
      await loadKeys()
    } else {
      toast.error('未返回 Token')
    }
  } catch (e) {
    toast.error('获取 Token 失败：' + e.message)
  } finally {
    autoAuthLoading.value = false
  }
}

// 手动设置/清除 Token
const clearToken = () => {
  token.value = ''
  localStorage.removeItem('kv_token')
  keys.value = []
  values.value = {}
}

// 加载全部 keys 列表（服务器不支持 pattern，本地过滤）
const loadKeys = async () => {
  if (!token.value) {
    toast.error('请先获取或填写 Token')
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await apiClient.getKVKeys(token.value)
    keys.value = Array.isArray(res) ? res : res?.keys || []
    page.value = 1
    values.value = {}
  } catch (e) {
    error.value = e.message || '加载键名失败'
  } finally {
    loading.value = false
  }
}

// 加载指定 key（将其加入列表并加载值）
const loadSpecificKey = async () => {
  const key = (specificKey.value || '').trim()
  if (!key) {
    toast.error('请输入要加载的键名')
    return
  }
  if (!token.value) {
    toast.error('请先获取或填写 Token')
    return
  }
  try {
    const res = await apiClient.getKVItem(token.value, key)
    const val = res && Object.prototype.hasOwnProperty.call(res, 'value') ? res.value : res
    if (!keys.value.includes(key)) {
      keys.value.unshift(key)
      page.value = 1
    }
    values.value[key] = val
    toast.success('已加载指定键')
    // 直接打开该项的编辑对话框
    await openEdit(key)
  } catch (e) {
    toast.error('加载指定键失败：' + e.message)
  }
}
// 打开新增/编辑对话框
const openCreate = () => {
  isEditing.value = false
  formKey.value = ''
  formValue.value = ''
  formError.value = ''
  editOpen.value = true
}
const openEdit = async (key) => {
  isEditing.value = true
  formKey.value = key
  formError.value = ''
  editOpen.value = true
  // 预加载当前值
  try {
    const res = await apiClient.getKVItem(token.value, key)
    const v = res && Object.prototype.hasOwnProperty.call(res, 'value') ? res.value : res
    formValue.value = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
  } catch (e) {
    formValue.value = ''
    toast.error('加载值失败：' + e.message)
  }
}

// 保存键值
const saving = ref(false)
const saveKeyValue = async () => {
  formError.value = ''
  const key = (formKey.value || '').trim()
  const raw = (formValue.value || '').trim()
  if (!key) return (formError.value = '请输入键名')
  if (!raw) return (formError.value = '请输入值（可为JSON或字符串）')

  let value
  try {
    value = JSON.parse(raw)
  } catch {
    value = raw // 允许纯字符串
  }

  saving.value = true
  try {
    await apiClient.setKVItem(token.value, key, value)
    toast.success(isEditing.value ? '已保存修改' : '已创建键值')
    editOpen.value = false
    await loadKeys()
  } catch (e) {
    formError.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

// 删除单个
const deleteKey = async (key) => {
  if (!confirm(`确定删除键 “${key}” 吗？`)) return
  try {
    await apiClient.deleteKVItem(token.value, key)
    toast.success('已删除')
    await loadKeys()
  } catch (e) {
    toast.error('删除失败：' + e.message)
  }
}

// 批量删除
const bulkDeleting = ref(false)
const bulkDelete = async () => {
  if (selected.value.size === 0) return
  if (!confirm(`确定删除选中的 ${selected.value.size} 个键吗？`)) return
  bulkDeleting.value = true
  try {
    const toDelete = Array.from(selected.value)
    for (const k of toDelete) {
      await apiClient.deleteKVItem(token.value, k)
    }
    toast.success('批量删除完成')
    selected.value.clear()
    await loadKeys()
  } catch (e) {
    toast.error('批量删除失败：' + e.message)
  } finally {
    bulkDeleting.value = false
  }
}

// 导出与导入
const exportAll = async () => {
  if (!isTokenSet.value) return
  // 尝试加载所有值
  const data = {}
  for (const k of keys.value) {
    try {
      const res = await apiClient.getKVItem(token.value, k)
      const val = res && Object.prototype.hasOwnProperty.call(res, 'value') ? res.value : res
      data[k] = val
    } catch {
      // 忽略单项失败
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kv-export-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importOpen = ref(false)
const importJson = ref('')
const importError = ref('')
const importing = ref(false)
const startImport = () => {
  importJson.value = ''
  importError.value = ''
  importOpen.value = true
}
const doImport = async () => {
  importError.value = ''
  let parsed
  try {
    parsed = JSON.parse(importJson.value || '{}')
  } catch {
    importError.value = 'JSON 无效'
    return
  }
  importing.value = true
  try {
    for (const [k, v] of Object.entries(parsed)) {
      await apiClient.setKVItem(token.value, k, v)
    }
    toast.success('导入完成')
    importOpen.value = false
    await loadKeys()
  } catch (e) {
    importError.value = e.message || '导入失败'
  } finally {
    importing.value = false
  }
}

// 工具函数
const previewValue = (v) => {
  if (v === undefined) return '点击查看'
  try {
    return typeof v === 'string' ? v : JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}
const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('已复制')
  } catch {
    toast.error('复制失败')
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <div
      class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10"
    >
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center gap-3">
          <Database class="h-6 w-6" />
          <div>
            <h1 class="text-2xl font-bold">KV 数据管理器</h1>
            <p class="text-sm text-muted-foreground">
              自动授权获取 Token，使用现代表格进行数据管理
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-6 py-6 max-w-7xl space-y-6">
      <!-- 自动授权 / Token 区域 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <ShieldCheck class="h-5 w-5" />
            自动授权 / Token
          </CardTitle>
          <CardDescription>通过命名空间快速获取 Token，或手动填写 Token</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label for="ns">命名空间</Label>
              <Input id="ns" v-model="autoAuth.namespace" placeholder="例如: class-2024-1" />
            </div>
            <div class="space-y-2">
              <Label for="pwd">授权密码（可选）</Label>
              <Input
                id="pwd"
                v-model="autoAuth.password"
                placeholder="留空表示无密码"
                type="password"
              />
            </div>
            <div class="space-y-2">
              <Label for="appid">App ID</Label>
              <Input id="appid" v-model="autoAuth.appId" disabled placeholder="应用标识符" />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Button :disabled="autoAuthLoading" @click="acquireToken">
              <Loader2 v-if="autoAuthLoading" class="mr-2 h-4 w-4 animate-spin" />
              <Key v-else class="mr-2 h-4 w-4" />
              自动授权获取 Token
            </Button>
            <div class="flex-1" />
            <div class="flex items-center gap-2 min-w-[280px]">
              <Input v-model="token" placeholder="或手动粘贴 Token" />
              <Button :disabled="!isTokenSet" variant="outline" @click="clearToken">清除</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 工具栏 -->
      <Card>
        <CardContent class="py-4">
          <div class="flex flex-col md:flex-row gap-3 md:items-center">
            <div class="flex items-center gap-2 md:w-[700px] w-full flex-wrap">
              <div class="relative flex-1">
                <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input v-model="searchText" class="pl-8" placeholder="本地过滤关键字" />
              </div>
              <Button :disabled="!isTokenSet" variant="outline" @click="loadKeys">
                <RefreshCw class="h-4 w-4 mr-2" />
                刷新
              </Button>
              <div class="flex items-center gap-2 min-w-[300px]">
                <Input v-model="specificKey" placeholder="输入完整键名（加载单项）" />
                <Button
                  :disabled="!isTokenSet || !specificKey.trim()"
                  variant="outline"
                  @click="loadSpecificKey"
                >
                  加载项
                </Button>
              </div>
            </div>
            <div class="md:ml-auto flex items-center gap-2">
              <Button :disabled="!isTokenSet" variant="outline" @click="startImport">
                <Upload class="h-4 w-4 mr-2" />
                导入
              </Button>
              <Button
                :disabled="!isTokenSet || keys.length === 0"
                variant="outline"
                @click="exportAll"
              >
                <Download class="h-4 w-4 mr-2" />
                导出
              </Button>
              <Separator class="h-6" orientation="vertical" />
              <Button :disabled="!isTokenSet" variant="secondary" @click="openCreate">
                <Plus class="h-4 w-4 mr-2" />
                新建
              </Button>
              <Button
                :disabled="!isTokenSet || selected.size === 0 || bulkDeleting"
                variant="destructive"
                @click="bulkDelete"
              >
                <Loader2 v-if="bulkDeleting" class="mr-2 h-4 w-4 animate-spin" />
                <Trash2 v-else class="h-4 w-4 mr-2" />
                删除所选
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 列表 -->
      <Card>
        <CardHeader>
          <CardTitle>键值列表</CardTitle>
          <CardDescription> 共 {{ filteredKeys.length }} 项 </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="error" class="text-sm text-red-500 mb-3">{{ error }}</div>
          <div v-if="loading" class="py-10 text-center text-muted-foreground">加载中...</div>
          <div v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-10">
                    <Checkbox
                      :checked="selected.size > 0 && selected.size === pagedKeys.length"
                      :indeterminate="selected.size > 0 && selected.size < pagedKeys.length"
                      @update:checked="
                        (val) => {
                          if (val) {
                            pagedKeys.forEach((k) => selected.add(k))
                          } else {
                            pagedKeys.forEach((k) => selected.delete(k))
                          }
                        }
                      "
                    />
                  </TableHead>
                  <TableHead class="min-w-[260px]">键名</TableHead>
                  <TableHead>值预览</TableHead>
                  <TableHead class="w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="k in pagedKeys" :key="k">
                  <TableCell>
                    <Checkbox
                      :checked="selected.has(k)"
                      @update:checked="
                        (val) => {
                          val ? selected.add(k) : selected.delete(k)
                        }
                      "
                    />
                  </TableCell>
                  <TableCell
                    class="font-mono text-sm break-all cursor-pointer hover:underline"
                    title="点击查看/编辑"
                    @click="openEdit(k)"
                  >
                    {{ k }}
                  </TableCell>
                  <TableCell>
                    <div
                      class="text-xs whitespace-pre-wrap max-h-40 overflow-auto rounded-md bg-muted p-2 cursor-pointer hover:bg-muted/70 transition-colors"
                      title="点击查看/编辑"
                      @click="openEdit(k)"
                    >
                      {{ previewValue(values[k]) }}
                    </div>
                  </TableCell>
                  <TableCell class="space-x-1 whitespace-nowrap">
                    <Button size="sm" variant="outline" @click="copy(k)">
                      <Copy class="h-3.5 w-3.5 mr-1" />
                      复制键
                    </Button>
                    <Button size="sm" variant="outline" @click="openEdit(k)">
                      <Edit class="h-3.5 w-3.5 mr-1" />
                      编辑
                    </Button>
                    <Button size="sm" variant="destructive" @click="deleteKey(k)">
                      <Trash2 class="h-3.5 w-3.5 mr-1" />
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow v-if="!pagedKeys.length">
                  <TableCell class="text-center text-muted-foreground py-10" colspan="4"
                    >暂无数据</TableCell
                  >
                </TableRow>
              </TableBody>
            </Table>

            <!-- 分页 -->
            <div class="flex items-center justify-between mt-4 text-sm">
              <div class="flex items-center gap-2">
                <span>每页</span>
                <select
                  v-model.number="pageSize"
                  class="h-9 w-[80px] rounded-md border border-input bg-background px-2"
                >
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                </select>
                <span class="text-muted-foreground">共 {{ totalPages }} 页</span>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  :disabled="page === 1"
                  variant="outline"
                  @click="page = Math.max(1, page - 1)"
                  >上一页</Button
                >
                <span>第 {{ page }} / {{ totalPages }} 页</span>
                <Button
                  :disabled="page === totalPages"
                  variant="outline"
                  @click="page = Math.min(totalPages, page + 1)"
                >
                  下一页
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 新增/编辑对话框 -->
    <Dialog :open="editOpen" @update:open="(val) => (editOpen = val)">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? '编辑键值' : '新增键值' }}</DialogTitle>
          <DialogDescription>支持 JSON 或纯文本，JSON 将自动格式化保存</DialogDescription>
        </DialogHeader>
        <div class="space-y-3 py-2">
          <div class="space-y-1">
            <Label for="kv-key">键名</Label>
            <Input id="kv-key" v-model="formKey" :disabled="isEditing" placeholder="请输入键名" />
          </div>
          <div class="space-y-1">
            <Label for="kv-val">值（JSON 或文本）</Label>
            <textarea
              id="kv-val"
              v-model="formValue"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              rows="10"
            ></textarea>
            <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
          </div>
        </div>
        <DialogFooter>
          <Button :disabled="saving" variant="outline" @click="editOpen = false">取消</Button>
          <Button :disabled="saving" @click="saveKeyValue">
            <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 导入对话框 -->
    <Dialog :open="importOpen" @update:open="(val) => (importOpen = val)">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>导入 JSON</DialogTitle>
          <DialogDescription>JSON 对象的每个键会写入为一个 KV 项</DialogDescription>
        </DialogHeader>
        <div class="space-y-3 py-2">
          <textarea
            v-model="importJson"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            placeholder='{"key":"value"}'
            rows="12"
          ></textarea>
          <p v-if="importError" class="text-sm text-red-500">{{ importError }}</p>
        </div>
        <DialogFooter>
          <Button :disabled="importing" variant="outline" @click="importOpen = false">取消</Button>
          <Button :disabled="importing" @click="doImport">
            <Loader2 v-if="importing" class="mr-2 h-4 w-4 animate-spin" />
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped></style>
