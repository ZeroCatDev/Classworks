<template>
  <v-app-bar class="no-select">
    <template #prepend>
      <v-app-bar-nav-icon icon="mdi-home" />
    </template>

    <v-app-bar-title>
      {{ configStore.serverConfig.classNumber }} - {{ titleText }}
    </v-app-bar-title>

    <v-spacer />

    <template #append>
      <v-btn
        icon="mdi-format-font-size-decrease"
        variant="text"
        @click="uiStore.zoom('out')"
      />
      <v-btn
        icon="mdi-format-font-size-increase"
        variant="text"
        @click="uiStore.zoom('up')"
      />
      <v-menu
        v-model="uiStore.datePickerVisible"
        :close-on-content-click="false"
      >
        <template #activator="{ props }">
          <v-btn icon="mdi-calendar" variant="text" v-bind="props" />
        </template>
        <v-card border>
          <v-date-picker
            v-model="uiStore.selectedDateObj"
            color="primary"
            @update:model-value="handleDateSelect"
          />
        </v-card>
      </v-menu>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        :loading="uiStore.loadingState.download"
        @click="downloadData"
      />
      <v-btn
        icon="mdi-bell"
        variant="text"
        :badge="unreadCount || undefined"
        :badge-color="unreadCount ? 'error' : undefined"
        @click="$refs.messageLog.drawer = true"
      />
      <v-btn icon="mdi-cog" variant="text" @click="$router.push('/settings')" />
    </template>
  </v-app-bar>

  <div class="d-flex">
    <!-- 主要内容区域 -->
    <v-container class="main-window flex-grow-1 no-select" fluid
      >
      <subject-grid
        :homework="dataStore.boardData.homework"
        :available-subjects="configStore.defaultSubjects"
        :content-style="uiStore.contentStyle"
        :empty-subject-display="configStore.featureFlags.emptySubjectDisplay"
        :dynamic-sort="configStore.featureFlags.dynamicSort"
        :disabled="isEditingDisabled"
        @edit="openDialog"
      />

      <v-btn
        v-if="!dataStore.synced"
        color="error"
        size="large"
        :loading="uiStore.loadingState.upload"
        class="ml-2"
        @click="manualUpload"
      >
        上传
      </v-btn>
      <v-btn v-else color="success" size="large" @click="showSyncMessage">
        同步完成
      </v-btn>
      <v-btn
        v-if="configStore.featureFlags.showRandomPickerButton"
        color="amber"
        prepend-icon="mdi-account-question"
        append-icon="mdi-dice-multiple"
        size="large"
        class="ml-2"
        @click="openRandomPicker"
      >
        随机点名
      </v-btn>

      <!-- 修改防烧屏提示卡片，使用 tonal 样式减少信息密度 -->
      <v-card
        v-if="configStore.featureFlags.showAntiScreenBurnCard"
        border
        class="mt-4 anti-burn-card"
        color="primary"
        variant="tonal"
      >
        <v-card-title class="text-subtitle-1">
          <v-icon start icon="mdi-shield-check" size="small" />
          屏幕保护技术已启用
        </v-card-title>
        <v-card-text class="text-body-2">
          <p>
            本应用采用独立自研的动态像素偏移技术(DPO™)，有效防止LCD屏幕烧屏现象。
          </p>
          <p class="text-caption text-grey">
            *研究显示动态像素偏移技术可以修复屏幕坏点，起到保护屏幕的作用，数据来自实验室。<a
              href="https://patentscope.wipo.int/search/zh/detail.jsf?docId=CN232281523&_cid=P20-M8L0YX-67061-1"
              target="_blank"
              >专利号CN108648692
            </a>
          </p>
          <p class="text-caption text-grey">
            *技术已自动适配您的设备，无需手动调整
          </p>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- 出勤统计区域 -->
    <attendance-manager
      :student-list="dataStore.studentList"
      :attendance="dataStore.boardData.attendance"
      :date-string="dataStore.dateString"
      @change="dataStore.synced = false"
      @save="saveAttendance"
      @update="updateAttendance"
    />
  </div>

  <!-- 主题内容编辑对话框 -->
  <subject-dialog
    ref="subjectDialog"
    :subject="currentSubject"
    :auto-save="canAutoSave"
    @save="saveSubjectContent"
  />

  <v-snackbar
    v-model="uiStore.snackbar.visible"
    :timeout="uiStore.snackbar.timeout"
  >
    {{ uiStore.snackbar.text }}
  </v-snackbar>

  <message-log ref="messageLog" />

  <!-- 添加确认对话框 -->
  <v-dialog v-model="uiStore.confirmDialogVisible" max-width="400">
    <v-card>
      <v-card-title class="text-h6">确认保存</v-card-title>
      <v-card-text>
        您正在修改 {{ dataStore.dateString }} 的数据，确定要保存吗？
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="uiStore.confirmDialogReject">
          取消
        </v-btn>
        <v-btn color="primary" @click="uiStore.confirmDialogResolve"
          >确认保存</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 添加随机点名组件 -->
  <random-picker
    ref="randomPicker"
    :student-list="dataStore.studentList"
    :attendance="dataStore.boardData.attendance"
  />
