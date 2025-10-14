<template>
  <v-container class="fill-height">
    <v-row>
      <v-col cols="12">
        <v-card
          class="elevation-12"
          border
        >
          <v-card-title class="d-flex align-center primary lighten-1 white--text py-3 px-4">
            <v-icon
              color="white"
              class="mr-2"
            >
              mdi-swap-horizontal
            </v-icon>
            课程表转换工具
          </v-card-title>
          <v-card-subtitle>
            将CSES格式的JSON或YAML文本转换为WakeUp软件使用的课程表
          </v-card-subtitle>
          <v-card-text>
            <!-- 错误提示 -->
            <v-alert
              v-if="error"
              type="error"
              class="mb-4 mt-3 mx-2"
              variant="tonal"
              border="start"
              closable
              @click:close="error = ''"
            >
              <div class="d-flex align-center">
                <v-icon class="mr-2">
                  mdi-alert-circle
                </v-icon>
                {{ error }}
              </div>
            </v-alert>

            <!-- 成功提示 -->
            <v-alert
              v-if="success"
              type="success"
              class="mb-4 mt-3 mx-2"
              variant="tonal"
              border="start"
              closable
              @click:close="success = ''"
            >
              <div class="d-flex align-center">
                <v-icon class="mr-2">
                  mdi-check-circle
                </v-icon>
                {{ success }}
              </div>
            </v-alert>

            <!-- 输入方式选择 -->
            <v-tabs
              v-model="activeTab"
              class="mb-4 mx-2"
              color="primary"
              rounded
            >
              <v-tab
                value="text"
                class="px-5"
              >
                <v-icon start>
                  mdi-text-box
                </v-icon> 文本粘贴
              </v-tab>
              <v-tab
                value="file"
                class="px-5"
              >
                <v-icon start>
                  mdi-file-upload
                </v-icon> 文件上传
              </v-tab>
            </v-tabs>

            <!-- 格式选择 -->
            <v-btn-toggle
              v-model="formatMode"
              color="primary"
              class="mb-4 mx-2"
              mandatory
              density="comfortable"
              border
              rounded
            >
              <v-btn value="auto">
                自动检测
              </v-btn>
              <v-btn value="json">
                JSON
              </v-btn>
              <v-btn
                value="yaml"
                :disabled="!yamlLibLoaded"
              >
                YAML
                <v-tooltip
                  activator="parent"
                  location="bottom"
                >
                  {{ yamlLibLoaded ? 'YAML解析库已加载' : '正在加载YAML解析库...' }}
                </v-tooltip>
              </v-btn>
            </v-btn-toggle>

            <!-- 添加当前检测到的格式提示 -->
            <div
              v-if="jsonText && formatMode === 'auto'"
              class="text-caption mb-2"
            >
              检测到的格式: {{ isYaml(jsonText) ? 'YAML' : 'JSON' }}
            </div>

            <v-window v-model="activeTab">
              <v-window-item value="text">
                <div class="d-flex align-center mb-2">
                  <v-textarea
                    v-model="jsonText"
                    label="粘贴JSON或YAML文本"
                    :loading="loading"
                    :disabled="loading"
                    row-height="25"
                    rows="6"
                    placeholder="请在此粘贴CSES格式的数据..."
                    @input="handleTextChange"
                  />
                </div>
              </v-window-item>
              <v-window-item value="file">
                <v-file-input
                  v-model="file"
                  accept=".js,.json,.yml,.yaml"
                  label="选择课程表文件"
                  prepend-icon="mdi-file-upload"
                  :loading="loading"
                  :disabled="loading"
                  hint="支持JSON、YAML格式文件"
                  persistent-hint
                  :rules="[
                    v => !v || v.size < 2000000 || '文件大小不能超过 2 MB',
                  ]"
                  @change="handleFileChange"
                />

                <v-alert
                  v-if="file && formatMode === 'auto'"
                  type="info"
                  class="mb-4"
                  variant="tonal"
                  density="compact"
                >
                  将根据文件扩展名自动检测格式
                </v-alert>
              </v-window-item>
            </v-window>

            <!-- 设置面板 -->
            <v-col cols="12">
              <v-card
                flat
                class="pa-4  rounded-lg"
                border
              >
                <div class="d-flex align-center mb-3">
                  <v-icon
                    color="primary"
                    class="mr-2"
                  >
                    mdi-calendar-multiselect
                  </v-icon>
                  <h3 class="text-subtitle-1 font-weight-medium mr-auto">
                    选择导出天数
                  </h3>
                  <v-btn
                    variant="text"
                    color="primary"
                    class="ml-2"
                    @click="selectAllDays"
                  >
                    <v-icon
                      start
                      size="small"
                    >
                      mdi-checkbox-multiple-marked
                    </v-icon>
                    全选
                  </v-btn>
                  <v-btn
                    variant="text"
                    color="error"
                    class="ml-2"
                    @click="clearSelectedDays"
                  >
                    <v-icon
                      start
                      size="small"
                    >
                      mdi-checkbox-multiple-blank-outline
                    </v-icon>
                    清除
                  </v-btn>
                </div>
                <v-chip-group
                  v-model="selectedDays"
                  multiple
                  class="mb-2"
                  color="primary"
                >
                  <v-chip
                    v-for="day in 7"
                    :key="day"
                    :value="day"
                    filter
                    variant="tonal"
                    class="filter-chip"
                    label
                  >
                    {{ dayNames[day] }}
                    <v-badge
                      v-if="getDaySchedule(day).length > 0"
                      :content="getDaySchedule(day).length"
                      color="primary"
                      inline
                    />
                  </v-chip>
                </v-chip-group>
              </v-card>
            </v-col>

            <!-- 改进设置选项卡，显示为开关组 -->
            <v-col cols="12">
              <v-card
                flat
                class="pa-4  rounded-lg"
                border
              >
                <div class="d-flex align-center mb-3">
                  <v-icon
                    color="primary"
                    class="mr-2"
                  >
                    mdi-cog
                  </v-icon>
                  <h3 class="text-subtitle-1 font-weight-medium">
                    显示配置
                  </h3>
                </div>
                <v-row>
                  <v-col
                    cols="12"
                    sm="6"
                  >
                    <v-switch
                      v-model="settings.hideTeacherName"
                      label="不显示教师姓名"
                      color="primary"
                      inset
                      hide-details
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                  >
                    <v-switch
                      v-model="settings.hideRoom"
                      label="不显示教室信息"
                      color="primary"
                      inset
                      hide-details
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                  >
                    <v-text-field
                      v-model.number="settings.totalWeeks"
                      label="总周数"
                      type="number"
                      min="1"
                      max="30"
                      :rules="[(v) => v > 0 || '周数必须大于0']"
                      density="comfortable"
                      variant="outlined"
                      prepend-inner-icon="mdi-calendar-week"
                      class="mt-3"
                    />
                  </v-col>
                </v-row>
              </v-card>
            </v-col>

            <!-- 添加加载状态的骨架屏 -->
            <v-card
              v-if="loading"
              class="my-4"
              outlined
            >
              <v-card-text>
                <v-skeleton-loader
                  type="table"
                  class="mx-auto"
                />
              </v-card-text>
            </v-card>

            <!-- 添加结果计数展示 -->
            <v-chip
              v-if="processedData"
              color="primary"
              class="ml-2"
              prepend-icon="mdi-book-open-variant"
            >
              {{ processedData.tableData.length }} 节课程
            </v-chip>

            <!-- 添加更清晰的选择提示 -->
            <v-alert
              v-if="processedData && exportPeriods.length === 0"
              type="warning"
              class="mb-4"
              closable
            >
              请选择要导出的节次
            </v-alert>

            <!-- 课程表预览 -->
            <v-card
              v-if="processedData"
              class="my-4"
              elevation="1"
            >
              <v-card-title class="d-flex align-center pa-4 bg-primary-lighten-5">
                <v-icon
                  color="primary"
                  class="mr-2"
                >
                  mdi-table
                </v-icon>
                <span class="font-weight-bold">课程表</span>
                <v-chip
                  color="primary"
                  class="ml-3"
                  size="small"
                  pill
                >
                  <v-icon
                    start
                    size="x-small"
                  >
                    mdi-book-open-variant
                  </v-icon>
                  {{ processedData.tableData.length }} 节课程
                </v-chip>
              </v-card-title>
              <v-card-text class="pa-0">
                <v-data-table
                  v-model:items-selected="selectedRows"
                  :headers="tableHeaders"
                  :items="processedData.tableData"
                  hide-default-footer
                  class="elevation-1"
                  :items-per-page="-1"
                  item-value="period"
                  show-select
                  select-strategy="single-independent"
                  :sort-by="[]"
                  disable-sort
                  @update:items-selected="updateSelectedPeriods"
                >
                  <template #[`item.data-table-select`]="{ item }">
                    <v-checkbox
                      v-model="exportPeriods"
                      :value="item.period"
                      hide-details
                      density="compact"
                    />
                  </template>

                  <template
                    v-for="day in 7"
                    #[`item.${day}`]="{ item }"
                    :key="day"
                  >
                    <div
                      v-if="item[day]"
                      class="course-cell"
                    >
                      <template v-if="Array.isArray(item[day])">
                        <div
                          v-for="(course, index) in item[day]"
                          :key="index"
                          class="course-item"
                        >
                          {{ course.name }}
                          <span
                            v-if="!settings.hideTeacherName && course.teacher"
                          >
                            <br>{{ course.teacher }}
                          </span>
                          <span
                            v-if="!settings.hideRoom && course.room"
                          >
                            <br>{{ course.room }}
                          </span>
                          <span
                            v-if="course.weekType"
                            class="week-type"
                          >
                            {{ course.weekType }}周
                          </span>
                        </div>
                      </template>
                      <template v-else>
                        {{ item[day].name }}
                        <span
                          v-if="!settings.hideTeacherName && item[day].teacher"
                        >
                          <br>{{ item[day].teacher }}
                        </span>
                        <span
                          v-if="!settings.hideRoom && item[day].room"
                        >
                          <br>{{ item[day].room }}
                        </span>
                        <span
                          v-if="item[day].weekType"
                          class="week-type"
                        >
                          {{ item[day].weekType }}周
                        </span>
                      </template>
                    </div>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>

            <!-- 时间表 -->
            <v-card
              v-if="hasExportData"
              class="my-4"
              elevation="1"
            >
              <v-card-title class="d-flex align-center pa-4 bg-primary-lighten-5">
                <v-icon
                  color="primary"
                  class="mr-2"
                >
                  mdi-timetable
                </v-icon>
                <span class="font-weight-bold">每日课程时间表</span>
                <v-chip
                  class="ml-3"
                  size="small"
                  color="primary"
                  pill
                >
                  <v-icon
                    start
                    size="x-small"
                  >
                    mdi-clock-outline
                  </v-icon>
                  {{ totalClassHours }} 课时
                </v-chip>
                <v-tooltip v-if="exportPeriods.length > 0">
                  <template #activator="{ props }">
                    <v-chip
                      class="ml-2"
                      size="small"
                      color="info"
                      v-bind="props"
                      pill
                    >
                      <v-icon
                        start
                        size="x-small"
                      >
                        mdi-information-outline
                      </v-icon>
                      节次已重排
                    </v-chip>
                  </template>
                  <span>已将选中的节次 {{ exportPeriods.join(', ') }} 重新排序为连续的 1-{{ exportPeriods.length }}</span>
                </v-tooltip>
              </v-card-title>
              <v-card-text>
                <!-- 美化日期导航标签 -->
                <v-tabs
                  v-if="daysWithSchedule.length > 0"
                  v-model="activeDay"
                  class="mb-4"
                  color="primary"
                  grow
                  align-tabs="center"
                >
                  <v-tab
                    v-for="day in daysWithSchedule"
                    :key="day"
                    :value="day"
                    class="px-2 font-weight-medium"
                  >
                    {{ dayNames[day] }}
                    <v-badge
                      :content="getDaySchedule(day).length"
                      color="primary"
                      inline
                    />
                  </v-tab>
                </v-tabs>

                <!-- 当前选中日期的课程表 -->
                <v-window v-model="activeDay">
                  <v-window-item
                    v-for="day in daysWithSchedule"
                    :key="day"
                    :value="day"
                  >
                    <v-table
                      density="compact"
                      class="rounded"
                      :headers-length="6"
                      disable-sort
                    >
                      <thead>
                        <tr>
                          <th class="text-center">
                            节次
                          </th>
                          <th>课程</th>
                          <th>时间</th>
                          <th>教师</th>
                          <th>教室</th>
                          <th>周次</th>
                        </tr>
                      </thead>
                      <tbody>
                        <template
                          v-for="(group, index) in groupByPeriod(getDaySchedule(day))"
                          :key="index"
                        >
                          <tr>
                            <td class="text-center font-weight-bold">
                              {{ group.period }}
                              <v-tooltip v-if="group.originalPeriod !== group.period">
                                <template #activator="{ props }">
                                  <v-icon
                                    size="x-small"
                                    v-bind="props"
                                    color="info"
                                    class="ml-1"
                                  >
                                    mdi-sync
                                  </v-icon>
                                </template>
                                原节次: {{ group.originalPeriod }}
                              </v-tooltip>
                            </td>
                            <td>
                              <div
                                v-for="(item, i) in group.items"
                                :key="i"
                                class="mb-1"
                              >
                                <v-chip
                                  size="small"
                                  :color="getSubjectColor(item.subject)"
                                  label
                                  text-color="white"
                                  class="mr-1"
                                >
                                  {{ item.subject }}
                                </v-chip>
                                <v-chip
                                  v-if="group.items.length > 1"
                                  size="x-small"
                                  class="ml-1"
                                  :color="item.weekType === '单' ? 'warning' : 'success'"
                                >
                                  {{ item.weekType }}周
                                </v-chip>
                              </div>
                            </td>
                            <td>
                              <div
                                v-for="(timeSlot, i) in group.uniqueTimeSlots"
                                :key="i"
                                class="mb-1"
                              >
                                <v-chip
                                  size="x-small"
                                  class="time-chip"
                                >
                                  {{ formatTime(timeSlot.startTime) }} - {{ formatTime(timeSlot.endTime) }}
                                </v-chip>
                              </div>
                            </td>
                            <td>
                              <template v-if="!settings.hideTeacherName">
                                <div
                                  v-for="(item, i) in group.items"
                                  :key="i"
                                  class="mb-1"
                                >
                                  {{ item.teacher || '-' }}
                                </div>
                              </template>
                              <template v-else>
                                -
                              </template>
                            </td>
                            <td>
                              <template v-if="!settings.hideRoom">
                                <div
                                  v-for="(item, i) in group.items"
                                  :key="i"
                                  class="mb-1"
                                >
                                  {{ item.room || '-' }}
                                </div>
                              </template>
                              <template v-else>
                                -
                              </template>
                            </td>
                            <td>
                              <div
                                v-for="(item, i) in group.items"
                                :key="i"
                                class="mb-1"
                              >
                                {{ item.weeks }}
                              </div>
                            </td>
                          </tr>
                        </template>
                      </tbody>
                    </v-table>
                  </v-window-item>
                </v-window>

                <!-- 无数据提示 -->
                <v-alert
                  v-if="hasExportData && daysWithSchedule.length === 0"
                  type="info"
                  class="mt-3"
                >
                  没有找到任何课程数据
                </v-alert>
              </v-card-text>
            </v-card>
          </v-card-text>

          <v-card-actions class="">
            <v-spacer />
            <v-btn
              color="primary"
              variant="outlined"
              :loading="loading"
              :disabled="(!jsonText && !file) || loading"
              prepend-icon="mdi-cog-refresh"
              @click="processInput"
            >
              处理数据
            </v-btn>
            <v-btn
              color="info"
              :disabled="!hasExportData"
              class="ml-2"
              prepend-icon="mdi-eye"
              border
              @click="showExportPreview"
            >
              刷新
            </v-btn>
            <v-btn
              color="success"
              variant="outlined"
              :disabled="!hasExportData"
              class="ml-2"
              prepend-icon="mdi-download"
              border
              @click="downloadCSV"
            >
              下载CSV
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
// 添加外部库的CDN加载
const loadJsYaml = () => {
  return new Promise((resolve, reject) => {
    if (typeof window.jsyaml !== 'undefined') {
      return resolve(window.jsyaml);
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js';
    script.async = true;
    script.onload = () => resolve(window.jsyaml);
    script.onerror = () => reject(new Error('无法加载YAML解析库'));
    document.head.appendChild(script);
  });
};

// 添加CSES解析器类
class CSESParser {
  constructor(data) {
    /**
     * 初始化 CSES 解析器
     * @param {Object} data - 解析后的YAML数据
     */
    this.data = data;
    this.version = null;
    this.subjects = [];
    this.schedules = [];

    this._parseData();
  }

  _parseData() {
    /** 解析数据 */
    if (!this.data) return;

    // 获取版本信息
    this.version = this.data.version || 1;

    // 解析科目信息
    const subjectsData = this.data.subjects || [];
    for (const subject of subjectsData) {
      this.subjects.push({
        name: subject.name,
        simplified_name: subject.simplified_name || null,
        teacher: subject.teacher || null,
        room: subject.room || null
      });
    }

    // 解析课程安排
    const schedulesData = this.data.schedules || [];
    for (const schedule of schedulesData) {
      const classes = [];
      for (const cls of schedule.classes || []) {
        classes.push({
          subject: cls.subject,
          start_time: cls.start_time,
          end_time: cls.end_time
        });
      }

      this.schedules.push({
        name: schedule.name,
        enable_day: schedule.enable_day,
        weeks: schedule.weeks || 'all',
        classes: classes
      });
    }
  }

  getSubjects() {
    /** 获取所有科目信息 */
    return this.subjects;
  }

  getSchedules() {
    /** 获取所有课程安排 */
    return this.schedules;
  }

  getScheduleByDay(day) {
    /**
     * 根据星期获取课程安排
     * @param {number} day - 星期（整数型，如 1, 2 等）
     * @returns {Array} 该星期的课程安排
     */
    const schedule = this.schedules.find(s => s.enable_day === day);
    return schedule ? schedule.classes : [];
  }

  // 转换为标准格式的CSES数据
  toCsesData() {
    return {
      version: this.version,
      subjects: this.subjects,
      schedules: this.schedules
    };
  }
}

export default {
  name: "Cses2Wakeup",
  data() {
    return {
      activeTab: "text",
      file: null,
      jsonText: "",
      loading: false,
      error: "",
      success: "",
      processedData: null,
      selectedRows: [],
      exportPeriods: [],
      selectedDays: [1, 2, 3, 4, 5, 6, 7], // 默认选中所有天
      formatMode: "auto", // 'auto', 'json', 或 'yaml'
      yamlLibLoaded: false, // YAML库是否加载成功
      activeDay: null, // 当前选中的日期
      subjectColors: {
        "数学": "blue",
        "语文": "red",
        "英语": "green",
        "物理": "purple",
        "化学": "orange",
        "生物": "teal",
        "历史": "brown",
        "地理": "indigo",
        "政治": "pink",
        "体育": "cyan",
        "自习": "grey",
        "早读": "amber",
        "班会": "deep-purple",
        "听力": "light-blue",
        "信息技术": "light-green",
      },
      settings: {
        hideTeacherName: false,
        hideRoom: false,
        totalWeeks: 30
      },
      tableHeaders: [
        { title: "", key: "data-table-select" },
        { title: "节次", key: "period" },
        { title: "周一", key: "1" },
        { title: "周二", key: "2" },
        { title: "周三", key: "3" },
        { title: "周四", key: "4" },
        { title: "周五", key: "5" },
        { title: "周六", key: "6" },
        { title: "周日", key: "7" },
      ],
      timeTableHeaders: [
        { title: "节次", key: "period" },
        { title: "课程", key: "subject" },
        { title: "星期", key: "day" },
        { title: "开始时间", key: "startTime" },
        { title: "结束时间", key: "endTime" },
        { title: "教师", key: "teacher" },
        { title: "教室", key: "room" },
        { title: "周次", key: "weeks" },
      ],
      dayNames: {
        1: "周一",
        2: "周二",
        3: "周三",
        4: "周四",
        5: "周五",
        6: "周六",
        7: "周日"
      }
    };
  },
  computed: {
    timeTableData() {
      if (!this.processedData || !this.processedData.tableData) return [];

      const timeTableData = [];

      // 获取选中的节次
      const selectedRows = this.processedData.tableData.filter(
        row => this.exportPeriods.includes(row.period)
      );

      // 创建节次映射 - 将原始节次映射到新的连续节次
      const periodMap = {};
      selectedRows
        .sort((a, b) => a.period - b.period)
        .forEach((row, index) => {
          periodMap[row.period] = index + 1; // 重新映射为连续的1,2,3...
        });

      // 对每个选中的节次和每天的课程进行处理
      selectedRows.forEach(row => {
        for (let day = 1; day <= 7; day++) {
          // 只处理用户选中的日期
          if (!this.selectedDays.includes(day)) continue;

          const courses = row[day];
          if (!courses) continue;

          if (Array.isArray(courses)) {
            // 处理数组形式的课程（单双周课程）
            courses.forEach(course => {
              if (!course || !course.name) return;

              timeTableData.push({
                originalPeriod: row.period, // 保留原始节次
                period: periodMap[row.period], // 使用重新计算的节次
                subject: course.name,
                day: this.dayNames[day],
                startTime: course.startTime,
                endTime: course.endTime,
                teacher: this.settings.hideTeacherName ? "" : (course.teacher || ""),
                room: this.settings.hideRoom ? "" : (course.room || ""),
                weeks: course.weekType ? `1-${this.settings.totalWeeks}${course.weekType}` : `1-${this.settings.totalWeeks}`
              });
            });
          } else {
            // 处理单个课程
            if (!courses.name) continue;

            timeTableData.push({
              originalPeriod: row.period, // 保留原始节次
              period: periodMap[row.period], // 使用重新计算的节次
              subject: courses.name,
              day: this.dayNames[day],
              startTime: courses.startTime,
              endTime: courses.endTime,
              teacher: this.settings.hideTeacherName ? "" : (courses.teacher || ""),
              room: this.settings.hideRoom ? "" : (courses.room || ""),
              weeks: courses.weekType ? `1-${this.settings.totalWeeks}${courses.weekType}` : `1-${this.settings.totalWeeks}`
            });
          }
        }
      });

      // 按照节次和星期排序
      return timeTableData.sort((a, b) => {
        // 先按节次排序
        if (a.period !== b.period) return a.period - b.period;
        // 再按星期排序
        const dayOrder = { "周一": 1, "周二": 2, "周三": 3, "周四": 4, "周五": 5, "周六": 6, "周日": 7 };
        return dayOrder[a.day] - dayOrder[b.day];
      });
    },

    hasExportData() {
      return this.processedData && this.exportPeriods.length > 0;
    },

    totalClassHours() {
      return this.timeTableData.length;
    },

    // 添加新的计算属性
    daysWithSchedule() {
      // 返回有课程的天数数组（只包括用户选中的天数）
      const days = [];
      for (let day = 1; day <= 7; day++) {
        if (this.selectedDays.includes(day) && this.getDaySchedule(day).length > 0) {
          days.push(day);
        }
      }
      return days;
    }
  },
  async mounted() {
    // 加载YAML解析库
    try {
      await loadJsYaml();
      this.yamlLibLoaded = true;
    } catch (error) {
      this.error = error.message;
    }

    // 监听daysWithSchedule变化，设置默认选中的日期
    this.$watch('daysWithSchedule', (newVal) => {
      if (newVal.length > 0 && !this.activeDay) {
        this.activeDay = newVal[0];
      }
    });
  },
  methods: {
    async handleFileChange() {
      this.resetData();

      if (!this.file) return;

      // 根据文件扩展名自动设置格式模式
      const fileName = this.file.name.toLowerCase();
      if (fileName.endsWith('.json') || fileName.endsWith('.js')) {
        this.formatMode = 'json';
      } else if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
        this.formatMode = 'yaml';

        // 确保YAML库已加载
        if (!this.yamlLibLoaded) {
          try {
            await loadJsYaml();
            this.yamlLibLoaded = true;
          } catch (error) {
            this.error = `无法加载YAML解析库: ${error.message}`;
            return;
          }
        }
      }

      // 读取文件内容
      try {
        const reader = new FileReader();
        reader.onload = async (fileEvent) => {
          try {
            this.jsonText = fileEvent.target.result;
            // 自动处理数据
            await this.processInput();
          } catch (error) {
            this.error = `文件读取失败: ${error.message}`;
          }
        };
        reader.onerror = () => {
          this.error = "文件读取失败";
        };
        reader.readAsText(this.file);
      } catch (error) {
        this.error = `文件处理失败: ${error.message}`;
      }
    },

    handleTextChange() {
      this.resetData();
    },

    resetData() {
      this.error = "";
      this.success = "";
      this.processedData = null;
      this.selectedRows = [];
      this.exportPeriods = [];
    },

    async processInput() {
      if (!this.jsonText && !this.file) {
        this.error = "请粘贴文本或上传文件";
        return;
      }

      this.loading = true;
      this.error = "";
      this.success = "";

      try {
        // 释放一个事件循环以允许UI更新
        await this.$nextTick();

        // 解析输入数据
        let data;
        try {
          if (this.formatMode === 'yaml' || (this.formatMode === 'auto' && this.isYaml(this.jsonText))) {
            // 解析YAML
            const yamlData = this.parseYaml(this.jsonText);
            // 使用CSESParser处理YAML数据
            const parser = new CSESParser(yamlData);
            data = parser.toCsesData();
          } else {
            // 解析JSON
            data = JSON.parse(this.jsonText);
          }
        } catch (error) {
          throw new Error(`格式解析错误: ${error.message}`);
        }

        // 验证CSES格式
        if (!this.validateCsesFormat(data)) {
          throw new Error("不是有效的CSES格式数据");
        }

        // 处理数据
        const result = this.processCsesData(data);
        this.processedData = result;

        // 重置选中的天数到工作日（1-5）
        this.selectedDays = [1, 2, 3, 4, 5];

        this.success = `数据处理成功！`;

        // 默认选中所有节次
        if (result.tableData && result.tableData.length > 0) {
          this.selectedRows = [...result.tableData];
          this.exportPeriods = result.tableData.map(row => row.period);
        }
      } catch (err) {
        this.error = "数据处理失败：" + err.message;
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    validateCsesFormat(data) {
      // 如果数据是通过CSESParser解析的
      if (data instanceof CSESParser) {
        return data.version === 1 &&
               Array.isArray(data.subjects) &&
               Array.isArray(data.schedules);
      }

      // 基本验证
      if (!data || typeof data !== 'object') return false;

      // 检查版本
      if (data.version !== 1) return false;

      // 检查subjects数组
      if (!Array.isArray(data.subjects)) return false;

      // 检查schedules数组
      if (!Array.isArray(data.schedules)) return false;

      return true;
    },

    processCsesData(data) {
      const { schedules, subjects } = data;

      // 使用对象引用优化内存使用
      const subjectMap = Object.fromEntries(
        subjects.map(subject => [subject.name, subject])
      );

      const tableData = [];

      // 获取最大节次数
      let maxPeriods = 0;
      schedules.forEach(schedule => {
        if (schedule.classes && schedule.classes.length > maxPeriods) {
          maxPeriods = schedule.classes.length;
        }
      });

      // 初始化课表数据结构
      for (let i = 1; i <= maxPeriods; i++) {
        tableData.push({
          period: i,
          1: null,
          2: null,
          3: null,
          4: null,
          5: null,
          6: null,
          7: null,
        });
      }

      // 处理每个课表
      schedules.forEach(schedule => {
        const day = schedule.enable_day;
        if (!day || day < 1 || day > 7) return;

        // 获取周类型
        let weekType = "";
        if (schedule.weeks === "odd") {
          weekType = "单";
        } else if (schedule.weeks === "even") {
          weekType = "双";
        }

        // 处理每节课
        schedule.classes.forEach((classInfo, index) => {
          if (!classInfo.subject) return;

          const period = index + 1;
          if (period > maxPeriods) return;

          // 获取科目详细信息
          const subjectInfo = subjectMap[classInfo.subject] || {};

          const courseInfo = {
            name: classInfo.subject,
            teacher: subjectInfo.teacher || "",
            room: subjectInfo.room || "",
            period: period,
            startTime: classInfo.start_time,
            endTime: classInfo.end_time,
            day: day,
            weekType: weekType,
          };

          // 将课程信息添加到表格
          const existingCourse = tableData[period - 1][day];

          if (!existingCourse) {
            // 位置为空，直接添加
            tableData[period - 1][day] = courseInfo;
          } else if (weekType && existingCourse.weekType && weekType !== existingCourse.weekType) {
            // 如果是不同的单/双周，创建数组
            if (!Array.isArray(tableData[period - 1][day])) {
              tableData[period - 1][day] = [existingCourse];
            }
            tableData[period - 1][day].push(courseInfo);
          } else if (weekType === existingCourse.weekType) {
            // 相同周类型的课程，可能是冲突，使用后者覆盖
            tableData[period - 1][day] = courseInfo;
          } else if (!weekType) {
            // 非单双周课程覆盖已有课程
            tableData[period - 1][day] = courseInfo;
          }
        });
      });

      return {
        tableData,
        originalData: data
      };
    },

    updateSelectedPeriods(selected) {
      this.exportPeriods = [];
      if (selected && selected.length > 0) {
        // 提取所有选中行的period值并去重
        this.exportPeriods = [...new Set(
          selected
            .filter(row => row && typeof row.period === 'number')
            .map(row => row.period)
        )];
      }
    },

    getTimeTableData() {
      return this.timeTableData;
    },

    downloadCSV() {
      if (!this.processedData?.tableData) {
        this.error = "没有可下载的数据";
        return;
      }

      // 如果没有选中任何要导出的节次
      if (this.exportPeriods.length === 0) {
        this.error = "请至少选择一节要导出的课";
        return;
      }

      // 如果没有课程数据
      if (this.daysWithSchedule.length === 0 || this.totalClassHours === 0) {
        this.error = "没有课程数据可导出";
        return;
      }

      // 生成CSV内容
      let csvContent = "课程名称,星期,开始节数,结束节数,老师,地点,周数\n";

      // 遍历每天的课程
      for (const day of this.daysWithSchedule) {
        // 获取该天的课程分组
        const periodGroups = this.groupByPeriod(this.getDaySchedule(day));

        // 遍历每个节次分组
        for (const group of periodGroups) {
          // 遍历该节次的每个课程
          for (const item of group.items) {
            const dayNumber = { "周一": 1, "周二": 2, "周三": 3, "周四": 4, "周五": 5, "周六": 6, "周日": 7 }[item.day];
            const teacher = this.settings.hideTeacherName ? "" : (item.teacher || "");
            const room = this.settings.hideRoom ? "" : (item.room || "");

            // 每节课单独导出，使用重新计算的节次
            csvContent += `${item.subject},${dayNumber},${item.period},${item.period},${teacher},${room},${item.weeks}\n`;
          }
        }
      }

      // 添加BOM头以确保Excel正确识别UTF-8编码
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `course_schedule_${this.totalClassHours}课时.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      // 显示成功信息，包含课时数
      this.success = `导出成功！共计 ${this.totalClassHours} 课时`;
    },

    // 修改showExportPreview方法
    showExportPreview() {
      if (!this.hasExportData) {
        this.error = "请先选择要导出的节次";
        return;
      }

      const previewContent = this.timeTableData.slice(0, 5).map(item =>
        `${item.subject} (${item.day} 第${item.period}节)`
      ).join('\n');

      if (this.timeTableData.length > 5) {
        this.success = `导出预览 (共${this.totalClassHours}课时):\n${previewContent}\n...等${this.totalClassHours - 5}节课程`;
      } else {
        this.success = `导出预览 (共${this.totalClassHours}课时):\n${previewContent}`;
      }

      // 刷新视图，确保节次重排效果显示
      this.$nextTick(() => {
        // 如果当前没有选中天数，自动选择第一个有课程的天数
        if (this.daysWithSchedule.length > 0 && !this.activeDay) {
          this.activeDay = this.daysWithSchedule[0];
        }
      });
    },

    // 添加YAML解析相关方法
    isYaml(text) {
      // 简单判断是否为YAML格式
      // YAML通常不以{或[开头，而JSON必须以{或[开头
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // 可能是JSON，尝试解析
        try {
          JSON.parse(trimmed);
          return false; // 成功解析为JSON
        } catch {
          // 解析JSON失败，可能是YAML
        }
      }
      // 检查是否含有YAML典型的格式如键值对 key: value
      return /^\s*[a-zA-Z0-9_-]+\s*:/.test(trimmed) ||
             /\n\s*[a-zA-Z0-9_-]+\s*:/.test(trimmed);
    },

    parseYaml(text) {
      try {
        // 使用CDN加载的jsyaml
        if (typeof window.jsyaml !== 'undefined') {
          return window.jsyaml.load(text);
        } else {
          throw new Error("YAML解析器未加载");
        }
      } catch (error) {
        throw new Error(`YAML解析错误: ${error.message}`);
      }
    },

    // 添加获取每天课程表的方法
    getDaySchedule(day) {
      if (!this.timeTableData) return [];
      // 获取原始数据并过滤
      const allData = this.getUnfilteredTimeTableData();
      return allData.filter(item => {
        const dayNum = { "周一": 1, "周二": 2, "周三": 3, "周四": 4, "周五": 5, "周六": 6, "周日": 7 }[item.day];
        return dayNum === day;
      });
    },

    // 添加一个辅助方法，获取不受selectedDays过滤的完整数据
    getUnfilteredTimeTableData() {
      if (!this.processedData || !this.processedData.tableData) return [];

      const timeTableData = [];

      // 获取选中的节次
      const selectedRows = this.processedData.tableData.filter(
        row => this.exportPeriods.includes(row.period)
      );

      // 创建节次映射
      const periodMap = {};
      selectedRows
        .sort((a, b) => a.period - b.period)
        .forEach((row, index) => {
          periodMap[row.period] = index + 1;
        });

      // 对每个选中的节次和每天的课程进行处理
      selectedRows.forEach(row => {
        for (let day = 1; day <= 7; day++) {
          const courses = row[day];
          if (!courses) continue;

          if (Array.isArray(courses)) {
            // 处理数组形式的课程（单双周课程）
            courses.forEach(course => {
              if (!course || !course.name) return;

              timeTableData.push({
                originalPeriod: row.period,
                period: periodMap[row.period],
                subject: course.name,
                day: this.dayNames[day],
                startTime: course.startTime,
                endTime: course.endTime,
                teacher: this.settings.hideTeacherName ? "" : (course.teacher || ""),
                room: this.settings.hideRoom ? "" : (course.room || ""),
                weeks: course.weekType ? `1-${this.settings.totalWeeks}${course.weekType}` : `1-${this.settings.totalWeeks}`
              });
            });
          } else {
            // 处理单个课程
            if (!courses.name) continue;

            timeTableData.push({
              originalPeriod: row.period,
              period: periodMap[row.period],
              subject: courses.name,
              day: this.dayNames[day],
              startTime: courses.startTime,
              endTime: courses.endTime,
              teacher: this.settings.hideTeacherName ? "" : (courses.teacher || ""),
              room: this.settings.hideRoom ? "" : (courses.room || ""),
              weeks: courses.weekType ? `1-${this.settings.totalWeeks}${courses.weekType}` : `1-${this.settings.totalWeeks}`
            });
          }
        }
      });

      // 按照节次和星期排序
      return timeTableData.sort((a, b) => {
        // 先按节次排序
        if (a.period !== b.period) return a.period - b.period;
        // 再按星期排序
        const dayOrder = { "周一": 1, "周二": 2, "周三": 3, "周四": 4, "周五": 5, "周六": 6, "周日": 7 };
        return dayOrder[a.day] - dayOrder[b.day];
      });
    },

    // 修改groupByPeriod方法，添加原始节次信息
    groupByPeriod(daySchedule) {
      // 按节次分组
      const groups = {};
      daySchedule.forEach(item => {
        if (!groups[item.period]) {
          groups[item.period] = {
            period: item.period,
            originalPeriod: item.originalPeriod, // 保存原始节次
            items: [],
            timeSlots: []
          };
        }
        groups[item.period].items.push(item);
        groups[item.period].timeSlots.push({
          startTime: item.startTime,
          endTime: item.endTime
        });
      });

      // 对每个分组，找出唯一的时间段
      Object.values(groups).forEach(group => {
        // 对时间段去重
        group.uniqueTimeSlots = [];
        group.timeSlots.forEach(timeSlot => {
          if (!group.uniqueTimeSlots.some(
            slot => slot.startTime === timeSlot.startTime && slot.endTime === timeSlot.endTime
          )) {
            group.uniqueTimeSlots.push(timeSlot);
          }
        });

        // 对时间段排序
        group.uniqueTimeSlots.sort((a, b) => {
          return a.startTime.localeCompare(b.startTime);
        });
      });

      // 转换为数组并按节次排序
      return Object.values(groups).sort((a, b) => a.period - b.period);
    },

    // 格式化时间 - 去掉秒数
    formatTime(timeStr) {
      if (!timeStr) return '';
      // 如果时间格式是 HH:MM:SS，则去掉秒数部分
      return timeStr.substring(0, 5);
    },

    // 获取课程颜色
    getSubjectColor(subject) {
      return this.subjectColors[subject] || 'grey';
    },

    selectAllDays() {
      this.selectedDays = [1, 2, 3, 4, 5, 6, 7];
    },

    clearSelectedDays() {
      this.selectedDays = [];
    }
  }
};
</script>

<style scoped>
.v-chip--selected {
  font-weight: bold;
}

.v-chip .v-badge {
  margin-left: 4px;
}

.time-chip {
  font-size: 0.75rem;
}

.course-cell {
  padding: 4px;
  font-size: 0.85rem;
  white-space: pre-line;
}

.course-item {
  padding: 2px 0;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
}

.course-item:last-child {
  border-bottom: none;
}

.week-type {
  font-size: 0.7rem;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 1px 3px;
  border-radius: 2px;
  margin-left: 2px;
}

/* 日期选择器样式 */
.filter-chip {
  min-width: 60px;
  justify-content: center;
  transition: all 0.2s ease;
}

.filter-chip.v-chip--selected {
  transform: scale(1.05);
  font-weight: bold;
}

/* 表格美化 */
.v-data-table {
  border-radius: 8px;
  overflow: hidden;
}

/* 卡片美化 */
.v-card {
  border-radius: 12px;
  overflow: hidden;
}

/* 美化按钮悬浮效果 */
.v-btn {
  transition: transform 0.2s ease;
}

.v-btn:not(:disabled):hover {
  transform: translateY(-2px);
}
</style>
