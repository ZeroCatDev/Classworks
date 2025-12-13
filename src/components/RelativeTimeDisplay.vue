<template>
  <span>{{ displayTime }}</span>
</template>

<script>
export default {
  name: 'RelativeTimeDisplay',
  props: {
    time: {
      type: [String, Date, Number],
      required: true
    }
  },
  computed: {
    displayTime() {
      if (!this.time) return ''
      const date = new Date(this.time)
      const now = new Date()

      // Reset hours to compare dates only
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const n = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const diffTime = d.getTime() - n.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '明天'
      if (diffDays === 2) return '后天'
      if (diffDays === -1) return '昨天'
      if (diffDays === -2) return '前天'

      // Check if in same week (assuming Monday start)
      const nDay = n.getDay() || 7 // 1-7

      // Start of current week for n
      const nStartOfWeek = new Date(n)
      nStartOfWeek.setDate(n.getDate() - nDay + 1)

      // End of current week for n
      const nEndOfWeek = new Date(n)
      nEndOfWeek.setDate(n.getDate() + (7 - nDay))

      if (d >= nStartOfWeek && d <= nEndOfWeek) {
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        return weekDays[date.getDay()]
      }

      // Default format M月D日
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    }
  }
}
</script>