</template>

<script>
import MessageLog from "@/components/MessageLog.vue";
import RandomPicker from "@/components/RandomPicker.vue";
import SubjectDialog from "@/components/SubjectDialog.vue";
import SubjectGrid from "@/components/SubjectGrid.vue";
import AttendanceManager from "@/components/AttendanceManager.vue";
import { getRelativeDateText, isToday, formatDate } from "@/utils/dateUtils";
import "@/styles/index.scss";
import "@/styles/transitions.scss";
import "@/styles/global.scss";

// Import stores
import dataStore from "@/store/dataStore";
import uiStore from "@/store/uiStateStore";
import configStore from "@/store/configStore";

export default {
  name: "Classworks 作业板",
  components: {
    MessageLog,
    RandomPicker,
    SubjectDialog,
    SubjectGrid,
    AttendanceManager,
  },

  data() {
    return {
      // Make stores accessible in template
      dataStore,
      uiStore,
      configStore,

      // Unwatch function reference
      unwatchSettings: null,
    };
  },

  computed: {
    titleText() {
      return getRelativeDateText(dataStore.dateString);
    },

    canAutoSave() {
      // Only consider auto save toggle and non-today restriction
      return (
        configStore.featureFlags.autoSave &&
        (!configStore.featureFlags.blockNonTodayAutoSave || this.isTodayData)
      );
    },

    isTodayData() {
      return isToday(dataStore.dateString);
    },

    needConfirmSave() {
      // Only in non-today and confirmation option is enabled
      return !this.isTodayData && configStore.featureFlags.confirmNonTodaySave;
    },

    shouldShowBlockedMessage() {
      // Only in non-today, auto save is on and non-today auto save is blocked
      return (
        !this.isTodayData &&
        configStore.featureFlags.autoSave &&
        configStore.featureFlags.blockNonTodayAutoSave
      );
    },

    isEditingDisabled() {
      return uiStore.loadingState.upload || uiStore.loadingState.download;
    },

    unreadCount() {
      return this.$refs.messageLog?.unreadCount || 0;
    },

    currentSubject() {
      if (!uiStore.currentSubjectKey) return { name: "", content: "" };

      return dataStore.getSubject(
        uiStore.currentSubjectKey,
        configStore.defaultSubjects
      );
    },
  },

  async mounted() {
    try {
      // Initialize configuration
      configStore.initialize();

      // Initialize data
      await this.initializeData();

      // Set up auto refresh
      uiStore.setupAutoRefresh(this.downloadData, this.shouldSkipRefresh);

      // Set up settings watcher
      this.unwatchSettings = configStore.watchSettings(() => {
        uiStore.updateFromSettings();
      });

      // Check URL hash for random picker
      this.checkHashForRandomPicker();

      // Add hash change listener
      window.addEventListener("hashchange", this.checkHashForRandomPicker);
    } catch (err) {
      console.error("Initialization failed:", err);
      this.showMessage("初始化失败，请刷新页面重试", "error");
    }
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }

    // Clean up UI resources
    uiStore.cleanup();

    // Remove hash change listener
    window.removeEventListener("hashchange", this.checkHashForRandomPicker);
  },

  methods: {
    async initializeData() {
      // Get URL parameters for date
      const urlParams = new URLSearchParams(window.location.search);
      const dateFromUrl = urlParams.get("date");

      // Set date (default to today if not specified)
      dataStore.dateString = formatDate(dateFromUrl || new Date());
      uiStore.selectedDateObj = new Date(dataStore.dateString);

      // Load data and config in parallel
      await Promise.all([this.downloadData(), this.loadConfig()]);
    },

    async downloadData() {
      if (uiStore.loadingState.download) return;

      try {
        uiStore.loadingState.download = true;
        await dataStore.loadData(
          configStore.serverConfig.provider,
          configStore.dataKey,
          dataStore.dateString
        );
        this.$message.success("下载成功", "数据已更新");
      } catch (error) {
        this.$message.error("下载失败", error.message);
      } finally {
        uiStore.loadingState.download = false;
      }
    },

    async trySave(isAutoSave = false) {
      // If auto save but doesn't meet auto save conditions
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

      // If needs confirmation and not auto save
      if (!isAutoSave && this.needConfirmSave) {
        try {
          await uiStore.showConfirmDialog();
        } catch {
          return false;
        }
      }

      // Try to save
      try {
        await this.uploadData();
        return true;
      } catch (error) {
        this.$message.error("保存失败", error.message || "请重试");
        return false;
      }
    },

    async uploadData() {
      if (uiStore.loadingState.upload) return;

      try {
        uiStore.loadingState.upload = true;
        await dataStore.saveData(
          configStore.serverConfig.provider,
          configStore.dataKey,
          dataStore.dateString
        );
        this.$message.success("保存成功");
      } finally {
        uiStore.loadingState.upload = false;
      }
    },

    async loadConfig() {
      try {
        await dataStore.loadConfig(
          configStore.serverConfig.provider,
          configStore.dataKey
        );
      } catch (error) {
        console.error("Failed to load config:", error);
        this.$message.error("加载配置失败", error.message);
      }
    },

    showSyncMessage() {
      this.$message.success("数据已同步", "数据已完成与服务器同步");
    },

    async openDialog(subject) {
      if (configStore.featureFlags.refreshBeforeEdit) {
        try {
          await this.downloadData();
        } catch (err) {
          console.error("刷新数据失败:", err);
          this.$message.error("刷新数据失败，可能显示的不是最新数据");
        }
      }

      uiStore.setCurrentSubject(subject);

      // If new subject, create empty structure
      if (!dataStore.boardData.homework[subject]) {
        dataStore.boardData.homework[subject] = {
          content: "",
        };
      }

      this.$refs.subjectDialog.open();
    },

    saveSubjectContent(content) {
      if (!uiStore.currentSubjectKey) return;

      dataStore.setHomework(uiStore.currentSubjectKey, content);

      // Handle auto save
      if (configStore.featureFlags.autoSave) {
        this.trySave(true);
      }
    },

    // Check if auto refresh should be skipped
    shouldSkipRefresh() {
      // If dialog is open, skip refresh
      if (this.$refs.subjectDialog?.dialogVisible) return true;

      // If confirm dialog is open, skip refresh
      if (uiStore.confirmDialogVisible) return true;

      // If date picker is open, skip refresh
      if (uiStore.datePickerVisible) return true;

      // If loading, skip refresh
      if (uiStore.loadingState.upload || uiStore.loadingState.download)
        return true;

      // If data is not synced (has unsaved changes), skip refresh
      if (!dataStore.synced) return true;

      // No special condition, don't skip refresh
      return false;
    },

    handleDateSelect(newDate) {
      if (!newDate) return;

      try {
        const formattedDate = formatDate(newDate);

        // Only update if date actually changed
        if (dataStore.dateString !== formattedDate) {
          dataStore.dateString = formattedDate;
          uiStore.selectedDateObj = new Date(newDate);

          // Use replace instead of push to avoid creating new history record
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

    showMessage(title, content = "", type = "success") {
      this.$message[type](title, content);
    },

    // Manual upload button
    async manualUpload() {
      return this.trySave(false);
    },

    saveAttendance(attendance) {
      dataStore.updateAttendance(attendance);
      this.trySave(true);
    },

    updateAttendance(attendance) {
      dataStore.updateAttendance(attendance);
    },

    openRandomPicker() {
      if (this.$refs.randomPicker) {
        this.$refs.randomPicker.open();
      }
    },

    checkHashForRandomPicker() {
      if (window.location.hash === "#random-picker") {
        this.$nextTick(() => {
          window.location.hash = "";
          this.openRandomPicker();
        });
      }
    },
  },
};
</script>

<style scoped>
.main-window {
  padding: 1rem;
  max-width: 100%;
}

.no-select {
  user-select: none;
}

.anti-burn-card {
  max-width: 600px;
}
</style>
