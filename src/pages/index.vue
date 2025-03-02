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
  <v-container
    class="main-window"
    fluid
  >
    <v-row>
      <v-col :cols="attendanceVisible ? 11 : 12">
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
              order: item.order
            }"
            @click="openDialog(item.key)"
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
        <div v-if="emptySubjectDisplay === 'button'" class="empty-subjects-container">
          <v-btn
            v-for="subject in emptySubjects"
            :key="subject.key"
            variant="outlined"
            color="primary"
            class="empty-subject-btn"
            @click="openDialog(subject.key)"
          >
            <v-icon start>mdi-plus</v-icon>
            {{ subject.name }}
          </v-btn>
        </div>
      </v-col>

      <v-col
        v-if="studentList.length"
        class="attendance-area"
        :cols="1"
        @click="setAttendanceArea"
      >
        <h1>出勤</h1>
        <h2>应到:{{ studentList.length }}人</h2>
        <h2>
          实到:{{ studentList.length - selectedSet.size }}人
        </h2>
        <h2>请假:{{ selectedSet.size }} 人</h2>
        <h3
          v-for="(i, index) in selectedSet"
          :key="'absent-' + index"
        >
          {{ `${index + 1}. ${studentList[i]}` }}
        </h3>
        <h2>迟到:{{ lateSet.size }} 人</h2>

        <h3
          v-for="(i, index) in lateSet"
          :key="'late-' + index"
        >
          {{ `${index + 1}. ${studentList[i]}` }}
        </h3>

        <!-- 空科目按钮显示区域 -->
        <template v-if="showEmptySubjects && emptySubjectDisplay === 'button'">
          <v-divider class="my-4" />
          <h2>未填写作业</h2>
          <v-btn
            v-for="subject in emptySubjects"
            :key="subject.key"
            block
            variant="outlined"
            class="mb-2"
            @click.stop="openDialog(subject.key)"
          >
            {{ subject.name }}
          </v-btn>
        </template>
      </v-col>
    </v-row>
  </v-container>
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
      <v-card-subtitle>写完后点击上传谢谢喵</v-card-subtitle>
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
  gap: 8px;
  margin-top: 16px;
}

