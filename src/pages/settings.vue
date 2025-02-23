<template>
  <v-app-bar>
    <template #prepend>
      <v-btn icon="mdi-arrow-left" variant="text" @click="$router.push('/')" />
    </template>
    <v-app-bar-title>设置</v-app-bar-title>
  </v-app-bar>

  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>服务器设置</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="serverDomain"
              label="服务器域名"
              placeholder="例如: http://example.com"
              required
            />
            <v-text-field
              v-model="classNumber"
              label="班号"
              placeholder="例如: 1 或 A"
              required
              :rules="[v => !!v || '班号不能为空', v => /^[A-Za-z0-9]+$/.test(v) || '班号只能包含字母和数字']"
            />
            <v-btn color="primary" @click="saveServerSettings">保存</v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card>
          <v-card-title>学生列表设置</v-card-title>
          <v-card-text>
            <v-textarea v-model="students" label="学生列表" required />
            <v-btn color="primary" @click="saveStudents">保存</v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card>
          <v-card-title>自动刷新设置</v-card-title>
          <v-card-text>
            <v-switch v-model="autoRefresh" label="启用自动刷新" />
            <v-text-field
              v-model="refreshInterval"
              type="number"
              label="刷新间隔(秒)"
              :disabled="!autoRefresh"
            />
            <v-btn color="primary" @click="saveRefreshSettings">保存</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <v-snackbar v-model="snackbar">
    {{ snackbarText }}
  </v-snackbar>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      serverDomain: '',
      classNumber: '',
      students: '',
      studentsList: [],
      snackbar: false,
      snackbarText: '',
      autoRefresh: false,
      refreshInterval: 300,
    };
  },
  
  mounted() {
    this.loadSettings();
  },

  methods: {
    loadSettings() {
      const savedDomain = localStorage.getItem('backendServerDomain');
      const savedClass = localStorage.getItem('classNumber');
      
      if (savedDomain) {
        this.serverDomain = savedDomain;
      }
      if (savedClass) {
        this.classNumber = savedClass;
      }

      if (localStorage.getItem('studentList')) {
        this.students = localStorage.getItem('studentList').replace(/,/g, '\n');
      }

      this.autoRefresh = localStorage.getItem('autoRefresh') === 'true';
      this.refreshInterval = parseInt(localStorage.getItem('refreshInterval')) || 300;
    },

    saveServerSettings() {
      try {
        if (this.serverDomain === '') {
          localStorage.removeItem('backendServerDomain');
          localStorage.removeItem('classNumber');
          this.showMessage('删除成功');
          return;
        }

        new URL(this.serverDomain);
        
        const cleanDomain = this.serverDomain.replace(/\/+$/, '');
        
        if (!this.classNumber || !/^[A-Za-z0-9]+$/.test(this.classNumber)) {
          throw new Error('Invalid class number');
        }

        localStorage.setItem('backendServerDomain', cleanDomain);
        localStorage.setItem('classNumber', this.classNumber);
        this.showMessage('保存成功');
      } catch (error) {
        console.error(error);
        this.showMessage('保存失败，请检查服务器域名和班号');
      }
    },

    async saveStudents() {
      try {
        this.studentsList = this.students.split('\n');
        await axios.put(`${this.serverDomain}/students`, {
          studentList: this.studentsList,
          id: 1,
        });
        localStorage.setItem('studentList', this.students);
        this.showMessage('保存成功');
      } catch (error) {
        console.error(error);
        this.showMessage('保存失败，请检查学生列表');
      }
    },

    saveRefreshSettings() {
      localStorage.setItem('autoRefresh', this.autoRefresh);
      localStorage.setItem('refreshInterval', this.refreshInterval);
      this.showMessage('保存成功');
    },

    showMessage(text) {
      this.snackbarText = text;
      this.snackbar = true;
    },
  },
};
</script> 