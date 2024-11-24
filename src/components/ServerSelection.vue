<template>
  <v-card border>
    <v-card>
      <v-card-title>选择服务器</v-card-title>
      <v-card-subtitle>没事别乱动</v-card-subtitle>
      <v-card-text>
          <v-text-field v-model="serverUrl" label="后端地址" required />
          <v-btn type="submit" color="primary" @click="saveServerUrl"> 保存 </v-btn>
      </v-card-text>
    </v-card>
    <v-card>
      <v-card-title>设置学生列表</v-card-title>
      <v-card-subtitle>没事别乱动</v-card-subtitle>

      <v-card-text>
        <v-textarea v-model="students" label="学生列表" required />
        <v-btn type="submit" color="primary" @click="saveStudents" border>
          保存
        </v-btn>
      </v-card-text>
    </v-card></v-card
  >
  <v-snackbar v-model="snackbar">
    {{ snackbarText }}
  </v-snackbar>
</template>

<script>
import axios from "axios";
export default {
  data() {
    return {
      serverUrl: "",
      snackbar: false,
      snackbarText: "",
      students: "",
      studentsList: [],
    };
  },
  mounted() {
    this.loadServerUrl();
    this.loadStudents();
  },
  methods: {
    saveServerUrl() {
      try {
        // 格式化URL，去除空格，/结尾，http://开头，使用new URL()
        if (this.serverUrl == "") {
          localStorage.removeItem("backendServerUrl");
          this.snackbarText = "删除成功，请刷新页面。";
          this.snackbar = true;

          return;
        }
        this.serverUrl =
          new URL(this.serverUrl).protocol +
          "//" +
          new URL(this.serverUrl).host;
        localStorage.setItem("backendServerUrl", this.serverUrl);
        this.snackbarText = "保存成功，请刷新页面。";
        this.snackbar = true;
      } catch (error) {
        console.log(error);
        this.snackbarText = "保存失败，请检查后端地址。";
        this.snackbar = true;
      }
    },
    saveStudents() {
      try {
        this.studentsList = this.students.split("\n");
        axios
          .post(this.serverUrl + "/setstudentlist", {
            studentList: this.studentsList,
            id: 1,
          })
          .then((response) => {
            console.log(response);
          });
        localStorage.setItem("studentList", this.students);
        this.snackbarText = "保存成功，请刷新页面。";
        this.snackbar = true;
      } catch (error) {
        console.log(error);
        this.snackbarText = "保存失败，请检查学生列表。";
        this.snackbar = true;
      }
    },
    loadServerUrl() {
      const savedUrl = localStorage.getItem("backendServerUrl");
      if (savedUrl) {
        this.serverUrl = savedUrl;
      }
    },
    loadStudents() {
      if (localStorage.getItem("studentList")) {
        this.students = localStorage.getItem("studentList").replace(/,/g, "\n");
      }
    },
  },
};
</script>
