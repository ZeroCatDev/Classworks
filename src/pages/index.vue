<template>
  <v-app-bar>
    <template #prepend>
      <v-app-bar-nav-icon icon="mdi-home" />
    </template>

    <v-app-bar-title>
      {{ classNumber }}班 - {{ titleText }}
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
      <v-menu
        v-model="datePickerDialog"
        :close-on-content-click="false"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            icon="mdi-calendar"
            variant="text"
            v-bind="props"
          />
        </template>

        <v-date-picker
          v-model="selectedDate"
          color="primary"
          @update:model-value="handleDateSelect"
        />
      </v-menu>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        :loading="downloadLoading"
        @click="downloadData"
      />
      <v-btn
        icon="mdi-cog"
        variant="text"
        @click="$router.push('/settings')"
      />
    </template>
  </v-app-bar>
  <div class="d-flex">
    <!-- 主要内容区域 -->
    <v-container
      class="main-window flex-grow-1"
      fluid
    >
      <div v-if="showNoDataMessage && !isToday" class="no-data-message">
        <v-card class="text-center pa-4" >
          <v-card-title class="text-h6">别看未来的作业了</v-card-title>
          <v-card-text>
            <div class="text-body-1">{{ noDataMessage }}</div>
          </v-card-text>
        </v-card>
      </div>

      <template v-else>
        <div class="grid-masonry" ref="gridContainer">
          <div
            v-for="item in sortedItems"
            :key="item.key"
            class="grid-item"
            :class="{ 
              'empty-card': !item.content,
              [`grid-row-${item.rowSpan}`]: true
            }"
            :style="{ 
              'grid-row-end': `span ${item.rowSpan}`,
              order: item.order,
              cursor: uploadLoading || downloadLoading || isPastDate ? 'not-allowed' : 'pointer',
              opacity: uploadLoading || downloadLoading ? '0.7' : '1'
            }"
            @click="!uploadLoading && !downloadLoading && !isPastDate && openDialog(item.key)"
          >
            <v-card border height="100%">
              <v-card-title :class="{ 'text-subtitle-1': !item.content }">
                {{ item.name }}
              </v-card-title>
              <v-card-text :style="item.content ? contentStyle : null">
                <template v-if="item.content">
                  <v-list>
                    <v-list-item
                      v-for="text in splitPoint(item.content)"
                      :key="text"
                    >
                      {{ text }}
                    </v-list-item>
                  </v-list>
                </template>
                <template v-else>
                  <div class="text-center pa-2">
                    <v-icon size="small" color="grey">mdi-plus</v-icon>
                    <div class="text-caption text-grey">点击添加作业</div>
                  </div>
                </template>
              </v-card-text>
            </v-card>
          </div>
        </div>

        <!-- 空科目按钮组 -->
        <v-btn-group v-if="emptySubjectDisplay === 'button'" class="empty-subjects-container">
          <v-btn
            v-for="subject in emptySubjects"
            :key="subject.key"
            variant="tonal"
            color="primary"
            @click="!uploadLoading && !downloadLoading && openDialog(subject.key)"
            :disabled="uploadLoading || downloadLoading"
          >
            <v-icon start>mdi-plus</v-icon>
            {{ subject.name }}
          </v-btn>
        </v-btn-group>
      </template>
    </v-container>

    <!-- 出勤统计区域 -->
    <v-col
      v-if="studentList.length"
      class="attendance-area"
      cols="1"
      @click="!isPastDate ? setAttendanceArea() : null"
    >
      <h1>出勤</h1>
      <h2>应到: {{ studentList.length }}人</h2>
      <h2>实到: {{ studentList.length - selectedSet.size }}人</h2>
      <h2>请假: {{ selectedSet.size }}人</h2>
      <h3 v-for="(i, index) in selectedSet" :key="'absent-' + index">
        {{ `${index + 1}. ${studentList[i]}` }}
      </h3>
      <h2>迟到: {{ lateSet.size }}人</h2>
      <h3 v-for="(i, index) in lateSet" :key="'late-' + index">
        {{ `${index + 1}. ${studentList[i]}` }}
      </h3>
    </v-col>
  </div>
  <v-container fluid>
    <v-btn
      v-if="!synced"
      color="error"
      size="large"
      :loading="uploadLoading"
      class="ml-2"
      @click="uploadData"
    >
      上传
    </v-btn>
    <v-btn
      v-else
      color="success"
      size="large"
      @click="showSyncMessage"
    >
      同步完成
    </v-btn>
  </v-container>
  <v-dialog
    v-model="dialogVisible"
    width="500"
    @click:outside="handleClose"
  >
    <v-card border>
      <v-card-title>{{ dialogTitle }}</v-card-title>
      <v-card-subtitle>
        {{ autoSave ? "喵？喵呜！" : "写完后点击上传谢谢喵" }}
      </v-card-subtitle>
      <v-card-text>
        <v-textarea
          ref="inputRef"
          v-model="textarea"
          auto-grow
          placeholder="使用换行表示分条"
          rows="5"
        />
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="attendDialogVisible"
    width="800"
  >
    <v-card>
      <v-card-title>设置学生出勤状态</v-card-title>
      <v-card-text>
        <v-btn @click="cleanstudentslist">
          全勤
        </v-btn>
        <v-container fluid>
          <v-row>
            <v-col
              v-for="(name, i) in studentList"
              :key="i"
              cols="12"
              sm="6"
              md="4"
            >
              <v-card
                border
                :class="{ selected: selectedSet.has(i) || lateSet.has(i) }"
                :color="
                  selectedSet.has(i)
                    ? 'primary'
                    : lateSet.has(i)
                      ? 'orange'
                      : ''
                "
                @click="toggleStudentStatus(i)"
              >
                <v-card-text>
                  {{ `${i + 1}. ${name}` }}
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-snackbar
    v-model="snackbar"
    :timeout="2000"
  >
    {{ snackbarText }}
  </v-snackbar>

  <v-dialog
    v-model="attendanceDialog"
    max-width="600"
  >
    <v-card>
      <v-card-title class="text-h6">
        编辑出勤状态
      </v-card-title>

      <v-card-text>
        <v-select
          v-model="selectedTimeSlot"
          :items="timeSlots"
          item-title="name"
          item-value="id"
          label="选择时间段"
          class="mb-4"
        />

        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>
              批量操作
            </v-expansion-panel-title>
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
            v-for="(student, index) in currentTimeSlotStudents"
            :key="index"
            :title="student"
          >
            <template v-slot:append>
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
              </v-btn-group>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          @click="saveAttendance"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.grid-masonry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 8px;
  grid-auto-flow: dense;
}

