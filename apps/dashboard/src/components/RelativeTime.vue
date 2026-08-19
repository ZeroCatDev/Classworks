<script setup>
import {onMounted, onBeforeUnmount, ref, watch, computed} from 'vue'

const props = defineProps({
  date: {type: [String, Number, Date], required: true},
  refreshMs: {type: Number, default: 60_000}, // 默认每分钟刷新
  locale: {type: String, default: 'zh-CN'},
  prefix: {type: String, default: ''}, // 可选前缀，如 "于"
  suffix: {type: String, default: ''}, // 可选后缀，如 "前"
  showTooltip: {type: Boolean, default: true}, // 鼠标悬浮显示绝对时间
})

const now = ref(Date.now())
let timer = null

const dateObj = computed(() => new Date(props.date))
const absText = computed(() => dateObj.value.toLocaleString(props.locale))

function formatRelative(from, to) {
  const rtf = new Intl.RelativeTimeFormat(props.locale, {numeric: 'auto'})
  const diff = to - from
  const sec = Math.round(diff / 1000)
  const min = Math.round(sec / 60)
  const hour = Math.round(min / 60)
  const day = Math.round(hour / 24)
  const month = Math.round(day / 30)
  const year = Math.round(month / 12)

  if (Math.abs(sec) < 60) return rtf.format(-sec, 'second')
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute')
  if (Math.abs(hour) < 24) return rtf.format(-hour, 'hour')
  if (Math.abs(day) < 30) return rtf.format(-day, 'day')
  if (Math.abs(month) < 12) return rtf.format(-month, 'month')
  return rtf.format(-year, 'year')
}

const relText = computed(() => {
  const text = formatRelative(dateObj.value.getTime(), now.value)
  return `${props.prefix}${text}${props.suffix}`
})

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, Math.max(5_000, props.refreshMs))
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

watch(() => props.refreshMs, (v) => {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    now.value = Date.now()
  }, Math.max(5_000, v || 60_000))
})
</script>

<template>
  <span :title="showTooltip ? absText : undefined">{{ relText }}</span>
</template>

<style scoped>
/* 行内展示，无额外样式 */
</style>
