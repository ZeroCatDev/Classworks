<template>
  <v-card
    :class="{ 'unsaved-changes': unsavedChanges }"
    :color="unsavedChanges ? 'warning-subtle' : undefined"
    border
  >
    <v-card-item>
      <template #prepend>
        <v-icon
          class="mr-2"
          icon="mdi-account-tie"
          size="large"
        />
      </template>
      <v-card-title class="text-h6">
        教师列表
      </v-card-title>
      <template #append>
        <unsaved-warning
          :show="unsavedChanges"
          message="有未保存的更改"
        />
        <v-btn
          :color="modelValue.advanced ? 'primary' : undefined"
          prepend-icon="mdi-code-braces"
          variant="text"
          @click="toggleAdvanced"
        >
          {{ modelValue.advanced ? "返回基础编辑" : "高级编辑" }}
        </v-btn>
      </template>
    </v-card-item>

    <v-card-text>
      <v-progress-linear
        v-if="loading"
        class="mb-4"
        color="primary"
        indeterminate
      />

      <v-alert
        v-if="error"
        class="mb-4"
        closable
        type="error"
        variant="tonal"
      >
        {{ error }}
      </v-alert>

      <v-expand-transition>
        <!-- 普通编辑模式 -->
        <div v-if="!modelValue.advanced">
          <!-- 添加教师表单 -->
          <v-card
            class="mb-6"
            variant="outlined"
          >
            <v-card-text>
              <v-row>
                <v-col
                  cols="12"
                  md="4"
                >
                  <v-text-field
                    v-model="newTeacher.name"
                    density="comfortable"
                    hide-details
                    label="教师姓名"
                    placeholder="输入教师姓名"
                    prepend-inner-icon="mdi-account"
                    variant="outlined"
                  />
                </v-col>
                <v-col
                  cols="12"
                  md="5"
                >
                  <v-combobox
                    v-model="newTeacher.subjects"
                    :items="commonSubjects"
                    chips
                    clearable
                    closable-chips
                    density="comfortable"
                    hide-details
                    label="任教科目"
                    multiple
                    placeholder="选择或输入科目"
                    prepend-inner-icon="mdi-book-open-variant"
                    variant="outlined"
                  />
                </v-col>
                <v-col
                  cols="12"
                  md="3"
                  class="d-flex align-center gap-2"
                >
                  <v-checkbox
                    v-model="newTeacher.isHeadTeacher"
                    density="comfortable"
                    hide-details
                    label="班主任"
                  />
                  <v-btn
                    :disabled="!newTeacher.name.trim() || newTeacher.subjects.length === 0"
                    color="primary"
                    prepend-icon="mdi-plus"
                    @click="addTeacher"
                  >
                    添加教师
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- 教师列表 -->
          <v-row v-if="modelValue.list.length === 0">
            <v-col cols="12">
              <v-alert
                type="info"
                variant="tonal"
              >
                暂无教师信息，请添加教师
              </v-alert>
            </v-col>
          </v-row>

          <v-row v-else>
            <v-col
              v-for="(teacher, index) in modelValue.list"
              :key="index"
              cols="12"
              lg="6"
              xl="4"
            >
              <v-hover v-slot="{ isHovering, props }">
                <v-card
                  :elevation="isMobile ? 1 : isHovering ? 4 : 1"
                  border
                  class="teacher-card"
                  v-bind="props"
                >
                  <v-card-text class="pa-4">
                    <div class="d-flex align-start mb-3">
                      <v-avatar
                        :color="teacher.isHeadTeacher ? 'primary' : 'grey-lighten-1'"
                        class="mr-3"
                        size="48"
                      >
                        <v-icon
                          :icon="teacher.isHeadTeacher ? 'mdi-star' : 'mdi-account'"
                          size="28"
                        />
                      </v-avatar>

                      <div class="flex-grow-1">
                        <div class="d-flex align-center mb-1">
                          <v-text-field
                            v-if="editState.index === index"
                            v-model="editState.teacher.name"
                            autofocus
                            class="flex-grow-1"
                            density="compact"
                            hide-details
                            variant="underlined"
                          />
                          <span
                            v-else
                            class="text-h6 font-weight-medium"
                            @click="handleClick(index, teacher)"
                          >
                            {{ teacher.name }}
                          </span>
                          <v-chip
                            v-if="teacher.isHeadTeacher"
                            class="ml-2"
                            color="primary"
                            density="comfortable"
                            size="small"
                            variant="flat"
                          >
                            班主任
                          </v-chip>
                        </div>

                        <div
                          v-if="editState.index === index"
                          class="mt-2"
                        >
                          <v-combobox
                            v-model="editState.teacher.subjects"
                            :items="commonSubjects"
                            chips
                            closable-chips
                            density="compact"
                            hide-details
                            label="任教科目"
                            multiple
                            variant="outlined"
                          />
                          <v-checkbox
                            v-model="editState.teacher.isHeadTeacher"
                            class="mt-2"
                            density="compact"
                            hide-details
                            label="班主任"
                          />
                        </div>
                        <div
                          v-else
                          class="mt-1"
                        >
                          <v-chip
                            v-for="(subject, sIndex) in teacher.subjects"
                            :key="sIndex"
                            class="mr-1 mb-1"
                            density="comfortable"
                            size="small"
                            variant="tonal"
                          >
                            {{ subject }}
                          </v-chip>
                        </div>
                      </div>

                      <div
                        :class="{ 'opacity-100': isHovering || isMobile || editState.index === index }"
                        class="d-flex gap-1 action-buttons ml-2"
                      >
                        <v-btn
                          v-if="editState.index === index"
                          color="success"
                          icon="mdi-check"
                          size="small"
                          variant="text"
                          @click="saveEdit"
                        />
                        <v-btn
                          v-if="editState.index === index"
                          color="grey"
                          icon="mdi-close"
                          size="small"
                          variant="text"
                          @click="cancelEdit"
                        />
                        <v-btn
                          v-else
                          color="primary"
                          icon="mdi-pencil"
                          size="small"
                          variant="text"
                          @click="startEdit(index, teacher)"
                        />
                        <v-btn
                          v-if="editState.index !== index"
                          color="error"
                          icon="mdi-delete"
                          size="small"
                          variant="text"
                          @click="removeTeacher(index)"
                        />
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-hover>
            </v-col>
          </v-row>
        </div>

        <!-- 高级编辑模式 -->
        <div
          v-else
          class="pt-2"
        >
          <v-textarea
            v-model="modelValue.text"
            hint="JSON 格式编辑教师列表。每个教师需包含 name、subjects（数组）、isHeadTeacher（布尔值）"
            label="批量编辑教师列表 (JSON)"
            persistent-hint
            placeholder="[{&quot;name&quot;:&quot;教师姓名&quot;,&quot;subjects&quot;:[&quot;语文&quot;,&quot;数学&quot;],&quot;isHeadTeacher&quot;:true}]"
            rows="15"
            variant="outlined"
            @update:model-value="handleTextInput"
          />
        </div>
      </v-expand-transition>

      <v-row class="mt-6">
        <v-col
          class="d-flex gap-2"
          cols="12"
        >
          <v-btn
            :disabled="loading"
            :loading="loading"
            color="primary"
            prepend-icon="mdi-content-save"
            size="large"
            @click="saveTeachers"
          >
            保存教师列表
          </v-btn>
          <v-btn
            :disabled="loading"
            :loading="loading"
            color="error"
            prepend-icon="mdi-refresh"
            size="large"
            variant="outlined"
            @click="loadTeachers"
          >
            重载教师列表
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import UnsavedWarning from "../common/UnsavedWarning.vue";
import "@/styles/warnings.scss";
import dataProvider from "@/utils/dataProvider";
import {getSetting} from "@/utils/settings";

