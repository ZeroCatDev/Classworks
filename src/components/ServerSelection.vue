<template>
  <v-card title="选择服务器">
    <v-card-text>
      <v-form @submit.prevent="saveServerUrl">
        <v-text-field v-model="serverUrl" label="后端地址" required />
        <v-btn type="submit" color="primary"> 保存 </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
  <v-snackbar v-model="snackbar">
    {{ snackbarText }}
  </v-snackbar>
</template>

<script>

export default {
  data() {
    return {
      serverUrl: "",
      snackbar: false,
      snackbarText: "",
    };
  },
  mounted() {
    this.loadServerUrl();
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
        new URL(this.serverUrl).protocol + "//" + new URL(this.serverUrl).host;
      localStorage.setItem("backendServerUrl", this.serverUrl);
      this.snackbarText = "保存成功，请刷新页面。";
      this.snackbar = true;
      }catch (error) {
        console.log(error);
        this.snackbarText = "保存失败，请检查后端地址。";
        this.snackbar = true;
      }
    },
    loadServerUrl() {
      const savedUrl = localStorage.getItem("backendServerUrl");
      if (savedUrl) {
        this.serverUrl = savedUrl;
      }
    },
  },
};
</script>
