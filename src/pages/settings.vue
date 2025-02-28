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
          <v-card-title class="d-flex align-center">
            学生列表设置
            <v-spacer />
            <v-btn
              variant="text"
              prepend-icon="mdi-code-braces"
              @click="showAdvancedEdit = !showAdvancedEdit"
            >
              {{ showAdvancedEdit ? '基础编辑' : '高级编辑' }}
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-expand-transition>
              <div v-if="!showAdvancedEdit">
                <v-row class="mb-4">
                  <v-col cols="12" sm="6" md="4">
                    <v-text-field
                      v-model="newStudent"
                      label="添加学生"
                      placeholder="输入学生姓名"
                      hide-details
                      @keyup.enter="addStudent"
                    >
                      <template #append>
                        <v-btn
                          icon="mdi-plus"
                          variant="text"
                          :disabled="!newStudent.trim()"
                          @click="addStudent"
                        />
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col
                    v-for="(student, index) in studentsList"
                    :key="index"
                    cols="12"
                    sm="6"
                    md="4"
                    lg="3"
                  >
                    <v-card variant="outlined" class="student-card">
                      <v-card-text class="d-flex align-center">
                        <span class="mr-2">{{ index + 1 }}.</span>
                        <span class="text-body-1 flex-grow-1">{{ student }}</span>
                        <v-btn
                          icon="mdi-delete"
                          variant="text"
                          color="error"
                          size="small"
                          @click="removeStudent(index)"
                        />
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </div>
            </v-expand-transition>

            <v-expand-transition>
              <div v-if="showAdvancedEdit">
                <v-textarea
                  v-model="students"
                  label="学生列表（每行一个名字）"
                  hint="使用文本编辑模式批量编辑学生名单"
                  persistent-hint
                />
              </div>
            </v-expand-transition>

            <v-row class="mt-4">
              <v-col cols="12" class="d-flex gap-2">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-content-save"
                  @click="saveStudents"
                >
                  保存
                </v-btn>
                <v-btn
                  color="error"
                  variant="outlined"
                  prepend-icon="mdi-refresh"
                  @click="reloadStudentList"
                >
                  重置
                </v-btn>
              </v-col>
            </v-row>
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

      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-row justify="center" align="center">
              <v-col cols="12" md="8" class="text-center">
                <v-avatar size="120" class="mb-4">
                  <v-img
                    src="https://avatars.githubusercontent.com/u/88357633?v=4"
                    alt="作者头像"
                  />
                </v-avatar>
                <h2 class="text-h5 mb-2">HomeworkPage</h2>
                <p class="text-body-1 mb-4">
                  由 <a href="https://github.com/sunwuyuan" target="_blank" class="text-decoration-none">Sunwuyuan</a> 开发
                </p>
                <div class="d-flex justify-center gap-2">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    href="https://github.com/SunWuyuan/homeworkpage-frontend"
                    target="_blank"
                    prepend-icon="mdi-github"
                  >
                  前端 GitHub
                  </v-btn>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    href="https://github.com/SunWuyuan/homeworkpage-backend"
                    target="_blank"
                    prepend-icon="mdi-github"
                  >
                  后端 GitHub
                  </v-btn>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    href="https://github.com/SunWuyuan/homeworkpage-backend"
                  >
                    报告问题
                  </v-btn>
                </div>
                <p class="mt-4 text-caption">
                  GPL License
                </p>
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
      showAdvancedEdit: false,
      newStudent: '',
    };
  },
  
  mounted() {
    this.loadSettings();
  },

  watch: {
    students: {
      handler(newVal) {
        this.studentsList = newVal.split('\n').filter(s => s.trim());
      },
      immediate: true
    },
    studentsList: {
      handler(newVal) {
        this.students = newVal.join('\n');
      },
      deep: true
    }
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
        this.studentsList = this.students.split('\n').filter(s => s.trim());
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
        const domain = localStorage.getItem('backendServerDomain');
        const classNum = localStorage.getItem('classNumber');
        
        if (!domain || !classNum) {
          throw new Error('请先设置服务器域名和班号');
        }

        await axios.put(`${domain}/${classNum}/students`, {
          studentList: this.studentsList,
          id: 1,
        });
        
        localStorage.setItem('studentList', this.studentsList.join(','));
        this.showMessage('保存成功');
      } catch (error) {
        console.error(error);
        this.showMessage(error.message || '保存失败，请检查服务器设置和学生列表');
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

    addStudent() {
      const student = this.newStudent.trim();
      if (student && !this.studentsList.includes(student)) {
        this.studentsList.push(student);
        this.newStudent = '';
      }
    },

    removeStudent(index) {
      this.studentsList.splice(index, 1);
    },

    reloadStudentList() {
      const savedList = localStorage.getItem('studentList');
      if (savedList) {
        this.students = savedList.replace(/,/g, '\n');
      } else {
        this.students = '';
        this.studentsList = [];
      }
    },

    showMessage(text) {
      this.snackbarText = text;
      this.snackbar = true;
    },
  },
};
</script>

<style scoped>
.student-card {
  transition: all 0.3s ease;
}

.student-card:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.gap-2 {
  gap: 8px;
}
</style> 