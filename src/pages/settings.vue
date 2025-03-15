<template>
  <div class="settings-page">
    <v-app-bar elevation="1">
      <template #prepend>
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          @click="$router.push('/')"
        />
      </template>
      <v-app-bar-title class="text-h6">设置</v-app-bar-title>
    </v-app-bar>

    <v-container class="py-4">
      <v-row>
        <v-col cols="12" md="6">
          <server-settings-card
            :loading="loading.server"
            @saved="onSettingsSaved"
          />
        </v-col>

        <v-col cols="12" md="6">
          <edit-settings-card @saved="onSettingsSaved" />
        </v-col>

        <v-col cols="12" md="6">
          <refresh-settings-card @saved="onSettingsSaved" />
        </v-col>

        <v-col cols="12" md="6">
          <display-settings-card @saved="onSettingsSaved" />
        </v-col>

        <!-- 开发者选项卡片 -->
        <v-col :cols="12" :md="settings.developer.enabled ? 12 : 6">
          <settings-card
            title="开发者选项"
            icon="mdi-developer-board"
          >
            <v-list>
              <v-list-item>
                <template #prepend>
                  <v-icon icon="mdi-code-tags" class="mr-3" />
                </template>
                <v-list-item-title>启用开发者选项</v-list-item-title>
                <v-list-item-subtitle>启用后可以查看和修改开发者设置</v-list-item-subtitle>
                <template #append>
                  <v-switch
                    v-model="settings.developer.enabled"
                    density="comfortable"
                    hide-details
                    @change="handleDeveloperChange"
                  />
                </template>
              </v-list-item>

              <template v-if="settings.developer.enabled">
                <v-divider class="my-2" />

                <v-list-item>
                  <template #prepend>
                    <v-icon icon="mdi-file-code" class="mr-3" />
                  </template>
                  <v-list-item-title>显示调试配置</v-list-item-title>
                  <v-list-item-subtitle>显示当前的调试配置信息</v-list-item-subtitle>
                  <template #append>
                    <v-switch
                      v-model="settings.developer.showDebugConfig"
                      density="comfortable"
                      hide-details
                    />
                  </template>
                </v-list-item>

                <v-divider class="my-2" />

                <v-expand-transition>
                  <div v-if="settings.developer.showDebugConfig">
                    <v-divider class="my-2" />
                    <v-textarea
                      v-model="debugConfig"
                      label="调试配置"
                      readonly
                      rows="10"
                      class="font-monospace mt-2"
                    />
                    <div class="d-flex gap-2">
                      <v-btn
                        prepend-icon="mdi-refresh"
                        variant="text"
                        @click="refreshDebugConfig"
                      >
                        刷新
                      </v-btn>
                      <v-btn
                        prepend-icon="mdi-content-copy"
                        variant="text"
                        @click="copyDebugConfig"
                      >
                        复制
                      </v-btn>
                    </div>
                  </div>
                </v-expand-transition>
              </template>
            </v-list>
          </settings-card>
        </v-col>

        <!-- 学生列表卡片 -->
        <v-col cols="12">
          <student-list-card
            v-model="studentData"
            :loading="loading.students"
            :error="studentsError"
            :is-mobile="isMobile"
            :unsaved-changes="hasUnsavedChanges"
            @save="saveStudents"
            @reload="loadStudentList"
            @update:modelValue="handleStudentDataChange"
          />
        </v-col>

        <!-- 关于卡片 -->
        <v-col cols="12">
          <about-card />
        </v-col>
      </v-row>
    </v-container>
    <!-- 消息记录组件 -->
    <message-log ref="messageLog" />
  </div>
</template>

<script>
import { useDisplay } from 'vuetify';
import ServerSettingsCard from '@/components/settings/cards/ServerSettingsCard.vue';
import EditSettingsCard from '@/components/settings/cards/EditSettingsCard.vue';
import RefreshSettingsCard from '@/components/settings/cards/RefreshSettingsCard.vue';
import DisplaySettingsCard from '@/components/settings/cards/DisplaySettingsCard.vue';
import {
  getSetting,
  setSetting,
  resetSetting,
  watchSettings
} from '@/utils/settings';
import MessageLog from '@/components/MessageLog.vue';
import SettingsCard from '@/components/SettingsCard.vue';
import StudentListCard from '@/components/settings/StudentListCard.vue';
import AboutCard from '@/components/settings/AboutCard.vue';
import '../styles/settings.scss';
import dataProvider from '@/utils/dataProvider';

