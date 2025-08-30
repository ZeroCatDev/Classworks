<template>
  <div>
    <!-- 错误提示 -->
    <v-alert
      v-if="error"
      type="error"
      class="mb-4 mt-3 mx-2"
      variant="tonal"
      border="start"
      closable
      @click:close="error = ''"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-alert-circle</v-icon>
        {{ error }}
      </div>
    </v-alert>

    <!-- 成功提示 -->
    <v-alert
      v-if="success"
      type="success"
      class="mb-4 mt-3 mx-2"
      variant="tonal"
      border="start"
      closable
      @click:close="success = ''"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-check-circle</v-icon>
        {{ success }}
      </div>
    </v-alert>

    <!-- 验证错误提示 -->
    <v-alert
      v-if="hasValidationErrors && !loading"
      type="warning"
      class="mb-4 mt-3 mx-2"
      variant="tonal"
      border="start"
    >
      <div class="d-flex align-center">
        <span class="font-weight-bold">配置验证失败，请检查以下问题：</span>
      </div>
      <v-list density="compact" class="bg-transparent">
        <v-list-item
          v-for="(error, index) in validationErrors"
          :key="index"
          class="px-0 py-0"
        >
          <template v-slot:prepend>
            <v-icon size="small" color="warning">mdi-circle-small</v-icon>
          </template>
          <v-list-item-title class="text-body-2">{{ error }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-alert>

    <!-- 加载状态 -->
    <v-card v-if="loading" class="my-4" outlined>
      <v-card-text>
        <v-skeleton-loader type="article" class="mx-auto"></v-skeleton-loader>
      </v-card-text>
    </v-card>

    <!-- 模式切换按钮和操作按钮 -->
    <div v-if="!loading" class="d-flex justify-space-between align-center mb-4">
      <div class="d-flex align-center gap-2">
        <v-btn
          color="success"
          variant="elevated"
          prepend-icon="mdi-open-in-new"
          @click="openConfig"
          class="mr-2 text-none"
          :disabled="!isValidConfig"
        >
          打开 ExamSchedule
        </v-btn>

        <v-tooltip
          v-if="!isValidConfig"
          activator="parent"
          location="bottom"
        >
          <span>请先完善配置信息后再打开</span>
        </v-tooltip>
      </div>
      <v-btn-toggle
        v-model="isEditMode"
        color="primary"
        variant="outlined"
        divided
      >  <v-btn
          class="text-error"
          prepend-icon="mdi-delete"
          @click="confirmDelete"

        >
          删除配置
        </v-btn>
        <v-btn :value="false" prepend-icon="mdi-eye"> 预览 </v-btn>
        <v-btn :value="true" prepend-icon="mdi-pencil"> 编辑 </v-btn>
      </v-btn-toggle>
    </div>

    <!-- 预览模式 -->
    <div v-if="!loading && !isEditMode">
      <div class="mb-8">
        <div class="text-h3 font-weight-bold" style="line-height: 1.2">
          {{ localConfig.examName || "未设置考试名称" }}
        </div>
        <div
          class="text-subtitle-1 text-grey"
          style="white-space: pre-wrap; line-height: 1.8"
        >
          {{ localConfig.message || "未设置考试提示" }}
        </div>
        <v-chip v-if="localConfig.room" size="large" class="px-4 py-2">
          <v-icon start>mdi-home</v-icon>
          考场：{{ localConfig.room }}
        </v-chip>
      </div>
      <div
        v-if="localConfig.examInfos && localConfig.examInfos.length > 0"
        class="mb-8"
      >
        <v-row>
          <v-col
            v-for="(examInfo, index) in localConfig.examInfos"
            :key="index"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card variant="tonal" class="h-100" hover>
              <v-card-title class="bg-primary-lighten-5 pa-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-book-open-page-variant</v-icon>
                  <span class="">{{ examInfo.name || "未设置科目" }}</span>
                </div>
              </v-card-title>
              <v-card-text class="pa-4">
                <div class="mb-3">
                  <div class="d-flex align-center mb-1">
                    <v-icon size="small" class="mr-2" color="success"
                      >mdi-clock-start</v-icon
                    >
                    <span class="text-body-2 text-grey-darken-1">开始时间</span>
                  </div>
                  <div class="text-h6 font-weight-medium text-success">
                    {{ examInfo.startFormatted || examInfo.start || "未设置" }}
                  </div>
                </div>
                <div>
                  <div class="d-flex align-center mb-1">
                    <v-icon size="small" class="mr-2" color="error"
                      >mdi-clock-end</v-icon
                    >
                    <span class="text-body-2 text-grey-darken-1">结束时间</span>
                  </div>
                  <div class="text-h6 font-weight-medium text-error">
                    {{ examInfo.endFormatted || examInfo.end || "未设置" }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
      <div v-else class="text-center py-12">
        <v-icon size="80" color="grey-lighten-2" class="mb-4">
          mdi-calendar-blank
        </v-icon>
        <div class="text-h5 text-grey-darken-1 mb-2">暂无考试科目安排</div>
        <div class="text-body-1 text-grey mb-4">
          点击上方"添加科目"按钮开始配置考试时间表
        </div>
        <v-btn color="primary" variant="outlined" @click="quickEdit">
          <v-icon start>mdi-plus</v-icon>
          立即添加
        </v-btn>
      </div>

      <!-- JSON预览 -->
      <v-card class="mb-4" elevation="2" border>
        <v-card-title
          class="d-flex align-center text-white cursor-pointer"
          @click="showJsonPreview = !showJsonPreview"
        >
          <v-icon class="mr-2">mdi-code-json</v-icon>
          JSON配置预览
          <v-spacer></v-spacer>
          <v-btn
            color="white"
            variant="outlined"
            prepend-icon="mdi-content-copy"
            size="small"
            @click.stop="copyToClipboard"
          >
            复制
          </v-btn>
          <v-btn
            color="white"
            variant="text"
            size="small"
            :icon="showJsonPreview ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            class="ml-2"
          >
          </v-btn>
        </v-card-title>
        <v-expand-transition>
          <v-card-text v-show="showJsonPreview" class="pa-4">
            <v-card variant="tonal" class="pa-4">
              <pre class="json-preview"><code>{{ formattedJson }}</code></pre>
            </v-card>
          </v-card-text>
        </v-expand-transition>
      </v-card>
    </div>

    <!-- 编辑模式 -->
    <div v-if="!loading && isEditMode">
      <!-- 基本信息 -->
      <v-card class="mb-4" elevation="1" border>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-information</v-icon>
          基本信息
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="localConfig.examName"
                label="考试名称"
                prepend-inner-icon="mdi-calendar-text"
                variant="outlined"
                :rules="[(v) => !!v || '考试名称不能为空']"
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="localConfig.room"
                label="考场号（标准ES尚不支持此配置）"
                prepend-inner-icon="mdi-home"
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-textarea
            v-model="localConfig.message"
            label="考试提示"
            prepend-inner-icon="mdi-message-text"
            variant="outlined"
            rows="3"
            placeholder="输入考试相关的提示信息..."
          ></v-textarea>

          <!-- 默认提示选项 -->
          <v-chip-group
            v-if="!localConfig.message || localConfig.message.trim() === ''"
            class="mt-2"
            column
          >
            <v-chip
              v-for="(tip, index) in defaultExamTips"
              :key="index"
              color="primary"
              variant="outlined"
              size="small"
              @click="selectDefaultTip(tip)"
              class="ma-1"
            >
              <v-icon start size="small">mdi-plus</v-icon>
              {{ tip }}
            </v-chip>
          </v-chip-group>
          <div class="text-caption text-medium-emphasis ml-2">
            <v-icon size="small" class="mr-1">mdi-lightbulb-outline</v-icon>
            点击上方选项快速添加常用考试提示
          </div>
        </v-card-text>
      </v-card>

      <!-- 考试科目安排 -->
      <v-card class="mb-4" elevation="1" border>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
          考试科目安排
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            size="small"
            @click="addExamInfo"
          >
            添加科目
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-list
            v-if="localConfig.examInfos && localConfig.examInfos.length > 0"
          >
            <v-list-item
              v-for="(examInfo, index) in localConfig.examInfos"
              :key="index"
              class="border-b pa-4"
            >
              <div class="w-100">
                <v-row>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="examInfo.name"
                      label="科目名称"
                      prepend-inner-icon="mdi-book"
                      variant="outlined"
                      density="comfortable"
                      :rules="[(v) => !!v || '科目名称不能为空']"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-menu
                      v-model="examInfo.startDateMenu"
                      :close-on-content-click="false"
                      transition="scale-transition"
                      offset-y
                      min-width="auto"
                    >
                      <template v-slot:activator="{ props }">
                        <v-text-field
                          v-model="examInfo.startFormatted"
                          label="开始时间"
                          prepend-inner-icon="mdi-clock-start"
                          variant="outlined"
                          density="comfortable"
                          readonly
                          v-bind="props"
                          :rules="[(v) => !!v || '开始时间不能为空']"
                        ></v-text-field>
                      </template>
                      <v-card min-width="600">
                        <v-card-title class="text-center py-2">
                          选择开始时间
                        </v-card-title>
                        <v-card-text class="pa-0">
                          <v-row no-gutters>
                            <v-col cols="6" class="border-e">
                              <v-date-picker
                                v-model="examInfo.startDate"
                                @update:model-value="updateStartDateTime(index)"
                                color="primary"
                                locale="zh-cn"
                                show-adjacent-months
                                elevation="0"
                              ></v-date-picker>
                            </v-col>
                            <v-col cols="6">
                              <v-time-picker
                                v-model="examInfo.startTime"
                                @update:model-value="updateStartDateTime(index)"
                                color="primary"
                                format="24hr"
                                scrollable
                                elevation="0"
                              ></v-time-picker>
                            </v-col>
                          </v-row>
                        </v-card-text>
                        <v-card-actions>
                          <v-spacer></v-spacer>
                          <v-btn
                            color="grey"
                            variant="text"
                            @click="examInfo.startDateMenu = false"
                          >
                            取消
                          </v-btn>
                          <v-btn
                            color="primary"
                            variant="text"
                            @click="examInfo.startDateMenu = false"
                          >
                            确定
                          </v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-menu
                      v-model="examInfo.endDateMenu"
                      :close-on-content-click="false"
                      transition="scale-transition"
                      offset-y
                      min-width="auto"
                    >
                      <template v-slot:activator="{ props }">
                        <v-text-field
                          v-model="examInfo.endFormatted"
                          label="结束时间"
                          prepend-inner-icon="mdi-clock-end"
                          variant="outlined"
                          density="comfortable"
                          readonly
                          v-bind="props"
                          :rules="[(v) => !!v || '结束时间不能为空']"
                        ></v-text-field>
                      </template>
                      <v-card min-width="600">
                        <v-card-title class="text-center py-2">
                          选择结束时间
                        </v-card-title>
                        <v-card-text class="pa-0">
                          <v-row no-gutters>
                            <v-col cols="6" class="border-e">
                              <v-date-picker
                                v-model="examInfo.endDate"
                                @update:model-value="updateEndDateTime(index)"
                                color="primary"
                                locale="zh-cn"
                                show-adjacent-months
                                elevation="0"
                              ></v-date-picker>
                            </v-col>
                            <v-col cols="6">
                              <v-time-picker
                                v-model="examInfo.endTime"
                                @update:model-value="updateEndDateTime(index)"
                                color="primary"
                                format="24hr"
                                scrollable
                                elevation="0"
                              ></v-time-picker>
                            </v-col>
                          </v-row>
                        </v-card-text>
                        <v-card-actions>
                          <v-spacer></v-spacer>
                          <v-btn
                            color="grey"
                            variant="text"
                            @click="examInfo.endDateMenu = false"
                          >
                            取消
                          </v-btn>
                          <v-btn
                            color="primary"
                            variant="text"
                            @click="examInfo.endDateMenu = false"
                          >
                            确定
                          </v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" md="2" class="d-flex align-center">
                    <v-btn
                      icon="mdi-delete"
                      color="error"
                      variant="text"
                      size="small"
                      @click="removeExamInfo(index)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                    <v-btn
                      v-if="index > 0"
                      icon="mdi-arrow-up"
                      color="primary"
                      variant="text"
                      size="small"
                      @click="moveExamInfo(index, -1)"
                    >
                      <v-icon>mdi-arrow-up</v-icon>
                    </v-btn>
                    <v-btn
                      v-if="index < localConfig.examInfos.length - 1"
                      icon="mdi-arrow-down"
                      color="primary"
                      variant="text"
                      size="small"
                      @click="moveExamInfo(index, 1)"
                    >
                      <v-icon>mdi-arrow-down</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
            </v-list-item>
          </v-list>
          <div v-else class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1" class="mb-2">
              mdi-book-plus
            </v-icon>
            <p class="text-body-2 text-grey-darken-1 mb-4">
              暂无考试科目，点击"添加科目"按钮开始添加
            </p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="addExamInfo">
              添加科目
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-delete-alert</v-icon>
          确认删除配置
        </v-card-title>
        <v-card-text>
          确定要删除配置 <strong>{{ localConfig.examName || `配置 ${configId}` }}</strong> 吗？
          <br><small class="text-grey">此操作不可撤销，将会删除所有相关数据</small>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="deleteDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            @click="deleteConfig"
            :loading="deleting"
          >
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import dataProvider from "@/utils/dataProvider";

export default {
  name: "ExamConfigEditor",
  props: {
    configId: {
      type: String,
      required: true,
    },
    // 是否在弹框模式下使用
    dialogMode: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["saved", "error", "opened", "deleted"],
  data() {
    return {
      localConfig: {
        examName: "",
        message: "",
        room: "",
        examInfos: [],
      },
      loading: false,
      saving: false,
      deleting: false,
      deleteDialog: false,
      error: "",
      success: "",
      isEditMode: false, // 新增：编辑模式状态
      showJsonPreview: false, // 新增：JSON预览显示状态
      defaultExamTips: [
        "请保持卷面整洁，字迹清晰，诚信应考。在听到终考铃时立刻起立，停止作答。",
        "沉着 冷静 细心 守记",
        "答题不守记，自己两行泪。",
      ],
    };
  },
  computed: {
    /**
     * 格式化的JSON字符串
     */
    formattedJson() {
      try {
        return JSON.stringify(this.localConfig, null, 2);
      } catch (err) {
        console.error("格式化JSON时出错:", err);
        return "无效的JSON格式";
      }
    },

    /**
     * 检查配置是否有效
     */
    isValidConfig() {
      return (
        this.localConfig.examName &&
        this.localConfig.message &&
        this.localConfig.examInfos &&
        this.localConfig.examInfos.length > 0 &&
        this.localConfig.examInfos.every(
          (info) => info.name && info.start && info.end
        )
      );
    },

    /**
     * 获取详细的验证错误信息
     */
    validationErrors() {
      const errors = [];

      if (
        !this.localConfig.examName ||
        this.localConfig.examName.trim() === ""
      ) {
        errors.push("考试名称不能为空");
      }

      if (!this.localConfig.message || this.localConfig.message.trim() === "") {
        errors.push("考试提示不能为空");
      }

      if (
        !this.localConfig.examInfos ||
        this.localConfig.examInfos.length === 0
      ) {
        errors.push("至少需要添加一个考试科目");
      } else {
        this.localConfig.examInfos.forEach((info, index) => {
          const subjectPrefix = `第${index + 1}个科目`;

          if (!info.name || info.name.trim() === "") {
            errors.push(`${subjectPrefix}的名称不能为空`);
          }

          if (!info.start) {
            errors.push(`${subjectPrefix}的开始时间不能为空`);
          }

          if (!info.end) {
            errors.push(`${subjectPrefix}的结束时间不能为空`);
          }

          // 检查时间逻辑
          if (info.start && info.end) {
            const startTime = new Date(info.start);
            const endTime = new Date(info.end);

            if (isNaN(startTime.getTime())) {
              errors.push(`${subjectPrefix}的开始时间格式不正确`);
            }

            if (isNaN(endTime.getTime())) {
              errors.push(`${subjectPrefix}的结束时间格式不正确`);
            }

            if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
              if (endTime <= startTime) {
                errors.push(`${subjectPrefix}的结束时间必须晚于开始时间`);
              }

              // 检查考试时长是否合理（不超过24小时）
              const duration = (endTime - startTime) / (1000 * 60 * 60); // 小时
              if (duration > 24) {
                errors.push(`${subjectPrefix}的考试时长不能超过24小时`);
              }
            }
          }
        });

        // 检查科目时间是否有重叠
        for (let i = 0; i < this.localConfig.examInfos.length; i++) {
          for (let j = i + 1; j < this.localConfig.examInfos.length; j++) {
            const info1 = this.localConfig.examInfos[i];
            const info2 = this.localConfig.examInfos[j];

            if (info1.start && info1.end && info2.start && info2.end) {
              const start1 = new Date(info1.start);
              const end1 = new Date(info1.end);
              const start2 = new Date(info2.start);
              const end2 = new Date(info2.end);

              if (
                !isNaN(start1.getTime()) &&
                !isNaN(end1.getTime()) &&
                !isNaN(start2.getTime()) &&
                !isNaN(end2.getTime())
              ) {
                // 检查时间重叠
                if (start1 < end2 && end1 > start2) {
                  errors.push(`第${i + 1}个科目与第${j + 1}个科目的时间有重叠`);
                }
              }
            }
          }
        }
      }

      return errors;
    },

    /**
     * 是否有验证错误
     */
    hasValidationErrors() {
      return this.validationErrors.length > 0;
    },
  },
  watch: {
    configId: {
      immediate: true,
      handler(newId) {
        if (newId) {
          this.loadConfig();
        }
      },
    },
  },
  methods: {
    /**
     * 加载配置数据
     */
    async loadConfig() {
      this.loading = true;
      this.error = "";

      try {
        const response = await dataProvider.loadData(`es_${this.configId}`);

        if (response) {
          this.localConfig = {
            examName: "",
            message: "",
            room: "",
            examInfos: [],
            ...response,
          };

          // 确保examInfos是数组
          if (!Array.isArray(this.localConfig.examInfos)) {
            this.localConfig.examInfos = [];
          }

          // 转换时间格式并初始化日期选择器数据
          this.localConfig.examInfos.forEach((info) => {
            if (info.start) {
              const startDate = this.parseDateTime(info.start);
              info.start = this.formatDateTimeLocal(startDate);
              info.startDate = startDate;
              info.startTime = this.formatTimeOnly(startDate);
              info.startFormatted = this.formatDisplayDateTime(startDate);
              info.startDateMenu = false;
            }
            if (info.end) {
              const endDate = this.parseDateTime(info.end);
              info.end = this.formatDateTimeLocal(endDate);
              info.endDate = endDate;
              info.endTime = this.formatTimeOnly(endDate);
              info.endFormatted = this.formatDisplayDateTime(endDate);
              info.endDateMenu = false;
            }
          });
        } else {
          console.error("加载配置失败:", response);
          this.error =
            "加载配置失败: " + (response.error?.message || "未知错误");
          this.$emit("error", this.error);
        }
      } catch (err) {
        console.error(err);
        this.error = "加载配置失败: " + err.message;
        this.$emit("error", this.error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 保存配置
     */
    async saveConfig() {
      if (!this.isValidConfig) {
        // 显示详细的验证错误信息
        const errors = this.validationErrors;
        if (errors.length > 0) {
          this.error = `配置验证失败：${errors.join("；")}`;
        } else {
          this.error = "请填写完整的配置信息";
        }
        return false;
      }

      this.saving = true;
      this.error = "";

      try {
        // 创建保存用的配置副本，转换时间格式
        const configToSave = {
          ...this.localConfig,
          examInfos: this.localConfig.examInfos.map((info) => ({
            ...info,
            start: this.formatDisplayDateTime(info.start),
            end: this.formatDisplayDateTime(info.end),
          })),
        };

        const response = await dataProvider.saveData(
          `es_${this.configId}`,
          configToSave
        );

        if (response) {
          this.success = "配置保存成功";
          this.$emit("saved", configToSave);
          return true;
        } else {
          this.error =
            "保存配置失败: " + (response.error?.message || "未知错误");
          this.$emit("error", this.error);
          return false;
        }
      } catch (err) {
        this.error = "保存配置失败: " + err;
        this.$emit("error", this.error);
        return false;
      } finally {
        this.saving = false;
      }
    },

    /**
     * 添加考试科目
     */
    addExamInfo() {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1小时后
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2小时后

      const examInfo = {
        name: "新科目",
        start: this.formatDateTimeLocal(startTime),
        end: this.formatDateTimeLocal(endTime),
        // 日期选择器相关数据
        startDate: startTime,
        startTime: this.formatTimeOnly(startTime),
        startFormatted: this.formatDisplayDateTime(startTime),
        startDateMenu: false,
        endDate: endTime,
        endTime: this.formatTimeOnly(endTime),
        endFormatted: this.formatDisplayDateTime(endTime),
        endDateMenu: false,
      };

      this.localConfig.examInfos.push(examInfo);
    },

    /**
     * 删除考试科目
     */
    removeExamInfo(index) {
      this.localConfig.examInfos.splice(index, 1);
    },

    /**
     * 移动考试科目位置
     */
    moveExamInfo(index, direction) {
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < this.localConfig.examInfos.length) {
        const item = this.localConfig.examInfos.splice(index, 1)[0];
        this.localConfig.examInfos.splice(newIndex, 0, item);
      }
    },

    /**
     * 复制JSON到剪贴板
     */
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.formattedJson);
        this.success = "JSON已复制到剪贴板";
      } catch (err) {
        this.error = "复制失败: " + err.message;
      }
    },

    /**
     * 切换编辑模式
     */
    toggleEditMode() {
      this.isEditMode = !this.isEditMode;
      // 清除之前的错误和成功消息
      this.error = "";
      this.success = "";
    },

    /**
     * 快速编辑 - 直接切换到编辑模式
     */
    quickEdit() {
      this.isEditMode = true;
      this.error = "";
      this.success = "";
    },

    /**
     * 选择默认提示
     */
    selectDefaultTip(tip) {
      if (this.localConfig.message && this.localConfig.message.trim() !== "") {
        // 如果已有内容，追加到现有内容后面
        this.localConfig.message += "\n" + tip;
      } else {
        // 如果没有内容，直接设置
        this.localConfig.message = tip;
      }
    },

    /**
     * 格式化日期时间为datetime-local输入格式
     */
    formatDateTimeLocal(dateTime) {
      if (!dateTime) return "";

      let date;
      if (typeof dateTime === "string") {
        // 处理各种可能的日期格式
        if (dateTime.includes("/")) {
          // 格式: 2025/08/29 16:27
          date = new Date(dateTime.replace(/\//g, "-"));
        } else {
          date = new Date(dateTime);
        }
      } else {
        date = new Date(dateTime);
      }

      if (isNaN(date.getTime())) {
        return "";
      }

      // 转换为本地时间的ISO字符串，去掉秒和毫秒
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    },

    /**
     * 格式化日期时间为显示格式
     */
    formatDisplayDateTime(dateTime) {
      if (!dateTime) return "";

      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        return dateTime; // 如果无法解析，返回原值
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}/${month}/${day} ${hours}:${minutes}`;
    },

    /**
     * 解析日期时间字符串
     */
    parseDateTime(dateTime) {
      if (!dateTime) return new Date();

      if (typeof dateTime === "string") {
        // 处理各种可能的日期格式
        if (dateTime.includes("/")) {
          // 格式: 2025/08/29 16:27
          return new Date(dateTime.replace(/\//g, "-"));
        } else {
          return new Date(dateTime);
        }
      } else {
        return new Date(dateTime);
      }
    },

    /**
     * 格式化时间为HH:MM格式
     */
    formatTimeOnly(dateTime) {
      if (!dateTime) return "00:00";

      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        return "00:00";
      }

      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${hours}:${minutes}`;
    },

    /**
     * 更新开始日期时间
     */
    updateStartDateTime(index) {
      const examInfo = this.localConfig.examInfos[index];
      if (!examInfo.startDate || !examInfo.startTime) return;

      // 合并日期和时间
      const date = new Date(examInfo.startDate);
      const [hours, minutes] = examInfo.startTime.split(":");
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // 更新相关字段
      examInfo.start = this.formatDateTimeLocal(date);
      examInfo.startFormatted = this.formatDisplayDateTime(date);
    },

    /**
     * 更新结束日期时间
     */
    updateEndDateTime(index) {
      const examInfo = this.localConfig.examInfos[index];
      if (!examInfo.endDate || !examInfo.endTime) return;

      // 合并日期和时间
      const date = new Date(examInfo.endDate);
      const [hours, minutes] = examInfo.endTime.split(":");
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // 更新相关字段
      examInfo.end = this.formatDateTimeLocal(date);
      examInfo.endFormatted = this.formatDisplayDateTime(date);
    },

    /**
     * 打开配置
     * 获取配置的云端地址并在新窗口中打开考试页面
     */
    async openConfig() {
      try {
        // 获取配置的云端访问地址
        const result = await dataProvider.getKeyCloudUrl(`es_${this.configId}`, {
          autoMigrate: true,
          autoConfig: true
        });

        if (result.success && result.url) {
          // 构建考试页面URL
          const examUrl = `https://es.zerocat.dev/exam/?configUrl=${encodeURIComponent(result.url)}`;

          // 在新窗口中打开
          window.open(examUrl, '_blank');

          this.success = '配置已在新窗口中打开';
          this.$emit('opened', { configId: this.configId, url: result.url });
        } else {
          throw new Error(result.error || '获取云端地址失败');
        }
      } catch (err) {
        this.error = '打开配置失败: ' + err.message;
        this.$emit('error', '打开配置失败: ' + err.message);
      }
    },

    /**
     * 确认删除配置
     */
    confirmDelete() {
      this.deleteDialog = true;
    },

    /**
     * 删除配置
     */
    async deleteConfig() {
      this.deleting = true;
      try {
        // 获取当前云端的配置列表
        const listData = await dataProvider.loadData('es_list');
        const currentList = listData || [];

        // 从列表中移除当前配置
        const updatedList = currentList.filter(item => item.id !== this.configId);

        // 更新云端的配置列表
        const listResponse = await dataProvider.saveData('es_list', updatedList);
        if (!listResponse) {
          throw new Error('更新云端列表失败');
        }

        this.deleteDialog = false;
        this.$emit("deleted", {
          success: true,
          message: "配置删除成功",
          configId: this.configId
        });
      } catch (error) {
        console.error("删除配置失败:", error);
        this.$emit("deleted", {
          success: false,
          message: "删除失败: " + error.message
        });
      } finally {
        this.deleting = false;
      }
    },
  },
};
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.border-b:last-child {
  border-bottom: none;
}

.json-preview {
  border-radius: 8px;
  font-family: "Fira Code", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
}

.json-preview code {
  font-weight: 400;
}

/* 预览模式样式增强 */
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.border-b:last-child {
  border-bottom: none;
}

/* 日期时间选择器样式 */
.border-e {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.datetime-picker-header {
  background-color: #f5f5f5;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

/* 预览卡片阴影效果 */
.v-card--variant-elevated {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

/* 模式切换按钮样式 */
.v-btn-toggle {
  border-radius: 8px;
  overflow: hidden;
}

.v-btn-toggle .v-btn {
  border-radius: 0 !important;
}

.cursor-pointer {
  cursor: pointer;
}

.v-card.hover:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease-in-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

.v-btn-toggle .v-btn:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.v-btn-toggle .v-btn:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}
</style>
