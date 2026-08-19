<template>
  <v-card
    class="noise-monitor-card"
    elevation="2"
    border
    rounded="xl"
    height="100%"
    style="cursor: pointer"
    @click="showDetail = true"
  >
    <v-card-text
      class="pa-5 d-flex flex-column"
      style="height: 100%"
    >
      <!-- 顶部标题行 -->
      <div class="d-flex align-center mb-3">
        <v-icon
          :color="statusColor"
          class="mr-2"
          size="20"
        >
          mdi-microphone
        </v-icon>
        <span class="text-subtitle-2 font-weight-medium text-medium-emphasis">
          环境噪音监测
        </span>
        <v-spacer />
        <v-chip
          :color="statusColor"
          size="x-small"
          variant="tonal"
          label
        >
          {{ statusLabel }}
        </v-chip>
      </div>

      <!-- 分贝显示 -->
      <div class="noise-db-display d-flex align-center justify-center flex-grow-1">
        <div class="text-center">
          <div class="d-flex align-end justify-center">
            <span
              class="noise-db-value font-weight-bold"
              :style="{ color: `rgb(var(--v-theme-${dbColor}))`, fontSize: dbFontSize }"
            >
              {{ currentDb }}
            </span>
            <span class="text-caption text-medium-emphasis ml-1 mb-1">dB</span>
          </div>
          <div
            class="noise-level-label text-caption mt-1"
            :class="`text-${dbColor}`"
          >
            {{ noiseLevel }}
          </div>
        </div>
      </div>

      <!-- 底部迷你波形 + 分数 -->
      <div class="d-flex align-center mt-2">
        <!-- 迷你波形条 -->
        <div
          class="noise-mini-bars d-flex align-end"
          style="height: 20px; gap: 2px; flex: 1;"
        >
          <div
            v-for="(val, i) in miniBarValues"
            :key="i"
            class="noise-mini-bar"
            :style="{
              height: `${val}%`,
              backgroundColor: `rgb(var(--v-theme-${barColor(val)}))`,
              flex: 1,
              borderRadius: '2px',
              transition: 'height 0.15s ease',
              minWidth: '3px',
              maxWidth: '6px',
            }"
          />
        </div>

        <!-- 当前评分 -->
        <div
          v-if="currentScore !== null"
          class="ml-3 text-center"
        >
          <div
            class="font-weight-bold text-subtitle-1"
            :class="`text-${scoreColor}`"
          >
            {{ currentScore }}
          </div>
          <div
            class="text-caption text-medium-emphasis"
            style="font-size: 10px; line-height: 1;"
          >
            评分
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>

  <!-- 详情对话框 -->
  <noise-monitor-detail
    v-model="showDetail"
    :status="status"
    :current-db="currentDb"
    :current-dbfs="currentDbfs"
    :noise-level="noiseLevel"
    :db-color="dbColor"
    :current-score="currentScore"
    :score-detail="scoreDetail"
    :ring-buffer="ringBuffer"
    :last-slice="lastSlice"
    :history="history"
    :is-monitoring="isMonitoring"
    @start="startMonitoring"
    @stop="stopMonitoring"
    @calibrate="handleCalibrate"
    @clear-history="handleClearHistory"
  />
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { noiseService } from '@wydev/noise-core'

const NoiseMonitorDetail = defineAsyncComponent(() =>
  import('@/components/NoiseMonitorDetail.vue')
)

// 最近 N 个采样用于迷你波形
const MINI_BAR_COUNT = 16

