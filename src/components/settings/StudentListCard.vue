<template>
  <v-card
    border
    :color="unsavedChanges ? 'warning-subtle' : undefined"
    :class="{ 'unsaved-changes': unsavedChanges }"
  >
    <v-card-item>
      <template #prepend>
        <v-icon icon="mdi-account-group" size="large" class="mr-2" />
      </template>
      <v-card-title class="text-h6">学生列表</v-card-title>
      <template #append>
        <unsaved-warning :show="unsavedChanges" message="有未保存的更改" />
        <v-btn
          prepend-icon="mdi-sort-alphabetical-variant"
          variant="text"
          class="mr-2"
          @click="sortStudentsByPinyin"
          :disabled="modelValue.list.length === 0"
        >
          按姓名首字母排序
        </v-btn>
        <v-btn
          :color="modelValue.advanced ? 'primary' : undefined"
          variant="text"
          prepend-icon="mdi-code-braces"
          @click="toggleAdvanced"
        >
          {{ modelValue.advanced ? "返回基础编辑" : "高级编辑" }}
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

      <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4">
        {{ error }}
      </v-alert>

      <v-expand-transition>
        <!-- 普通编辑模式 -->
        <div v-if="!modelValue.advanced">
          <v-row class="mb-6">
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="newStudentName"
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
                    :disabled="!newStudentName.trim()"
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
                  :elevation="isMobile ? 1 : isHovering ? 4 : 1"
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
                      v-if="editState.index === index"
                      v-model="editState.name"
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

                    <div
                      class="d-flex gap-1 action-buttons"
                      :class="{ 'opacity-100': isHovering || isMobile }"
                    >
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
            :disabled="loading"
            @click="$emit('save')"
          >
            保存名单
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            prepend-icon="mdi-refresh"
            size="large"
            :loading="loading"
            :disabled="loading"
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
import UnsavedWarning from "../common/UnsavedWarning.vue";
import "@/styles/warnings.scss";
import { pinyin } from "pinyin-pro";

export default {
  name: "StudentListCard",
  components: {
    UnsavedWarning,
  },
  props: {
    modelValue: {
      type: Object,
      required: true,
      default: () => ({
        list: [],
        text: "",
        advanced: false,
      }),
    },
    loading: Boolean,
    error: String,
    isMobile: Boolean,
    unsavedChanges: Boolean,
  },

  data() {
    return {
      newStudentName: "",
      editState: {
        index: -1,
        name: "",
      },
    };
  },

  emits: ["update:modelValue", "save", "reload"],

  computed: {
    text: {
      get() {
        return this.modelValue.text;
      },
      set(value) {
        this.handleTextInput(value);
      },
    },
  },

  methods: {
    // UI 相关方法
    toggleAdvanced() {
      const advanced = !this.modelValue.advanced;
      this.updateModelValue({
        advanced,
        text: advanced ? this.modelValue.list.join("\n") : this.modelValue.text,
        list: this.modelValue.list,
      });
    },

    updateModelValue(newData) {
      this.$emit("update:modelValue", {
        ...this.modelValue,
        ...newData,
      });
    },

    // 基础编辑操作
    addStudent() {
      const name = this.newStudentName.trim();
      if (!name || this.modelValue.list.includes(name)) return;

      const newList = [...this.modelValue.list, name];
      this.updateModelValue({
        list: newList,
        text: newList.join("\n"),
      });
      this.newStudentName = "";
    },

    removeStudent(index) {
      const newList = this.modelValue.list.filter((_, i) => i !== index);
      this.updateModelValue({
        list: newList,
        text: newList.join("\n"),
      });
    },

    moveStudent(index, direction) {
      const newList = [...this.modelValue.list];
      let targetIndex;

      if (direction === "top") {
        targetIndex = 0;
      } else if (direction === "up") {
        targetIndex = index - 1;
      } else {
        targetIndex = index + 1;
      }

      if (targetIndex >= 0 && targetIndex < newList.length) {
        const [student] = newList.splice(index, 1);
        newList.splice(targetIndex, 0, student);

        this.updateModelValue({
          list: newList,
          text: newList.join("\n"),
        });
      }
    },

    // 文本编辑操作
    startEdit(index, name) {
      this.editState = { index, name };
    },

    saveEdit() {
      const { index, name } = this.editState;
      if (index === -1 || !name.trim()) return;

      const newList = [...this.modelValue.list];
      newList[index] = name.trim();

      this.updateModelValue({
        list: newList,
        text: newList.join("\n"),
      });
      this.editState = { index: -1, name: "" };
    },

    handleClick(index, student) {
      if (this.isMobile) {
        this.startEdit(index, student);
      }
    },

    handleTextInput(value) {
      const list = value
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s);

      this.updateModelValue({
        text: value,
        list,
      });
    },

    sortStudentsByPinyin() {
      const newList = [...this.modelValue.list].sort((a, b) => {
        const pinyinA = pinyin(a, { toneType: "none" ,mode: 'surname'});
        const pinyinB = pinyin(b, { toneType: "none",mode: 'surname' });
        return pinyinA.localeCompare(pinyinB);
      });

      this.updateModelValue({
        list: newList,
        text: newList.join("\n"),
      });
    },
  },
};
</script>

<style scoped>
.student-card {
  transition: all 0.2s ease;
}

.action-buttons {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* 修改警告样式的选择器和实现 */
.v-card.unsaved-changes {
  animation: pulse-warning 2s infinite;
  border: 2px solid rgb(var(--v-theme-warning)) !important;
}

@keyframes pulse-warning {
  0%,
  100% {
    border-color: rgba(var(--v-theme-warning), 1) !important;
  }
  50% {
    border-color: rgba(var(--v-theme-warning), 0.5) !important;
  }
}

/* 移动端样式 */
@media (max-width: 600px) {
  .action-buttons {
    opacity: 1;
  }
}
</style>
