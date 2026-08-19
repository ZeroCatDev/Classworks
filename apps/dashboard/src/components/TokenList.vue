<script setup>
import {computed} from 'vue'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty
} from '@/components/ui/table'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Copy, CheckCircle2, Key, Clock, Trash2} from 'lucide-vue-next'
import RelativeTime from '@/components/RelativeTime.vue'

const props = defineProps({
  items: {type: Array, default: () => []}, // [{ id, token, appId, appName?, note, installedAt }]
  loading: {type: Boolean, default: false},
  copiedId: {type: [String, Number, null], default: null}, // 用于显示已复制状态
  showAppColumn: {type: Boolean, default: true}, // 是否显示“应用”列，嵌在应用卡片下方时可隐藏
  compact: {type: Boolean, default: false}, // 仅显示备注（或时间），点击展开查看详情
  sortByTime: {type: Boolean, default: false}, // 按时间倒序排序
})

const emit = defineEmits(['copy', 'revoke'])

const rows = computed(() => {
  const list = [...props.items]
  if (props.sortByTime) {
    return list.sort((a, b) => new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime())
  }
  // 默认排序：按 appName 升序，时间倒序
  return list.sort((a, b) => {
    const an = (a.appName || a.appId || '').toString().toLowerCase()
    const bn = (b.appName || b.appId || '').toString().toLowerCase()
    if (an === bn) {
      return new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime()
    }
    return an < bn ? -1 : 1
  })
})

const colCount = computed(() => (props.compact ? 1 : (props.showAppColumn ? 5 : 4)))

const formatDate = (dateString) => new Date(dateString).toLocaleString('zh-CN')

// 紧凑模式下：点击行由父组件决定弹框打开
</script>

<template>
  <div class="relative">
    <Table>
      <TableCaption v-if="!loading && rows.length === 0">
        暂无授权应用令牌。
      </TableCaption>
      <TableHeader v-if="!props.compact">
        <TableRow>
          <TableHead v-if="props.showAppColumn" class="w-[28%]">应用</TableHead>
          <TableHead :class="props.showAppColumn ? 'w-[32%]' : 'w-[44%]'">令牌</TableHead>
          <TableHead class="w-[20%]">备注</TableHead>
          <TableHead class="w-[20%] text-right">授权时间</TableHead>
          <TableHead class="w-[100px] text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="loading">
          <TableCell :colspan="colCount" class="text-center py-8 text-muted-foreground">
            加载中...
          </TableCell>
        </TableRow>
        <TableRow v-else-if="rows.length === 0">
          <TableCell :colspan="colCount">
            <TableEmpty description="暂无数据" icon="package"/>
          </TableCell>
        </TableRow>
        <!-- 非紧凑模式：完整列集 -->
        <template v-if="!props.compact">
          <TableRow v-for="item in rows" :key="item.id">
            <TableCell v-if="props.showAppColumn">
              <div class="flex items-center gap-2">
                <Badge class="shrink-0" variant="secondary">{{ item.appId }}</Badge>
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ item.appName || `应用 ${item.appId}` }}</div>
                  <div class="text-xs text-muted-foreground truncate">ID: {{ item.appId }}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Key class="h-3.5 w-3.5 text-muted-foreground"/>
                <code class="text-xs font-mono truncate">{{ item.token }}</code>
                <Button
                    :title="props.copiedId === item.token ? '已复制' : '复制令牌'"
                    class="h-7 w-7 ml-auto"
                    size="sm"
                    variant="ghost"
                    @click="emit('copy', item)"
                >
                  <CheckCircle2 v-if="props.copiedId === item.token" class="h-3.5 w-3.5 text-green-500"/>
                  <Copy v-else class="h-3.5 w-3.5"/>
                </Button>
              </div>
            </TableCell>
            <TableCell>
              <span class="text-sm text-muted-foreground block truncate">{{ item.note || '-' }}</span>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                <Clock class="h-3.5 w-3.5"/>
                <span>
                  <RelativeTime :date="item.installedAt"/>
                </span>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <Button
                  class="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  size="sm"
                  variant="ghost"
                  @click="emit('revoke', item)"
              >
                <Trash2 class="h-3.5 w-3.5 mr-1"/>
                撤销
              </Button>
            </TableCell>
          </TableRow>
        </template>

        <!-- 紧凑模式：仅显示备注（无备注显示时间），点击触发 open 事件 -->
        <template v-else>
          <TableRow
              v-for="item in rows"
              :key="item.id"
              class="cursor-pointer hover:bg-muted/50"
              @click="emit('open', item)"
          >
            <TableCell>
              <div class="text-sm font-medium truncate">
                {{ item.note || '' }}
                <span class="text-xs text-muted-foreground">
                  <RelativeTime :date="item.installedAt"/>
                </span>
              </div>
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>

</template>

<style scoped>
.truncate {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