export default {
  name: 'NoiseMonitorCard',
  components: { NoiseMonitorDetail },
  data() {
    return {
      showDetail: false,
      isMonitoring: false,
      status: 'initializing',
      currentDbfs: -100,
      currentDisplayDb: 0,
      currentScore: null,
      scoreDetail: null,
      ringBuffer: [],
      lastSlice: null,
      history: [],
      unsubscribe: null,
      recentDbValues: new Array(MINI_BAR_COUNT).fill(0),
    }
  },
  computed: {
    currentDb() {
      if (!this.isMonitoring || this.status !== 'active') return '--'
      return Math.round(this.currentDisplayDb)
    },
    statusColor() {
      if (this.status === 'active') return 'success'
      if (this.status === 'paused') return 'warning'
      if (this.status === 'permission-denied' || this.status === 'error') return 'error'
      return 'grey'
    },
    statusLabel() {
      const map = {
        initializing: '就绪',
        active: '监测中',
        paused: '已暂停',
        'permission-denied': '无权限',
        error: '错误',
      }
      return this.isMonitoring ? (map[this.status] || '未知') : '未启动'
    },
    dbColor() {
      const db = typeof this.currentDb === 'number' ? this.currentDb : 0
      if (db < 40) return 'success'
      if (db < 55) return 'light-green'
      if (db < 70) return 'warning'
      if (db < 85) return 'orange'
      return 'error'
    },
    dbFontSize() {
      return '2.5rem'
    },
    noiseLevel() {
      const db = typeof this.currentDb === 'number' ? this.currentDb : 0
      if (!this.isMonitoring || this.status !== 'active') return '等待监测'
      if (db < 30) return '极其安静'
      if (db < 40) return '非常安静'
      if (db < 50) return '安静'
      if (db < 60) return '正常交谈'
      if (db < 70) return '较为嘈杂'
      if (db < 80) return '嘈杂'
      if (db < 90) return '非常嘈杂'
      return '极度嘈杂'
    },
    scoreColor() {
      if (this.currentScore === null) return 'grey'
      if (this.currentScore >= 80) return 'success'
      if (this.currentScore >= 60) return 'warning'
      return 'error'
    },
    miniBarValues() {
      return this.recentDbValues.map(db => {
        // 将 dB 值 (0-100) 映射到 5%-100% 高度
        return Math.max(5, Math.min(100, db))
      })
    },
  },
  mounted() {
    this.history = noiseService.getHistory()
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  },
  methods: {
    async startMonitoring() {
      try {
        await noiseService.start()
        this.isMonitoring = true
        this.unsubscribe = noiseService.subscribe((snapshot) => {
          this.status = snapshot.status
          this.currentDbfs = snapshot.currentDbfs
          this.currentDisplayDb = snapshot.currentDisplayDb
          this.ringBuffer = snapshot.ringBuffer || []
          this.lastSlice = snapshot.lastSlice || null
          this.currentScore = snapshot.currentScore ?? null
          this.scoreDetail = snapshot.currentScoreDetail ?? null

          // 更新迷你波形数据
          const dbVal = Math.max(0, Math.min(100, this.currentDisplayDb))
          this.recentDbValues.push(dbVal)
          if (this.recentDbValues.length > MINI_BAR_COUNT) {
            this.recentDbValues.shift()
          }

          // 更新历史
          this.history = noiseService.getHistory()
        })
      } catch (e) {
        console.error('噪音监测启动失败:', e)
        this.status = 'error'
      }
    },
    stopMonitoring() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
      noiseService.stop()
      this.isMonitoring = false
      this.status = 'initializing'
      this.recentDbValues = new Array(MINI_BAR_COUNT).fill(0)
      this.currentScore = null
      this.scoreDetail = null
    },
    handleCalibrate(targetDb) {
      noiseService.calibrate(targetDb, (success, msg) => {
        console.log(success ? '校准成功' : `校准失败: ${msg}`)
      })
    },
    handleClearHistory() {
      noiseService.clearHistory()
      this.history = []
    },
    barColor(val) {
      if (val < 30) return 'success'
      if (val < 55) return 'light-green'
      if (val < 70) return 'warning'
      if (val < 85) return 'orange'
      return 'error'
    },
  },
}
</script>

<style scoped lang="scss">
.noise-monitor-card {
  overflow: hidden;

  .noise-db-value {
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .noise-level-label {
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .noise-mini-bars {
    opacity: 0.85;
  }
}
</style>
