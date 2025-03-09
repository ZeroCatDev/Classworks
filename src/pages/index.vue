<template>
  <v-app-bar class="no-select">
    <template #prepend>
      <v-app-bar-nav-icon icon="mdi-home" />
    </template>

    <v-app-bar-title>
      {{ state.classNumber }}班 - {{ titleText }}
    </v-app-bar-title>

    <v-spacer />

    <template #append>
      <v-btn
        icon="mdi-format-font-size-decrease"
        variant="text"
        @click="zoom('out')"
      />
      <v-btn
        icon="mdi-format-font-size-increase"
        variant="text"
        @click="zoom('up')"
      />
      <v-menu v-model="state.datePickerDialog" :close-on-content-click="false">
        <template #activator="{ props }">
          <v-btn icon="mdi-calendar" variant="text" v-bind="props" />
        </template>

        <v-date-picker
          v-model="state.selectedDate"
          color="primary"
          @update:model-value="handleDateSelect"
        />
      </v-menu>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        :loading="loading.download"
        @click="downloadData"
      />
      <v-btn icon="mdi-cog" variant="text" @click="$router.push('/settings')" />
      <v-btn
        icon="mdi-bell"
        variant="text"
        :badge="unreadCount || undefined"
        :badge-color="unreadCount ? 'error' : undefined"
        @click="$refs.messageLog.drawer = true"
      />
    </template>
  </v-app-bar>
  <div class="d-flex">
    <!-- 主要内容区域 -->
    <v-container class="main-window flex-grow-1 no-select" fluid>
      <!-- 有内容的科目卡片 -->
      <div ref="gridContainer" class="grid-masonry">
        <TransitionGroup name="grid">
          <div
            v-for="item in sortedItems"
            :key="item.key"
            class="grid-item"
            :style="{
              'grid-row-end': `span ${item.rowSpan}`,
              order: item.order,
            }"
          >
            <v-card
              border
              height="100%"
              class="glow-track"
              @click="!isEditingDisabled && openDialog(item.key)"
              @mousemove="handleMouseMove"
              @touchmove="handleTouchMove"
            >
              <v-card-title>{{ item.name }}</v-card-title>
              <v-card-text :style="state.contentStyle">
                <v-list>
                  <v-list-item
                    v-for="text in splitPoint(item.content)"
                    :key="text"
                  >
                    {{ text }}
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </div>
        </TransitionGroup>
      </div>

      <!-- 单独显示空科目 -->
      <div class="empty-subjects mt-4">
        <template v-if="emptySubjectDisplay === 'button'">
          <v-btn-group divided variant="outlined">
            <v-btn
              v-for="subject in unusedSubjects"
              :key="subject.key"
              :disabled="isEditingDisabled"
              @click="openDialog(subject.key)"
            >
              <v-icon start> mdi-plus </v-icon>
              {{ subject.name }}
            </v-btn>
          </v-btn-group>
        </template>
        <div v-else class="empty-subjects-grid">
          <TransitionGroup name="v-list">
            <v-card
              v-for="subject in unusedSubjects"
              :key="subject.key"
              border
              class="empty-subject-card"
              :disabled="isEditingDisabled"
              @click="openDialog(subject.key)"
            >
              <v-card-title class="text-subtitle-1">
                {{ subject.name }}
              </v-card-title>
              <v-card-text class="text-center">
                <v-icon size="small" color="grey"> mdi-plus </v-icon>
                <div class="text-caption text-grey">点击添加作业</div>
              </v-card-text>
            </v-card>
          </TransitionGroup>
        </div>
      </div>
    </v-container>

    <!-- 出勤统计区域 -->
    <v-col
      v-if="state.studentList && state.studentList.length"
      class="attendance-area no-select"
      cols="1"
      @click="setAttendanceArea()"
    >
      <h1>出勤</h1>
      <h2>应到: {{ state.studentList.length - state.excludeSet.size }}人</h2>
      <h2>
        实到:
        {{
          state.studentList.length -
          state.selectedSet.size -
          state.lateSet.size -
          state.excludeSet.size
        }}人
      </h2>
      <h2>请假: {{ state.selectedSet.size }}人</h2>
      <h3 v-for="(i, index) in state.selectedSet" :key="'absent-' + index">
        {{ `${index + 1}. ${state.studentList[i]}` }}
      </h3>
      <h2>迟到: {{ state.lateSet.size }}人</h2>
      <h3 v-for="(i, index) in state.lateSet" :key="'late-' + index">
        {{ `${index + 1}. ${state.studentList[i]}` }}
      </h3>
      <h2>不参与: {{ state.excludeSet.size }}人</h2>
      <h3 v-for="(i, index) in state.excludeSet" :key="'exclude-' + index">
        {{ `${index + 1}. ${state.studentList[i]}` }}
      </h3>
    </v-col>
  </div>
  <v-container fluid>
    <v-btn
      v-if="!state.synced"
      color="error"
      size="large"
      :loading="loading.upload"
      class="ml-2"
      @click="uploadData"
    >
      上传
    </v-btn>
    <v-btn v-else color="success" size="large" @click="showSyncMessage">
      同步完成 </v-btn
    ><v-btn
      v-if="showRandomButton"
      color="yellow"
      prepend-icon="mdi-account-question"
      append-icon="mdi-dice-multiple"
      size="large"
      class="ml-2"
      href="classisland://plugins/IslandCaller/Run"
    >
      随机点名
    </v-btn>
  </v-container>
  <v-dialog
    v-model="state.dialogVisible"
    width="500"
    @click:outside="handleClose"
  >
    <v-card border>
      <v-card-title>{{ state.dialogTitle }}</v-card-title>
      <v-card-subtitle>
        {{ autoSave ? "喵？喵呜！" : "写完后点击上传谢谢喵" }}
      </v-card-subtitle>
      <v-card-text>
        <v-textarea
          ref="inputRef"
          v-model="state.textarea"
          auto-grow
          placeholder="使用换行表示分条"
          rows="5"
        />
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="state.snackbar" :timeout="2000">
    {{ state.snackbarText }}
  </v-snackbar>

  <v-dialog v-model="state.attendanceDialog" max-width="600">
    <v-card>
      <v-card-title class="text-h6"> 编辑出勤状态 </v-card-title>

      <v-card-text>
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title> 批量操作 </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-btn-group>
                <v-btn
                  color="success"
                  prepend-icon="mdi-account-check"
                  @click="setAllPresent"
                >
                  全部到齐
                </v-btn>
                <v-btn
                  color="error"
                  prepend-icon="mdi-account-off"
                  @click="setAllAbsent"
                >
                  全部请假
                </v-btn>
                <v-btn
                  color="warning"
                  prepend-icon="mdi-clock-alert"
                  @click="setAllLate"
                >
                  全部迟到
                </v-btn>
              </v-btn-group>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-list class="mt-4">
          <v-list-subheader>学生列表</v-list-subheader>
          <v-list-item
            v-for="(student, index) in state.studentList"
            :key="index"
            :title="student"
          >
            <template #append>
              <v-btn-group>
                <v-btn
                  :color="isPresent(index) ? 'success' : ''"
                  icon="mdi-account-check"
                  size="small"
                  @click="setPresent(index)"
                />
                <v-btn
                  :color="isAbsent(index) ? 'error' : ''"
                  icon="mdi-account-off"
                  size="small"
                  @click="setAbsent(index)"
                />
                <v-btn
                  :color="isLate(index) ? 'warning' : ''"
                  icon="mdi-clock-alert"
                  size="small"
                  @click="setLate(index)"
                />
                <v-btn
                  :color="isExclude(index) ? 'grey' : ''"
                  icon="mdi-account-cancel"
                  size="small"
                  @click="setExclude(index)"
                />
              </v-btn-group>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="saveAttendance"> 保存 </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <message-log ref="messageLog" />
