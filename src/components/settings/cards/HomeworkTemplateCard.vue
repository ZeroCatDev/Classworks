<template>
  <settings-card
    title="作业模板配置"
    icon="mdi-book-edit"
    :loading="loading"
    border
  >
    <!-- 顶部操作按钮 -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="loadConfig"
          class="mr-2"
        >
          重新加载配置
        </v-btn>
        <v-btn
          color="success"
          size="large"
          prepend-icon="mdi-content-save"
          :loading="loading"
          @click="saveConfig"
        >
          保存所有更改
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

    <v-row>
      <v-col cols="12" md="6">
        <setting-group title="科目配置" icon="mdi-book" border>
          <v-list>
            <v-list-item>
              <v-text-field
                v-model="newSubject"
                label="添加新科目"
                variant="outlined"
                density="comfortable"
                append-inner-icon="mdi-plus"
                @click:append-inner="addSubject"
                @keyup.enter="addSubject"
              />
            </v-list-item>

            <v-list-item v-for="subject in subjectList" :key="subject">
              <v-card border class="w-100 mb-2">
                <v-card-title class="d-flex align-center">
                  <v-text-field
                    v-model="editedSubjects[subject]"
                    :placeholder="subject"
                    density="comfortable"
                    variant="plain"
                    hide-details
                    @blur="updateSubject(subject)"
                  />
                  <v-spacer />
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    size="small"
                    @click="deleteSubject(subject)"
                  />
                </v-card-title>
                <v-card-text>
                  <v-text-field
                    v-model="newBookTypes[subject]"
                    label="添加作业本名称"
                    variant="outlined"
                    density="comfortable"
                    class="mb-2"
                    append-inner-icon="mdi-plus"
                    @click:append-inner="() => addBookType(subject)"
                    @keyup.enter="() => addBookType(subject)"
                  />

                  <v-list density="compact" border rounded>
                    <v-list-item
                      v-for="(books, bookType) in config.subjects[subject].books"
                      :key="bookType"
                      :title="bookType"
                      @click="openSubjectBookDialog(subject, bookType, books)"
                    >
                      <template v-slot:prepend>
                        <v-icon icon="mdi-book-open-variant" class="mr-2" />
                      </template>
                      <template v-slot:append>
                        <v-chip
                          size="small"
                          class="mr-2"
                          color="info"
                        >
                          {{ books.length }}个部分
                        </v-chip>
                        <v-btn
                          icon="mdi-delete"
                          variant="text"
                          color="error"
                          size="small"
                          @click.stop="() => deleteBookType(subject, bookType)"
                        />
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-list-item>
          </v-list>
        </setting-group>
      </v-col>

      <v-col cols="12" md="6">
        <setting-group title="通用配置" icon="mdi-cog" border>
          <v-list>
            <v-list-item>
              <v-text-field
                v-model="newCommonBook"
                label="添加作业本名称"
                variant="outlined"
                density="comfortable"
                append-inner-icon="mdi-plus"
                @click:append-inner="addCommonBook"
                @keyup.enter="addCommonBook"
              />
            </v-list-item>

            <v-list-item>
              <v-list density="compact" border rounded>
                <v-list-item
                  v-for="(books, bookType) in config.commonSubject.books"
                  :key="bookType"
                  :title="bookType"
                  @click="openSubjectBookDialog('common', bookType, books)"
                >
                  <template v-slot:prepend>
                    <v-icon icon="mdi-book-multiple" class="mr-2" />
                  </template>
                  <template v-slot:append>
                    <v-chip
                      size="small"
                      class="mr-2"
                      color="info"
                    >
                      {{ books.length }}个部分
                    </v-chip>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="small"
                      @click.stop="() => deleteBookType('common', bookType)"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </v-list-item>

            <v-divider class="my-2" />

            <v-list-item>
              <v-text-field
                v-model="newAction"
                label="添加操作"
                variant="outlined"
                density="comfortable"
                append-inner-icon="mdi-plus"
                @click:append-inner="addAction"
                @keyup.enter="addAction"
              />
            </v-list-item>

            <v-list-item>
              <v-list density="compact" border rounded>
                <v-list-item
                  v-for="action in config.actions"
                  :key="action"
                  :title="action"
                  @click="openActionDialog(action)"
                >
                  <template v-slot:append>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="small"
                      @click.stop="removeAction(action)"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </v-list-item>
          </v-list>
        </setting-group>
      </v-col>
    </v-row>

    <!-- 编辑弹框 -->
    <v-dialog v-model="dialog.show" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          {{ dialog.title }}
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="dialog.editedItem.name"
                  :label="dialog.nameLabel"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || '名称不能为空']"
                />
              </v-col>

              <v-col cols="12" v-if="dialog.editedItem.type === 'subjectBook'">
                <div class="text-subtitle-2 mb-2">所属科目</div>
                <v-chip color="primary">{{ dialog.editedItem.subject }}</v-chip>
              </v-col>

              <v-col cols="12" v-if="['subjectBook', 'commonBook'].includes(dialog.editedItem.type)">
                <v-card variant="outlined">
                  <v-card-title class="text-subtitle-1 py-2">需完成部分</v-card-title>
                  <v-card-text class="pt-0">
                    <v-list density="compact" border rounded class="mb-2">
                      <v-list-item
                        v-for="(task, index) in dialog.editedItem.tasks"
                        :key="index"
                      >
                        <template v-slot:prepend>
                          <v-icon icon="mdi-checkbox-blank-circle-outline" size="small" class="mr-2" />
                        </template>
                        <v-text-field
                          v-model="dialog.editedItem.tasks[index]"
                          variant="plain"
                          density="compact"
                          hide-details
                        />
                        <template v-slot:append>
                          <v-btn
                            icon="mdi-delete"
                            variant="text"
                            color="error"
                            size="small"
                            @click="removeTask(index)"
                          />
                        </template>
                      </v-list-item>
                    </v-list>
                    <v-text-field
                      v-model="newTask"
                      label="添加需完成部分"
                      variant="outlined"
                      density="comfortable"
                      append-inner-icon="mdi-plus"
                      @click:append-inner="addTask"
                      @keyup.enter="addTask"
                      class="mt-2"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            @click="saveDialog"
          >
            关闭
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            @click="closeDialog"
          >
            取消
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 底部保存提示 -->
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
import { reactive } from 'vue';
import SettingsCard from '@/components/SettingsCard.vue';
import SettingGroup from '@/components/settings/SettingGroup.vue';
import dataProvider from "@/utils/dataProvider.js";

