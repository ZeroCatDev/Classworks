<template>
  <v-app-bar class="no-select">
    <template #prepend>
      <v-app-bar-nav-icon icon="mdi-home" />
    </template>

    <v-app-bar-title>
      {{ state.classNumber }} - {{ titleText }}
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
        <v-card border>
          <v-date-picker
            v-model="state.selectedDateObj"
            :model-value="state.selectedDateObj"
            color="primary"
            @update:model-value="handleDateSelect"
        /></v-card>
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
      </div><v-btn
      v-if="!state.synced"
      color="error"
      size="large"
      :loading="loading.upload"
      class="ml-2"
      @click="manualUpload"
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

    <!-- 出勤统计区域 -->
    <v-col
      v-if="state.studentList && state.studentList.length"
      class="attendance-area no-select"
      cols="1"
      @click="setAttendanceArea()"
    >
      <h1>出勤</h1>
      <h2>
        应到:
        {{
          state.studentList.length - state.boardData.attendance.exclude.length
        }}人
      </h2>
      <h2>
        实到:
        {{
          state.studentList.length -
          state.boardData.attendance.absent.length -
          state.boardData.attendance.late.length -
          state.boardData.attendance.exclude.length
        }}人
      </h2>
      <h2>请假: {{ state.boardData.attendance.absent.length }}人</h2>
      <h3
        v-for="(name, index) in state.boardData.attendance.absent"
        :key="'absent-' + index"
      >
        {{ `${index + 1}. ${name}` }}
      </h3>
      <h2>迟到: {{ state.boardData.attendance.late.length }}<snap>人</snap></h2>
      <h3
        v-for="(name, index) in state.boardData.attendance.late"
        :key="'late-' + index"
      >
        {{ `${index + 1}. ${name}` }}
      </h3>
      <h2>不参与: {{ state.boardData.attendance.exclude.length }}人</h2>
      <h3
        v-for="(name, index) in state.boardData.attendance.exclude"
        :key="'exclude-' + index"
      >
        {{ `${index + 1}. ${name}` }}
      </h3>
    </v-col>
  </div>

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

  <v-dialog
    v-model="state.attendanceDialog"
    max-width="600"
    @update:model-value="handleAttendanceDialogClose"
  >
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

  <!-- 添加确认对话框 -->
  <v-dialog v-model="confirmDialog.show" max-width="400">
    <v-card>
      <v-card-title class="text-h6"> 确认保存 </v-card-title>
      <v-card-text>
        您正在修改 {{ state.dateString }} 的数据，确定要保存吗？
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="confirmDialog.reject">
          取消
        </v-btn>
        <v-btn color="primary" @click="confirmDialog.resolve"> 确认保存 </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import MessageLog from "@/components/MessageLog.vue";
import dataProvider from "@/utils/dataProvider";
import { getSetting, watchSettings, setSetting } from "@/utils/settings";
import { useDisplay } from "vuetify";
import "../styles/index.scss";
import "../styles/transitions.scss"; // 添加新的样式导入
import { debounce, throttle } from "@/utils/debounce";