export default {
  name: 'Settings',
  components: {
    ServerSettingsCard,
    EditSettingsCard,
    RefreshSettingsCard,
    DisplaySettingsCard,
    MessageLog,
    SettingsCard,
    StudentListCard,
    AboutCard
  },
  setup() {
    const { mobile } = useDisplay();
    return { isMobile: mobile };
  },
  data() {
    const settings = {
      server: {
        domain: getSetting('server.domain'),
        classNumber: getSetting('server.classNumber'),
        provider: getSetting('server.provider')
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
        blockNonTodayAutoSave: getSetting('edit.blockNonTodayAutoSave'),
        confirmNonTodaySave: getSetting('edit.confirmNonTodaySave'),
        refreshBeforeEdit: getSetting('edit.refreshBeforeEdit'),
      },
      display: {
        emptySubjectDisplay: getSetting('display.emptySubjectDisplay'),
        dynamicSort: getSetting('display.dynamicSort'),
        showRandomButton: getSetting('display.showRandomButton')
      },
      developer: {
        enabled: getSetting('developer.enabled'),
        showDebugConfig: getSetting('developer.showDebugConfig')
      },
      message: {
        showSidebar: getSetting('message.showSidebar'),
        maxActiveMessages: getSetting('message.maxActiveMessages'),
        timeout: getSetting('message.timeout'),
        saveHistory: getSetting('message.saveHistory')
      }
    };
    return {
      settings,
      dataProviders: [
        { title: '服务器', value: 'server' },
        { title: '本地存储', value: 'localStorage' },
        { title:'本地数据库',value:'indexedDB'}
      ],
      studentData: {
        list: [],
        text: '',
        advanced: false
      },
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
      debugConfig: '',
      loading: {
        server: false,
        students: false
      },
      hasUnsavedChanges: false,
      lastSavedData: null
    }
  },

  watch: {
    'settings': {
      handler(newSettings) {
        this.handleSettingsChange(newSettings);
      },
      deep: true
    },
    'studentData': {
      handler(newData) {
        // 只检查是否有未保存的更改
        if (this.lastSavedData) {
          this.hasUnsavedChanges = JSON.stringify(newData.list) !== JSON.stringify(this.lastSavedData);
        }
        // 更新文本显示
        this.studentData.text = newData.list.join('\n');
      },
      deep: true
    }
  },

  mounted() {
    this.loadAllSettings();
    this.unwatchSettings = watchSettings(() => {
      this.loadAllSettings();
    });
    this.loadStudentList();
    this.refreshDebugConfig();

    // 检查开发者选项,如果未启用则关闭相关功能
    if (!this.settings.developer.enabled) {
      this.settings.developer.showDebugConfig = false;
      this.handleSettingsChange(this.settings);
    }
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
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

    // 添加统一的设置处理方法
    handleSettingsChange(newSettings) {
      // 使用防抖来避免过多更新
      if (this.settingsChangeTimeout) {
        clearTimeout(this.settingsChangeTimeout);
      }

      this.settingsChangeTimeout = setTimeout(() => {
        Object.entries(newSettings).forEach(([section, values]) => {
          Object.entries(values).forEach(([key, value]) => {
            const settingKey = `${section}.${key}`;
            const currentValue = getSetting(settingKey);
            if (value !== currentValue) {
              const success = setSetting(settingKey, value);
              if (success) {
                this.showMessage('设置已更新', `${settingKey} 已保存`);
              } else {
                this.showError('保存失败', `${settingKey} 设置失败`);
                // 回滚到原值
                this.settings[section][key] = currentValue;
              }
            }
          });
        });
      }, 100); // 添加100ms延迟
    },

    showMessage(title, content = '', type = 'success') {
      this.$message[type](title, content);
    },

    showError(title, content = '') {
      this.$message.error(title, content);
    },

    async loadStudentList() {
      try {
        this.loading.students = true;
        this.studentsError = null;

        const domain = getSetting('server.domain');
        const classNum = getSetting('server.classNumber');
        const provider = getSetting('server.provider');

        if (!classNum) {
          throw new Error('请先设置班号');
        }

        const key = provider === 'server' ? `${domain}/${classNum}` : classNum;
        const res = await dataProvider.loadConfig(provider, key);

        if (!res.success) {
          throw new Error(res.error.message);
        }

        if (res.data && Array.isArray(res.data.studentList)) {
          this.studentData.list = res.data.studentList;
          this.studentData.text = res.data.studentList.join('\n');
          this.lastSavedData = [...res.data.studentList];
          this.hasUnsavedChanges = false;
        }
      } catch (error) {
        console.error('加载学生列表失败:', error);
        this.studentsError = error.message || '加载失败，请检查设置';
        this.showError('加载失败', this.studentsError);
      } finally {
        this.loading.students = false;
      }
    },

    async saveStudents() {
      try {
        const domain = getSetting('server.domain');
        const classNum = getSetting('server.classNumber');
        const provider = getSetting('server.provider');

        if (!classNum) {
          throw new Error('请先设置班号');
        }

        const key = provider === 'server' ? `${domain}/${classNum}` : classNum;
        const res = await dataProvider.saveConfig(provider, key, {
          studentList: this.studentData.list,
        });

        if (!res.success) {
          throw new Error(res.error.message);
        }

        // 更新保存状态
        this.lastSavedData = [...this.studentData.list];
        this.hasUnsavedChanges = false;
        this.showMessage('保存成功', '学生列表已更新');
      } catch (error) {
        console.error('保存学生列表失败:', error);
        this.showError('保存失败', error.message || '请重试');
      }
    },

    handleStudentDataChange(newData) {
      // 仅在列表实际发生变化时更新
      if (JSON.stringify(newData.list) !== JSON.stringify(this.studentData.list)) {
        this.studentData = { ...newData };
        this.hasUnsavedChanges = true;
      }
    },

    saveEdit() {
      if (this.editingIndex !== -1) {
        const newName = this.editingName.trim();
        if (newName && newName !== this.studentData.list[this.editingIndex]) {
          this.studentData.list[this.editingIndex] = newName;
        }
        this.editingIndex = -1;
        this.editingName = '';
      }
    },

    startEdit(index, name) {
      this.editingIndex = index;
      this.editingName = name;
    },

    confirmDelete(index) {
      this.studentToDelete = {
        index,
        name: this.studentData.list[index]
      };
      this.deleteDialog = true;
    },

    moveStudent(index, direction) {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < this.studentData.list.length) {
        [this.studentData.list[index], this.studentData.list[newIndex]] = [this.studentData.list[newIndex], this.studentData.list[index]];
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
        newPos < this.studentData.list.length &&
        newPos !== this.studentToMove
      ) {
        const student = this.studentData.list[this.studentToMove];
        this.studentData.list.splice(this.studentToMove, 1);
        this.studentData.list.splice(newPos, 0, student);
      }
      this.numberDialog = false;
      this.studentToMove = null;
      this.newPosition = '';
    },

    moveToTop(index) {
      if (index > 0) {
        const student = this.studentData.list[index];
        this.studentData.list.splice(index, 1);
        this.studentData.list.unshift(student);
      }
    },

    addStudent() {
      const student = this.newStudent.trim();
      if (student && !this.studentData.list.includes(student)) {
        this.studentData.list.push(student);
        this.newStudent = '';
      }
    },

    removeStudent(index) {
      if (index !== undefined) {
        this.studentData.list.splice(index, 1);
        this.deleteDialog = false;
        this.studentToDelete = null;
      }
    },

    resetFontSize() {
      resetSetting('font.size');
      this.settings.font.size = getSetting('font.size');
      this.showMessage('字体已重置', '字体大小已恢复默认值');
    },

    refreshDebugConfig() {
      const allSettings = {};
      Object.keys(this.settings).forEach(section => {
        allSettings[section] = {};
        Object.keys(this.settings[section]).forEach(key => {
          allSettings[section][key] = getSetting(`${section}.${key}`);
        });
      });
      this.debugConfig = JSON.stringify(allSettings, null, 2);
    },

    async copyDebugConfig() {
      try {
        await navigator.clipboard.writeText(this.debugConfig);
        this.showMessage('复制成功', '配置信息已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        this.showError('复制失败', '请手动复制');
      }
    },

    handleDeveloperChange(enabled) {
      if (!enabled) {
        // 关闭开发者选项时重置相关设置
        this.settings.developer.showDebugConfig = false;
        this.settings.message = {
          showSidebar: true,
          maxActiveMessages: 5,
          timeout: 5000,
          saveHistory: true
        };
        // 不需要手动调用 saveSettings，watch 会自动处理
      }
    },

    resetDeveloperSettings() {
      this.settings.developer = {
        enabled: false,
        showDebugConfig: false
      };
      this.settings.message = {
        showSidebar: true,
        maxActiveMessages: 5,
        timeout: 5000,
        saveHistory: true
      };
      this.handleSettingsChange(this.settings);
      this.showMessage('已重置', '开发者设置已重置为默认值', 'warning');
    },

    adjustFontSize(direction) {
      const step = 2;
      const size = this.settings.font.size;
      if (direction === 'up' && size < 100) {
        this.settings.font.size = size + step;
      } else if (direction === 'down' && size > 16) {
        this.settings.font.size = size - step;
      }
      this.handleSettingsChange(this.settings);
    },

    onSettingsSaved() {
      this.showMessage('设置已更新', '您的设置已成功保存');
      // 如果需要，可以在这里重新加载相关数据
    }
  }
}
</script>

<style lang="scss">
.settings-page {
  .v-card {
    transition: transform 0.2s, box-shadow 0.2s;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
    }
  }
}
</style>
