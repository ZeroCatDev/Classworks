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
      <v-col cols="11">
        <v-container
          fluid
          style="padding-left: 2px; padding-right: 2px"
        >
          <v-row
            v-for="subjects in homeworkArrange"
            :key="subjects.name"
          >
            <v-col
              v-for="subject in subjects"
              :key="subject"
              cols="4"
              style="padding: 2px !important"
              @click="openDialog(subject)"
            >
              <v-card border>
                <v-card-title>{{ homeworkData[subject].name }}</v-card-title>
                <v-card-text :style="contentStyle">
                  <v-list>
                    <v-list-item
                      v-for="text in splitPoint(homeworkData[subject].content)"
                      :key="text"
                    >
                      {{ text }}
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
        <div />
      </v-col>


      <v-col
        v-if="studentList.length"
        class="attendance-area"
        cols="1"
        @click="setAttendanceArea"
      >
        <h1>出勤</h1>
        <h2>应到:{{ studentList.length }}人</h2>
        <h2>
          实到:{{ studentList.length - selectedSet.size - lateSet.size }}人
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
  },
};
</script>
