<template>
  <v-app-bar>
    <template #prepend>
      <v-app-bar-nav-icon icon="mdi-home" />
    </template>

    <v-app-bar-title>
      <strong>{{ dateString }}</strong> 作业
    </v-app-bar-title>

    <v-spacer />

    <v-btn
      icon="mdi-cog"
      variant="text"
      @click="ServerSelectionDialog = true"
    />
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
      icon="mdi-plus"
      variant="text"
      @click="zoom('up')"
    />
    <v-btn
      icon="mdi-minus"
      variant="text"
      @click="zoom('out')"
    />
    <v-btn
      v-if="!synced"
      color="primary"
      size="large"
      :loading="downloadLoading"
      @click="downloadData"
    >
      下载
    </v-btn>
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

  <v-dialog
    v-model="ServerSelectionDialog"
    width="500"
  >
    <ServerSelection />
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
import ServerSelection from "../components/ServerSelection.vue";

export default {
  name: "HomeworkBoard",
  components: { ServerSelection },
  data() {
    return {
      backurl: localStorage.getItem("backendServerUrl") || "",
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
      fontSize: 28,
      ServerSelectionDialog: false,
    };
  },

  computed: {
    isMobile() {
      return useDisplay().mobile.value;
    },
  },

  async mounted() {
    try {
      this.updateBackendUrl();
      await this.initializeData();
    } catch (err) {
      console.error("初始化失败:", err);
      this.showError("初始化失败，请刷新页面重试");
    }
  },

  methods: {
    async initializeData() {
      const res = await axios.get(this.backurl + "/config.json");
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
        this.dateString = this.$route.query.date;
      } else {
        const today = new Date();
        this.dateString = today.toISOString().split("T")[0];
      }
    },

    handleClose() {
      if (this.currentEditSubject) {
        this.homeworkData[this.currentEditSubject].content = this.textarea;
        this.synced = false;
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

    openDialog(subject) {
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
        this.lateSet.add(index); // Toggle to late
      } else if (this.lateSet.has(index)) {
        this.lateSet.delete(index);
      } else {
        this.selectedSet.add(index); // Toggle to late
      }
      this.synced = false;
    },
    cleanstudentslist()
    {
      this.selectedSet.clear();
      this.lateSet.clear();
      this.synced = false;

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
    },

    async uploadData() {
      try {
        this.uploadLoading = true;
        await axios.post(this.backurl + "/upload", {
          date: this.dateString,
          data: this.homeworkData,
          attendance: Array.from(this.selectedSet),
          late: Array.from(this.lateSet), // Upload late students as well
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
      const res = await axios.get(
        this.backurl + "/download?date=" + this.dateString
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
      const savedUrl = localStorage.getItem("backendServerUrl");
      if (savedUrl) {
        this.backurl = savedUrl;
      }
    },
  },
};
</script>
