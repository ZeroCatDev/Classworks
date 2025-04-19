<template>
  <v-container class="fill-height"
    >{{ processedData }}
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
                  :headers="tableHeaders"
                  :items="processedData.tableData"
                  hide-default-footer
                  class="elevation-1"
                  :items-per-page="-1"
                >
                  <template #[`item.period`]="{ item }">
                    <v-checkbox
                      v-model="selectedPeriods[item.period]"
                      hide-details
                      dense
                      @change="updateProcessedData"
                    ></v-checkbox>
                  </template>

                  <template #[`item.1`]="{ item }">
                    <div v-if="item[1]" class="course-cell">
                      {{ item[1].name }}
                      <br />
                      {{ item[1].teacher }}
                    </div>
                  </template>

                  <template #[`item.2`]="{ item }">
                    <div v-if="item[2]" class="course-cell">
                      {{ item[2].name }}
                      <br />
                      {{ item[2].teacher }}
                    </div>
                  </template>

                  <template #[`item.3`]="{ item }">
                    <div v-if="item[3]" class="course-cell">
                      {{ item[3].name }}
                      <br />
                      {{ item[3].teacher }}
                    </div>
                  </template>

                  <template #[`item.4`]="{ item }">
                    <div v-if="item[4]" class="course-cell">
                      {{ item[4].name }}
                      <br />
                      {{ item[4].teacher }}
                    </div>
                  </template>

                  <template #[`item.5`]="{ item }">
                    <div v-if="item[5]" class="course-cell">
                      {{ item[5].name }}
                      <br />
                      {{ item[5].teacher }}
                    </div>
                  </template>

                  <template #[`item.6`]="{ item }">
                    <div v-if="item[6]" class="course-cell">
                      {{ item[6].name }}
                      <br />
                      {{ item[6].teacher }}
                    </div>
                  </template>

                  <template #[`item.7`]="{ item }">
                    <div v-if="item[7]" class="course-cell">
                      {{ item[7].name }}
                      <br />
                      {{ item[7].teacher }}
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
      selectedPeriods: {},
      settings: {
        hideIndoorLocation: false,
        hideTeacherName: false,
        totalWeeks: 30,
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
      },
      availableSubjects: [
        "语文",
        "数学",
        "英语",
        "物理",
        "化学",
        "生物",
        "历史",
        "地理",
        "政治",
        "体育",
        "自习",
        "早读",
        "班会",
        "听力",
        "答疑",
      ],
      tableHeaders: [
        { title: "选择", value: "period" },
        { title: "周一", value: "1" },
        { title: "周二", value: "2" },
        { title: "周三", value: "3" },
        { title: "周四", value: "4" },
        { title: "周五", value: "5" },
        { title: "周六", value: "6" },
        { title: "周日", value: "7" },
      ],
    };
  },
  methods: {
    handleFileChange() {
      this.error = "";
      this.success = "";
      this.processedData = null;
      this.jsonText = "";
      this.selectedPeriods = {};
    },
    handleTextChange() {
      this.error = "";
      this.success = "";
      this.processedData = null;
      this.file = null;
      this.selectedPeriods = {};
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

        const result = this.processScheduleData(data);
        this.processedData = {
          ...this.processedData,
          tableData: result.tableData,
          csvContent: result.csvContent,
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

      // 获取所有选中的节次
      const selectedPeriods = Object.entries(this.selectedPeriods)
        .filter(([, selected]) => selected)
        .map(([period]) => parseInt(period))
        .sort((a, b) => a - b);

      // 计算实际的节次序号
      let actualPeriod = 1;
      const periodMapping = {};

      // 遍历选中的节次
      selectedPeriods.forEach((period) => {
        const periodData = this.processedData.tableData[period - 1];
        if (!periodData) return;

        // 检查这个节次是否有任何课程
        const hasCourses = Object.values(periodData).some(
          (value) => value && typeof value === "object" && value.name
        );

        if (hasCourses) {
          periodMapping[period] = actualPeriod++;
        }
      });

      // 生成CSV内容
      selectedPeriods.forEach((period) => {
        const periodData = this.processedData.tableData[period - 1];
        if (!periodData) return;

        Object.entries(periodData).forEach(([, course]) => {
          if (course && course.name) {
            // 根据设置处理地点和教师信息
            const location =
              this.settings.hideIndoorLocation && course.location === "教室"
                ? ""
                : course.location || "";

            const teacher = this.settings.hideTeacherName
              ? ""
              : course.teacher || "";

            const courseData = {
              name: course.name || "",
              weekday: this.weekdayMap[course.weekday] || "",
              period: periodMapping[period] || period,
              teacher: teacher,
              location: location,
              weeks: `1-${this.settings.totalWeeks}`,
            };

            csvContent += `${courseData.name},${courseData.weekday},${courseData.period},${courseData.period},${courseData.teacher},${courseData.location},${courseData.weeks}\n`;
          }
        });
      });

      // 添加BOM头以确保Excel正确识别UTF-8编码
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "course_schedule.csv";
      link.click();
      URL.revokeObjectURL(link.href);
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
        csvContent: result.csvContent,
      };
    },
    processScheduleData(data) {
      if (!data || !data.Subjects || !data.TimeLayouts) {
        throw new Error("数据格式不正确");
      }

      const subjects = data.Subjects;
      const timeLayouts = data.TimeLayouts;
      const tableData = [];

      // 初始化12节课的数据结构
      for (let i = 1; i <= 12; i++) {
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
        this.selectedPeriods[i] = true;
      }

      // 处理每个时间布局
      for (const layoutId in timeLayouts) {
        const layout = timeLayouts[layoutId];
        const weekday = this.weekdayMap[layout.Name];
        let currentPeriod = 0;

        layout.Layouts.forEach((timeSlot) => {
          const classId = timeSlot.DefaultClassId;
          if (subjects[classId] && timeSlot.TimeType === 0) {
            const subject = subjects[classId];
            currentPeriod++;

            const courseInfo = {
              name: subject.Name,
              teacher: subject.TeacherName || "", // 改为空字符串
              location: subject.IsOutDoor ? "户外" : "教室",
              period: currentPeriod,
              startTime: timeSlot.StartSecond.substr(11, 5),
              endTime: timeSlot.EndSecond.substr(11, 5),
              weekday: layout.Name,
            };

            // 将课程信息存储到对应的节次和星期
            if (currentPeriod <= 12 && weekday) {
              tableData[currentPeriod - 1][weekday] = courseInfo;
            }
          }
        });
      }

      // 生成CSV内容
      let csvContent = "课程名称,星期,开始节数,结束节数,老师,地点,周数\n";
      tableData.forEach((periodData, index) => {
        if (this.selectedPeriods[index + 1]) {
          Object.entries(periodData).forEach(([, course]) => {
            if (course) {
              csvContent += `${course.name},${
                this.weekdayMap[course.weekday]
              },${course.period},${course.period},${course.teacher},${
                course.location
              },1-16\n`;
            }
          });
        }
      });

      return {
        tableData,
        csvContent,
      };
    },
    getCourseByDayAndPeriod(day, period) {
      if (!this.processedData?.periodCourses) return null;
      return this.processedData.periodCourses[period]?.[day] || null;
    },
    togglePeriodSelection(period, day) {
      if (!this.selectedPeriods[period]) {
        this.selectedPeriods[period] = {};
      }
      this.selectedPeriods[period][day] = !this.selectedPeriods[period][day];
      this.updateProcessedData();
    },
    isPeriodSelected(period, day) {
      return this.selectedPeriods[period]?.[day] || false;
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