.empty-subject-btn {
  flex: 1;
  min-width: 120px;
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
  
  .empty-subject-btn {
    min-width: 100px;
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
</style>

<script>
import axios from "axios";
import { useDisplay } from "vuetify";

export default {
  name: "HomeworkBoard",
  data() {
    return {
      backurl: '',
      classNumber: '',
      currentEditSubject: null,
      studentList: ["加载中"],
      selectedSet: new Set(), // Absent students
      lateSet: new Set(), // Late students
      dialogVisible: false,
      dialogTitle: "",
      textarea: "",
      dateString: "",
      synced: false,
      attendDialogVisible: false,
      contentStyle: { "font-size": "28px" },
      uploadLoading: false,
      downloadLoading: false,
      homeworkData: {},
      homeworkArrange: [[], []],
      snackbar: false,
      snackbarText: "",
      fontSize: parseInt(localStorage.getItem('fontSize')) || 28,
      datePickerDialog: false,
      selectedDate: null,
      refreshInterval: null,
      autoSave: false,
      refreshBeforeEdit: false,
      showEmptySubjects: localStorage.getItem('showEmptySubjects') === 'true',
      emptySubjectDisplay: localStorage.getItem('emptySubjectDisplay') || 'card',
      subjectOrder: [
        "语文", "数学", "英语", "物理", "化学", 
        "生物", "政治", "历史", "地理", "其他"
      ],
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
          // 计算每个卡片的行数
          rowSpan: value.content ? 
            Math.ceil((value.content.split('\n').filter(line => line.trim()).length + 1) * 0.8) : 1
        }))
        .filter(item => {
          if (this.emptySubjectDisplay === 'button') {
            return item.content;
          }
          return true;
        });

      // 对项目进行排序和优化布局
      return this.optimizeGridLayout(items);
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
  },

  async mounted() {
    try {
      this.updateBackendUrl();
      await this.initializeData();
      this.setupAutoRefresh();
      this.autoSave = localStorage.getItem('autoSave') === 'true';
      this.refreshBeforeEdit = localStorage.getItem('refreshBeforeEdit') === 'true';
    } catch (err) {
      console.error("初始化失败:", err);
      this.showError("初始化失败，请刷新页面重试");
    }
  },

  methods: {
    async initializeData() {
      const res = await axios.get(`${this.backurl}/config`);
      this.studentList = res.data.studentList;
      localStorage.setItem("studentList", res.data.studentList);
      this.homeworkArrange = res.data.homeworkArrange;

      this.initializeHomeworkData();
      this.setCurrentDate();
      await this.downloadDataDirectly();
    },

    initializeHomeworkData() {
      this.homeworkArrange.forEach((subjects) => {
        subjects.forEach((subject) => {
          this.homeworkData[subject] = {
            name: subject,
            content: "",
          };
        });
      });
    },

    setCurrentDate() {
      if (this.$route.query.date) {
        try {
          const date = new Date(this.$route.query.date);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }
          // 使用本地时区格式化日期
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          this.dateString = `${year}-${month}-${day}`;
        } catch (e) {
          // 如果日期无效，使用今天的日期
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          this.dateString = `${year}-${month}-${day}`;
        }
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        this.dateString = `${year}-${month}-${day}`;
      }
    },

    handleClose() {
      if (this.currentEditSubject) {
        this.homeworkData[this.currentEditSubject].content = this.textarea;
        this.synced = false;
        
        // 如果启用了自动保存，关闭对话框时自动上传
        if (this.autoSave) {
          this.uploadData();
        }
      }
      this.dialogVisible = false;
    },

    showSyncMessage() {
      this.snackbar = true;
      this.snackbarText = "数据已完成与服务器同步";
    },

    showError(message) {
      this.snackbar = true;
      this.snackbarText = message;
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
      localStorage.setItem('fontSize', this.fontSize.toString());
    },

    async uploadData() {
      if (this.uploadLoading) return; // 防止重复上传
      
      try {
        this.uploadLoading = true;
        await axios.post(`${this.backurl}/homework`, {
          date: new Date(this.dateString).toISOString().split('T')[0],
          data: this.homeworkData,
          attendance: Array.from(this.selectedSet),
          late: Array.from(this.lateSet),
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

    async downloadData() {
      try {
        this.downloadLoading = true;
        await this.downloadDataDirectly();
      } catch (err) {
        console.error("下载失败:", err);
        this.showError("下载失败，请重试");
      } finally {
        this.downloadLoading = false;
      }
    },

    async downloadDataDirectly() {
      const formattedDate = new Date(this.dateString).toISOString().split('T')[0];
      const res = await axios.get(
        `${this.backurl}/homework?date=${formattedDate}`
      );
      this.homeworkData = res.data.data || this.homeworkData;

      const subjectOrder = [
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
      ];
      // 1. 将对象转换成数组，方便排序
      let sortedSubjects = Object.keys(this.homeworkData).map((key) => ({
        key,
        ...this.homeworkData[key],
      }));

      // 2. 按照指定的顺序排序
      sortedSubjects.sort((a, b) => {
        const indexA = subjectOrder.indexOf(a.key);
        const indexB = subjectOrder.indexOf(b.key);

        // 优先根据学科顺序排序
        if (indexA !== indexB) {
          return indexA - indexB;
        }

        return 0;
      });

      // 3. 进一步排序：将 content 为空的项移动到最后
      sortedSubjects = [
        // 先放置有 content 的项
        ...sortedSubjects.filter((item) => item.content != ""),
        // 再放置 content 为空的项
        ...sortedSubjects.filter((item) => item.content == ""),
      ];

      // 4. 将排序后的数组转换回对象
      this.homeworkData = sortedSubjects.reduce((acc, curr) => {
        acc[curr.key] = { name: curr.name, content: curr.content };
        return acc;
      }, {});
      this.selectedSet = new Set(res.data.attendance || []);
      this.lateSet = new Set(res.data.late || []); // Initialize late set
      this.synced = true;
    },

    updateBackendUrl() {
      const domain = localStorage.getItem('backendServerDomain');
      const classNum = localStorage.getItem('classNumber');
      
      if (domain && classNum) {
        this.backurl = `${domain}/${classNum}`;
        this.classNumber = classNum;
      }
    },

    setupAutoRefresh() {
      const autoRefresh = localStorage.getItem('autoRefresh') === 'true';
      const interval = parseInt(localStorage.getItem('refreshInterval')) || 300;
      
      if (autoRefresh) {
        this.refreshInterval = setInterval(() => {
          this.downloadData();
        }, interval * 1000);
      }
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

    beforeDestroy() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
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
    }
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
    }
  }
};
</script>
