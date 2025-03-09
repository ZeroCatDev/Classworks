<template>
  <v-card
    border
    :color="hasChanges ? 'warning-subtle' : undefined"
    :class="{ 'unsaved-changes': hasChanges }"
  >
    <v-card-item>
      <template #prepend>
        <v-icon icon="mdi-account-group" size="large" class="mr-2" />
      </template>
      <v-card-title class="text-h6">学生列表</v-card-title>
      <template #append>
        <v-chip
          v-if="hasChanges"
          color="warning"
          size="small"
          class="mr-2"
        >
          未保存
        </v-chip>
        <v-btn
          :color="modelValue.advanced ? 'primary' : undefined"
          variant="text"
          prepend-icon="mdi-code-braces"
          @click="toggleAdvanced"
        >
          {{ modelValue.advanced ? '返回基础编辑' : '高级编辑' }}
        </v-btn>
      </template>
    </v-card-item>

    <v-card-text>
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
        class="mb-4"
      />

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        closable
        class="mb-4"
      >
        {{ error }}
      </v-alert>

      <v-expand-transition>
        <!-- 普通编辑模式 -->
        <div v-if="!modelValue.advanced">
          <v-row class="mb-6">
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="newStudent"
                label="添加学生"
                placeholder="输入学生姓名后回车添加"
                prepend-inner-icon="mdi-account-plus"
                variant="outlined"
                hide-details
                class="mb-4"
                @keyup.enter="addStudent"
              >
                <template #append>
                  <v-btn
                    icon="mdi-plus"
                    variant="text"
                    color="primary"
                    :disabled="!newStudent.trim()"
                    @click="addStudent"
                  />
                </template>
              </v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col
              v-for="(student, index) in modelValue.list"
              :key="index"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-hover v-slot="{ isHovering, props }">
                <v-card
                  v-bind="props"
                  :elevation="isMobile ? 1 : (isHovering ? 4 : 1)"
                  class="student-card"
                  border
                >
                  <v-card-text class="d-flex align-center pa-3">
                    <v-menu location="bottom" :open-on-hover="!isMobile">
                      <template #activator="{ props: menuProps }">
                        <v-btn
                          variant="tonal"
                          size="small"
                          class="mr-3 font-weight-medium"
                          v-bind="menuProps"
                        >
                          {{ index + 1 }}
                        </v-btn>
                      </template>

                      <v-list density="compact" nav>
                        <v-list-item
                          prepend-icon="mdi-arrow-up-bold"
                          :disabled="index === 0"
                          @click="moveStudent(index, 'top')"
                        >
                          置顶
                        </v-list-item>
                        <v-divider />
                        <v-list-item
                          prepend-icon="mdi-arrow-up"
                          :disabled="index === 0"
                          @click="moveStudent(index, 'up')"
                        >
                          上移
                        </v-list-item>
                        <v-list-item
                          prepend-icon="mdi-arrow-down"
                          :disabled="index === modelValue.list.length - 1"
                          @click="moveStudent(index, 'down')"
                        >
                          下移
                        </v-list-item>
                      </v-list>
                    </v-menu>

                    <v-text-field
                      v-if="editingIndex === index"
                      v-model="editingName"
                      density="compact"
                      variant="underlined"
                      hide-details
                      class="flex-grow-1"
                      autofocus
                      @keyup.enter="saveEdit"
                      @blur="saveEdit"
                    />
                    <span
                      v-else
                      class="text-body-1 flex-grow-1"
                      @click="handleClick(index, student)"
                    >
                      {{ student }}
                    </span>

                    <div class="d-flex gap-1 action-buttons" :class="{ 'opacity-100': isHovering || isMobile }">
                      <v-btn
                        icon="mdi-pencil"
                        variant="text"
                        color="primary"
                        size="small"
                        @click="startEdit(index, student)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        color="error"
                        size="small"
                        @click="removeStudent(index)"
                      />
                    </div>
                  </v-card-text>
                </v-card>
              </v-hover>
            </v-col>
          </v-row>
        </div>

        <!-- 高级编辑模式 -->
        <div v-else class="pt-2">
          <v-textarea
            v-model="text"
            label="批量编辑学生列表"
            placeholder="每行输入一个学生姓名"
            hint="使用文本编辑模式批量编辑学生名单，保存时会自动去除空行"
            persistent-hint
            variant="outlined"
            rows="10"
            @input="handleTextInput"
          />
        </div>
      </v-expand-transition>

      <v-row class="mt-6">
        <v-col cols="12" class="d-flex gap-2">
          <v-btn
            color="primary"
            prepend-icon="mdi-content-save"
            size="large"
            :loading="loading"
            :disabled="loading || !hasChanges"
            @click="handleSave"
          >
            保存名单
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            prepend-icon="mdi-refresh"
            size="large"
            :loading="loading"
            :disabled="loading || !hasChanges"
            @click="$emit('reload')"
          >
            重载名单
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'StudentListCard',
  props: {
    modelValue: {
      type: Object,
      required: true,
      default: () => ({
        list: [],
        text: '',
        advanced: false
      })
    },
    loading: Boolean,
    error: String,
    isMobile: Boolean,
    originalList: {
      type: Array,
      default: () => []
    }
  },

  data() {
    return {
      newStudent: '',
      editingIndex: -1,
      editingName: '',
      internalOriginalList: [] // 添加内部状态
    }
  },

  created() {
    // 初始化内部状态
    this.internalOriginalList = [...this.originalList];
  },

  watch: {
    originalList: {
      handler(newList) {
        this.internalOriginalList = [...newList];
      },
      immediate: true
    }
  },

  emits: ['update:modelValue', 'save', 'reload'],

  computed: {
    text: {
      get() {
        return this.modelValue.text;
      },
      set(value) {
        this.handleTextInput(value);
      }
    },
    hasChanges() {
      const currentList = this.modelValue.list;
      const originalList = this.internalOriginalList;

      if (currentList.length !== originalList.length) {
        return true;
      }

      // 使用 JSON 字符串比较来优化性能
      return JSON.stringify(currentList) !== JSON.stringify(originalList);
    }
  },

  methods: {
    toggleAdvanced() {
      const advanced = !this.modelValue.advanced;
      const text = advanced ? this.modelValue.list.join('\n') : this.modelValue.text;

      this.$emit('update:modelValue', {
        ...this.modelValue,
        advanced,
        text
      });
    },

    handleTextInput(value) {
      const list = value
        .split('\n')
        .map(s => s.trim())
        .filter(s => s);

      this.$emit('update:modelValue', {
        ...this.modelValue,
        text: value,
        list
      });
    },

    addStudent() {
      const name = this.newStudent.trim();
      if (name && !this.modelValue.list.includes(name)) {
        const newList = [...this.modelValue.list, name];
        this.$emit('update:modelValue', {
          ...this.modelValue,
          list: newList,
          text: newList.join('\n')
        });
        this.newStudent = '';
      }
    },

    removeStudent(index) {
      const newList = this.modelValue.list.filter((_, i) => i !== index);
      this.$emit('update:modelValue', {
        ...this.modelValue,
        list: newList,
        text: newList.join('\n')
      });
    },

    moveStudent(index, direction) {
      const newList = [...this.modelValue.list];
      let targetIndex;

      if (direction === 'top') {
        targetIndex = 0;
      } else if (direction === 'up') {
        targetIndex = index - 1;
      } else {
        targetIndex = index + 1;
      }

      if (targetIndex >= 0 && targetIndex < newList.length) {
        const [student] = newList.splice(index, 1);
        newList.splice(targetIndex, 0, student);

        this.$emit('update:modelValue', {
          ...this.modelValue,
          list: newList,
          text: newList.join('\n')
        });
      }
    },

    startEdit(index, name) {
      this.editingIndex = index;
      this.editingName = name;
    },

    saveEdit() {
      if (this.editingIndex !== -1 && this.editingName.trim()) {
        const newList = [...this.modelValue.list];
        newList[this.editingIndex] = this.editingName.trim();

        this.$emit('update:modelValue', {
          ...this.modelValue,
          list: newList,
          text: newList.join('\n')
        });
      }
      this.editingIndex = -1;
      this.editingName = '';
    },

    handleClick(index, student) {
      // 如果是移动端，点击即开始编辑
      if (this.isMobile) {
        this.startEdit(index, student);
      }
    },

    async handleSave() {
      await this.$emit('save');
      // 保存成功后更新内部状态
      this.internalOriginalList = [...this.modelValue.list];
    }
  }
}
</script>

<style scoped>
.student-card {
  transition: all 0.2s ease;
}

.action-buttons {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.unsaved-changes {
  animation: subtle-pulse 2s infinite;
  border: 2px solid rgb(var(--v-theme-warning));
}

@keyframes subtle-pulse {
  0% { border-color: rgba(var(--v-theme-warning), 1); }
  50% { border-color: rgba(var(--v-theme-warning), 0.5); }
  100% { border-color: rgba(var(--v-theme-warning), 1); }
}

@media (max-width: 600px) {
  .action-buttons {
    opacity: 1;
  }
}
</style>
