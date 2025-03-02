<template>
  <v-app-bar elevation="1">
    <template #prepend>
      <v-btn icon="mdi-arrow-left" variant="text" @click="$router.push('/')" class="mr-2" />
    </template>
    <v-app-bar-title class="text-h6 font-weight-medium">设置</v-app-bar-title>
  </v-app-bar>

  <v-container class="py-4">
    <v-row>
      <v-col cols="12" md="4">
        <v-card elevation="2" class="rounded-lg">
          <v-card-item>
            <template v-slot:prepend>
              <v-icon icon="mdi-server" size="large" class="mr-2" />
            </template>
            <v-card-title class="text-h6">服务器设置</v-card-title>
          </v-card-item>

          <v-card-text>
            <v-text-field v-model="settings.server.domain" label="服务器域名" placeholder="例如: http://example.com"
              prepend-inner-icon="mdi-web" variant="outlined" density="comfortable" class="mb-4" required />
            <v-text-field v-model="settings.server.classNumber" label="班号" placeholder="例如: 1 或 A"
              prepend-inner-icon="mdi-account-group" variant="outlined" density="comfortable" required
              :rules="[v => !!v || '班号不能为空', v => /^[A-Za-z0-9]+$/.test(v) || '班号只能包含字母和数字']" />
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn color="primary" prepend-icon="mdi-content-save" block @click="saveSettings('server')">
              保存设置
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>



      <v-col cols="12" md="4">
        <v-card elevation="2" class="rounded-lg">
          <v-card-item>
            <template v-slot:prepend>
              <v-icon icon="mdi-refresh" size="large" class="mr-2" />
            </template>
            <v-card-title class="text-h6">自动刷新设置（不建议启用）</v-card-title>
          </v-card-item>

          <v-card-text>
            <v-switch v-model="settings.refresh.auto" label="启用自动刷新" color="primary" hide-details class="mb-4" />
            <v-text-field v-model="settings.refresh.interval" type="number" label="刷新间隔" suffix="秒"
              :disabled="!settings.refresh.auto" variant="outlined" density="comfortable" :rules="[
                v => v >= 10 || '刷新间隔不能小于10秒',
                v => v <= 3600 || '刷新间隔不能大于3600秒'
              ]" />
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn color="primary" prepend-icon="mdi-content-save" block @click="saveSettings('refresh')">
              保存设置
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="2" class="rounded-lg">
          <v-card-item>
            <template v-slot:prepend>
              <v-icon icon="mdi-format-size" size="large" class="mr-2" />
            </template>
            <v-card-title class="text-h6">字体设置</v-card-title>
          </v-card-item>

          <v-card-text>
            <v-text-field v-model="settings.font.size" type="number" label="字体大小" suffix="px" variant="outlined"
              density="comfortable" class="mb-4" :rules="[
                v => v >= 16 || '字体大小不能小于16px',
                v => v <= 100 || '字体大小不能大于100px'
              ]" />
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" class="flex-grow-1"
              @click="resetFontSize">
              重置
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-content-save" class="flex-grow-1" @click="saveSettings('font')">
              保存设置
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="2" class="rounded-lg">
          <v-card-item>
            <template v-slot:prepend>
              <v-icon icon="mdi-pencil-cog" size="large" class="mr-2" />
            </template>
            <v-card-title class="text-h6">编辑设置</v-card-title>
          </v-card-item>

          <v-card-text>
            <v-switch v-model="settings.edit.autoSave" label="启用自动保存" color="primary" hide-details class="mb-4">
              <template v-slot:append>
                <v-tooltip location="right">
                  <template v-slot:activator="{ props }">
                    <v-icon v-bind="props" icon="mdi-help-circle-outline" size="small" class="ml-2" />
                  </template>
                  编辑完成后自动上传到服务器
                </v-tooltip>
              </template>
            </v-switch>

            <v-switch v-model="settings.edit.refreshBeforeEdit" label="编辑前自动刷新" color="primary" hide-details>
              <template v-slot:append>
                <v-tooltip location="right">
                  <template v-slot:activator="{ props }">
                    <v-icon v-bind="props" icon="mdi-help-circle-outline" size="small" class="ml-2" />
                  </template>
                  打开编辑框前自动从服务器获取最新数据
                </v-tooltip>
              </template>
            </v-switch>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn color="primary" prepend-icon="mdi-content-save" block @click="saveSettings('edit')">
              保存设置
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col> <v-col cols="12" md="4">
        <v-card elevation="2" class="rounded-lg">
          <v-card-item>
            <template v-slot:prepend>
              <v-icon icon="mdi-card-outline" size="large" class="mr-2" />
            </template>
            <v-card-title class="text-h6">显示设置</v-card-title>
          </v-card-item>

          <v-card-text>
            <v-switch v-model="settings.display.dynamicSort" label="启用动态排序" hint="动态排序会根据内容长度自动调整卡片位置以优化显示效果"
              persistent-hint class="mb-4" @change="saveSettings('display')">
              <template v-slot:append>
                <v-tooltip location="right">
                  <template v-slot:activator="{ props }">
                    <v-icon v-bind="props" icon="mdi-help-circle-outline" size="small" class="ml-2" />
                  </template>
                  <div>
                    <p>启用：根据内容长度动态调整位置</p>
                    <p>关闭：按语数英/物化生/政史地固定排列</p>
                  </div>
                </v-tooltip>
              </template>
            </v-switch>

            <v-divider class="my-4" />

            <v-radio-group v-model="settings.display.emptySubjectDisplay" label="空作业显示方式" class="mt-4"
              @change="saveSettings('display')">
              <v-radio value="card" label="显示为空卡片">
                <template v-slot:label>
                  <div class="d-flex align-center">
                    显示为空卡片
                    <v-tooltip location="right">
                      <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" icon="mdi-help-circle-outline" size="small" class="ml-2" />
                      </template>
                      在主界面中显示为可点击的空白卡片
                    </v-tooltip>
                  </div>
                </template>
              </v-radio>
              <v-radio value="button" label="显示为按钮组">
                <template v-slot:label>
                  <div class="d-flex align-center">
                    显示为按钮组
                    <v-tooltip location="right">
                      <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" icon="mdi-help-circle-outline" size="small" class="ml-2" />
                      </template>
                      在主界面底部显示为一组添加按钮
                    </v-tooltip>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn color="primary" prepend-icon="mdi-content-save" block @click="saveSettings('display')">
              保存设置
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card elevation="2" class="rounded-lg">
          <v-card-item>
            <template v-slot:prepend>
              <v-icon icon="mdi-account-multiple" size="large" class="mr-2" />
            </template>
            <v-card-title class="text-h6">学生列表设置</v-card-title>
            <template v-slot:append>
              <v-btn :color="showAdvancedEdit ? 'primary' : undefined" variant="text" prepend-icon="mdi-code-braces"
                @click="showAdvancedEdit = !showAdvancedEdit">
                {{ showAdvancedEdit ? '返回基础编辑' : '高级编辑' }}
              </v-btn>
            </template>
          </v-card-item>

          <v-card-text>
            <v-progress-linear v-if="studentsLoading" indeterminate color="primary" class="mb-4" />

            <v-alert v-if="studentsError" type="error" variant="tonal" closable class="mb-4">
              {{ studentsError }}
            </v-alert>

            <v-expand-transition>
              <div v-if="!showAdvancedEdit">
                <v-row class="mb-6">
                  <v-col cols="12" sm="6" md="4">
                    <v-text-field v-model="newStudent" label="添加学生" placeholder="输入学生姓名后回车添加"
                      prepend-inner-icon="mdi-account-plus" variant="outlined" hide-details @keyup.enter="addStudent">
                      <template #append>
                        <v-btn icon="mdi-plus" variant="text" color="primary" :disabled="!newStudent.trim()"
                          @click="addStudent" />
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col v-for="(student, index) in studentsList" :key="index" cols="12" sm="6" md="4" lg="3">
                    <v-hover v-slot="{ isHovering, props }">
                      <v-card v-bind="props" :elevation="isMobile ? 1 : (isHovering ? 4 : 1)" :class="[
                        'student-card',
                        {
                          'bg-primary-subtle': isHovering && !isMobile,
                          'mobile': isMobile
                        }
                      ]" border>
                        <v-card-text class="d-flex align-center pa-3">
                          <v-menu location="bottom" :open-on-hover="!isMobile" :open-on-long-press="isMobile">
                            <template v-slot:activator="{ props: menuProps }">
                              <v-btn variant="tonal" size="small" class="mr-3 font-weight-medium" v-bind="menuProps">
                                {{ index + 1 }}
                              </v-btn>
                            </template>
                            <v-list density="compact" nav>
                              <v-list-item prepend-icon="mdi-arrow-up-bold" :disabled="index === 0"
                                @click="moveToTop(index)">
                                置顶
                              </v-list-item>
                              <v-divider />
                              <v-list-item prepend-icon="mdi-arrow-up" :disabled="index === 0"
                                @click="moveStudent(index, 'up')">
                                上移
                              </v-list-item>
                              <v-list-item prepend-icon="mdi-arrow-down" :disabled="index === studentsList.length - 1"
                                @click="moveStudent(index, 'down')">
                                下移
                              </v-list-item>
                              <v-divider />
                              <v-list-item prepend-icon="mdi-format-list-numbered" @click="setStudentNumber(index)">
                                设置序号
                              </v-list-item>
                            </v-list>
                          </v-menu>

                          <v-text-field v-if="editingIndex === index" v-model="editingName" density="compact"
                            variant="underlined" hide-details class="flex-grow-1" @keyup.enter="saveEdit"
                            @blur="saveEdit" autofocus />
                          <span v-else class="text-body-1 flex-grow-1"
                            @click="isMobile ? startEdit(index, student) : null"
                            @dblclick="!isMobile ? startEdit(index, student) : null">
                            {{ student }}
                          </span>

                          <div class="d-flex gap-1 action-buttons" :class="{ 'opacity-100': isHovering || isMobile }">
                            <v-btn icon="mdi-pencil" variant="text" color="primary" size="small"
                              @click="startEdit(index, student)" />
                            <v-btn icon="mdi-delete" variant="text" color="error" size="small"
                              @click="confirmDelete(index)" />
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-hover>
                  </v-col>
                </v-row>
              </div>
            </v-expand-transition>

            <v-expand-transition>
              <div v-if="showAdvancedEdit" class="pt-2">
                <v-textarea v-model="students" label="批量编辑学生列表" placeholder="每行输入一个学生姓名" hint="使用文本编辑模式批量编辑学生名单"
                  persistent-hint variant="outlined" rows="10" />
              </div>
            </v-expand-transition>

            <v-row class="mt-6">
              <v-col cols="12" class="d-flex gap-2">
                <v-btn color="primary" prepend-icon="mdi-content-save" size="large" :loading="studentsLoading"
                  :disabled="studentsLoading" @click="saveStudents">
                  保存学生列表
                </v-btn>
                <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" size="large"
                  :loading="studentsLoading" :disabled="studentsLoading" @click="reloadStudentList">
                  重置列表
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card elevation="2" class="rounded-lg">
          <v-card-item>
            <template v-slot:prepend>
              <v-icon icon="mdi-information" size="large" class="mr-2" />
            </template>
            <v-card-title class="text-h6">关于</v-card-title>
          </v-card-item>

          <v-card-text>
            <v-row justify="center" align="center">
              <v-col cols="12" md="8" class="text-center">
                <v-avatar size="120" class="mb-4">
                  <v-img src="https://avatars.githubusercontent.com/u/88357633?v=4" alt="作者头像" />
                </v-avatar>
                <h2 class="text-h5 mb-2">HomeworkPage</h2>
                <p class="text-body-1 mb-4">
                  由 <a href="https://github.com/sunwuyuan" target="_blank"
                    class="text-decoration-none font-weight-medium">Sunwuyuan</a> 开发
                </p>
                <div class="d-flex justify-center gap-2 flex-wrap">
                  <v-btn color="primary" variant="outlined" href="https://github.com/SunWuyuan/homeworkpage-frontend"
                    target="_blank" prepend-icon="mdi-github">
                    前端 GitHub
                  </v-btn>
                  <v-btn color="primary" variant="outlined" href="https://github.com/SunWuyuan/homeworkpage-backend"
                    target="_blank" prepend-icon="mdi-github">
                    后端 GitHub
                  </v-btn>
                  <v-btn color="primary" variant="outlined"
                    href="https://github.com/SunWuyuan/homeworkpage-backend/issues" target="_blank"
                    prepend-icon="mdi-bug">
                    报告问题
                  </v-btn>
                </div>
                <p class="mt-4 text-caption text-medium-emphasis">
                  GPL License © 2024
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

  <v-dialog v-model="deleteDialog" max-width="300">
    <v-card>
      <v-card-title>确认删除</v-card-title>
      <v-card-text>
        确定要删除学生 "{{ studentToDelete?.name }}" 吗？
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="deleteDialog = false">
          取消
        </v-btn>
        <v-btn color="error" variant="text" @click="removeStudent(studentToDelete?.index)">
          删除
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="numberDialog" max-width="300">
    <v-card>
      <v-card-title>设置序号</v-card-title>
      <v-card-text>
        <v-text-field v-model="newPosition" type="number" label="新序号" :rules="[
          v => !!v || '序号不能为空',
          v => v > 0 || '序号必须大于0',
          v => v <= studentsList.length || `序号不能大于${studentsList.length}`
        ]" @keyup.enter="applyNewPosition" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="numberDialog = false">
          取消
        </v-btn>
        <v-btn color="primary" @click="applyNewPosition">
          确定
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import axios from 'axios';
import { useDisplay } from 'vuetify';
import {
  getSetting,
  setSetting,
  resetSetting,
  watchSettings
} from '@/utils/settings';