export default {
  name: "TeacherListCard",
  components: {
    UnsavedWarning,
  },
  props: {
    isMobile: Boolean,
  },

  data() {
    return {
      newTeacher: {
        name: "",
        subjects: [],
        isHeadTeacher: false,
      },
      editState: {
        index: -1,
        teacher: null,
      },
      modelValue: {
        list: [],
        text: "",
        advanced: false,
      },
      loading: false,
      error: null,
      lastSavedData: null,
      unsavedChanges: false,
      commonSubjects: [
        "语文",
        "数学",
        "英语",
        "物理",
        "化学",
        "生物",
        "政治",
        "历史",
        "地理",
        "信息技术",
        "音乐",
        "美术",
        "体育",
      ],
    };
  },

  watch: {
    modelValue: {
      handler(newData) {
        if (this.lastSavedData) {
          this.unsavedChanges = JSON.stringify(newData.list) !== JSON.stringify(this.lastSavedData);
        }
        if (!this.modelValue.advanced) {
          this.modelValue.text = JSON.stringify(newData.list, null, 2);
        }
      },
      deep: true,
    },
  },

  mounted() {
    this.loadTeachers();
  },

  methods: {
    async loadTeachers() {
      this.error = null;
      try {
        this.loading = true;
        const classNum = getSetting("server.classNumber");

        if (!classNum) {
          throw new Error("请先设置班号");
        }

        try {
          const response = await dataProvider.loadData("classworks-list-teacher");

          if (response.success !== false && Array.isArray(response)) {
            this.modelValue.list = response.map((item) => ({
              name: item.name || "",
              subjects: Array.isArray(item.subjects) ? item.subjects : [],
              isHeadTeacher: Boolean(item.isHeadTeacher),
            }));

            this.modelValue.text = JSON.stringify(this.modelValue.list, null, 2);
            this.lastSavedData = JSON.parse(JSON.stringify(this.modelValue.list));
            this.unsavedChanges = false;
          }
        } catch (error) {
          console.warn("Failed to load teacher list, initializing empty list", error);
          this.modelValue.list = [];
          this.modelValue.text = "[]";
          this.lastSavedData = [];
        }
      } catch (error) {
        console.error("加载教师列表失败:", error);
        this.error = error.message || "加载失败，请检查设置";
        this.$message?.error("加载失败", this.error);
      } finally {
        this.loading = false;
      }
    },

    async saveTeachers() {
      try {
        const classNum = getSetting("server.classNumber");

        if (!classNum) {
          throw new Error("请先设置班号");
        }

        const formattedList = this.modelValue.list.map((teacher) => ({
          name: teacher.name,
          subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [],
          isHeadTeacher: Boolean(teacher.isHeadTeacher),
        }));

        const response = await dataProvider.saveData(
          "classworks-list-teacher",
          formattedList
        );

        if (response.success === false) {
          throw new Error(response.error?.message || "保存失败");
        }

        this.modelValue.list = formattedList;
        this.lastSavedData = JSON.parse(JSON.stringify(formattedList));
        this.unsavedChanges = false;
        this.$message?.success("保存成功", "教师列表已更新");
      } catch (error) {
        console.error("保存教师列表失败:", error);
        this.$message?.error("保存失败", error.message || "请重试");
      }
    },

    toggleAdvanced() {
      this.modelValue.advanced = !this.modelValue.advanced;
      if (this.modelValue.advanced) {
        this.modelValue.text = JSON.stringify(this.modelValue.list, null, 2);
      }
    },

    handleTextInput(text) {
      if (!this.modelValue.advanced) return;

      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          this.modelValue.list = parsed.map((item) => ({
            name: item.name || "",
            subjects: Array.isArray(item.subjects) ? item.subjects : [],
            isHeadTeacher: Boolean(item.isHeadTeacher),
          }));
          this.error = null;
        } else {
          this.error = "JSON 必须是一个数组";
        }
      } catch (e) {
        // JSON 解析错误，不更新列表，用户可能还在输入
        this.error = "JSON 格式错误: " + e.message;
      }
    },

    addTeacher() {
      const name = this.newTeacher.name.trim();
      if (!name) {
        this.$message?.warning("提示", "请输入教师姓名");
        return;
      }
      if (this.newTeacher.subjects.length === 0) {
        this.$message?.warning("提示", "请选择至少一个任教科目");
        return;
      }

      this.modelValue.list.push({
        name,
        subjects: [...this.newTeacher.subjects],
        isHeadTeacher: this.newTeacher.isHeadTeacher,
      });

      // 重置表单
      this.newTeacher = {
        name: "",
        subjects: [],
        isHeadTeacher: false,
      };
    },

    startEdit(index, teacher) {
      this.editState.index = index;
      this.editState.teacher = {
        name: teacher.name,
        subjects: [...teacher.subjects],
        isHeadTeacher: teacher.isHeadTeacher,
      };
    },

    saveEdit() {
      if (this.editState.index !== -1) {
        const newName = this.editState.teacher.name.trim();
        if (!newName) {
          this.$message?.warning("提示", "教师姓名不能为空");
          return;
        }
        if (this.editState.teacher.subjects.length === 0) {
          this.$message?.warning("提示", "请选择至少一个任教科目");
          return;
        }

        this.modelValue.list[this.editState.index] = {
          name: newName,
          subjects: [...this.editState.teacher.subjects],
          isHeadTeacher: this.editState.teacher.isHeadTeacher,
        };

        this.editState.index = -1;
        this.editState.teacher = null;
      }
    },

    cancelEdit() {
      this.editState.index = -1;
      this.editState.teacher = null;
    },

    removeTeacher(index) {
      if (index !== undefined) {
        this.modelValue.list.splice(index, 1);
      }
    },

    handleClick(index, teacher) {
      if (this.isMobile) {
        this.startEdit(index, teacher);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.teacher-card {
  transition: all 0.2s ease;
}

.action-buttons {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.unsaved-changes {
  border-color: rgb(var(--v-theme-warning)) !important;
}
</style>
