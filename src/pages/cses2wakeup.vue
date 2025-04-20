<template>x
  <v-container class="fill-height">
    <v-row>
      <v-col cols="12">
        <v-card class="elevation-12" border>
          <v-card-title class="text-h5 text-center pt-6">
            课程表转换工具
          </v-card-title>

          <v-card-text>
            <v-alert
              v-if="error"
              type="error"
              class="mb-4"
              closable
              @click:close="error = ''"
            >
              {{ error }}
            </v-alert>

            <v-alert
              v-if="success"
              type="success"
              class="mb-4"
              closable
              @click:close="success = ''"
            >
              {{ success }}
            </v-alert>

            <v-tabs v-model="activeTab" class="mb-4">
              <v-tab value="text">文本粘贴</v-tab>

              <v-tab value="file" disabled>文件上传</v-tab>
            </v-tabs>

            <v-window v-model="activeTab">
              <v-window-item value="text">
                <v-textarea
                  v-model="jsonText"
                  label="粘贴JSON文本"
                  :loading="loading"
                  :disabled="loading"
                  row-height="25"
                  rows="3"
                  placeholder="请在此粘贴JSON格式的课程表数据..."
                  @input="handleTextChange"
                ></v-textarea>
              </v-window-item>
              <v-window-item value="file">
                <v-file-input
                  v-model="file"
                  accept=".js,.json"
                  label="选择课程表文件"
                  prepend-icon="mdi-file-upload"
                  :loading="loading"
                  :disabled="loading"
                  @change="handleFileChange"
                  :rules="[
                    (v) => !v || v.size < 2000000 || '文件大小不能超过 2 MB',
                  ]"
                ></v-file-input>
              </v-window-item>
            </v-window>
            <v-card class="mb-4" outlined>
              <v-card-title class="text-subtitle-1"> 课程设置 </v-card-title>
              <v-card-text>
                <div v-if="processedData">
                  <div class="text-subtitle-2 mb-2">导出设置</div>
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-switch
                        v-model="settings.hideIndoorLocation"
                        label="室内课程不显示地点"
                        color="primary"
                      ></v-switch>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-switch
                        v-model="settings.hideTeacherName"
                        label="不显示教师姓名"
                        color="primary"
                      ></v-switch>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model.number="settings.totalWeeks"
                        label="总周数"
                        type="number"
                        min="1"
                        max="30"
                        :rules="[(v) => v > 0 || '周数必须大于0']"
                        dense
                      ></v-text-field>
                    </v-col>

                  </v-row>

                  <!-- 课表选择 - 仅在新格式数据时显示 -->
                  <div
                    v-if="
                      processedData.schedules &&
                      processedData.schedules.length > 0
                    "
                  >
                    <div class="text-subtitle-2 mb-2">课表选择</div>
                    <v-row>
                      <v-col cols="12">
                        <!-- 使用普通的chip而不是v-chip-group，手动处理点击事件 -->
                        <div class="d-flex flex-wrap">
                          <v-chip
                            v-for="schedule in processedData.schedules"
                            :key="schedule.uuid"
                            :color="
                              selectedSchedules[schedule.uuid]
                                ? 'primary'
                                : 'grey'
                            "
                            :outlined="!selectedSchedules[schedule.uuid]"
                            :input-value="selectedSchedules[schedule.uuid]"
                            :prepend-icon="
                              selectedSchedules[schedule.uuid]
                                ? 'mdi-check'
                                : ''
                            "
                            class="ma-1"
                            @click="toggleScheduleSelection(schedule)"
                            filter
                          >
                            {{ schedule.name }}
                            <span
                              v-if="
                                schedule.weeks === 'odd' ||
                                schedule.weeks === 'even'
                              "
                              class="ml-1"
                            >
                              ({{ schedule.weeks === "odd" ? "单" : "双" }}周)
                            </span>
                          </v-chip>
                        </div>
                      </v-col>
                    </v-row>
                  </div>
                </div>
              </v-card-text>
            </v-card>
            <v-card v-if="processedData" class="mt-4" outlined>
              <v-card-title class="text-subtitle-1">
                处理结果预览
              </v-card-title>
              <v-card-text>
                <div class="text-subtitle-2 mb-2">每周课程表</div>
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

                  <template #[`item.1`]="{ item }">
                    <div v-if="item['1']" class="course-cell">
                      <template v-if="Array.isArray(item['1'])">
                        <div
                          v-for="(course, index) in item['1']"
                          :key="index"
                          class="course-item"
                        >
                          {{ course.name }}
                          <span
                            v-if="!settings.hideTeacherName && course.teacher"
                          >
                            <br />{{ course.teacher }}
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
                        {{ item['1'].name }}
                        <span
                          v-if="!settings.hideTeacherName && item['1'].teacher"
                        >
                          <br />{{ item['1'].teacher }}
                        </span>
                        <span
                          v-if="item['1'].weekType"
                          class="week-type"
                        >
                          {{ item['1'].weekType }}周
                        </span>
                      </template>
                    </div>
                  </template>

                  <template #[`item.2`]="{ item }">
                    <div v-if="item['2']" class="course-cell">
                      <template v-if="Array.isArray(item['2'])">
                        <div
                          v-for="(course, index) in item['2']"
                          :key="index"
                          class="course-item"
                        >
                          {{ course.name }}
                          <span
                            v-if="!settings.hideTeacherName && course.teacher"
                          >
                            <br />{{ course.teacher }}
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
                        {{ item['2'].name }}
                        <span
                          v-if="!settings.hideTeacherName && item['2'].teacher"
                        >
                          <br />{{ item['2'].teacher }}
                        </span>
                        <span
                          v-if="item['2'].weekType"
                          class="week-type"
                        >
                          {{ item['2'].weekType }}周
                        </span>
                      </template>
                    </div>
                  </template>

                  <template #[`item.3`]="{ item }">
                    <div v-if="item['3']" class="course-cell">
                      <template v-if="Array.isArray(item['3'])">
                        <div
                          v-for="(course, index) in item['3']"
                          :key="index"
                          class="course-item"
                        >
                          {{ course.name }}
                          <span
                            v-if="!settings.hideTeacherName && course.teacher"
                          >
                            <br />{{ course.teacher }}
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
                        {{ item['3'].name }}
                        <span
                          v-if="!settings.hideTeacherName && item['3'].teacher"
                        >
                          <br />{{ item['3'].teacher }}
                        </span>
                        <span
                          v-if="item['3'].weekType"
                          class="week-type"
                        >
                          {{ item['3'].weekType }}周
                        </span>
                      </template>
                    </div>
                  </template>

                  <template #[`item.4`]="{ item }">
                    <div v-if="item['4']" class="course-cell">
                      <template v-if="Array.isArray(item['4'])">
                        <div
                          v-for="(course, index) in item['4']"
                          :key="index"
                          class="course-item"
                        >
                          {{ course.name }}
                          <span
                            v-if="!settings.hideTeacherName && course.teacher"
                          >
                            <br />{{ course.teacher }}
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
                        {{ item['4'].name }}
                        <span
                          v-if="!settings.hideTeacherName && item['4'].teacher"
                        >
                          <br />{{ item['4'].teacher }}
                        </span>
                        <span
                          v-if="item['4'].weekType"
                          class="week-type"
                        >
                          {{ item['4'].weekType }}周
                        </span>
                      </template>
                    </div>
                  </template>

                  <template #[`item.5`]="{ item }">
                    <div v-if="item['5']" class="course-cell">
                      <template v-if="Array.isArray(item['5'])">
                        <div
                          v-for="(course, index) in item['5']"
                          :key="index"
                          class="course-item"
                        >
                          {{ course.name }}
                          <span
                            v-if="!settings.hideTeacherName && course.teacher"
                          >
                            <br />{{ course.teacher }}
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
                        {{ item['5'].name }}
                        <span
                          v-if="!settings.hideTeacherName && item['5'].teacher"
                        >
                          <br />{{ item['5'].teacher }}
                        </span>
                        <span
                          v-if="item['5'].weekType"
                          class="week-type"
                        >
                          {{ item['5'].weekType }}周
                        </span>
                      </template>
                    </div>
                  </template>

                  <template #[`item.6`]="{ item }">
                    <div v-if="item['6']" class="course-cell">
                      <template v-if="Array.isArray(item['6'])">
                        <div
                          v-for="(course, index) in item['6']"
                          :key="index"
                          class="course-item"
                        >
                          {{ course.name }}
                          <span
                            v-if="!settings.hideTeacherName && course.teacher"
                          >
                            <br />{{ course.teacher }}
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
                        {{ item['6'].name }}
                        <span
                          v-if="!settings.hideTeacherName && item['6'].teacher"
                        >
                          <br />{{ item['6'].teacher }}
                        </span>
                        <span
                          v-if="item['6'].weekType"
                          class="week-type"
                        >
                          {{ item['6'].weekType }}周
                        </span>
                      </template>
                    </div>
                  </template>

                  <template #[`item.7`]="{ item }">
                    <div v-if="item['7']" class="course-cell">
                      <template v-if="Array.isArray(item['7'])">
                        <div
                          v-for="(course, index) in item['7']"
                          :key="index"
                          class="course-item"
                        >
                          {{ course.name }}
                          <span
                            v-if="!settings.hideTeacherName && course.teacher"
                          >
                            <br />{{ course.teacher }}
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
                        {{ item['7'].name }}
                        <span
                          v-if="!settings.hideTeacherName && item['7'].teacher"
                        >
                          <br />{{ item['7'].teacher }}
                        </span>
                        <span
                          v-if="item['7'].weekType"
                          class="week-type"
                        >
                          {{ item['7'].weekType }}周
                        </span>
                      </template>
                    </div>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-card-text>

          <v-card-actions class="pa-4">
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              :loading="loading"
              :disabled="(!file && !jsonText) || loading"
              @click="processInput"
            >
              处理数据
            </v-btn>
            <v-btn
              color="success"
              :disabled="!processedData"
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
      selectedRows: [], // 存储选中的行
      selectedPeriodIds: [], // 存储选中的节次ID（数字）
      exportPeriods: [], // 存储需要导出的节次列表
      selectedSchedules: {}, // 存储用户选择的课表
      settings: {
        hideIndoorLocation: false,
        hideTeacherName: false,
        totalWeeks: 30
      },
      courseColors: {
        语文: "red",
        数学: "blue",
        英语: "green",
        物理: "purple",
        化学: "orange",
        生物: "teal",
        历史: "brown",
        地理: "indigo",
        政治: "pink",
        体育: "cyan",
        自习: "grey",
        早读: "amber",
        班会: "deep-purple",
        听力: "light-blue",
        答疑: "lime",
        信息技术: "light-green",
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
    };
  },
  methods: {
    handleFileChange() {
      this.error = "";
      this.success = "";
      this.processedData = null;
      this.jsonText = "";
      this.selectedRows = [];
      this.selectedPeriodIds = [];
      this.exportPeriods = [];
      this.selectedSchedules = {};
    },
    handleTextChange() {
      this.error = "";
      this.success = "";
      this.processedData = null;
      this.file = null;
      this.selectedRows = [];
      this.selectedPeriodIds = [];
      this.exportPeriods = [];
      this.selectedSchedules = {};
    },
    async processInput() {
      if (!this.file && !this.jsonText) {
        this.error = "请选择文件或粘贴JSON文本";
        return;
      }

      this.loading = true;
      this.error = "";
      this.success = "";

      try {
        let data;
        if (this.activeTab === "file") {
          const fileContent = await this.file.text();
          // 使用 Function 构造器来执行文件内容
          const processFunction = new Function("return " + fileContent)();
          data = processFunction.default.data;
        } else {
          // 尝试解析JSON文本
          try {
            data = JSON.parse(this.jsonText);
          } catch {
            throw new Error("JSON格式不正确，请检查输入");
          }
        }

        // 为课表生成新的唯一ID
        if (data.schedules) {
          data.schedules = this.assignUniqueIds(data.schedules);
        }

        // 初始化所有课表为未选中状态
        this.selectedSchedules = {};
        if (data.schedules) {
          data.schedules.forEach((schedule) => {
            this.selectedSchedules[schedule.uuid] = false;
          });
        }

        const result = this.processScheduleData(data);
        this.processedData = {
          ...this.processedData,
          tableData: result.tableData,
          schedules: data.schedules,
          processedData: data,
        };
        this.success = "数据处理成功！";
      } catch (err) {
        this.error = "数据处理失败：" + err.message;
        console.error(err);
      } finally {
        this.loading = false;
      }
    },


    downloadCSV() {
      if (!this.processedData?.tableData) {
        this.error = "没有可下载的数据";
        return;
      }

      // 生成CSV内容
      let csvContent = "课程名称,星期,开始节数,结束节数,老师,地点,周数\n";

      // 如果没有选中任何要导出的节次，提示用户
      if (this.exportPeriods.length === 0) {
        this.error = "请至少选择一节要导出的课";
        return;
      }

      // 获取所有需要导出的节次对应的行数据
      const selectedRows = this.processedData.tableData.filter(
        row => this.exportPeriods.includes(row.period)
      );

      // 对选中的行按照节次排序
      selectedRows.sort((a, b) => a.period - b.period);

      // 计算总课时数
      let totalClassHours = 0;

      // 遍历选中的行，并重新编号
      selectedRows.forEach((periodData, newPeriodIndex) => {
        // 新的节次编号（从1开始）
        const newPeriod = newPeriodIndex + 1;

        // 遍历每一天
        for (let day = 1; day <= 7; day++) {
          const courseData = periodData[day];

          // 如果是数组（单双周课程）
          if (Array.isArray(courseData)) {
            courseData.forEach((course) => {
              if (course && course.name) {
                // 增加课时计数（每节课算一课时）
                totalClassHours++;

                // 根据设置处理地点和教师信息
                const location =
                  this.settings.hideIndoorLocation && course.location === "教室"
                    ? ""
                    : course.location || "";

                const teacher = this.settings.hideTeacherName
                  ? ""
                  : course.teacher || "";

                // 处理周数
                const weekRange = course.weekType
                  ? `1-${this.settings.totalWeeks}${course.weekType}`
                  : `1-${this.settings.totalWeeks}`;

                // 每节课单独导出，开始节数和结束节数相同
                csvContent += `${course.name},${day},${periodData.period},${periodData.period},${teacher},${location},${weekRange}\n`;
              }
            });
          }
          // 单个课程
          else if (courseData && courseData.name) {
            // 增加课时计数（每节课算一课时）
            totalClassHours++;

            // 根据设置处理地点和教师信息
            const location =
              this.settings.hideIndoorLocation && courseData.location === "教室"
                ? ""
                : courseData.location || "";

            const teacher = this.settings.hideTeacherName
              ? ""
              : courseData.teacher || "";

            // 处理周数
            const weekRange = courseData.weekType
              ? `1-${this.settings.totalWeeks}${courseData.weekType}`
              : `1-${this.settings.totalWeeks}`;

            // 每节课单独导出，开始节数和结束节数相同
            csvContent += `${courseData.name},${day},${periodData.period},${periodData.period},${teacher},${location},${weekRange}\n`;
          }
        }
      });

      // 添加BOM头以确保Excel正确识别UTF-8编码
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `course_schedule_${totalClassHours}课时.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      // 显示成功信息，包含课时数
      this.success = `导出成功！共计 ${totalClassHours} 课时`;
    },
    getCourseColor(courseName) {
      return this.courseColors[courseName] || "grey";
    },
    updateProcessedData() {
      if (!this.processedData) return;
      const data = this.processedData.processedData;
      const result = this.processScheduleData(data);
      this.processedData = {
        ...this.processedData,
        tableData: result.tableData,
      };
    },
    updateSelectedPeriods(selected) {
      // 更新selectedPeriodIds数组，与selectedRows保持同步
      this.selectedPeriodIds = [];
      if (selected && selected.length > 0) {
        // 提取所有选中行的period值并去重
        this.selectedPeriodIds = [...new Set(
          selected
            .filter(row => row && typeof row.period === 'number')
            .map(row => row.period)
        )];
      }

      // 同时更新exportPeriods列表
      this.exportPeriods = [...this.selectedPeriodIds];
    },

    // 切换节次是否导出
    toggleExportPeriod(period) {
      const index = this.exportPeriods.indexOf(period);
      if (index === -1) {
        this.exportPeriods.push(period);
      } else {
        this.exportPeriods.splice(index, 1);
      }
    },

    // 检查节次是否需要导出
    isExportPeriod(period) {
      return this.exportPeriods.includes(period);
    },
    processScheduleData(data) {
      // 检测新旧数据格式
      if (data.schedules && Array.isArray(data.schedules)) {
        return this.processNewFormatData(data);
      } else if (data.Subjects && data.TimeLayouts) {
        return this.processOldFormatData(data);
      } else {
        throw new Error("数据格式不正确");
      }
    },

    // 处理新格式数据
    processNewFormatData(data) {
      const { schedules, subjects } = data;
      const tableData = [];

      // 获取最大节次数
      let maxPeriods = 12; // 默认值
      schedules.forEach((schedule) => {
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

      // 默认选中所有行
      this.selectedRows = [...tableData];
      // 更新选中的节次ID
      this.selectedPeriodIds = tableData.map(row => row.period);
      // 默认所有节次都导出
      this.exportPeriods = [...this.selectedPeriodIds];

      // 仅处理用户选择的课表
      const selectedSchedules = schedules.filter(
        (schedule) => this.selectedSchedules[schedule.uuid] === true
      );

      // 如果没有选中任何课表，直接返回空表格
      if (selectedSchedules.length === 0) {
        return {
          tableData,
          processedData: data,
        };
      }

      // 处理每张课表
      selectedSchedules.forEach((schedule) => {
        // 获取星期
        const weekday = String(schedule.enable_day);
        if (!weekday || weekday < 1 || weekday > 7) return;

        // 获取单双周信息
        let weekType = "";
        if (schedule.weeks === "odd") {
          weekType = "单";
        } else if (schedule.weeks === "even") {
          weekType = "双";
        }

        // 处理课程
        schedule.classes.forEach((classInfo, index) => {
          if (!classInfo.subject) return;

          const period = index + 1;
          if (period > maxPeriods) return;

          // 查找科目信息
          let teacher = "";
          if (subjects && Array.isArray(subjects)) {
            const subjectInfo = subjects.find(
              (s) => s.name === classInfo.subject
            );
            if (subjectInfo) {
              teacher = subjectInfo.teacher || "";
            }
          }

          const courseInfo = {
            name: classInfo.subject,
            teacher: teacher,
            location: "", // 新格式没有提供地点信息
            period: period,
            startTime: classInfo.start_time,
            endTime: classInfo.end_time,
            weekday: schedule.name,
            weekType: weekType,
          };

          // 将课程信息存储到对应的节次和星期
          const existing = tableData[period - 1][weekday];

          // 处理课程放置逻辑
          if (!existing) {
            // 位置为空，直接添加
            tableData[period - 1][weekday] = courseInfo;
          } else if (
            weekType &&
            existing.weekType &&
            weekType !== existing.weekType
          ) {
            // 如果是不同的单/双周类型，创建数组存储
            if (!Array.isArray(tableData[period - 1][weekday])) {
              tableData[period - 1][weekday] = [existing];
            }
            tableData[period - 1][weekday].push(courseInfo);
          }
          // 其他情况下（相同周类型或无周类型），直接覆盖
          // 这应该不会发生，因为在选择过程中已经处理了冲突
        });
      });

      return {
        tableData,
        processedData: data,
      };
    },

    // 处理旧格式数据（保持兼容性）
    processOldFormatData(data) {
      if (!data || !data.Subjects || !data.TimeLayouts) {
        throw new Error("数据格式不正确");
      }

      const subjects = data.Subjects;
      const timeLayouts = data.TimeLayouts;
      const classPlans = data.ClassPlans || {};
      const tableData = [];

      // 确定最大节次数
      let maxPeriods = 100; // 默认最大值
      for (const layoutId in timeLayouts) {
        const layout = timeLayouts[layoutId];
        let periodCount = 0;
        layout.Layouts.forEach((timeSlot) => {
          if (timeSlot.TimeType === 0) {
            periodCount++;
          }
        });
        maxPeriods = Math.max(maxPeriods, periodCount);
      }

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

      // 默认选中所有行
      this.selectedRows = [...tableData];
      // 更新选中的节次ID
      this.selectedPeriodIds = tableData.map(row => row.period);
      // 默认所有节次都导出
      this.exportPeriods = [...this.selectedPeriodIds];

      // 映射每个TimeLayout到对应的ClassPlan
      const layoutToClassPlan = {};
      for (const planId in classPlans) {
        const plan = classPlans[planId];
        if (plan.TimeLayoutId) {
          layoutToClassPlan[plan.TimeLayoutId] = plan;
        }
      }

      // 处理每个时间布局
      for (const layoutId in timeLayouts) {
        const layout = timeLayouts[layoutId];
        let layoutName = layout.Name;
        let weekType = "";
        let weekday = "";

        // 获取对应的ClassPlan
        const classPlan = layoutToClassPlan[layoutId];

        // 处理单双周的情况
        if (layoutName.startsWith("Odd_")) {
          weekType = "单";
          layoutName = layoutName.replace("Odd_", "");
        } else if (layoutName.startsWith("Even_")) {
          weekType = "双";
          layoutName = layoutName.replace("Even_", "");
        }

        // 如果有ClassPlan，从TimeRule获取详细信息
        if (classPlan && classPlan.TimeRule) {
          // 周几 (0-6 代表周日到周六)
          const weekDay = classPlan.TimeRule.WeekDay;
          weekday = weekDay === 0 ? "7" : String(weekDay);

          // 更精确的单双周信息
          if (
            classPlan.TimeRule.WeekCountDiv &&
            classPlan.TimeRule.WeekCountDivTotal
          ) {
            if (
              classPlan.TimeRule.WeekCountDiv === 1 &&
              classPlan.TimeRule.WeekCountDivTotal === 2
            ) {
              weekType = "单";
            } else if (
              classPlan.TimeRule.WeekCountDiv === 2 &&
              classPlan.TimeRule.WeekCountDivTotal === 2
            ) {
              weekType = "双";
            }
          }
        } else {
          // 没有ClassPlan，使用Name中的信息
          weekday = this.weekdayMap[layoutName];
          if (!weekday) continue; // 跳过无法识别的星期
        }

        let currentPeriod = 0;

        layout.Layouts.forEach((timeSlot) => {
          const classId = timeSlot.DefaultClassId;
          if (subjects[classId] && timeSlot.TimeType === 0) {
            const subject = subjects[classId];
            currentPeriod++;

            const courseInfo = {
              name: subject.Name,
              teacher: subject.TeacherName || "",
              location: subject.IsOutDoor ? "户外" : "教室",
              period: currentPeriod,
              startTime: timeSlot.StartSecond.substr(11, 5),
              endTime: timeSlot.EndSecond.substr(11, 5),
              weekday: layoutName,
              weekType: weekType,
            };

            // 将课程信息存储到对应的节次和星期
            // 对于单双周的处理：如果同一位置已经有课程，并且是另一类型的单双周，则保留两者
            if (currentPeriod <= maxPeriods && weekday) {
              const existing = tableData[currentPeriod - 1][weekday];

              // 如果位置为空，直接添加
              if (!existing) {
                tableData[currentPeriod - 1][weekday] = courseInfo;
              }
              // 如果已存在课程且当前处理的是单双周课程
              else if (weekType) {
                // 如果现有课程是另一种单双周课程，或不是单双周课程
                if (existing.weekType !== weekType) {
                  // 创建组合课程数组
                  if (!Array.isArray(tableData[currentPeriod - 1][weekday])) {
                    tableData[currentPeriod - 1][weekday] = [existing];
                  }
                  tableData[currentPeriod - 1][weekday].push(courseInfo);
                }
                // 如果是相同的单双周类型，可能是重复，不处理
              }
              // 如果当前不是单双周课程，但已存在课程
              else {
                // 普通课程优先级更高，替换现有的
                tableData[currentPeriod - 1][weekday] = courseInfo;
              }
            }
          }
        });
      }

      return {
        tableData,
        processedData: data, // 保存原始数据以供后续使用
      };
    },
    getCourseByDayAndPeriod(day, period) {
      if (!this.processedData?.periodCourses) return null;
      return this.processedData.periodCourses[period]?.[day] || null;
    },
    toggleScheduleSelection(schedule) {
      if (!schedule || !schedule.uuid) return;

      // 获取当前课表的选中状态
      const isCurrentlySelected = !!this.selectedSchedules[schedule.uuid];

      // 创建新的选中状态对象
      const newSelectedSchedules = { ...this.selectedSchedules };

      // 如果当前课表已选中，则取消选中
      if (isCurrentlySelected) {
        newSelectedSchedules[schedule.uuid] = false;
        this.selectedSchedules = newSelectedSchedules;
        this.updateProcessedData();
        return;
      }

      // 当前操作是选中课表，获取课表相关信息
      const day = schedule.enable_day;
      const weekType = schedule.weeks; // "odd", "even", "all" 或其他

      // 检测冲突，仅处理同一天的课表冲突
      if (this.processedData?.schedules) {
        this.processedData.schedules.forEach((otherSchedule) => {
          // 跳过当前课表
          if (otherSchedule.uuid === schedule.uuid) return;

          // 如果不在同一天，跳过
          if (otherSchedule.enable_day !== day) return;

          const otherWeekType = otherSchedule.weeks;

          // 冲突处理逻辑：
          // - 单周与双周不冲突
          // - 相同类型课程冲突
          // - "all" 会与任何类型冲突
          let hasConflict = false;

          if (weekType === "odd" && otherWeekType === "even") {
            hasConflict = false;
          } else if (weekType === "even" && otherWeekType === "odd") {
            hasConflict = false;
          } else if (weekType === "all" || otherWeekType === "all") {
            hasConflict = true;
          } else if (weekType === otherWeekType) {
            hasConflict = true;
          }

          // 如果有冲突且其他课表当前被选中，则取消选中
          if (hasConflict && newSelectedSchedules[otherSchedule.uuid]) {
            newSelectedSchedules[otherSchedule.uuid] = false;
          }
        });
      }

      // 选中当前课表
      newSelectedSchedules[schedule.uuid] = true;

      // 更新选中状态
      this.selectedSchedules = newSelectedSchedules;

      // 更新处理数据
      this.updateProcessedData();
    },

    // 生成唯一ID的方法
    assignUniqueIds(schedules) {
      if (!schedules || !Array.isArray(schedules)) return schedules;

      // 按天和周类型分组
      const groupedSchedules = {};

      schedules.forEach(schedule => {
        const day = schedule.enable_day;
        const weekType = schedule.weeks || 'all';
        const key = `${day}_${weekType}`;

        if (!groupedSchedules[key]) {
          groupedSchedules[key] = [];
        }

        groupedSchedules[key].push(schedule);
      });

      // 为每个组内的课表分配新ID
      const newSchedules = [];

      Object.values(groupedSchedules).forEach(group => {
        group.forEach((schedule, index) => {
          // 创建带有新ID的课表副本
          const newSchedule = { ...schedule };
          // 生成新的UUID: 原始ID + 日期 + 周类型 + 索引
          const day = schedule.enable_day;
          const weekType = schedule.weeks || 'all';
          newSchedule.uuid = `schedule_${day}_${weekType}_${index}_${Date.now()}`;
          newSchedules.push(newSchedule);
        });
      });

      return newSchedules;
    },
  },
  computed: {
    weekdayMap() {
      return {
        周一: "1",
        周二: "2",
        周三: "3",
        周四: "4",
        周五: "5",
        周六: "6",
        周日: "7",
        Monday: "1",
        Tuesday: "2",
        Wednesday: "3",
        Thursday: "4",
        Friday: "5",
        Saturday: "6",
        Sunday: "7",
      };
    },
    maxPeriods() {
      if (!this.processedData) return [];
      let max = 0;
      for (const day in this.processedData.statistics) {
        const courses = this.processedData.statistics[day].courses;
        if (courses.length > 0) {
          max = Math.max(max, ...courses.map((c) => c.period));
        }
      }
      return Array.from({ length: max }, (_, i) => i + 1);
    },
  },
};
</script>

<style scoped>
.course-cell {
  padding: 4px;
  text-align: center;
  min-height: 60px;
  position: relative;
}

.course-item {
  padding: 4px 0;
  border-bottom: 1px dashed #eee;
}

.course-item:last-child {
  border-bottom: none;
}

.week-type {
  display: inline-block;
  font-size: 0.8em;
  color: #666;
  margin-top: 4px;
  padding: 1px 4px;
  border-radius: 2px;
  background-color: #f5f5f5;
}
</style>