</template>

<script>
import MessageLog from "@/components/MessageLog.vue";
import dataProvider from "@/utils/dataProvider";
import { getSetting, watchSettings, setSetting } from "@/utils/settings";
import { useDisplay } from "vuetify";
import "../styles/index.scss";
import "../styles/transitions.scss";  // 添加新的样式导入
import { debounce, throttle } from "@/utils/debounce";

export default {
  name: "HomeworkBoard",
  components: {
    MessageLog,
  },
  data() {
    return {
      dataKey: "",
      provider: "",
      state: {
        classNumber: "",
        studentList: [],
        selectedSet: new Set(),
        lateSet: new Set(),
        excludeSet: new Set(), // 新增不参与集合
        dialogVisible: false,
        dialogTitle: "",
        textarea: "",
        dateString: "", // 从 state 内统一管理日期
        synced: false,
        attendDialogVisible: false,
        contentStyle: { "font-size": `${getSetting("font.size")}px` },
        uploadLoading: false,
        downloadLoading: false,
        homeworkData: {},
        snackbar: false,
        snackbarText: "",
        fontSize: getSetting("font.size"),
        datePickerDialog: false,
        selectedDate: null,
        refreshInterval: null,
        subjectOrder: [
          "语文",
          "数学",
          "英语",
          "物理",
          "化学",
          "生物",
          "政治",
          "历史",
          "地理",
          "其他",
        ],
        showNoDataMessage: false,
        noDataMessage: "",
        isToday: false,
        attendanceDialog: false,
        availableSubjects: [
          { key: "语文", name: "语文" },
          { key: "数学", name: "数学" },
          { key: "英语", name: "英语" },
          { key: "物理", name: "物理" },
          { key: "化学", name: "化学" },
          { key: "生物", name: "生物" },
          { key: "政治", name: "政治" },
          { key: "历史", name: "历史" },
          { key: "地理", name: "地理" },
          { key: "其他", name: "其他" },
        ],
      },
      loading: {
        download: false,
        upload: false,
        students: false,
      },
      debouncedUpload: null,
      throttledReflow: null,
      sortedItemsCache: {
        key: "",
        value: [],
      },
    };
  },

  computed: {
    isMobile() {
      return useDisplay().mobile.value;
    },
    titleText() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const today = `${year}-${month}-${day}`;

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = `${yesterday.getFullYear()}-${String(
        yesterday.getMonth() + 1
      ).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

      if (this.state.dateString === today) {
        return "今天的作业";
      } else if (this.state.dateString === yesterdayFormatted) {
        return "昨天的作业";
      } else {
        return `${this.state.dateString}的作业`;
      }
    },
    sortedItems() {
      const key = `${JSON.stringify(
        this.state.homeworkData
      )}_${this.state.subjectOrder.join()}_${this.dynamicSort}`;
      if (this.sortedItemsCache.key === key) {
        return this.sortedItemsCache.value;
      }

      const items = Object.entries(this.state.homeworkData)
        .filter(([, value]) => value.content?.trim())
        .map(([key, value]) => ({
          key,
          name: value.name,
          content: value.content,
          order: this.state.subjectOrder.indexOf(key),
          rowSpan: Math.ceil(
            (value.content.split("\n").filter((line) => line.trim()).length +
              1) *
              0.8
          ),
        }));

      const result = this.dynamicSort
        ? this.optimizeGridLayout(items)
        : items.sort((a, b) => a.order - b.order);

      // 使用方法更新缓存
      this.updateSortedItemsCache(key, result);

      return result;
    },
    unusedSubjects() {
      const usedKeys = Object.keys(this.state.homeworkData);
      return this.state.availableSubjects.filter(
        (subject) => !usedKeys.includes(subject.key)
      );
    },
    emptySubjects() {
      if (this.emptySubjectDisplay !== "button") return [];
      return this.unusedSubjects;
    },
    autoSave() {
      return getSetting("edit.autoSave");
    },
    refreshBeforeEdit() {
      return getSetting("edit.refreshBeforeEdit");
    },
    emptySubjectDisplay() {
      return getSetting("display.emptySubjectDisplay");
    },
    dynamicSort() {
      return getSetting("display.dynamicSort");
    },
    isEditingDisabled() {
      return this.state.uploadLoading || this.state.downloadLoading;
    },
    unreadCount() {
      return this.$refs.messageLog?.unreadCount || 0;
    },
    showRandomButton() {
      return getSetting("display.showRandomButton");
    },
  },

  watch: {
    homeworkData: {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.waterfall) {
            this.$refs.waterfall.reflow();
          }
        });
      },
      deep: true,
    },
    "$vuetify.display.width": {
      handler() {
        this.throttledReflow();
      },
    },
  },

  created() {
    // 创建防抖的上传函数
    this.debouncedUpload = debounce(this.uploadData, 2000);
    // 创建节流的重排函数
    this.throttledReflow = throttle(() => {
      if (this.$refs.gridContainer) {
        this.optimizeGridLayout(this.sortedItems);
      }
    }, 200);
  },

  async mounted() {
    try {
      this.updateBackendUrl();
      await this.initializeData();
      this.setupAutoRefresh();
      this.unwatchSettings = watchSettings(() => {
        this.updateSettings();
      });
    } catch (err) {
      console.error("初始化失败:", err);
      this.showError("初始化失败，请刷新页面重试");
    }
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }
    if (this.state.refreshInterval) {
      // 注意刷新间隔存放在 state 内
      clearInterval(this.state.refreshInterval);
    }
  },

  methods: {
    async initializeData() {
      this.provider = getSetting("server.provider");
      const domain = getSetting("server.domain");
      const classNum = getSetting("server.classNumber");

      this.dataKey =
        this.provider === "server" ? `${domain}/${classNum}` : classNum;
      this.state.classNumber = classNum;

      // 从 URL 获取日期，如果没有则使用今天的日期
      const urlParams = new URLSearchParams(window.location.search);
      const dateFromUrl = urlParams.get("date");
      const today = new Date().toISOString().split("T")[0];

      this.state.dateString = dateFromUrl || today;
      this.state.isToday = this.state.dateString === today;

      await Promise.all([this.downloadData(), this.loadConfig()]);
    },

    async downloadData() {
      if (this.loading.download) return;

      try {
        this.loading.download = true;
        const response = await dataProvider.loadData(
          this.provider,
          this.dataKey,
          this.state.dateString
        );

        if (!response.success) {
          // 处理错误情况
          if (response.error.code === "NOT_FOUND") {
            this.state.showNoDataMessage = true;
            this.state.noDataMessage = response.error.message;
            this.state.homeworkData = {};
            this.state.selectedSet = new Set();
            this.state.lateSet = new Set();
            this.state.excludeSet = new Set(); // 添加不参与状态
          } else {
            throw new Error(response.error.message);
          }
        } else {
          // 处理成功情况
          const { homework = {}, attendance = {} } = response.data;
          this.state.homeworkData = homework;
          this.state.selectedSet = new Set(attendance.absent || []);
          this.state.lateSet = new Set(attendance.late || []);
          this.state.excludeSet = new Set(attendance.exclude || []); // 添加不参与状态
          this.state.synced = true;
          this.state.showNoDataMessage = false;
          this.showMessage("下载成功", "数据已更新");
        }
      } catch (error) {
        this.showError("下载失败", error.message);
      } finally {
        this.loading.download = false;
      }
    },

    async uploadData() {
      if (this.loading.upload) return;

      try {
        this.loading.upload = true;
        const response = await dataProvider.saveData(
          this.provider,
          this.dataKey,
          {
            homework: this.state.homeworkData,
            attendance: {
              absent: Array.from(this.state.selectedSet),
              late: Array.from(this.state.lateSet),
              exclude: Array.from(this.state.excludeSet), // 添加不参与状态
            },
          },
          this.state.dateString
        );

        if (!response.success) {
          throw new Error(response.error.message);
        }

        this.state.synced = true;
        this.showMessage(response.message || "保存成功");
      } catch (error) {
        console.error("保存失败:", error);
        this.showError("保存失败", error.message || "请重试");
      } finally {
        this.loading.upload = false;
      }
    },

    async loadConfig() {
      try {
        const response = await dataProvider.loadConfig(
          this.provider,
          this.dataKey
        );

        if (!response.success) {
          throw new Error(response.error.message);
        }

        this.state.studentList = response.data.studentList || [];
      } catch (error) {
        console.error("加载配置失败:", error);
        this.showError("加载配置失败", error.message);
      }
    },

    handleClose() {
      if (!this.currentEditSubject) return;

      const content = this.state.textarea.trim();
      if (content) {
        this.state.homeworkData[this.currentEditSubject] = {
          name: this.state.availableSubjects.find(
            (s) => s.key === this.currentEditSubject
          )?.name,
          content,
        };
        this.state.synced = false;
        if (this.autoSave) {
          // 直接调用上传，移除防抖
          this.uploadData();
        }
      } else {
        delete this.state.homeworkData[this.currentEditSubject];
      }
      this.state.dialogVisible = false;
    },

    showSyncMessage() {
      this.state.snackbar = true;
      this.state.snackbarText = "数据已完成与服务器同步";
    },

    showError(message) {
      this.state.snackbar = true;
      this.state.snackbarText = message;
    },

    async openDialog(subject) {
      if (this.refreshBeforeEdit) {
        try {
          await this.downloadData();
        } catch (err) {
          console.error("刷新数据失败:", err);
          this.showError("刷新数据失败，可能显示的不是最新数据");
        }
      }
      this.currentEditSubject = subject;
      // 如果是新科目，需要创建对应的数据结构
      if (!this.state.homeworkData[subject]) {
        this.state.homeworkData[subject] = {
          name:
            this.state.availableSubjects.find((s) => s.key === subject)?.name ||
            subject,
          content: "",
        };
      }
      this.state.dialogTitle = this.state.homeworkData[subject].name;
      this.state.textarea = this.state.homeworkData[subject].content;
      this.state.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.inputRef) {
          this.$refs.inputRef.focus();
        }
      });
    },

    splitPoint(content) {
      return content.split("\n").filter((text) => text.trim());
    },

    setAttendanceArea() {
      this.state.attendanceDialog = true;
    },

    toggleStudentStatus(index) {
      if (this.state.selectedSet.has(index)) {
        this.state.selectedSet.delete(index);
        this.state.lateSet.add(index);
      } else if (this.state.lateSet.has(index)) {
        this.state.lateSet.delete(index);
        this.state.excludeSet.add(index);
      } else if (this.state.excludeSet.has(index)) {
        this.state.excludeSet.delete(index);
      } else {
        this.state.selectedSet.add(index);
      }
      this.state.synced = false;
      if (this.autoSave) {
        this.uploadData();
      }
    },

    cleanstudentslist() {
      this.state.selectedSet.clear();
      this.state.lateSet.clear();
      this.state.excludeSet.clear();
      this.state.synced = false;
      if (this.autoSave) {
        this.uploadData();
      }
    },

    zoom(direction) {
      const step = 2;
      if (direction === "up" && this.state.fontSize < 100) {
        this.state.fontSize += step;
      } else if (direction === "out" && this.state.fontSize > 16) {
        this.state.fontSize -= step;
      }
      this.state.contentStyle = {
        "font-size": `${this.state.fontSize}px`,
      };
      setSetting("font.size", this.state.fontSize);
    },

    updateBackendUrl() {
      const provider = getSetting("server.provider");
      const domain = getSetting("server.domain");
      const classNum = getSetting("server.classNumber");

      this.provider = provider;
      this.dataKey = provider === "server" ? `${domain}/${classNum}` : classNum;

      this.state.classNumber = classNum;
    },

    setupAutoRefresh() {
      const autoRefresh = getSetting("refresh.auto");
      const interval = getSetting("refresh.interval");
      if (this.state.refreshInterval) {
        clearInterval(this.state.refreshInterval);
      }
      if (autoRefresh) {
        this.state.refreshInterval = setInterval(() => {
          this.downloadData();
        }, interval * 1000);
      }
    },

    updateSettings() {
      this.state.fontSize = getSetting("font.size");
      this.state.contentStyle = { "font-size": `${this.state.fontSize}px` };
      this.setupAutoRefresh();
      this.updateBackendUrl();
    },

    handleDateSelect(newDate) {
      if (newDate) {
        const date = new Date(newDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        // 只有当日期真正改变时才更新
        if (this.state.dateString !== formattedDate) {
          this.state.dateString = formattedDate;

          // 使用 replace 而不是 push 来避免创建新的历史记录
          this.$router
            .replace({
              query: { date: formattedDate },
            })
            .catch(() => {});

          this.downloadData();
        }
      }
    },

    optimizeGridLayout(items) {
      // 设置最大列数
      const maxColumns = Math.min(3, Math.floor(window.innerWidth / 300));
      if (maxColumns <= 1) return items;

      // 使用贪心算法分配
      const columns = Array.from({ length: maxColumns }, () => ({
        height: 0,
        items: [],
      }));

      items.forEach((item) => {
        const shortestColumn = columns.reduce(
          (min, col, i) => (col.height < columns[min].height ? i : min),
          0
        );
        columns[shortestColumn].items.push(item);
        columns[shortestColumn].height += item.rowSpan;
      });

      // 展平结果并添加顺序
      return columns
        .flatMap((col) => col.items)
        .map((item, index) => ({
          ...item,
          order: index,
        }));
    },

    fixedGridLayout(items) {
      const rowSubjects = [
        ["语文", "数学", "英语"],
        ["物理", "化学", "生物"],
        ["政治", "历史", "地理", "其他"],
      ];
      return items
        .sort((a, b) => {
          const getRowIndex = (subject) => {
            for (let i = 0; i < rowSubjects.length; i++) {
              if (rowSubjects[i].includes(subject)) {
                return i;
              }
            }
            return rowSubjects.length;
          };
          const getColumnIndex = (subject) => {
            for (const row of rowSubjects) {
              const index = row.indexOf(subject);
              if (index !== -1) return index;
            }
            return 999;
          };
          const rowA = getRowIndex(a.key);
          const rowB = getRowIndex(b.key);
          if (rowA !== rowB) {
            return rowA - rowB;
          }
          const colA = getColumnIndex(a.key);
          const colB = getColumnIndex(b.key);
          return colA - colB;
        })
        .map((item, index) => ({
          ...item,
          order: index,
          rowSpan: item.content ? 2 : 1,
        }));
    },

    setAllPresent() {
      this.state.selectedSet.clear();
      this.state.lateSet.clear();
      this.state.excludeSet.clear();
    },

    setAllAbsent() {
      this.state.studentList.forEach((_, index) => {
        this.setAbsent(index);
      });
    },

    setAllLate() {
      this.state.studentList.forEach((_, index) => {
        this.setLate(index);
      });
    },

    isPresent(index) {
      return (
        !this.state.selectedSet.has(index) &&
        !this.state.lateSet.has(index) &&
        !this.state.excludeSet.has(index)
      );
    },

    isAbsent(index) {
      return this.state.selectedSet.has(index);
    },

    isLate(index) {
      return this.state.lateSet.has(index);
    },

    isExclude(index) {
      return this.state.excludeSet.has(index);
    },

    setPresent(index) {
      this.state.selectedSet.delete(index);
      this.state.lateSet.delete(index);
      this.state.excludeSet.delete(index);
    },

    setAbsent(index) {
      this.state.selectedSet.add(index);
      this.state.lateSet.delete(index);
      this.state.excludeSet.delete(index);
    },

    setLate(index) {
      this.state.lateSet.add(index);
      this.state.selectedSet.delete(index);
      this.state.excludeSet.delete(index);
    },

    setExclude(index) {
      this.state.excludeSet.add(index);
      this.state.selectedSet.delete(index);
      this.state.lateSet.delete(index);
    },

    async saveAttendance() {
      try {
        await this.uploadData();
        this.state.attendanceDialog = false;
      } catch (error) {
        console.error("保存出勤状态失败:", error);
        this.showError("保存失败，请重试");
      }
    },

    showMessage(title, content = "", type = "success") {
      this.$message[type](title, content);
    },

    updateSortedItemsCache(key, value) {
      this._sortedItemsCache = {
        key,
        value,
      };
    },

    handleMouseMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--x', `${x}%`);
      card.style.setProperty('--y', `${y}%`);
    },

    handleTouchMove(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--x', `${x}%`);
        card.style.setProperty('--y', `${y}%`);
      }
    },
  },
};
</script>
