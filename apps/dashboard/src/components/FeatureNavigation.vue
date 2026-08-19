<script setup>
import {useRouter} from 'vue-router'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {
  Shield,
  TestTube2,
  Settings,
  Layers,
  Database,
  Key,
  ArrowRight,
} from 'lucide-vue-next'

const router = useRouter()

const features = [
  {
    title: '自动授权配置',
    description: '管理设备的自动授权规则，支持多种设备类型和权限设置',
    icon: Shield,
    path: '/auto-auth-management',
    color: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'API 测试工具',
    description: '测试自动授权 API、学生名称设置和 KV 操作权限',
    icon: TestTube2,
    path: '/auto-auth-test',
    color: 'from-purple-500 to-pink-500',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
  }, {
    title: 'KV 管理器',
    description: '浏览和管理键值存储数据，支持批量操作',
    icon: Database,
    path: '/kv-manager',
    color: 'from-green-500 to-emerald-500',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    title: '设备管理',
    description: '管理您账户下的所有设备，修改名称和密码',
    icon: Layers,
    path: '/device-management',
    color: 'from-orange-500 to-red-500',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
]

const navigateTo = (path) => {
  router.push(path)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold">功能导航</h2>
        <p class="text-sm text-muted-foreground mt-1">快速访问各项功能</p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card
          v-for="feature in features"
          :key="feature.path"
          class="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          @click="navigateTo(feature.path)"
      >
        <CardHeader class="pb-3">
          <div class="flex items-start justify-between mb-3">
            <div :class="[feature.iconBg, 'p-3 rounded-lg']">
              <component :is="feature.icon" :class="[feature.iconColor, 'h-6 w-6']"/>
            </div>
            <ArrowRight
                class="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"/>
          </div>
          <CardTitle class="text-lg">{{ feature.title }}</CardTitle>
          <CardDescription class="text-xs line-clamp-2">
            {{ feature.description }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button class="w-full group-hover:bg-primary/10" size="sm" variant="ghost">
            前往
            <ArrowRight class="ml-2 h-3 w-3"/>
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
