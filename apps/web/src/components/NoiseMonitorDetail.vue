<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-xl noise-detail-card">
      <!-- 顶部标题栏 -->
      <v-card-title class="d-flex align-center pa-4">
        <v-icon
          class="mr-2"
          color="primary"
        >
          mdi-waveform
        </v-icon>
        <span class="text-h6 font-weight-bold">环境噪音监测</span>
        <v-spacer />
        <v-chip
          v-if="sessionActive"
          color="teal"
          size="small"
          variant="tonal"
          class="mr-2"
        >
          <v-icon
            start
            size="12"
          >
            mdi-record-circle
          </v-icon>
          {{ sessionData?.sessionName || '自习中' }}
        </v-chip>
        <v-chip
          :color="isMonitoring ? 'success' : 'grey'"
          size="small"
          variant="tonal"
          class="mr-2"
        >
          {{ isMonitoring ? '监测中' : '已停止' }}
        </v-chip>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="$emit('update:modelValue', false)"
        />
      </v-card-title>

      <!-- 分页标签 -->
      <v-tabs
        v-model="activeTab"
        color="primary"
        density="compact"
        grow
      >
        <v-tab value="realtime">
          <v-icon
            start
            size="18"
          >
            mdi-pulse
          </v-icon>
          实时监测
        </v-tab>
        <v-tab value="reports">
          <v-icon
            start
            size="18"
          >
            mdi-chart-bar
          </v-icon>
          统计报告
        </v-tab>
      </v-tabs>

      <v-divider />

      <v-card-text
        class="pa-0"
        style="max-height: 70vh;"
      >
        <v-tabs-window v-model="activeTab">
          <!-- ==================== 实时监测 ==================== -->
          <v-tabs-window-item value="realtime">
            <!-- 麦克风不可用提示 -->
            <v-alert
              v-if="micPermissionState === 'denied'"
              type="error"
              variant="tonal"
              class="ma-4 mb-0"
              prominent
            >
              <template #prepend>
                <v-icon
                  icon="mdi-microphone-off"
                  size="28"
                />
              </template>
              <div class="text-subtitle-2 font-weight-bold mb-1">
                麦克风权限被拒绝
              </div>
              <div class="text-body-2">
                浏览器已拒绝麦克风访问，无法进行噪音监测。请在浏览器地址栏左侧的锁图标中重新授予麦克风权限，然后刷新页面。
              </div>
            </v-alert>
            <v-alert
              v-else-if="micPermissionState === 'unavailable'"
              type="warning"
              variant="tonal"
              class="ma-4 mb-0"
              prominent
            >
              <template #prepend>
                <v-icon
                  icon="mdi-microphone-question"
                  size="28"
                />
              </template>
              <div class="text-subtitle-2 font-weight-bold mb-1">
                未检测到麦克风
              </div>
              <div class="text-body-2">
                当前设备未检测到麦克风硬件，无法进行噪音监测。请连接麦克风后刷新页面重试。
              </div>
            </v-alert>

            <!-- 分贝仪表区 -->
            <div class="noise-dashboard pa-5">
              <div class="d-flex align-center justify-center">
                <div class="text-center">
                  <div
                    class="noise-gauge-ring"
                    :class="`ring-${dbColor}`"
                  >
                    <div class="noise-gauge-inner d-flex flex-column align-center justify-center">
                      <span
                        class="noise-gauge-value font-weight-bold"
                        :class="`text-${dbColor}`"
                      >
                        {{ currentDb }}
                      </span>
                      <span class="text-caption text-medium-emphasis">dB</span>
                    </div>
                  </div>
                  <div
                    class="text-subtitle-1 font-weight-medium mt-3"
                    :class="`text-${dbColor}`"
                  >
                    {{ noiseLevel }}
                  </div>
                </div>
              </div>

              <!-- 分贝条 -->
              <div
                class="noise-level-bar mt-5 mx-auto"
                style="max-width: 500px;"
              >
                <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                  <span>0 dB</span>
                  <span>50</span>
                  <span>100 dB</span>
                </div>
                <div class="noise-gradient-bar">
                  <div
                    v-if="isMonitoring && typeof currentDb === 'number'"
                    class="noise-indicator"
                    :style="{ left: `${Math.min(100, Math.max(0, currentDb))}%` }"
                  />
                </div>
              </div>
            </div>

            <v-divider />

            <!-- 实时波形 -->
            <div class="pa-5">
              <div class="d-flex align-center mb-3">
                <v-icon
                  class="mr-2"
                  size="18"
                  color="primary"
                >
                  mdi-chart-line
                </v-icon>
                <span class="text-subtitle-2 font-weight-medium">噪音走势</span>
                <v-spacer />
                <span class="text-caption text-medium-emphasis">
                  最近 {{ ringBuffer.length }} 个采样
                </span>
              </div>
              <div
                ref="waveformContainer"
                class="noise-waveform"
              >
                <svg
                  width="100%"
                  height="120"
                  :viewBox="`0 0 ${waveformWidth} 120`"
                  preserveAspectRatio="none"
                >
                  <!-- 网格 -->
                  <line
                    v-for="y in gridLines"
                    :key="`grid-${y.val}`"
                    x1="0"
                    :y1="y.y"
                    :x2="waveformWidth"
                    :y2="y.y"
                    stroke="currentColor"
                    stroke-opacity="0.08"
                    stroke-dasharray="4,4"
                  />
                  <!-- 阈值线 -->
                  <line
                    v-if="alertThreshold"
                    x1="0"
                    :y1="dbToY(alertThreshold)"
                    :x2="waveformWidth"
                    :y2="dbToY(alertThreshold)"
                    stroke="rgb(var(--v-theme-error))"
                    stroke-opacity="0.5"
                    stroke-dasharray="6,3"
                    stroke-width="1.5"
                  />
                  <!-- 波形填充 -->
                  <path
                    v-if="waveformPath"
                    :d="waveformFillPath"
                    :fill="`url(#waveGradient-rt)`"
                    opacity="0.3"
                  />
                  <!-- 波形线 -->
                  <path
                    v-if="waveformPath"
                    :d="waveformPath"
                    fill="none"
                    stroke="rgb(var(--v-theme-primary))"
                    stroke-width="2"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <defs>
                    <linearGradient
                      id="waveGradient-rt"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stop-color="rgb(var(--v-theme-primary))"
                        stop-opacity="0.4"
                      />
                      <stop
                        offset="100%"
                        stop-color="rgb(var(--v-theme-primary))"
                        stop-opacity="0.02"
                      />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <v-divider />

            <!-- 当前评分 -->
            <div class="pa-5">
              <div class="d-flex align-center mb-3">
                <v-icon
                  class="mr-2"
                  size="18"
                  color="amber"
                >
                  mdi-star-circle
                </v-icon>
                <span class="text-subtitle-2 font-weight-medium">实时评分</span>
              </div>
              <div
                v-if="currentScore !== null"
                class="d-flex flex-wrap ga-4"
              >
                <v-card
                  variant="tonal"
                  :color="scoreColor"
                  rounded="xl"
                  class="flex-grow-1"
                  min-width="200"
                >
                  <v-card-text class="d-flex align-center pa-4">
                    <v-progress-circular
                      :model-value="currentScore"
                      :color="scoreColor"
                      :size="56"
                      :width="5"
                      class="mr-4"
                    >
                      <span class="text-h6 font-weight-bold">{{ currentScore }}</span>
                    </v-progress-circular>
                    <div>
                      <div class="text-subtitle-1 font-weight-bold">
                        {{ scoreLabel }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        综合评分 (0-100)
                      </div>
                    </div>
                  </v-card-text>
                </v-card>

                <v-card
                  v-if="scoreDetail"
                  variant="outlined"
                  rounded="xl"
                  class="flex-grow-1"
                  min-width="200"
                >
                  <v-card-text class="pa-4">
                    <div class="text-subtitle-2 font-weight-medium mb-2">
                      扣分扣因
                    </div>
                    <div
                      v-for="item in scorePenaltyItems"
                      :key="item.label"
                      class="d-flex align-center justify-space-between mb-1"
                    >
                      <div class="d-flex align-center">
                        <v-icon
                          :color="item.color"
                          size="14"
                          class="mr-2"
                        >
                          {{ item.icon }}
                        </v-icon>
                        <span class="text-body-2">{{ item.label }}</span>
                      </div>
                      <div
                        class="d-flex align-center"
                        style="min-width: 140px;"
                      >
                        <v-progress-linear
                          :model-value="item.percent"
                          :color="item.color"
                          height="6"
                          rounded
                          class="mr-2"
                        />
                        <span
                          class="text-caption font-weight-medium"
                          style="min-width: 36px; text-align: right;"
                        >
                          {{ item.percent }}%
                        </span>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
              <div
                v-else
                class="text-center text-medium-emphasis py-4"
              >
                <v-icon
                  size="32"
                  class="mb-2"
                >
                  mdi-chart-arc
                </v-icon>
                <div class="text-body-2">
                  开始监测后将显示评分
                </div>
              </div>
            </div>

            <v-divider />

            <!-- 操作按钮 -->
            <div class="pa-4 d-flex align-center">
              <v-btn
                v-if="!isMonitoring"
                color="success"
                variant="elevated"
                prepend-icon="mdi-play"
                size="large"
                class="px-6"
                :disabled="micPermissionState === 'denied' || micPermissionState === 'unavailable'"
                @click="$emit('start')"
              >
                开始监测
              </v-btn>
              <v-btn
                v-else
                color="error"
                variant="tonal"
                prepend-icon="mdi-stop"
                size="large"
                class="px-6"
                @click="$emit('stop')"
              >
                停止监测
              </v-btn>
              <v-spacer />
              <v-btn
                variant="tonal"
                color="deep-purple"
                prepend-icon="mdi-crosshairs-gps"
                @click="openCalibrateDialog"
              >
                校准
              </v-btn>
            </div>
          </v-tabs-window-item>

          <!-- ==================== 统计报告 ==================== -->
          <v-tabs-window-item value="reports">
            <div
              v-if="sortedDateKeys.length === 0"
              class="text-center text-medium-emphasis py-12"
            >
              <v-icon
                size="48"
                class="mb-3"
              >
                mdi-chart-box-outline
              </v-icon>
              <div class="text-body-1">
                暂无统计报告
              </div>
              <div class="text-caption mt-1">
                在配置的晚自习时间段内，系统会自动记录并生成报告
              </div>
            </div>

            <template v-else>
              <!-- 日期选择器 + 操作 -->
              <div class="pa-4">
                <div class="d-flex align-center flex-wrap ga-2 mb-3">
                  <v-icon
                    size="18"
                    color="teal"
                    class="mr-1"
                  >
                    mdi-calendar
                  </v-icon>
                  <span class="text-subtitle-2 font-weight-medium">选择日期</span>
                  <v-spacer />
                  <v-btn
                    color="error"
                    size="x-small"
                    variant="text"
                    prepend-icon="mdi-delete-sweep"
                    @click="confirmClearMode = 'all'"
                  >
                    清空全部
                  </v-btn>
                </div>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="dateKey in sortedDateKeys"
                    :key="dateKey"
                    :color="selectedDate === dateKey ? 'primary' : undefined"
                    :variant="selectedDate === dateKey ? 'elevated' : 'tonal'"
                    size="small"
                    @click="$emit('select-date', dateKey)"
                  >
                    <v-icon
                      start
                      size="14"
                    >
                      mdi-calendar-blank
                    </v-icon>
                    {{ formatDateLabel(dateKey) }}
                    <v-badge
                      :content="reportMeta.dates[dateKey].count"
                      color="primary"
                      inline
                      class="ml-1"
                    />
                  </v-chip>
                </div>
              </div>

              <v-divider />

              <!-- 当日元数据摘要 -->
              <div
                v-if="selectedDate && reportMeta.dates[selectedDate]"
                class="pa-4 pb-0"
              >
                <div class="d-flex align-center ga-3 flex-wrap">
                  <div class="text-h6 font-weight-bold">
                    {{ formatDateLabel(selectedDate) }}
                  </div>
                  <v-chip
                    size="small"
                    :color="metaScoreColor(reportMeta.dates[selectedDate].avgScore)"
                    variant="tonal"
                  >
                    均分 {{ reportMeta.dates[selectedDate].avgScore }}
                  </v-chip>
                  <v-chip
                    size="small"
                    variant="tonal"
                  >
                    {{ reportMeta.dates[selectedDate].count }} 条记录
                  </v-chip>
                  <v-spacer />
                  <v-btn
                    color="error"
                    size="x-small"
                    variant="text"
                    prepend-icon="mdi-delete"
                    @click="confirmClearMode = 'date'"
                  >
                    清空当日
                  </v-btn>
                </div>
              </div>

              <!-- 当日报告列表 -->
              <div
                v-if="dateReports.length === 0 && selectedDate"
                class="text-center text-medium-emphasis py-8"
              >
                <v-icon size="32">
                  mdi-file-document-outline
                </v-icon>
                <div class="text-body-2 mt-1">
                  该日期暂无报告数据
                </div>
              </div>

              <!-- 报告选择条 -->
              <div
                v-if="dateReports.length > 0"
                class="pa-4 pt-3 d-flex flex-wrap ga-2"
              >
                <v-chip
                  v-for="(report, idx) in dateReports"
                  :key="report.startTime"
                  :color="selectedReportIndex === idx ? 'teal' : undefined"
                  :variant="selectedReportIndex === idx ? 'elevated' : 'outlined'"
                  size="small"
                  @click="selectedReportIndex = idx"
                >
                  {{ report.sessionName }}
                  <span class="text-caption ml-1">{{ formatTime(report.startTime) }}</span>
                </v-chip>
              </div>

              <v-divider v-if="selectedReport" />

              <!-- 选中的报告 -->
              <div
                v-if="selectedReport"
                class="report-content"
              >
                <!-- 报告标题 -->
                <div class="pa-5 pb-0">
                  <div class="text-h6 font-weight-bold d-flex align-center">
                    {{ selectedReport.sessionName }} 统计报告
                  </div>
                </div>

                <!-- 报告概览 6宫格 -->
                <div class="pa-5">
                  <div class="d-flex align-center mb-3">
                    <span class="report-section-line bg-teal" />
                    <span class="text-subtitle-2 font-weight-bold ml-2">报告概览</span>
                  </div>
                  <div class="report-grid">
                    <div class="report-stat-card">
                      <div class="text-caption text-medium-emphasis">
                        时长
                      </div>
                      <div class="text-h6 font-weight-bold">
                        {{ formatDuration(selectedReport.duration) }}
                      </div>
                    </div>
                    <div class="report-stat-card">
                      <div class="text-caption text-medium-emphasis">
                        表现
                      </div>
                      <div class="text-h6 font-weight-bold">
                        {{ selectedReport.score }} 分
                        <span class="text-caption">（{{ reportScoreLabel(selectedReport.score) }}）</span>
                      </div>
                    </div>
                    <div class="report-stat-card">
                      <div class="text-caption text-medium-emphasis">
                        峰值
                      </div>
                      <div class="text-h6 font-weight-bold">
                        {{ selectedReport.maxDb }} dB
                      </div>
                    </div>
                    <div class="report-stat-card">
                      <div class="text-caption text-medium-emphasis">
                        平均
                      </div>
                      <div class="text-h6 font-weight-bold">
                        {{ selectedReport.avgDb }} dB
                      </div>
                    </div>
                    <div class="report-stat-card">
                      <div class="text-caption text-medium-emphasis">
                        超阈时长
                      </div>
                      <div class="text-h6 font-weight-bold">
                        {{ formatSeconds(selectedReport.overThresholdDuration) }}
                      </div>
                    </div>
                    <div class="report-stat-card">
                      <div class="text-caption text-medium-emphasis">
                        打断次数
                      </div>
                      <div class="text-h6 font-weight-bold">
                        {{ selectedReport.segmentCount }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 噪音走势图 -->
                <div class="pa-5">
                  <div class="d-flex align-center mb-3">
                    <span class="report-section-line bg-teal" />
                    <span class="text-subtitle-2 font-weight-bold ml-2">噪音走势</span>
                  </div>
                  <div
                    ref="reportChartContainer"
                    class="noise-waveform"
                  >
                    <svg
                      width="100%"
                      height="140"
                      :viewBox="`0 0 ${reportChartWidth} 140`"
                      preserveAspectRatio="none"
                    >
                      <!-- Y轴网格 -->
                      <line
                        v-for="y in reportGridLines"
                        :key="`rg-${y.val}`"
                        x1="0"
                        :y1="y.y"
                        :x2="reportChartWidth"
                        :y2="y.y"
                        stroke="currentColor"
                        stroke-opacity="0.1"
                        stroke-dasharray="4,4"
                      />
                      <!-- 阈值线 -->
                      <line
                        x1="0"
                        :y1="reportDbToY(selectedReport.alertThresholdDb || 55)"
                        :x2="reportChartWidth"
                        :y2="reportDbToY(selectedReport.alertThresholdDb || 55)"
                        stroke="rgb(var(--v-theme-error))"
                        stroke-opacity="0.6"
                        stroke-dasharray="6,3"
                        stroke-width="1.5"
                      />
                      <!-- 走势填充 -->
                      <path
                        v-if="reportWaveformPath"
                        :d="reportWaveformFillPath"
                        fill="url(#reportGrad)"
                        opacity="0.3"
                      />
                      <!-- 走势线 -->
                      <path
                        v-if="reportWaveformPath"
                        :d="reportWaveformPath"
                        fill="none"
                        stroke="rgb(var(--v-theme-primary))"
                        stroke-width="1.5"
                        stroke-linejoin="round"
                      />
                      <defs>
                        <linearGradient
                          id="reportGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stop-color="rgb(var(--v-theme-primary))"
                            stop-opacity="0.3"
                          />
                          <stop
                            offset="100%"
                            stop-color="rgb(var(--v-theme-primary))"
                            stop-opacity="0.02"
                          />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-2">
                    统计范围：{{ formatFullTime(selectedReport.startTime) }} - {{ formatFullTime(selectedReport.endTime) }}；
                    噪音报警阈值: {{ selectedReport.alertThresholdDb || 55 }} dB；
                    覆盖率: {{ reportCoverage }}%
                  </div>
                </div>

                <!-- 更多统计 -->
                <div class="pa-5">
                  <div class="d-flex align-center mb-3">
                    <span class="report-section-line bg-teal" />
                    <span class="text-subtitle-2 font-weight-bold ml-2">更多统计</span>
                  </div>
                  <div class="d-flex flex-wrap ga-4">
                    <!-- 噪音等级分布 -->
                    <v-card
                      variant="outlined"
                      rounded="xl"
                      class="flex-grow-1"
                      min-width="280"
                    >
                      <v-card-text class="pa-4">
                        <div class="text-subtitle-2 font-weight-medium mb-3">
                          噪音等级分布
                        </div>
                        <div class="noise-level-distribution">
                          <div
                            class="d-flex"
                            style="height: 16px; border-radius: 8px; overflow: hidden;"
                          >
                            <div
                              v-for="seg in levelDistribution"
                              :key="seg.label"
                              :style="{
                                width: `${seg.percent}%`,
                                backgroundColor: seg.color,
                                minWidth: seg.percent > 0 ? '4px' : '0',
                              }"
                            />
                          </div>
                          <div class="d-flex flex-wrap ga-3 mt-3 justify-center">
                            <div
                              v-for="seg in levelDistribution"
                              :key="`leg-${seg.label}`"
                              class="d-flex align-center"
                            >
                              <span
                                class="d-inline-block mr-1"
                                :style="{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '2px',
                                  backgroundColor: seg.color,
                                }"
                              />
                              <span class="text-caption text-medium-emphasis">
                                {{ seg.label }} ({{ seg.percent }}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>

                    <!-- 扣分扣因 -->
                    <v-card
                      variant="outlined"
                      rounded="xl"
                      class="flex-grow-1"
                      min-width="280"
                    >
                      <v-card-text class="pa-4">
                        <div class="text-subtitle-2 font-weight-medium mb-3">
                          扣分扣因 (越长扣分越多)
                        </div>
                        <div
                          v-for="item in reportPenaltyItems"
                          :key="item.label"
                          class="d-flex align-center mb-2"
                        >
                          <span
                            class="text-body-2 mr-3"
                            style="min-width: 32px;"
                          >{{ item.label }}</span>
                          <v-progress-linear
                            :model-value="item.percent"
                            :color="item.color"
                            height="10"
                            rounded
                            class="flex-grow-1 mr-2"
                          />
                          <span
                            class="text-body-2 font-weight-bold"
                            style="min-width: 40px; text-align: right;"
                          >{{ item.percent }}%</span>
                        </div>
                      </v-card-text>
                    </v-card>
                  </div>
                </div>
              </div>
            </template>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>
    </v-card>

    <!-- 校准对话框 -->
    <v-dialog
      v-model="showCalibrateDialog"
      max-width="560"
      scrollable
    >
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon
            class="mr-2"
            color="deep-purple"
          >
            mdi-crosshairs-gps
          </v-icon>
          <span class="text-h6 font-weight-bold">分贝校准</span>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="showCalibrateDialog = false"
          />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-5">
          <!-- 当前校准状态 -->
          <v-card
            variant="outlined"
            class="mb-5"
          >
            <v-card-text class="py-3">
              <div class="text-caption text-medium-emphasis mb-1">
                当前校准值
              </div>
              <div class="d-flex align-center ga-6 flex-wrap">
                <div>
                  <span class="text-body-2 text-medium-emphasis">基准分贝：</span>
                  <span class="text-body-1 font-weight-bold">
                    {{ calibrationSettings.baselineDb }} dB
                  </span>
                </div>
                <div>
                  <span class="text-body-2 text-medium-emphasis">基准 RMS：</span>
                  <span class="text-body-1 font-weight-bold font-monospace">
                    {{ calibrationSettings.baselineRms != null ? calibrationSettings.baselineRms.toFixed(6) : '未校准' }}
                  </span>
                </div>
                <div>
                  <span class="text-body-2 text-medium-emphasis">最大分贝：</span>
                  <span class="text-body-1 font-weight-bold">
                    {{ calibrationSettings.maxLevelDb }} dB
                  </span>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- 自动校准 -->
          <div class="d-flex align-center mb-2">
            <v-icon
              size="18"
              class="mr-2"
              color="primary"
            >
              mdi-auto-fix
            </v-icon>
            <span class="text-subtitle-2 font-weight-medium">自动校准</span>
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            在已知环境分贝的场景下，输入当前环境的真实分贝值，点击开始后保持环境安静 3 秒。
          </div>
          <div class="d-flex align-center ga-3 mb-5 flex-wrap">
            <v-text-field
              v-model.number="calibrateTargetDb"
              density="compact"
              variant="outlined"
              type="number"
              label="目标分贝"
              suffix="dB"
              hide-details
              style="max-width: 160px;"
              :min="20"
              :max="80"
            />
            <v-btn
              color="deep-purple"
              variant="tonal"
              prepend-icon="mdi-crosshairs-gps"
              :loading="isCalibrating"
              :disabled="!isMonitoring"
              @click="doAutoCalibrate"
            >
              开始校准
            </v-btn>
            <span
              v-if="!isMonitoring"
              class="text-caption text-warning"
            >
              需先开启监测
            </span>
            <span
              v-if="calibrateMessage"
              class="text-caption"
              :class="calibrateSuccess ? 'text-success' : 'text-error'"
            >
              {{ calibrateMessage }}
            </span>
          </div>

          <v-divider class="mb-5" />

          <!-- 手动校准 -->
          <div class="d-flex align-center mb-2">
            <v-icon
              size="18"
              class="mr-2"
              color="orange"
            >
              mdi-pencil-ruler
            </v-icon>
            <span class="text-subtitle-2 font-weight-medium">手动校准 / 参数调整</span>
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            直接输入校准参数。修改后点击保存生效。
          </div>
          <div class="d-flex align-center ga-3 mb-4 flex-wrap">
            <v-text-field
              v-model.number="editBaselineDb"
              density="compact"
              variant="outlined"
              type="number"
              label="基准分贝"
              suffix="dB"
              hide-details
              style="max-width: 160px;"
              :min="20"
              :max="80"
            />
            <v-text-field
              v-model="editBaselineRms"
              density="compact"
              variant="outlined"
              label="基准 RMS"
              hide-details
              style="max-width: 200px;"
              placeholder="如 0.003200"
            />
            <v-text-field
              v-model.number="editMaxLevelDb"
              density="compact"
              variant="outlined"
              type="number"
              label="最大显示分贝"
              suffix="dB"
              hide-details
              style="max-width: 180px;"
              :min="40"
              :max="120"
            />
          </div>
        </v-card-text>

        <v-card-actions class="px-4 pb-4">
          <v-btn
            variant="text"
            prepend-icon="mdi-restore"
            @click="resetCalibration"
          >
            恢复默认
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-content-save"
            @click="saveManualCalibration"
          >
            保存校准
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 清空报告确认 -->
    <v-dialog
      v-model="showConfirmClear"
      max-width="360"
    >
      <v-card>
        <v-card-title>确认清空</v-card-title>
        <v-card-text>
          {{ confirmClearMode === 'all'
            ? '确定要清空所有日期的统计报告吗？此操作不可撤销。'
            : `确定要清空 ${formatDateLabel(selectedDate)} 的统计报告吗？此操作不可撤销。`
          }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="confirmClearMode = ''"
          >
            取消
          </v-btn>
          <v-btn
            color="error"
            @click="doClearReports"
          >
            确认清空
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
import {
  noiseService,
  getNoiseControlSettings,
  saveNoiseControlSettings,
  resetNoiseControlSettings,
} from '@wydev/noise-core';

export default {
  name: 'NoiseMonitorDetail',
  props: {
    modelValue: { type: Boolean, default: false },
    status: { type: String, default: '' },
    currentDb: { type: [Number, String], default: '--' },
    currentDbfs: { type: Number, default: 0 },
    noiseLevel: { type: String, default: '未知' },
    dbColor: { type: String, default: 'grey' },
    currentScore: { type: Number, default: null },
    scoreDetail: { type: Object, default: null },
    ringBuffer: { type: Array, default: () => [] },
    lastSlice: { type: Object, default: null },
    history: { type: Array, default: () => [] },
    isMonitoring: { type: Boolean, default: false },
    micPermissionState: { type: String, default: '' },
    sessionActive: { type: Boolean, default: false },
    sessionData: { type: Object, default: null },
    reportMeta: { type: Object, default: () => ({ dates: {} }) },
    selectedDate: { type: String, default: '' },
    dateReports: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue', 'start', 'stop', 'clear-history', 'select-date', 'clear-date-reports', 'clear-all-reports'],
  data() {
    return {
      activeTab: 'realtime',
      confirmClearMode: '', // '' | 'date' | 'all'
      waveformWidth: 600,
      reportChartWidth: 600,
      selectedReportIndex: 0,
      // 校准
      showCalibrateDialog: false,
      calibrationSettings: {},
      calibrateTargetDb: 40,
      isCalibrating: false,
      calibrateMessage: '',
      calibrateSuccess: false,
      editBaselineDb: 40,
      editBaselineRms: '',
      editMaxLevelDb: 100,

    }
  },
  computed: {
    scoreColor() {
      if (this.currentScore === null) return 'grey'
      if (this.currentScore >= 80) return 'success'
      if (this.currentScore >= 60) return 'warning'
      return 'error'
    },
    scoreLabel() {
      if (this.currentScore === null) return '暂无评分'
      if (this.currentScore >= 90) return '非常安静'
      if (this.currentScore >= 80) return '环境良好'
      if (this.currentScore >= 60) return '需要注意'
      if (this.currentScore >= 40) return '比较嘈杂'
      return '极度嘈杂'
    },
    alertThreshold() {
      return this.sessionConfig?.alertThresholdDb || 55
    },
    scorePenaltyItems() {
      if (!this.scoreDetail) return []
      const total = 100
      return [
        {
          label: '持续',
          icon: 'mdi-volume-high',
          color: 'amber',
          percent: Math.round((this.scoreDetail.sustainedPenalty / total) * 100),
        },
        {
          label: '时长',
          icon: 'mdi-clock-alert',
          color: 'orange',
          percent: Math.round((this.scoreDetail.timePenalty / total) * 100),
        },
        {
          label: '打断',
          icon: 'mdi-flash-alert',
          color: 'pink',
          percent: Math.round((this.scoreDetail.segmentPenalty / total) * 100),
        },
      ]
    },
    gridLines() {
      return [20, 40, 60, 80].map(val => ({ val, y: this.dbToY(val) }))
    },
    reportGridLines() {
      return [20, 40, 60, 80].map(val => ({ val, y: this.reportDbToY(val) }))
    },
    waveformPath() {
      if (!this.ringBuffer || this.ringBuffer.length < 2) return null
      const w = this.waveformWidth
      const points = this.ringBuffer.slice(-120)
      const step = w / (points.length - 1)
      return points.map((pt, i) => {
        const x = i * step
        const y = this.dbToY(pt.displayDb ?? 0)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    },
    waveformFillPath() {
      if (!this.waveformPath) return null
      return `${this.waveformPath} L${this.waveformWidth},120 L0,120 Z`
    },
    showConfirmClear() {
      return this.confirmClearMode !== ''
    },
    sortedDateKeys() {
      if (!this.reportMeta?.dates) return []
      return Object.keys(this.reportMeta.dates).sort().reverse()
    },
    selectedReport() {
      return this.dateReports[this.selectedReportIndex] || null
    },
    reportCoverage() {
      if (!this.selectedReport?.samples?.length || !this.selectedReport?.duration) return 0
      return ((this.selectedReport.samples.length * 2 / (this.selectedReport.duration / 1000)) * 100).toFixed(1)
    },
    reportWaveformPath() {
      if (!this.selectedReport?.samples?.length) return null
      const samples = this.selectedReport.samples
      if (samples.length < 2) return null
      const w = this.reportChartWidth
      const step = w / (samples.length - 1)
      return samples.map((s, i) => {
        const x = i * step
        const y = this.reportDbToY(s.db)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    },
    reportWaveformFillPath() {
      if (!this.reportWaveformPath) return null
      return `${this.reportWaveformPath} L${this.reportChartWidth},140 L0,140 Z`
    },
    levelDistribution() {
      if (!this.selectedReport?.samples?.length) {
        return [
          { label: '安静', percent: 0, color: '#4caf50' },
          { label: '正常', percent: 0, color: '#8bc34a' },
          { label: '吵闹', percent: 0, color: '#ff9800' },
          { label: '极吵', percent: 0, color: '#f44336' },
        ]
      }
      const dbs = this.selectedReport.samples.map(s => s.db)
      const total = dbs.length
      let quiet = 0, normal = 0, loud = 0, extreme = 0
      dbs.forEach(d => {
        if (d < 45) quiet++
        else if (d < 60) normal++
        else if (d < 75) loud++
        else extreme++
      })
      return [
        { label: '安静', percent: Math.round(quiet / total * 100), color: '#4caf50' },
        { label: '正常', percent: Math.round(normal / total * 100), color: '#8bc34a' },
        { label: '吵闹', percent: Math.round(loud / total * 100), color: '#ff9800' },
        { label: '极吵', percent: Math.round(extreme / total * 100), color: '#f44336' },
      ]
    },
    reportPenaltyItems() {
      if (!this.selectedReport?.scorePenalties) return []
      const p = this.selectedReport.scorePenalties
      return [
        { label: '持续', color: 'amber', percent: Math.min(100, Math.round(p.sustained / 40 * 100)) },
        { label: '时长', color: 'orange', percent: Math.min(100, Math.round(p.time / 30 * 100)) },
        { label: '打断', color: 'pink', percent: Math.min(100, Math.round(p.segment / 30 * 100)) },
      ]
    },
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.$nextTick(() => {
          this.updateWaveformWidth()
          this.updateReportChartWidth()
        })
      }
    },
    activeTab() {
      this.$nextTick(() => {
        this.updateWaveformWidth()
        this.updateReportChartWidth()
      })
    },
    selectedReportIndex() {
      this.$nextTick(() => this.updateReportChartWidth())
    },
    selectedDate() {
      this.selectedReportIndex = 0
    },
  },
  mounted() {
    this.updateWaveformWidth()
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleResize() {
      this.updateWaveformWidth()
      this.updateReportChartWidth()
    },
    updateWaveformWidth() {
      if (this.$refs.waveformContainer) {
        this.waveformWidth = this.$refs.waveformContainer.offsetWidth || 600
      }
    },
    updateReportChartWidth() {
      if (this.$refs.reportChartContainer) {
        this.reportChartWidth = this.$refs.reportChartContainer.offsetWidth || 600
      }
    },
    dbToY(db) {
      return 120 - Math.max(0, Math.min(100, db)) / 100 * 120
    },
    reportDbToY(db) {
      return 140 - Math.max(0, Math.min(100, db)) / 100 * 140
    },
    doClearReports() {
      if (this.confirmClearMode === 'all') {
        this.$emit('clear-all-reports')
      } else if (this.confirmClearMode === 'date') {
        this.$emit('clear-date-reports', this.selectedDate)
      }
      this.confirmClearMode = ''
      this.selectedReportIndex = 0
    },
    formatDateLabel(dateStr) {
      if (!dateStr) return ''
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
      if (dateStr === todayStr) return '今天'
      if (dateStr === yesterdayStr) return '昨天'
      const parts = dateStr.split('-')
      return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
    },
    formatTime(ts) {
      const d = new Date(ts)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    metaScoreColor(score) {
      if (score >= 80) return 'success'
      if (score >= 60) return 'warning'
      return 'error'
    },
    formatFullTime(ts) {
      if (!ts) return '--'
      const d = new Date(ts)
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
    },
    formatDuration(ms) {
      if (!ms) return '0 分钟'
      const totalMin = Math.floor(ms / 60000)
      const h = Math.floor(totalMin / 60)
      const m = totalMin % 60
      if (h > 0) return `${h} 小时 ${m} 分钟`
      return `${m} 分钟`
    },
    formatSeconds(sec) {
      if (!sec || sec < 0) return '0秒'
      const m = Math.floor(sec / 60)
      const s = sec % 60
      if (m > 0) return `${m}分${s}秒`
      return `${s}秒`
    },
    reportScoreLabel(score) {
      if (score >= 90) return '优秀'
      if (score >= 80) return '良好'
      if (score >= 60) return '一般'
      if (score >= 40) return '较差'
      return '极差'
    },

    // ===== 校准 =====
    openCalibrateDialog() {
      this.refreshCalibrationSettings()
      this.showCalibrateDialog = true
    },
    refreshCalibrationSettings() {
      const s = getNoiseControlSettings()
      this.calibrationSettings = s
      this.editBaselineDb = s.baselineDb
      this.editBaselineRms = s.baselineRms != null ? String(s.baselineRms) : ''
      this.editMaxLevelDb = s.maxLevelDb
    },
    doAutoCalibrate() {
      this.isCalibrating = true
      this.calibrateMessage = ''
      noiseService.calibrate(this.calibrateTargetDb, (success, msg) => {
        this.isCalibrating = false
        this.calibrateSuccess = success
        this.calibrateMessage = msg
        if (success) {
          this.refreshCalibrationSettings()
        }
        setTimeout(() => { this.calibrateMessage = '' }, 5000)
      })
    },
    saveManualCalibration() {
      const patch = {
        baselineDb: this.editBaselineDb,
        maxLevelDb: this.editMaxLevelDb,
      }
      const rmsVal = parseFloat(this.editBaselineRms)
      if (!isNaN(rmsVal) && rmsVal > 0) {
        patch.baselineRms = rmsVal
      }
      saveNoiseControlSettings(patch)
      this.refreshCalibrationSettings()
    },
    resetCalibration() {
      resetNoiseControlSettings()
      this.refreshCalibrationSettings()
    },
  },
}
</script>

<style scoped lang="scss">
.noise-detail-card {
  .noise-dashboard {
    background: linear-gradient(
      135deg,
      rgba(var(--v-theme-surface-variant), 0.3),
      rgba(var(--v-theme-surface), 1)
    );
  }

  .noise-gauge-ring {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 4px solid;
    transition: border-color 0.3s ease;

    &.ring-success { border-color: rgb(var(--v-theme-success)); }
    &.ring-light-green { border-color: rgb(var(--v-theme-light-green)); }
    &.ring-warning { border-color: rgb(var(--v-theme-warning)); }
    &.ring-orange { border-color: rgb(var(--v-theme-orange)); }
    &.ring-error { border-color: rgb(var(--v-theme-error)); }
    &.ring-grey { border-color: rgb(var(--v-theme-grey)); }
  }

  .noise-gauge-inner {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: rgb(var(--v-theme-surface));
  }

  .noise-gauge-value {
    font-size: 2.4rem;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .noise-gradient-bar {
    position: relative;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(
      to right,
      rgb(var(--v-theme-success)),
      rgb(var(--v-theme-light-green)),
      rgb(var(--v-theme-warning)),
      rgb(var(--v-theme-orange)),
      rgb(var(--v-theme-error))
    );
  }

  .noise-indicator {
    position: absolute;
    top: -4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    border: 3px solid rgb(var(--v-theme-primary));
    transform: translateX(-50%);
    transition: left 0.15s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }

  .noise-waveform {
    background: rgba(var(--v-theme-surface-variant), 0.15);
    border-radius: 12px;
    padding: 8px;
    overflow: hidden;
  }
}

// 报告样式
.report-section-line {
  display: inline-block;
  width: 4px;
  height: 18px;
  border-radius: 2px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.report-stat-card {
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface-variant), 0.1);
}
</style>
