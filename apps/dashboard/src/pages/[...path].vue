<script setup>
import {onMounted} from 'vue'
import {useRoute, RouterLink} from 'vue-router'
import {Button} from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {AlertCircle, Home, ArrowLeft} from 'lucide-vue-next'

const route = useRoute()

const goBack = () => {
  if (history.length > 1) history.back()
  else window.location.assign('/')
}

onMounted(() => {
  document.title = '404 - 页面未找到'
})
</script>

<template>
  <main
      class="relative min-h-dvh grid place-items-center px-6 py-16 bg-gradient-to-b from-background to-muted/40"
  >
    <!-- 背景点缀 -->
    <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent blur-2xl"
    />

    <Card class="w-full max-w-xl">
      <CardHeader class="text-center">
        <div
            class="mx-auto flex size-14 items-center justify-center rounded-full border bg-background/60 shadow-sm"
        >
          <AlertCircle class="size-7 text-primary"/>
        </div>
        <CardTitle class="mt-3 text-2xl">页面未找到</CardTitle>
        <CardDescription>
          抱歉，您访问的地址不存在或已被移动。
        </CardDescription>
      </CardHeader>

      <CardContent class="text-center text-sm text-muted-foreground break-words">
        <p>
          请求路径：
          <span class="font-medium text-foreground/80">{{ route.fullPath }}</span>
        </p>
      </CardContent>

      <CardFooter class="flex items-center justify-center gap-3">
        <RouterLink to="/">
          <Button size="lg">
            <Home class="size-4"/>
            返回首页
          </Button>
        </RouterLink>
        <Button size="lg" variant="outline" @click="goBack">
          <ArrowLeft class="size-4"/>
          返回上一页
        </Button>
      </CardFooter>
    </Card>

    <p class="mt-6 text-center text-xs text-muted-foreground/80 select-none">
      错误代码：404
    </p>
  </main>
</template>

<style scoped>
</style>