export default {
  name: "Classworks作业板",
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
        boardData: {
          homework: {},
          attendance: {
            absent: [],
            late: [],
            exclude: [],
          },
        },
        dialogVisible: false,
        dialogTitle: "",
        textarea: "",
        dateString: "", // 从 state 内统一管理日期
        synced: false,
        attendDialogVisible: false,
        contentStyle: { "font-size": `${getSetting("font.size")}px` },
        uploadLoading: false,
        downloadLoading: false,
        snackbar: false,
        snackbarText: "",
        fontSize: getSetting("font.size"),
        datePickerDialog: false,
        selectedDate: new Date().toISOString().split("T")[0],
        selectedDateObj: new Date(this.selectedDate),
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
      confirmDialog: {
        show: false,
        resolve: null,
        reject: null,
      },
    };
  },

  computed: {
    isMobile() {
      return useDisplay().mobile.value;
    },
    titleText() {
      const today = this.getToday();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const currentDateStr = this.state.dateString;
      const todayStr = this.formatDate(today);
      const yesterdayStr = this.formatDate(yesterday);

      if (currentDateStr === todayStr) {
        return "今天的作业";
      } else if (currentDateStr === yesterdayStr) {
        return "昨天的作业";
      } else {
        return `${currentDateStr}的作业`;
      }
    },
    sortedItems() {
      const key = `${JSON.stringify(
        this.state.boardData.homework
      )}_${this.state.subjectOrder.join()}_${this.dynamicSort}`;
      if (this.sortedItemsCache.key === key) {
        return this.sortedItemsCache.value;
      }

      const items = Object.entries(this.state.boardData.homework)
        .filter(([, value]) => value.content?.trim())
        .map(([key, value]) => ({
          key,
          name:
            this.state.availableSubjects.find((s) => s.key === key)?.name ||
            key,
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

      this.updateSortedItemsCache(key, result);

      return result;
    },
    unusedSubjects() {
      const usedKeys = Object.keys(this.state.boardData.homework);
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
    blockNonTodayAutoSave() {
      return getSetting("edit.blockNonTodayAutoSave");
    },
    isToday() {
      const today = new Date().toISOString().split("T")[0];
      return this.state.dateString === today;
    },
    canAutoSave() {
      // 只考虑自动保存开关和非当天限制
      return this.autoSave && (!this.blockNonTodayAutoSave || this.isToday);
    },
    needConfirmSave() {
      // 只在非今天且开启了确认选项时需要确认
      return !this.isToday && this.confirmNonTodaySave;
    },
    shouldShowBlockedMessage() {
      // 只在非今天且开启了自动保存和禁止非当天自动保存时提示
      return !this.isToday && this.autoSave && this.blockNonTodayAutoSave;
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
    confirmNonTodaySave() {
      return getSetting("edit.confirmNonTodaySave");
    },
    shouldShowSaveConfirm() {
      return !this.isToday && this.confirmNonTodaySave;
    },
    shouldBlockAutoSave() {
      return !this.isToday && this.autoSave && this.blockNonTodayAutoSave;
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
      deep: true,
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
    // 添加新的日期辅助方法
    ensureDate(dateInput) {
      if (dateInput instanceof Date) {
        return dateInput;
      }
      if (typeof dateInput === "string") {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      return new Date(); // 如果无法解析，返回当前日期
    },

    formatDate(dateInput) {
      const date = this.ensureDate(dateInput);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },

    getToday() {
      return new Date();
    },

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
      const today = this.getToday();

      // 确保日期格式正确
      const currentDate = dateFromUrl ? new Date(dateFromUrl) : today;
      this.state.dateString = this.formatDate(currentDate);
      this.state.selectedDate = this.state.dateString;
      this.state.isToday =
        this.formatDate(currentDate) === this.formatDate(today);

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
          if (response.error.code === "NOT_FOUND") {
            this.state.showNoDataMessage = true;
            this.state.noDataMessage = response.error.message;
            // 确保数据结构完整
            this.state.boardData = {
              homework: {},
              attendance: { absent: [], late: [], exclude: [] },
            };
          } else {
            throw new Error(response.error.message);
          }
        } else {
          // 确保数据结构完整
          this.state.boardData = {
            homework: response.data.homework || {},
            attendance: {
              absent: response.data.attendance?.absent || [],
              late: response.data.attendance?.late || [],
              exclude: response.data.attendance?.exclude || [],
            },
          };
          this.state.synced = true;
          this.state.showNoDataMessage = false;
          this.$message.success("下载成功", "数据已更新");
        }
      } catch (error) {
        // 发生错误时也要确保数据结构完整
        this.state.boardData = {
          homework: {},
          attendance: { absent: [], late: [], exclude: [] },
        };
        this.$message.error("下载失败", error.message);
      } finally {
        this.loading.download = false;
      }
    },

    async trySave(isAutoSave = false) {
      // 如果是自动保存但不满足自动保存条件
      if (isAutoSave && !this.canAutoSave) {
        if (this.shouldShowBlockedMessage) {
          this.showMessage(
            "需要手动保存",
            "已禁止自动保存非当天数据",
            "warning"
          );
        }
        return false;
      }

      // 如果需要确认且不是自动保存
      if (!isAutoSave && this.needConfirmSave) {
        try {
          await this.showConfirmDialog();
        } catch {
          return false;
        }
      }

      // 尝试保存
      try {
        await this.uploadData();
        return true;
      } catch (error) {
        this.$message.error("保存失败", error.message || "请重试");
        return false;
      }
    },

    async handleClose() {
      if (!this.currentEditSubject) return;

      const content = this.state.textarea.trim();
      const originalContent =
        this.state.boardData.homework[this.currentEditSubject]?.content || "";

      // 如果内容发生变化(包括清空)，就视为修改
      if (content !== originalContent.trim()) {
        if (content) {
          // 使用精简的数据结构
          this.state.boardData.homework[this.currentEditSubject] = {
            content,
          };
        } else {
          delete this.state.boardData.homework[this.currentEditSubject];
        }
        this.state.synced = false;

        // 处理自动保存
        if (this.autoSave) {
          await this.trySave(true);
        }
      }

      this.state.dialogVisible = false;
    },

    async uploadData() {
      if (this.loading.upload) return;

      try {
        this.loading.upload = true;
        const response = await dataProvider.saveData(
          this.provider,
          this.dataKey,
          this.state.boardData,
          this.state.dateString // 添加dateString参数
        );

        if (!response.success) {
          throw new Error(response.error.message);
        }

        this.state.synced = true;
        this.$message.success(response.message || "保存成功");
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
        this.$message.error("加载配置失败", error.message);
      }
    },

    showSyncMessage() {
      this.$message.success("数据已同步", "数据已完成与服务器同步");
    },

    async openDialog(subject) {
      if (this.refreshBeforeEdit) {
        try {
          await this.downloadData();
        } catch (err) {
          console.error("刷新数据失败:", err);
          this.$message.error("刷新数据失败，可能显示的不是最新数据");
        }
      }

      this.currentEditSubject = subject;
      // 如果是新科目，需要创建对应的精简数据结构
      if (!this.state.boardData.homework[subject]) {
        this.state.boardData.homework[subject] = {
          content: "",
        };
      }
      this.state.dialogTitle =
        this.state.availableSubjects.find((s) => s.key === subject)?.name ||
        subject;
      this.state.textarea = this.state.boardData.homework[subject].content;
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
      const student = this.state.studentList[index];
      if (this.state.boardData.attendance.absent.includes(student)) {
        this.state.boardData.attendance.absent =
          this.state.boardData.attendance.absent.filter(
            (name) => name !== student
          );
        this.state.boardData.attendance.late.push(student);
      } else if (this.state.boardData.attendance.late.includes(student)) {
        this.state.boardData.attendance.late =
          this.state.boardData.attendance.late.filter(
            (name) => name !== student
          );
        this.state.boardData.attendance.exclude.push(student);
      } else if (this.state.boardData.attendance.exclude.includes(student)) {
        this.state.boardData.attendance.exclude =
          this.state.boardData.attendance.exclude.filter(
            (name) => name !== student
          );
      } else {
        this.state.boardData.attendance.absent.push(student);
      }
      this.state.synced = false;
      if (this.canAutoSave) {
        this.uploadData();
      }
    },

    cleanstudentslist() {
      this.state.boardData.attendance.absent = [];
      this.state.boardData.attendance.late = [];
      this.state.boardData.attendance.exclude = [];
      this.state.synced = false;
      if (this.canAutoSave) {
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
      if (!newDate) return;

      try {
        const selectedDate = this.ensureDate(newDate);
        const formattedDate = this.formatDate(selectedDate);

        // 只有当日期真正改变时才更新
        if (this.state.dateString !== formattedDate) {
          this.state.dateString = formattedDate;
          this.state.selectedDate = formattedDate;
          this.state.isToday =
            formattedDate === this.formatDate(this.getToday());

          // 使用 replace 而不是 push 来避免创建新的历史记录
          this.$router
            .replace({
              query: { date: formattedDate },
            })
            .catch(() => {});
          this.downloadData();
        }
      } catch (error) {
        console.error("Date processing error:", error);
        this.$message.error("日期处理错误", "请重新选择日期");
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
      this.state.boardData.attendance = {
        absent: [],
        late: [],
        exclude: [],
      };
      this.state.synced = false;
    },

    setAllAbsent() {
      this.state.boardData.attendance.absent = [...this.state.studentList];
      this.state.boardData.attendance.late = [];
      this.state.boardData.attendance.exclude = [];
      this.state.synced = false;
    },

    setAllLate() {
      this.state.boardData.attendance.absent = [];
      this.state.boardData.attendance.late = [...this.state.studentList];
      this.state.boardData.attendance.exclude = [];
      this.state.synced = false;
    },

    isPresent(index) {
      const student = this.state.studentList[index];
      const { absent, late, exclude } = this.state.boardData.attendance;
      return (
        !absent.includes(student) &&
        !late.includes(student) &&
        !exclude.includes(student)
      );
    },

    isAbsent(index) {
      return this.state.boardData.attendance.absent.includes(
        this.state.studentList[index]
      );
    },

    isLate(index) {
      return this.state.boardData.attendance.late.includes(
        this.state.studentList[index]
      );
    },

    isExclude(index) {
      return this.state.boardData.attendance.exclude.includes(
        this.state.studentList[index]
      );
    },

    setPresent(index) {
      const student = this.state.studentList[index];
      const { absent, late, exclude } = this.state.boardData.attendance;
      this.state.boardData.attendance.absent = absent.filter(
        (name) => name !== student
      );
      this.state.boardData.attendance.late = late.filter(
        (name) => name !== student
      );
      this.state.boardData.attendance.exclude = exclude.filter(
        (name) => name !== student
      );
      this.state.synced = false;
    },

    setAbsent(index) {
      const student = this.state.studentList[index];
      if (!this.state.boardData.attendance.absent.includes(student)) {
        this.setPresent(index);
        this.state.boardData.attendance.absent.push(student);
        this.state.synced = false;
      }
    },

    setLate(index) {
      const student = this.state.studentList[index];
      if (!this.state.boardData.attendance.late.includes(student)) {
        this.setPresent(index);
        this.state.boardData.attendance.late.push(student);
        this.state.synced = false;
      }
    },

    setExclude(index) {
      const student = this.state.studentList[index];
      if (!this.state.boardData.attendance.exclude.includes(student)) {
        this.setPresent(index);
        this.state.boardData.attendance.exclude.push(student);
        this.state.synced = false;
      }
    },

    async saveAttendance() {
      try {
        await this.trySave(true);
        this.state.attendanceDialog = false;
      } catch (error) {
        console.error("保存出勤状态失败:", error);
        this.$message.error("保存失败", "请重试");
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
      card.style.setProperty("--x", `${x}%`);
      card.style.setProperty("--y", `${y}%`);
    },

    handleTouchMove(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--x", `${x}%`);
        card.style.setProperty("--y", `${y}%`);
      }
    },

    showConfirmDialog() {
      return new Promise((resolve, reject) => {
        this.confirmDialog = {
          show: true,
          resolve: () => {
            this.confirmDialog.show = false;
            resolve();
          },
          reject: () => {
            this.confirmDialog.show = false;
            reject(new Error("用户取消保存"));
          },
        };
      });
    },

    confirmSave() {
      this.confirmDialog.show = false;
      if (this.confirmDialog.resolve) {
        this.confirmDialog.resolve(true);
      }
    },

    cancelSave() {
      this.confirmDialog.show = false;
      if (this.confirmDialog.reject) {
        this.confirmDialog.reject(new Error("用户取消保存"));
      }
    },

    // 点击上传按钮时调用
    async manualUpload() {
      return this.trySave(false);
    },

    async handleAttendanceDialogClose(newValue) {
      if (!newValue && !this.state.synced) {
        // 对话框关闭且数据未同步时尝试保存
        await this.trySave(true);
      }
    },
  },
};
</script>
