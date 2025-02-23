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
          <v-card-title>云端学生列表设置</v-card-title>
          <v-card-text>
            <v-textarea v-model="students" label="学生列表" required />
            <v-btn color="primary" @click="saveStudents">保存</v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card disabled>
          <v-card-title>自动刷新设置</v-card-title>
          <v-card-text>
            <v-switch v-model="autoRefresh" label="启用自动刷新"/>
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

      <v-col cols="12">
        <v-card>
          <v-card-title>字体设置</v-card-title>
          <v-card-text>
            <v-row align="center">
              <v-col>
                <v-text-field
                  v-model="fontSize"
                  type="number"
                  label="字体大小"
                  suffix="px"
                  :rules="[
                    v => v >= 16 || '字体大小不能小于16px',
                    v => v <= 100 || '字体大小不能大于100px'
                  ]"
                />
              </v-col>
              <v-col cols="auto">
                <v-btn color="primary" @click="saveFontSize">保存</v-btn>
              </v-col>
              <v-col cols="auto">
                <v-btn color="error" @click="resetFontSize">重置</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card>
          <v-card-title>编辑设置</v-card-title>
          <v-card-text>
            <v-row>
              <v-col>
                <v-switch
                  v-model="autoSave"
                  label="启用自动保存"
                  hint="编辑完成后自动上传到服务器"
                  persistent-hint
                  @change="saveEditSettings"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-switch
                  v-model="refreshBeforeEdit"
                  label="编辑前自动刷新"
                  hint="打开编辑框前自动从服务器获取最新数据"
                  persistent-hint
                  @change="saveEditSettings"
                />
              </v-col>
            </v-row>
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
      fontSize: '28',
      autoSave: false,
      refreshBeforeEdit: false,
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

      const savedFontSize = localStorage.getItem('fontSize');
      if (savedFontSize) {
        this.fontSize = savedFontSize;
      }

      this.autoSave = localStorage.getItem('autoSave') === 'true';
      this.refreshBeforeEdit = localStorage.getItem('refreshBeforeEdit') === 'true';
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

    saveFontSize() {
      try {
        const size = parseInt(this.fontSize);
        if (size >= 16 && size <= 100) {
          localStorage.setItem('fontSize', size.toString());
          this.showMessage('字体大小保存成功');
        } else {
          throw new Error('Invalid font size');
        }
      } catch (error) {
        this.showMessage('保存失败，字体大小必须在16-100之间');
      }
    },

    resetFontSize() {
      localStorage.removeItem('fontSize');
      this.fontSize = '28';
      this.showMessage('字体大小已重置为默认值');
    },

    saveEditSettings() {
      localStorage.setItem('autoSave', this.autoSave);
      localStorage.setItem('refreshBeforeEdit', this.refreshBeforeEdit);
      this.showMessage(
        this.autoSave 
          ? '已启用自动保存' 
          : this.refreshBeforeEdit 
            ? '已启用编辑前刷新' 
            : '已更新编辑设置'
      );
    },

    showMessage(text) {
      this.snackbarText = text;
      this.snackbar = true;
    },
  },
};
</script> 