export default {
  setup() {
    const { mobile } = useDisplay();
    return { isMobile: mobile };
  },

  data() {
    return {
      settings: {
        server: {
          domain: getSetting('server.domain'),
          classNumber: getSetting('server.classNumber'),
        },
        refresh: {
          auto: getSetting('refresh.auto'),
          interval: getSetting('refresh.interval'),
        },
        font: {
          size: getSetting('font.size'),
        },
        edit: {
          autoSave: getSetting('edit.autoSave'),
          refreshBeforeEdit: getSetting('edit.refreshBeforeEdit'),
        },
        display: {
          emptySubjectDisplay: getSetting('display.emptySubjectDisplay'),
          dynamicSort: getSetting('display.dynamicSort'),
        }
      },
      students: '',
      studentsList: [],
      snackbar: false,
      snackbarText: '',
      showAdvancedEdit: false,
      newStudent: '',
      editingIndex: -1,
      editingName: '',
      deleteDialog: false,
      studentToDelete: null,
      numberDialog: false,
      newPosition: '',
      studentToMove: null,
      touchStartTime: 0,
      touchTimeout: null,
      studentsLoading: false,
      studentsError: null,
    };
  },

  mounted() {
    this.loadAllSettings();
    this.unwatchSettings = watchSettings(() => {
      this.loadAllSettings();
    });
    this.loadStudentList();
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }
  },

  watch: {
    'settings.server': {
      handler(newVal, oldVal) {
        if (newVal.domain !== oldVal?.domain || newVal.classNumber !== oldVal?.classNumber) {
          this.loadStudentList();
        }
      },
      deep: true
    },
    'settings.refresh': {
      handler() {
        this.saveSettings('refresh');
      },
      deep: true
    },
    'settings.font': {
      handler() {
        this.saveSettings('font');
      },
      deep: true
    },
    'settings.edit': {
      handler() {
        this.saveSettings('edit');
      },
      deep: true
    },
    'settings.display': {
      handler() {
        this.saveSettings('display');
      },
      deep: true
    },
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
    loadAllSettings() {
      Object.keys(this.settings).forEach(section => {
        Object.keys(this.settings[section]).forEach(key => {
          this.settings[section][key] = getSetting(`${section}.${key}`);
        });
      });
    },

    saveSettings(section) {
      try {
        Object.keys(this.settings[section]).forEach(key => {
          setSetting(`${section}.${key}`, this.settings[section][key]);
        });
        this.showMessage('设置已保存');
      } catch (error) {
        console.error('保存设置失败:', error);
        this.showMessage('保存设置失败，请检查输入');
      }
    },

    async loadStudentList() {
      try {
        this.studentsLoading = true;
        this.studentsError = null;

        const domain = getSetting('server.domain');
        const classNum = getSetting('server.classNumber');

        if (!domain || !classNum) {
          throw new Error('请先设置服务器域名和班号');
        }

        const res = await axios.get(`${domain}/${classNum}/config`);
        if (res.data && Array.isArray(res.data.studentList)) {
          this.studentsList = res.data.studentList;
          this.students = this.studentsList.join('\n');
        } else {
          throw new Error('获取学生列表失败');
        }
      } catch (error) {
        console.error('加载学生列表失败:', error);
        this.studentsError = error.message || '加载失败，请检查服务器设置';
        this.showMessage(this.studentsError);
      } finally {
        this.studentsLoading = false;
      }
    },

    async saveStudents() {
      try {
        const domain = getSetting('server.domain');
        const classNum = getSetting('server.classNumber');

        if (!domain || !classNum) {
          throw new Error('请先设置服务器域名和班号');
        }

        await axios.put(`${domain}/${classNum}/config`, {
          studentList: this.studentsList,
          timeSlots: [],
        });

        localStorage.setItem('studentList', this.studentsList.join(','));
        this.showMessage('保存成功');
      } catch (error) {
        console.error('保存学生列表失败:', error);
        this.showMessage(error.message || '保存失败，请检查服务器设置和学生列表');
      }
    },

    async reloadStudentList() {
      try {
        await this.loadStudentList();
        this.showMessage('已重新加载学生列表');
      } catch (error) {
        this.showMessage('重新加载失败');
      }
    },

    showMessage(text) {
      this.snackbarText = text;
      this.snackbar = true;
    },

    startEdit(index, name) {
      if (this.editingIndex !== -1 && this.editingIndex !== index) {
        this.saveEdit();
      }

      this.editingIndex = index;
      this.editingName = name;
    },

    saveEdit() {
      if (this.editingIndex !== -1) {
        const newName = this.editingName.trim();
        if (newName && newName !== this.studentsList[this.editingIndex]) {
          this.studentsList[this.editingIndex] = newName;
          if (this.settings.edit.autoSave) {
            this.saveStudents();
          }
        }
        this.editingIndex = -1;
        this.editingName = '';
      }
    },

    confirmDelete(index) {
      this.studentToDelete = {
        index,
        name: this.studentsList[index]
      };
      this.deleteDialog = true;
    },

    moveStudent(index, direction) {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < this.studentsList.length) {
        [this.studentsList[index], this.studentsList[newIndex]] =
          [this.studentsList[newIndex], this.studentsList[index]];

        if (this.settings.edit.autoSave) {
          this.saveStudents();
        }
      }
    },

    setStudentNumber(index) {
      this.studentToMove = index;
      this.newPosition = String(index + 1);
      this.numberDialog = true;
    },

    applyNewPosition() {
      const newPos = parseInt(this.newPosition) - 1;
      if (
        this.studentToMove !== null &&
        newPos >= 0 &&
        newPos < this.studentsList.length &&
        newPos !== this.studentToMove
      ) {
        const student = this.studentsList[this.studentToMove];
        this.studentsList.splice(this.studentToMove, 1);
        this.studentsList.splice(newPos, 0, student);
        if (this.settings.edit.autoSave) this.saveStudents();
      }
      this.numberDialog = false;
      this.studentToMove = null;
      this.newPosition = '';
    },

    moveToTop(index) {
      if (index > 0) {
        const student = this.studentsList[index];
        this.studentsList.splice(index, 1);
        this.studentsList.unshift(student);

        if (this.settings.edit.autoSave) {
          this.saveStudents();
        }
      }
    },

    addStudent() {
      const student = this.newStudent.trim();
      if (student && !this.studentsList.includes(student)) {
        this.studentsList.push(student);
        this.newStudent = '';
        if (this.settings.edit.autoSave) {
          this.saveStudents();
        }
      }
    },

    removeStudent(index) {
      if (index !== undefined) {
        this.studentsList.splice(index, 1);
        this.deleteDialog = false;
        this.studentToDelete = null;
        if (this.settings.edit.autoSave) this.saveStudents();
      }
    },

    resetFontSize() {
      resetSetting('font.size');
      this.settings.font.size = getSetting('font.size');
      this.showMessage('字体大小已重置为默认值');
    },
  },
};
</script>

<style scoped>
.student-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.bg-primary-subtle {
  background-color: rgb(var(--v-theme-primary), 0.05);
}

.action-buttons {
  transition: opacity 0.2s ease;
  opacity: 0;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.student-card .v-text-field {
  margin: 0;
  padding: 0;
}

@media (max-width: 600px) {
  .v-container {
    padding: 12px;
  }

  .v-col {
    padding: 8px;
  }
}

.student-card.mobile {
  margin-bottom: 8px;
}

.student-card.mobile .v-btn {
  min-width: 40px;
  min-height: 40px;
}

.student-card.mobile .v-text-field {
  font-size: 16px;
}

@media (max-width: 600px) {
  .v-col {
    padding: 6px !important;
  }

  .student-card {
    margin-bottom: 4px;
  }

  .action-buttons {
    opacity: 1;
  }
}

.student-card {
  -webkit-tap-highlight-color: transparent;
}

.student-card:active {
  background-color: rgb(var(--v-theme-primary), 0.05);
}
</style>