const DEFAULT_CONFIG = {
  subjects: {
    "语文": {
      books: {
        "课本": ["第一单元", "第二单元"],
        "练习册": ["第一章", "第二章"]
      }
    },
    "数学": {
      books: {
        "课本": ["第一章", "第二章"],
        "习题册": ["基础练习", "提高练习"]
      }
    },
    "英语": {
      books: {
        "课本": ["Unit 1", "Unit 2"],
        "练习册": ["Chapter 1", "Chapter 2"]
      }
    }
  },
  commonSubject: {
    books: {
      "试卷": ["单元测试", "期中测试", "期末测试"],
      "假期作业": ["必做题", "选做题"]
    }
  },
  actions: ["写完", "下一课", "不交", "明天交"]
};

export default {
  name: 'HomeworkTemplateCard',

  components: {
    SettingsCard,
    SettingGroup
  },

  data() {
    return {
      loading: false,
      error: null,
      config: reactive(JSON.parse(JSON.stringify(DEFAULT_CONFIG))),
      originalConfig: null,
      newSubject: '',
      newCommonBook: '',
      newAction: '',
      newTask: '',
      editedSubjects: {},
      editedBookTypes: {},
      newBookTypes: {},
      newBooks: {},
      showSnackbar: false,
      snackbarText: '',
      snackbarColor: 'success',
      isNewConfig: true,
      dialog: {
        show: false,
        title: '',
        nameLabel: '',
        editedItem: {
          name: '',
          type: '', // 'book', 'commonBook', 'action'
          subject: '',
          bookType: '',
          originalName: '',
          tasks: []
        }
      }
    };
  },

  computed: {
    subjectList() {
      return Object.keys(this.config.subjects);
    },
    hasChanges() {
      if (this.isNewConfig) return true;
      return this.originalConfig &&
        JSON.stringify(this.config) !== JSON.stringify(this.originalConfig);
    }
  },

  created() {
    this.loadConfig();
  },

  methods: {
    async loadConfig() {
      this.loading = true;
      try {
        const response = await dataProvider.loadData("classworks-config-homework-template");
        if (response) {
          // 数据存在且加载成功
          const config = response;
          Object.assign(this.config, config);
          this.originalConfig = JSON.parse(JSON.stringify(config));
          this.isNewConfig = false;
          this.showMessage('配置已加载', 'success');
        } else if (response.error?.code === 'NOT_FOUND') {
          // 数据不存在，使用默认配置
          this.showMessage('使用默认配置', 'info');
          this.isNewConfig = true;
        } else {
          // 其他错误，继续使用当前配置
          const errorMsg = response.error?.message || '加载失败';
          this.showMessage(`加载失败: ${errorMsg}，可继续编辑当前配置`, 'warning');
        }
      } catch (error) {
        // 发生错误，继续使用当前配置
        console.error('Failed to load config:', error);
        this.showMessage('加载失败，可继续编辑当前配置', 'warning');
      }
      this.loading = false;
    },

    async saveConfig() {
      this.loading = true;
      try {
        const response = await dataProvider.saveData("classworks-config-homework-template", this.config);
        if (response) {
          this.originalConfig = JSON.parse(JSON.stringify(this.config));
          this.isNewConfig = false;
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
      if (!this.newSubject) return;
      if (!this.config.subjects[this.newSubject]) {
        this.config.subjects[this.newSubject] = { books: {} };
      }
      this.newSubject = '';
    },

    updateSubject(oldSubject) {
      const newSubject = this.editedSubjects[oldSubject];
      if (newSubject && newSubject !== oldSubject) {
        const subjectData = this.config.subjects[oldSubject];
        this.config.subjects[newSubject] = subjectData;
        delete this.config.subjects[oldSubject];
      }
      delete this.editedSubjects[oldSubject];
    },

    deleteSubject(subject) {
      delete this.config.subjects[subject];
    },

    addBookType(subject) {
      const newType = this.newBookTypes[subject];
      if (!newType) return;

      if (!this.config.subjects[subject].books[newType]) {
        this.config.subjects[subject].books[newType] = [];
      }
      this.newBookTypes[subject] = '';
    },

    updateBookType(subject, oldType) {
      const key = `${subject}-${oldType}`;
      const newType = this.editedBookTypes[key];
      if (newType && newType !== oldType) {
        const books = this.config.subjects[subject].books[oldType];
        this.config.subjects[subject].books[newType] = books;
        delete this.config.subjects[subject].books[oldType];
      }
      delete this.editedBookTypes[key];
    },

    deleteBookType(subject, bookType) {
      if (subject === 'common') {
        delete this.config.commonSubject.books[bookType];
      } else {
        delete this.config.subjects[subject].books[bookType];
      }
    },

    addBook(subject, bookType) {
      const key = `${subject}-${bookType}`;
      const newBook = this.newBooks[key];
      if (!newBook) return;

      if (!this.config.subjects[subject].books[bookType].includes(newBook)) {
        this.config.subjects[subject].books[bookType].push(newBook);
      }
      this.newBooks[key] = '';
    },

    removeBook(subject, bookType, book) {
      const books = this.config.subjects[subject].books[bookType];
      const index = books.indexOf(book);
      if (index > -1) {
        books.splice(index, 1);
      }
    },

    addCommonBook() {
      if (!this.newCommonBook) return;
      if (!this.config.commonSubject.books[this.newCommonBook]) {
        this.config.commonSubject.books[this.newCommonBook] = [];
      }
      this.newCommonBook = '';
    },

    removeCommonBook(book) {
      delete this.config.commonSubject.books[book];
    },

    addAction() {
      if (!this.newAction) return;
      if (!this.config.actions.includes(this.newAction)) {
        this.config.actions.push(this.newAction);
      }
      this.newAction = '';
    },

    removeAction(action) {
      const index = this.config.actions.indexOf(action);
      if (index > -1) {
        this.config.actions.splice(index, 1);
      }
    },

    openBookDialog(subject, bookType, book) {
      this.dialog.show = true;
      this.dialog.title = '编辑需完成部分';
      this.dialog.nameLabel = '部分名称';
      this.dialog.editedItem = {
        name: book,
        type: 'book',
        subject,
        bookType,
        originalName: book,
        tasks: this.config.subjects[subject].books[bookType]
      };
    },

    openCommonBookDialog(book) {
      this.dialog.show = true;
      this.dialog.title = '编辑通用作业本';
      this.dialog.nameLabel = '作业本名称';
      this.dialog.editedItem = {
        name: book,
        type: 'commonBook',
        originalName: book,
        tasks: Array.isArray(this.config.commonSubject.books[book]) ? [...this.config.commonSubject.books[book]] : []
      };
    },

    openActionDialog(action) {
      this.dialog = {
        show: true,
        title: '编辑操作',
        nameLabel: '操作名称',
        editedItem: {
          name: action,
          type: 'action',
          originalName: action,
          tasks: []
        }
      };
    },

    addTask() {
      if (!this.newTask) return;
      if (!this.dialog.editedItem.tasks) {
        this.dialog.editedItem.tasks = [];
      }
      this.dialog.editedItem.tasks.push(this.newTask);
      this.newTask = '';
    },

    removeTask(index) {
      this.dialog.editedItem.tasks.splice(index, 1);
    },

    openSubjectBookDialog(subject, bookType, books) {
      this.dialog.show = true;
      this.dialog.title = subject === 'common' ? '编辑通用作业本' : '编辑作业本';
      this.dialog.nameLabel = '作业本名称';
      this.dialog.editedItem = {
        name: bookType,
        type: 'subjectBook',
        subject,
        originalName: bookType,
        tasks: Array.isArray(books) ? [...books] : []
      };
    },

    saveDialog() {
      const { type, name, subject, originalName, tasks } = this.dialog.editedItem;

      if (!name) {
        this.showMessage('名称不能为空', 'error');
        return;
      }

      let actionIndex;
      const targetBooks = subject === 'common'
        ? this.config.commonSubject.books
        : subject ? this.config.subjects[subject].books : null;

      switch (type) {
        case 'subjectBook':
          if (targetBooks) {
            if (originalName !== name) {
              // 如果名称改变了，需要创建新的条目并删除旧的
              targetBooks[name] = tasks || [];
              delete targetBooks[originalName];
            } else {
              // 如果只改变了任务列表
              targetBooks[name] = tasks || [];
            }
          }
          break;
        case 'action':
          actionIndex = this.config.actions.indexOf(originalName);
          if (actionIndex > -1) {
            this.config.actions[actionIndex] = name;
          }
          break;
      }

      this.closeDialog();
      //this.showMessage('修改成功', 'success');
    },

    closeDialog() {
      this.dialog = {
        show: false,
        title: '',
        nameLabel: '',
        editedItem: {
          name: '',
          type: '',
          subject: '',
          originalName: '',
          tasks: []
        }
      };
      this.newTask = '';
    }
  }
};
</script>

<style scoped>
.v-card-text {
  padding-top: 0;
}
</style>