<template>
  <v-card
    class="time-card"
    elevation="2"
    border
    rounded="xl"
    height="100%"
  >
    <v-card-text
      class="pa-6 d-flex flex-column "
      style="height: 100%"
    >
      <!-- 时间显示 -->
      <div
        class="time-display"
        :style="timeStyle"
      >
        {{ timeString }}<span
          class="seconds-text"
          :style="secondsStyle"
        >{{ secondsString }}</span>
      </div>

      <!-- 日期 + 星期 + 时段 -->
      <div
        class="date-line mt-3"
        :style="dateStyle"
      >
        {{ dateString }}  {{ weekdayString }}  {{ periodOfDay }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { SettingsManager, watchSettings } from '@/utils/settings'

// 时间字体大小比例（大屏场景）
const TIME_FONT_RATIO = 2.0
const SECONDS_FONT_RATIO = 0.9
const DATE_FONT_RATIO = 0.6

export default {
  name: 'TimeCard',
  data() {
    return {
      now: new Date(),
      timer: null,
      unwatch: null,
      fontSize: 28,
    }
  },
  computed: {
    timeString() {
      const h = String(this.now.getHours()).padStart(2, '0')
      const m = String(this.now.getMinutes()).padStart(2, '0')
      return `${h}:${m}`
    },
    secondsString() {
      return `:${String(this.now.getSeconds()).padStart(2, '0')}`
    },
    dateString() {
      const y = this.now.getFullYear()
      const m = this.now.getMonth() + 1
      const d = this.now.getDate()
      return `${y}年${m}月${d}日`
    },
    weekdayString() {
      const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
      return days[this.now.getDay()]
    },
    periodOfDay() {
      const h = this.now.getHours()
      if (h < 6) return '凌晨'
      if (h < 8) return '早晨'
      if (h < 11) return '上午'
      if (h < 13) return '中午'
      if (h < 17) return '下午'
      if (h < 19) return '傍晚'
      if (h < 22) return '晚上'
      return '深夜'
    },
    timeStyle() {
      return {
        'font-size': `${this.fontSize * TIME_FONT_RATIO}px`,
        'font-weight': '700',
        'line-height': '1',
        'letter-spacing': '4px',
        'font-variant-numeric': 'tabular-nums',
      }
    },
    secondsStyle() {
      return {
        'font-size': `${this.fontSize * SECONDS_FONT_RATIO}px`,
        'font-variant-numeric': 'tabular-nums',
        'vertical-align': 'baseline',
        'margin-left': '4px',
        'opacity': '0.6',
      }
    },
    dateStyle() {
      return {
        'font-size': `${this.fontSize * DATE_FONT_RATIO}px`,
        'letter-spacing': '1px',
      }
    },
  },
  mounted() {
    this.loadSettings()
    this.startTimer()
    this.unwatch = watchSettings(() => {
      this.loadSettings()
    })
  },
  beforeUnmount() {
    this.stopTimer()
    if (this.unwatch) {
      this.unwatch()
    }
  },
  methods: {
    loadSettings() {
      this.fontSize = SettingsManager.getSetting('font.size')
    },
    startTimer() {
      // 每秒更新一次
      this.timer = setInterval(() => {
        this.now = new Date()
      }, 1000)
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
  },
}
</script>

<style scoped>
.time-card {
  transition: all 0.3s ease;
  overflow: hidden;
}

.time-card:hover {
  transform: translateY(-2px);
}

.time-display {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  white-space: nowrap;
}

.seconds-text {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
}

.date-line {
  opacity: 0.75;
  letter-spacing: 1px;
}
</style>