.grid-item {
  width: 100%;
  transition: all 0.2s ease;
}

.empty-card {
  transform: scale(0.9);
  opacity: 0.8;
  grid-row-end: span 1 !important;
}

.empty-card:hover {
  transform: scale(0.95);
  opacity: 1;
}

.empty-subjects-container {
  display: flex;
  flex-wrap: wrap;
}

@media (max-width: 1199px) {
  .grid-masonry {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 799px) {
  .grid-masonry {
    grid-template-columns: 1fr;
  }
  
  .empty-card {
    transform: scale(0.95);
  }
}

/* 确保容器高度不超过视口 */
.main-window {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

/* 优化滚动条样式 */
.main-window::-webkit-scrollbar {
  width: 8px;
}

.main-window::-webkit-scrollbar-track {
  background: transparent;
}

.main-window::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.main-window::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.no-data-message {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  margin: 20px 0;
}

.attendance-drawer {
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.attendance-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

/* 优化滚动条样式 */
.attendance-drawer :deep(.v-navigation-drawer__content::-webkit-scrollbar) {
  width: 8px;
}

.attendance-drawer :deep(.v-navigation-drawer__content::-webkit-scrollbar-track) {
  background: transparent;
}

.attendance-drawer :deep(.v-navigation-drawer__content::-webkit-scrollbar-thumb) {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.attendance-drawer :deep(.v-navigation-drawer__content::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(0, 0, 0, 0.3);
}

/* 响应式调整 */
@media (max-width: 960px) {
  .attendance-drawer {
    display: none;
  }
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}

.attendance-card {
  display: flex;
  flex-direction: column;
}

.attendance-numbers {
  padding: 20px 0;
}

.total-number {
  border-bottom: 1px solid rgba(0,0,0,0.12);
  padding-bottom: 20px;
}

.status-number {
  flex: 1;
}

.text-h2, .text-h3 {
  line-height: 1.2;
}
</style>

<script>
import axios from "axios";
import { useDisplay } from "vuetify";
import { getSetting, watchSettings } from '@/utils/settings';

export default {
  name: "HomeworkBoard",
  data() {
    return {
      backurl: '',
      classNumber: '',
      currentEditSubject: null,
      studentList: [],
      selectedSet: new Set(), // Absent students
      lateSet: new Set(), // Late students
      dialogVisible: false,
      dialogTitle: "",
      textarea: "",
      dateString: "",
      synced: false,
      attendDialogVisible: false,
      contentStyle: { "font-size": `${getSetting('font.size')}px` },
      uploadLoading: false,
      downloadLoading: false,
      homeworkData: {},
      homeworkArrange: [[], []],
      snackbar: false,
      snackbarText: "",
      fontSize: getSetting('font.size'),
      datePickerDialog: false,
      selectedDate: null,
      refreshInterval: null,
      subjectOrder: [
        "语文", "数学", "英语", "物理", "化学", 
        "生物", "政治", "历史", "地理", "其他"
      ],
      showNoDataMessage: false,
      noDataMessage: '',
      isToday: false,
      attendanceDialog: false,
      selectedTimeSlot: null,
      timeSlots: [],
      currentTimeSlotStudents: [],
    };
  },

  computed: {
    isMobile() {
      return useDisplay().mobile.value;
    },
    titleText() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      if (this.dateString === today) {
        return '今天的作业';
      } else if (this.dateString === yesterdayFormatted) {
        return '昨天的作业';
      } else {
        return `${this.dateString}的作业`;
      }
    },
    sortedItems() {
      const items = Object.entries(this.homeworkData)
        .map(([key, value]) => ({
          key,
          name: value.name,
          content: value.content,
          order: this.subjectOrder.indexOf(key),
          rowSpan: value.content ? 
            Math.ceil((value.content.split('\n').filter(line => line.trim()).length + 1) * 0.8) : 1
        }))
        .filter(item => {
          if (this.emptySubjectDisplay === 'button') {
            return item.content;
          }
          return true;
        });

      // Sort items: prioritize non-empty content first
      return items.sort((a, b) => {
        // If one item has content and the other does not, prioritize the one with content
        if (a.content && !b.content) return -1;
        if (!a.content && b.content) return 1;

        // If both have content or both are empty, sort by order
        return a.order - b.order;
      });
    },
    attendanceVisible() {
      return this.studentList.length > 0;
    },
    emptySubjects() {
      if (this.emptySubjectDisplay !== 'button') return [];
      
      return Object.entries(this.homeworkData)
        .map(([key, value]) => ({
          key,
          name: value.name,
          content: value.content,
          order: this.subjectOrder.indexOf(key)
        }))
        .filter(subject => !subject.content)
        .sort((a, b) => a.order - b.order);
    },
    autoSave() {
      return getSetting('edit.autoSave');
    },
    refreshBeforeEdit() {
      return getSetting('edit.refreshBeforeEdit');
    },
    emptySubjectDisplay() {
      return getSetting('display.emptySubjectDisplay');
    },
    dynamicSort() {
      return getSetting('display.dynamicSort');
    },
    isPastDate() {
      const selectedDate = new Date(this.dateString);
      const today = new Date();
      // 将时间部分归零以进行比较
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return selectedDate < today; // 如果选择的日期在今天之前，则返回 true
    },
  },

  async mounted() {
    try {
      this.updateBackendUrl();
      await this.initializeData();
      this.setupAutoRefresh();
      
      // 监听设置变化
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
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },

  methods: {
    async initializeData() {
      try {
        // 获取配置信息（包含学生列表和时间段）
        await this.loadConfig();
        
        // 获取URL中的日期参数
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        
        if (dateParam) {
          this.dateString = dateParam;
        } else {
          const now = new Date();
          this.dateString = now.toISOString().split('T')[0];
        }

        // 下载当天作业数据
        await this.downloadData();
      } catch (error) {
        console.error('初始化失败:', error);
        this.showError('初始化失败，请检查网络连接');
      }
    },

    async loadConfig() {
      try {
        const domain = getSetting('server.domain');
        const classNum = getSetting('server.classNumber');
        
        if (!domain || !classNum) {
          throw new Error('请先设置服务器域名和班号');
        }

        const res = await axios.get(`${domain}/${classNum}/config`);
        // 直接使用返回的数据，不再需要 .data 层
        this.studentList = res.data.studentList || [];
        this.timeSlots = res.data.timeSlots || [];
        
        // 如果有时间段，默认选择第一个
        if (this.timeSlots.length > 0) {
          this.selectedTimeSlot = this.timeSlots[0].id;
          this.updateCurrentTimeSlotStudents();
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        throw error;
      }
    },

    updateCurrentTimeSlotStudents() {
      if (this.selectedTimeSlot) {
        const slot = this.timeSlots.find(s => s.id === this.selectedTimeSlot);
        this.currentTimeSlotStudents = slot ? slot.students : [];
      } else {
        this.currentTimeSlotStudents = this.studentList;
      }
    },

    async downloadDataDirectly() {
      try {
        const formattedDate = new Date(this.dateString).toISOString().split('T')[0];
        const res = await axios.get(
          `${this.backurl}/homework?date=${formattedDate}`
        );

        const today = new Date();
        this.isToday = today.toISOString().split('T')[0] === formattedDate;

        // Check if the response indicates success
        if (res.data && res.data.status !== false) {
          this.showNoDataMessage = false;

          // Process the new data structure
          const { homework, attendance } = res.data;

          // Initialize homeworkData with existing data or default empty subjects
          this.homeworkData = {
            "语文": { name: "语文", content: "" },
            "数学": { name: "数学", content: "" },
            "英语": { name: "英语", content: "" },
            "物理": { name: "物理", content: "" },
            "化学": { name: "化学", content: "" },
            "生物": { name: "生物", content: "" },
            "历史": { name: "历史", content: "" },
            "地理": { name: "地理", content: "" },
            "政治": { name: "政治", content: "" },
          };

          // Update homeworkData with existing data from the response
          for (const subject in homework) {
            if (homework.hasOwnProperty(subject)) {
              this.homeworkData[subject] = homework[subject];
            }
          }

          // Update attendance information if available
          if (attendance) {
            this.selectedTimeSlot = attendance.timeSlotId;
            this.selectedSet = new Set(attendance.absent || []);
            this.lateSet = new Set(attendance.late || []);
            this.updateCurrentTimeSlotStudents();
          } else {
            this.selectedSet.clear();
            this.lateSet.clear();
          }

          this.synced = true;
        } else {
          // Handle the error case for today's date
          if (this.isToday && res.data.status == false) {
            this.showNoDataMessage = false; // Ensure we show the empty data
            this.homeworkData = {
              "语文": { name: "语文", content: "" },
              "数学": { name: "数学", content: "" },
              "英语": { name: "英语", content: "" },
              "物理": { name: "物理", content: "" },
              "化学": { name: "化学", content: "" },
              "生物": { name: "生物", content: "" },
              "历史": { name: "历史", content: "" },
              "地理": { name: "地理", content: "" },
              "政治": { name: "政治", content: "" },
            };
            this.noDataMessage = ''; // Clear any previous message
          } else {
            // Handle other error cases
            this.showNoDataMessage = true;
            this.noDataMessage = res.data.msg || '未找到数据';
            this.homeworkData = {};
            this.selectedSet.clear();
            this.lateSet.clear();
          }
        }
      } catch (error) {
        console.error('下载数据失败:', error);
        this.showError('下载数据失败，请重试');
      }
    },

    async uploadData() {
      if (this.uploadLoading) return;
      
      try {
        this.uploadLoading = true;
        await axios.post(`${this.backurl}/homework`, {
          date: new Date(this.dateString).toISOString().split('T')[0],
          homework: this.homeworkData, // 修改键名为 homework
          attendance: {
            timeSlotId: this.selectedTimeSlot,
            absent: Array.from(this.selectedSet),
            late: Array.from(this.lateSet),
          },
        });
        this.synced = true;
        this.showSyncMessage();
      } catch (err) {
        console.error("上传失败:", err);
        this.showError("上传失败，请重试");
      } finally {
        this.uploadLoading = false;
      }
    },

    showSyncMessage() {
      this.snackbar = true;
      this.snackbarText = "数据已完成与服务器同步";
    },

    showError(message) {
      this.snackbar = true;
      this.snackbarText = message;
    },

    handleClose() {
      if (this.currentEditSubject) {
        // Update only the specific subject being edited
        const currentSubject = this.homeworkData[this.currentEditSubject];
        if (currentSubject) {
          currentSubject.content = this.textarea;
        }
        this.synced = false;
        
        // If auto-save is enabled, upload the data
        if (this.autoSave) {
          this.uploadData();
        }
      }
      this.dialogVisible = false;
    },

    async openDialog(subject) {
      // 如果启用了编辑前刷新，先刷新数据
      if (this.refreshBeforeEdit) {
        try {
          await this.downloadData();
        } catch (err) {
          this.showError("刷新数据失败，可能显示的不是最新数据");
        }
      }

      this.currentEditSubject = subject;
      this.dialogTitle = this.homeworkData[subject].name;
      this.textarea = this.homeworkData[subject].content;
      this.dialogVisible = true;

      // 在下一个 tick 后聚焦输入框
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
      this.attendDialogVisible = true;
    },

    toggleStudentStatus(index) {
      if (this.selectedSet.has(index)) {
        this.selectedSet.delete(index);
        this.lateSet.add(index);
      } else if (this.lateSet.has(index)) {
        this.lateSet.delete(index);
      } else {
        this.selectedSet.add(index);
      }
      this.synced = false;
      
      // 如果启用了自动保存，状态改变时自动上传
      if (this.autoSave) {
        this.uploadData();
      }
    },
    cleanstudentslist()
    {
      this.selectedSet.clear();
      this.lateSet.clear();
      this.synced = false;

      // 如果启用了自动保存，清空后自动上传
      if (this.autoSave) {
        this.uploadData();
      }
    },
    zoom(direction) {
      const step = 2;
      if (direction === "up" && this.fontSize < 100) {
        this.fontSize += step;
      } else if (direction === "out" && this.fontSize > 16) {
        this.fontSize -= step;
      }
      this.contentStyle = {
        "font-size": `${this.fontSize}px`,
      };
      setSetting('font.size', this.fontSize);
    },

    updateBackendUrl() {
      const domain = getSetting('server.domain');
      const classNum = getSetting('server.classNumber');
      
      if (domain && classNum) {
        this.backurl = `${domain}/${classNum}`;
        this.classNumber = classNum;
      }
    },

    setupAutoRefresh() {
      const autoRefresh = getSetting('refresh.auto');
      const interval = getSetting('refresh.interval');
      
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
      
      if (autoRefresh) {
        this.refreshInterval = setInterval(() => {
          this.downloadData();
        }, interval * 1000);
      }
    },

    updateSettings() {
      // 更新字体大小
      this.fontSize = getSetting('font.size');
      this.contentStyle = { "font-size": `${this.fontSize}px` };
      
      // 更新自动刷新
      this.setupAutoRefresh();
      
      // 更新服务器设置
      this.updateBackendUrl();
    },

    handleDateSelect(newDate) {
      if (newDate) {
        // 使用本地时区处理日期，避免时区偏移
        const date = new Date(newDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        this.dateString = formattedDate;
        this.$router.push(`/?date=${formattedDate}`);
        this.downloadData();
      }
    },

    optimizeGridLayout(items) {
      // 首先按内容长度和科目顺序排序
      const sortedItems = items.sort((a, b) => {
        // 有内容的排在前面
        if (a.content && !b.content) return -1;
        if (!a.content && b.content) return 1;
        
        // 内容较长的优先
        if (a.content && b.content) {
          const lengthDiff = b.rowSpan - a.rowSpan;
          if (lengthDiff !== 0) return lengthDiff;
        }
        
        // 最后按科目顺序
        return a.order - b.order;
      });

      // 计算每列的当前高度
      const columnHeights = [0, 0, 0];
      const columnItems = [[], [], []];
      
      // 分配项目到最短的列
      sortedItems.forEach(item => {
        const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
        columnHeights[shortestColumn] += item.rowSpan;
        columnItems[shortestColumn].push(item);
      });

      // 将所有列的项目合并，并设置显示顺序
      return columnItems.flat().map((item, index) => ({
        ...item,
        order: index
      }));
    },

    fixedGridLayout(items) {
      // 定义每行的科目顺序
      const rowSubjects = [
        ["语文", "数学", "英语"],
        ["物理", "化学", "生物"],
        ["政治", "历史", "地理", "其他"]
      ];

      // 按照固定布局排序
      return items.sort((a, b) => {
        // 找出科目所在的行号
        const getRowIndex = (subject) => {
          for (let i = 0; i < rowSubjects.length; i++) {
            if (rowSubjects[i].includes(subject)) {
              return i;
            }
          }
          return rowSubjects.length; // 其他科目放最后
        };

        // 获取科目在行内的位置
        const getColumnIndex = (subject) => {
          for (const row of rowSubjects) {
            const index = row.indexOf(subject);
            if (index !== -1) return index;
          }
          return 999; // 未知科目放最后
        };

        const rowA = getRowIndex(a.key);
        const rowB = getRowIndex(b.key);

        if (rowA !== rowB) {
          return rowA - rowB;
        }

        // 同一行内按照预定义顺序排序
        const colA = getColumnIndex(a.key);
        const colB = getColumnIndex(b.key);
        return colA - colB;
      }).map((item, index) => ({
        ...item,
        order: index,
        // 固定布局时每个卡片占用相同的行高
        rowSpan: item.content ? 2 : 1
      }));
    },

    setAllPresent() {
      this.selectedSet.clear();
      this.lateSet.clear();
    },

    setAllAbsent() {
      this.currentTimeSlotStudents.forEach((_, index) => {
        this.setAbsent(index);
      });
    },

    setAllLate() {
      this.currentTimeSlotStudents.forEach((_, index) => {
        this.setLate(index);
      });
    },

    isPresent(index) {
      return !this.selectedSet.has(index) && !this.lateSet.has(index);
    },

    isAbsent(index) {
      return this.selectedSet.has(index);
    },

    isLate(index) {
      return this.lateSet.has(index);
    },

    setPresent(index) {
      this.selectedSet.delete(index);
      this.lateSet.delete(index);
    },

    setAbsent(index) {
      this.selectedSet.add(index);
      this.lateSet.delete(index);
    },

    setLate(index) {
      this.lateSet.add(index);
      this.selectedSet.delete(index);
    },

    async saveAttendance() {
      try {
        await this.uploadData();
        this.attendanceDialog = false;
      } catch (error) {
        console.error('保存出勤状态失败:', error);
        this.showError('保存失败，请重试');
      }
    },

    async downloadData() {
      if (this.downloadLoading) return;
      
      try {
        this.downloadLoading = true;
        await this.downloadDataDirectly();
      } catch (error) {
        console.error('下载数据失败:', error);
        this.showError('下载数据失败，请重试');
      } finally {
        this.downloadLoading = false;
      }
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
      deep: true
    },
    // 监听窗口大小变化
    '$vuetify.display.width': {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.gridContainer) {
            // 触发重新布局
            this.optimizeGridLayout(this.sortedItems);
          }
        });
      }
    },
    selectedTimeSlot() {
      this.updateCurrentTimeSlotStudents();
    }
  }
};
</script>
