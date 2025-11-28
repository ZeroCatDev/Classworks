<template>
  <settings-card
    :loading="loading"
    border
    icon="mdi-book-multiple"
    title="科目管理"
  >
    <v-alert
      v-if="error"
      class="mb-4"
      closable
      type="error"
      variant="tonal"
    >
      {{ error }}
    </v-alert>

    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <v-btn
          :loading="loading"
          class="mr-2"
          color="primary"
          prepend-icon="mdi-refresh"
          size="large"
          variant="text"
          @click="loadConfig"
        >
          重新加载
        </v-btn>

        <v-btn
          :loading="loading"
          color="success"
          prepend-icon="mdi-content-save"
          size="large"
          @click="saveConfig"
        >
          保存
        </v-btn>
        <v-btn
          :loading="loading"
          class="mr-2"
          prepend-icon="mdi-restore"
          variant="text"
          @click="resetToDefault"
        >
          重置为默认
        </v-btn>
      </div>
      <v-chip
        v-if="hasChanges"
        color="warning"
        variant="elevated"
      >
        有未保存的更改
      </v-chip>
    </div>

    <!-- 添加新科目 -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="newSubjectName"
              :rules="[v => !!v || '科目名称不能为空']"
              append-inner-icon="mdi-plus"
              density="comfortable"
              label="科目名称"
              variant="outlined"
              @keyup.enter="addSubject"
              @click:append-inner="addSubject"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 科目列表 -->
    <v-card variant="outlined">
      <v-card-text class="pa-0">
        <v-list lines="one">
          <v-list-item
            v-for="(subject, index) in subjects"
            :key="subject.order"
          >
            <template v-slot:prepend>
              <div class="d-flex flex-column align-center mr-2">
                <v-btn
                  :disabled="index === 0"
                  icon="mdi-chevron-up"
                  size="small"
                  variant="text"
                  @click="moveSubject(index, -1)"
                />
                <v-btn
                  :disabled="index === subjects.length - 1"
                  icon="mdi-chevron-down"
                  size="small"
                  variant="text"
                  @click="moveSubject(index, 1)"
                />
              </div>
            </template>

            <v-list-item-title>
              <v-text-field
                v-model="subject.name"
                density="compact"
                hide-details
                variant="plain"
                @blur="updateSubject(subject)"
              />
            </v-list-item-title>

            <template v-slot:append>
              <v-btn
                color="error"
                icon="mdi-delete"
                size="small"
                variant="text"
                @click="deleteSubject(subject)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- 底部提示 -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarText }}
    </v-snackbar>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import dataProvider from "@/utils/dataProvider.js";

export default {
  name: 'SubjectManagementCard',

  components: {
    SettingsCard
  },

  data() {
    return {
      loading: false,
      error: null,
      subjects: [],
      originalSubjects: null,
      newSubjectName: '',
      showSnackbar: false,
      snackbarText: '',
      snackbarColor: 'success',
      defaultSubjects: [
        {name: '语文', order: 0},
        {name: '数学', order: 1},
        {name: '英语', order: 2},
        {name: '物理', order: 3},
        {name: '化学', order: 4},
        {name: '生物', order: 5},
        {name: '政治', order: 6},
        {name: '历史', order: 7},
        {name: '地理', order: 8},
        {name: '其他', order: 9}
      ]
    };
  },

  computed: {
    hasChanges() {
      return this.originalSubjects &&
        JSON.stringify(this.subjects) !== JSON.stringify(this.originalSubjects);
    }
  },

  created() {
    this.loadConfig();
  },

  methods: {
    async loadConfig() {
      this.loading = true;
      try {
        const response = await dataProvider.loadData("classworks-config-subject");
        if (response) {
          // 数据存在且加载成功
          this.subjects = response.map((subject, index) => ({
            name: subject.name,
            order: subject.order ?? index
          })).sort((a, b) => a.order - b.order);
          this.originalSubjects = JSON.parse(JSON.stringify(this.subjects));
          this.showMessage('配置已加载', 'success');
        } else {
          // 数据不存在，使用空数组
          this.subjects = [];
          this.originalSubjects = [];
          this.showMessage('使用默认配置', 'info');
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        this.showMessage('加载失败，可继续编辑当前配置', 'warning');
      }
      this.loading = false;
    },

    async saveConfig() {
      this.loading = true;
      try {
        const response = await dataProvider.saveData("classworks-config-subject", this.subjects);
        if (response) {
          this.originalSubjects = JSON.parse(JSON.stringify(this.subjects));
          this.showMessage('配置已保存', 'success');
        } else {
          throw new Error(response || '保存失败');
        }
      } catch (error) {
        console.error('Failed to save config:', error);
        this.showMessage(`保存失败: ${error.message}，请稍后重试`, 'error');
      }
      this.loading = false;
    },

    showMessage(text, color = 'success') {
      this.snackbarText = text;
      this.snackbarColor = color;
      this.showSnackbar = true;
    },

    addSubject() {
      if (!this.newSubjectName) return;

      const subject = {
        name: this.newSubjectName,
        order: this.subjects.length
      };

      this.subjects.push(subject);
      this.newSubjectName = '';
    },

    updateSubject(subject) {
      const index = this.subjects.findIndex(s => s.order === subject.order);
      if (index > -1) {
        this.subjects[index] = {...subject};
      }
    },

    deleteSubject(subject) {
      const index = this.subjects.findIndex(s => s.order === subject.order);
      if (index > -1) {
        this.subjects.splice(index, 1);
        // 更新剩余科目的顺序
        this.subjects.forEach((s, i) => {
          s.order = i;
        });
      }
    },

    moveSubject(index, direction) {
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < this.subjects.length) {
        // 交换位置
        const temp = this.subjects[index];
        this.subjects[index] = this.subjects[newIndex];
        this.subjects[newIndex] = temp;
        // 更新顺序
        this.subjects.forEach((subject, i) => {
          subject.order = i;
        });
      }
    },

    resetToDefault() {
      this.subjects = JSON.parse(JSON.stringify(this.defaultSubjects));
      this.showMessage('已重置为默认科目列表', 'info');
    }
  }
};
</script>

<style scoped>
.v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.v-list-item:last-child {
  border-bottom: none;
}
</style>
