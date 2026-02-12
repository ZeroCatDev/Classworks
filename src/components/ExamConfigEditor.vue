<template>
  <div>
    <!-- 错误提示 -->
    <v-alert
      v-if="error"
      border="start"
      class="mb-4 mt-3 mx-2"
      closable
      type="error"
      variant="tonal"
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
      border="start"
      class="mb-4 mt-3 mx-2"
      closable
      type="success"
      variant="tonal"
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
      border="start"
      class="mb-4 mt-3 mx-2"
      type="warning"
      variant="tonal"
    >
      <div class="d-flex align-center">
        <span class="font-weight-bold">配置验证失败，请检查以下问题：</span>
      </div>
      <v-list class="bg-transparent" density="compact">
        <v-list-item
          v-for="(error, index) in validationErrors"
          :key="index"
          class="px-0 py-0"
        >
          <template v-slot:prepend>
            <v-icon color="warning" size="small">mdi-circle-small</v-icon>
          </template>
          <v-list-item-title class="text-body-2">{{ error }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-alert>

    <!-- 加载状态 -->
    <v-card v-if="loading" class="my-4" outlined>
      <v-card-text>
        <v-skeleton-loader class="mx-auto" type="article"></v-skeleton-loader>
      </v-card-text>
    </v-card>

    <!-- 模式切换按钮和操作按钮 -->
    <div v-if="!loading" class="d-flex justify-space-between align-center mb-4">
      <div class="d-flex align-center gap-2">
        <v-btn
          :disabled="!isValidConfig"
          class="text-none"
          color="success"
          prepend-icon="mdi-open-in-new"
          variant="elevated"
          @click="openConfig"
        >
          打开 ExamSchedule
        </v-btn>

        <v-btn
          :disabled="!isValidConfig"
          class="text-none"
          color="primary"
          prepend-icon="mdi-link-variant"
          variant="elevated"
          @click="copyConfigUrl"
        >
          复制远程链接
        </v-btn>

        <v-btn
          :disabled="!isValidConfig"
          class="text-none"
          color="primary"
          prepend-icon="mdi-download"
          variant="elevated"
          @click="downloadAsJson"
        >
          JSON 文件
        </v-btn>

        <v-btn
          :disabled="!isValidConfig"
          class="text-none"
          color="primary"
          prepend-icon="mdi-download"
          variant="elevated"
          @click="downloadAsEa2"
        >
          .ea2 文件
        </v-btn>

        <v-btn
          :disabled="!isValidConfig"
          class="text-none"
          color="secondary"
          prepend-icon="mdi-play-circle"
          variant="elevated"
          @click="openInEa2Player"
        >
          拉起EA2播放器
        </v-btn>

        <v-tooltip
          v-if="!isValidConfig"
          activator="parent"
          location="bottom"
        >
          <span>请先完善配置信息后再操作</span>
        </v-tooltip>
      </div>
      <v-btn-toggle
        v-model="isEditMode"
        color="primary"
        divided
        variant="outlined"
      >
        <v-btn
          class="text-error"
          prepend-icon="mdi-delete"
          @click="confirmDelete"

        >
          删除配置
        </v-btn>
        <v-btn :value="false" prepend-icon="mdi-eye"> 预览</v-btn>
        <v-btn :value="true" prepend-icon="mdi-pencil"> 编辑</v-btn>
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
        <v-chip v-if="localConfig.room" class="px-4 py-2" size="large">
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
            lg="4"
            md="6"
          >
            <v-card class="h-100" hover variant="tonal">
              <v-card-title class="bg-primary-lighten-5 pa-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-book-open-page-variant</v-icon>
                  <span class="">{{ examInfo.name || "未设置科目" }}</span>
                </div>
              </v-card-title>
              <v-card-text class="pa-4">
                <div class="mb-3">
                  <div class="d-flex align-center mb-1">
                    <v-icon class="mr-2" color="success" size="small"
                    >mdi-clock-start
                    </v-icon
                    >
                    <span class="text-body-2 text-grey-darken-1">开始时间</span>
                  </div>
                  <div class="text-h6 font-weight-medium text-success">
                    {{ examInfo.startFormatted || examInfo.start || "未设置" }}
                  </div>
                </div>
                <div>
                  <div class="d-flex align-center mb-1">
                    <v-icon class="mr-2" color="error" size="small"
                    >mdi-clock-end
                    </v-icon
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
        <v-icon class="mb-4" color="grey-lighten-2" size="80">
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
      <v-card border class="mb-4" elevation="2">
        <v-card-title
          class="d-flex align-center text-white cursor-pointer"
          @click="showJsonPreview = !showJsonPreview"
        >
          <v-icon class="mr-2">mdi-code-json</v-icon>
          配置预览
          <v-spacer></v-spacer>

          <v-btn
            color="white"
            prepend-icon="mdi-content-copy"
            size="small"
            variant="outlined"
            @click.stop="copyToClipboard"
          >
            复制
          </v-btn>

          <v-btn
            :icon="showJsonPreview ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            class="ml-2"
            color="white"
            size="small"
            variant="text"
          >
          </v-btn>
        </v-card-title>
        <v-expand-transition>
          <v-card-text v-show="showJsonPreview" class="pa-4">
            <v-card class="pa-4" variant="tonal">
              <pre class="json-preview"><code>{{ formattedStorageJson }}</code></pre>
            </v-card>
          </v-card-text>
        </v-expand-transition>
      </v-card>
    </div>

    <!-- 编辑模式 -->
    <div v-if="!loading && isEditMode">
      <!-- 基本信息 -->
      <v-card border class="mb-4" elevation="1">
        <v-card-title class="d-flex align-center bg-primary-lighten-5 pa-4">
          <v-icon class="mr-2">mdi-information</v-icon>
          <span class="font-weight-bold">基本信息</span>
        </v-card-title>
        <v-card-text class="pa-6">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="localConfig.examName"
                :rules="[
                  (v) => !!v || '考试名称不能为空',
                  (v) => (v && v.trim().length > 0) || '考试名称不能为空白字符',
                  (v) => !v || v.length <= 100 || '考试名称不能超过100个字符'
                ]"
                clearable
                density="comfortable"
                label="考试名称"
                placeholder="如：2025年高考模拟考试"
                prepend-inner-icon="mdi-calendar-text"
                required
                variant="outlined"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="localConfig.room"
                clearable
                density="comfortable"
                label="考场号（仅 ExamSchedule-Management 支持此配置）"
                placeholder="如：一号考场"
                prepend-inner-icon="mdi-home"
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <span class="text-subtitle-2 font-weight-bold d-block mb-2">
                <v-icon size="small" class="mr-1">mdi-message-text</v-icon>
                考试提示
              </span>
              <v-textarea
                v-model="localConfig.message"
                :rules="[
                  (v) => !!v || '考试提示不能为空',
                  (v) => (v && v.trim().length > 0) || '考试提示不能为空白字符'
                ]"
                clearable
                density="comfortable"
                label="输入考试相关的提示信息..."
                no-resize
                placeholder="例如：请保持卷面整洁，诚信应考。在听到终考铃时立刻停止作答。"
                rows="3"
                variant="outlined"
              ></v-textarea>

              <!-- 默认提示选项 -->
              <div v-if="!localConfig.message || localConfig.message.trim() === ''" class="mt-3">
                <v-chip-group
                  class="d-flex gap-2"
                  column
                >
                  <v-chip
                    v-for="(tip, index) in defaultExamTips"
                    :key="index"
                    class="cursor-pointer"
                    color="primary"
                    size="small"
                    variant="outlined"
                    @click="selectDefaultTip(tip)"
                  >
                    <v-icon size="small" start>mdi-plus</v-icon>
                    {{ tip.substring(0, 20) }}...
                  </v-chip>
                </v-chip-group>
                <div class="text-caption text-medium-emphasis mt-2 ml-2">
                  <v-icon class="mr-1" size="x-small">mdi-lightbulb-outline</v-icon>
                  点击上方选项快速添加常用考试提示
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- 考试科目安排 -->
      <v-card border class="mb-4" elevation="1">
        <v-card-title class="d-flex align-center bg-success-lighten-5 pa-4">
          <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
          <span class="font-weight-bold">考试科目安排</span>
          <v-spacer></v-spacer>

          <!-- 提醒时间开关 -->
          <div class="d-flex align-center mr-4">
            <v-switch
              v-model="enableCustomAlertTime"
              color="primary"
              density="compact"
              hide-details
              @change="toggleAlertTimeMode"
            >
              <template v-slot:label>
                <span class="text-body-2">自定义提醒时间</span>
              </template>
            </v-switch>
          </div>

          <v-btn
            color="success"
            prepend-icon="mdi-plus"
            size="small"
            variant="elevated"
            @click="addExamInfo"
          >
            添加科目
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-list
            v-if="localConfig.examInfos && localConfig.examInfos.length > 0"
            class="py-0"
          >
            <v-list-item
              v-for="(examInfo, index) in localConfig.examInfos"
              :key="index"
              class="border-b pa-4 hover-highlight"
            >
              <div class="w-100">
                <!-- 科目序号指示器 -->
                <div class="d-flex align-center mb-3">
                  <v-chip
                    :color="index % 2 === 0 ? 'primary' : 'secondary'"
                    size="small"
                    variant="tonal"
                    class="mr-3"
                  >
                    <v-icon start size="small">mdi-numeric-{{ index + 1 }}-circle</v-icon>
                    第 {{ index + 1 }} 科目
                  </v-chip>

                  <!-- 考试时长显示 -->


                  <v-spacer></v-spacer>
                  <div class="d-flex gap-1">
                    <v-btn
                      v-if="index > 0"
                      color="primary"
                      icon="mdi-arrow-up"
                      size="x-small"
                      variant="text"
                      @click="moveExamInfo(index, -1)"
                    >
                      <v-tooltip activator="parent" location="bottom">上移</v-tooltip>
                    </v-btn>
                    <v-btn
                      v-if="index < localConfig.examInfos.length - 1"
                      color="primary"
                      icon="mdi-arrow-down"
                      size="x-small"
                      variant="text"
                      @click="moveExamInfo(index, 1)"
                    >
                      <v-tooltip activator="parent" location="bottom">下移</v-tooltip>
                    </v-btn>
                    <v-btn
                      color="error"
                      icon="mdi-delete"
                      size="x-small"
                      variant="text"
                      @click="removeExamInfo(index)"
                    >
                      <v-tooltip activator="parent" location="bottom">删除</v-tooltip>
                    </v-btn>
                  </div>
                </div>

                <v-row class="align-start">
                  <v-col cols="12" md="4">
                    <!-- 科目名称自动完成选择器 -->
                    <v-autocomplete
                      v-model="examInfo.name"
                      :items="availableSubjects"
                      :rules="[
                        (v) => !!v || '科目名称不能为空',
                        (v) => (v && v.trim().length > 0) || '科目名称不能为空白字符'
                      ]"
                      clearable
                      density="comfortable"
                      item-title="name"
                      label="科目名称"
                      no-data-text="没有可用科目，请输入自定义名称"
                      prepend-inner-icon="mdi-book"
                      variant="outlined"
                    >
                      <template v-slot:prepend-item>
                        <v-list-item
                          v-if="customSubjectInput"
                          title="自定义："
                        >
                          <template v-slot:append>
                            <span class="text-primary font-weight-bold">{{ customSubjectInput }}</span>
                          </template>
                        </v-list-item>
                        <v-divider v-if="customSubjectInput"></v-divider>
                      </template>
                    </v-autocomplete>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-menu
                      v-model="examInfo.startDateMenu"
                      :close-on-content-click="false"
                      min-width="auto"
                      offset-y
                      transition="scale-transition"
                    >
                      <template v-slot:activator="{ props }">
                        <v-text-field
                          v-model="examInfo.startFormatted"
                          :rules="[
                            (v) => !!v || '开始时间不能为空',
                            (v) => validateTimeFormat(v, '开始时间'),
                            () => validateNoTimeOverlap(examInfo, index)
                          ]"
                          density="comfortable"
                          label="开始时间"
                          placeholder="2025/01/01 09:00"
                          prepend-inner-icon="mdi-clock-start"
                          v-bind="props"
                          variant="outlined"
                          @blur="updateStartDateTimeFromInput(index)"
                        >
                          <template v-slot:append>
                            <v-icon>mdi-calendar-clock</v-icon>
                          </template>
                        </v-text-field>
                      </template>
                      <v-card min-width="500">
                        <v-card-title class="text-center py-3 bg-primary-lighten-5">
                          <v-icon class="mr-2" color="primary">mdi-clock-start</v-icon>
                          选择开始时间
                        </v-card-title>
                        <v-card-text class="pa-0">
                          <v-row no-gutters>
                            <v-col class="border-e" cols="6">
                              <v-date-picker
                                v-model="examInfo.startDate"
                                color="primary"
                                elevation="0"
                                locale="zh-cn"
                                show-adjacent-months
                                @update:model-value="updateStartDateTime(index)"
                              ></v-date-picker>
                            </v-col>
                            <v-col cols="6">
                              <v-time-picker
                                v-model="examInfo.startTime"
                                color="primary"
                                elevation="0"
                                format="24hr"
                                scrollable
                                @update:model-value="updateStartDateTime(index)"
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
                            关闭
                          </v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-menu
                      v-model="examInfo.endDateMenu"
                      :close-on-content-click="false"
                      min-width="auto"
                      offset-y
                      transition="scale-transition"
                    >
                      <template v-slot:activator="{ props }">
                        <v-text-field
                          v-model="examInfo.endFormatted"
                          :rules="[
                            (v) => !!v || '结束时间不能为空',
                            (v) => validateTimeFormat(v, '结束时间'),
                            () => validateEndAfterStart(examInfo),
                            () => validateNoTimeOverlap(examInfo, index)
                          ]"
                          density="comfortable"
                          label="结束时间"
                          placeholder="2025/01/01 11:00"
                          prepend-inner-icon="mdi-clock-end"
                          v-bind="props"
                          variant="outlined"
                          @blur="updateEndDateTimeFromInput(index)"
                        >
                          <template v-slot:append>
                            <v-icon>mdi-calendar-clock</v-icon>
                          </template>
                        </v-text-field>
                      </template>
                      <v-card min-width="500">
                        <v-card-title class="text-center py-3 bg-error-lighten-5">
                          <v-icon class="mr-2" color="error">mdi-clock-end</v-icon>
                          选择结束时间
                        </v-card-title>
                        <v-card-text class="pa-0">
                          <v-row no-gutters>
                            <v-col class="border-e" cols="6">
                              <v-date-picker
                                v-model="examInfo.endDate"
                                color="error"
                                elevation="0"
                                locale="zh-cn"
                                show-adjacent-months
                                @update:model-value="updateEndDateTime(index)"
                              ></v-date-picker>
                            </v-col>
                            <v-col cols="6">
                              <v-time-picker
                                v-model="examInfo.endTime"
                                color="error"
                                elevation="0"
                                format="24hr"
                                scrollable
                                @update:model-value="updateEndDateTime(index)"
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
                            关闭
                          </v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </v-col>
                    <v-col cols="12" md="2">
                      <v-text-field
                        v-model="examInfo.durationMinutes"
                        :rules="[
                          (v) => !!v || '时长不能为空',
                          (v) => !isNaN(v) || '时长必须是数字',
                          (v) => parseInt(v) > 0 || '时长必须大于0',
                          (v) => parseInt(v) <= 1440 || '时长不能超过1440分钟（24小时）'
                        ]"
                        type="number"
                        min="1"
                        max="1440"
                        density="comfortable"
                        label="时长（分钟）"
                        placeholder="例如：120"
                        prepend-inner-icon="mdi-timer"
                        variant="outlined"
                        :hint="durationHint(examInfo)"
                        persistent-hint
                        @blur="updateDurationFromInput(index)"
                      />
                    </v-col>

                    <!-- 提醒时间输入框（仅在启用自定义时显示） -->
                    <v-col v-if="enableCustomAlertTime" cols="12" md="2">
                      <v-text-field
                        v-model="examInfo.alertTime"
                        :rules="[
                          (v) => !!v || '提醒时间不能为空',
                          (v) => !isNaN(v) || '提醒时间必须是数字',
                          (v) => parseInt(v) >= 0 || '提醒时间不能为负数',
                          (v) => parseInt(v) <= 120 || '提醒时间不能超过120分钟'
                        ]"
                        type="number"
                        min="0"
                        max="120"
                        density="comfortable"
                        label="提醒时间（分钟）"
                        placeholder="例如：15"
                        prepend-inner-icon="mdi-bell-ring"
                        variant="outlined"
                        hint="考试结束前提醒"
                        persistent-hint
                      />
                    </v-col>
                </v-row>
              </div>
            </v-list-item>
          </v-list>
          <div v-else class="text-center py-12">
            <v-icon class="mb-4" color="grey-lighten-2" size="80">
              mdi-calendar-blank
            </v-icon>
            <div class="text-h5 text-grey-darken-1 mb-2">暂无考试科目安排</div>
            <div class="text-body-1 text-grey mb-4">
              点击上方"添加科目"按钮开始配置
            </div>
            <v-btn
              color="success"
              prepend-icon="mdi-plus"
              size="large"
              variant="elevated"
              @click="addExamInfo"
            >
              立即添加科目
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="error">mdi-delete-alert</v-icon>
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
            :loading="deleting"
            color="error"
            variant="outlined"
            @click="deleteConfig"
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
      availableSubjects: [], // 可用的科目列表
      customSubjectInput: "", // 自定义科目输入
      enableCustomAlertTime: false, // 是否启用自定义提醒时间
      defaultExamTips: [
        "请保持卷面整洁，字迹清晰，诚信应考。在听到终考铃时立刻起立，停止作答。",
        "沉着 冷静 细心 守记",
        "答题不守记，自己两行泪。",
      ],
    };
  },
  computed: {
    /**
     * 格式化的JSON字符串（旧版，完整数据）
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
     * 格式化的存储格式JSON字符串（只包含核心字段）
     */
    formattedStorageJson() {
      try {
        const storageConfig = {
          examName: this.localConfig.examName,
          message: this.localConfig.message,
          room: this.localConfig.room,
          examInfos: this.localConfig.examInfos.map((info) => ({
            name: info.name,
            start: this.formatDisplayDateTime(info.start),
            end: this.formatDisplayDateTime(info.end),
            alertTime: parseInt(info.alertTime) || 15,
          })),
        };
        return JSON.stringify(storageConfig, null, 2);
      } catch (err) {
        console.error("格式化存储JSON时出错:", err);
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
  created() {
    this.loadSubjects();
  },
  methods: {
    /**
     * 加载可用的科目列表
     */
    async loadSubjects() {
      try {
        const response = await dataProvider.loadData("classworks-config-subject");
        if (response && Array.isArray(response)) {
          this.availableSubjects = response
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(subject => ({
              name: subject.name,
              order: subject.order ?? 0
            }));
        } else {
          // 使用默认科目列表
          this.availableSubjects = [
            { name: '语文', order: 0 },
            { name: '数学', order: 1 },
            { name: '英语', order: 2 },
            { name: '物理', order: 3 },
            { name: '化学', order: 4 },
            { name: '生物', order: 5 },
            { name: '政治', order: 6 },
            { name: '历史', order: 7 },
            { name: '地理', order: 8 },
          ];
        }
      } catch (error) {
        console.warn('加载科目列表失败，使用默认列表:', error);
        // 使用默认科目列表
        this.availableSubjects = [
          { name: '语文', order: 0 },
          { name: '数学', order: 1 },
          { name: '英语', order: 2 },
          { name: '物理', order: 3 },
          { name: '化学', order: 4 },
          { name: '生物', order: 5 },
          { name: '政治', order: 6 },
          { name: '历史', order: 7 },
          { name: '地理', order: 8 },
        ];
      }
    },

    /**
     * 自动填充剩余科目的时间（基于最后一个科目，每个科目间隔10分钟）
     */
    autoFillRemaining() {
      if (this.localConfig.examInfos.length === 0) return;

      let lastEndTime = null;

      // 找到最后已设置的时间
      for (let i = this.localConfig.examInfos.length - 1; i >= 0; i--) {
        if (this.localConfig.examInfos[i].end) {
          lastEndTime = new Date(this.localConfig.examInfos[i].end);
          break;
        }
      }

      // 如果没有任何已设置的时间，使用当前时间
      if (!lastEndTime) {
        lastEndTime = new Date();
      }

      // 从前往后填充
      for (let i = 0; i < this.localConfig.examInfos.length; i++) {
        const examInfo = this.localConfig.examInfos[i];

        // 如果已经有时间，跳过但更新 lastEndTime
        if (examInfo.end) {
          lastEndTime = new Date(examInfo.end);
          continue;
        }

        // 计算新的开始和结束时间
        const startTime = new Date(lastEndTime.getTime() + 10 * 60 * 1000); // 前一个结束时间 + 10分钟
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 考试时长2小时

        // 更新科目时间
        examInfo.start = this.formatDateTimeLocal(startTime);
        examInfo.startDate = startTime;
        examInfo.startTime = this.formatTimeOnly(startTime);
        examInfo.startFormatted = this.formatDisplayDateTime(startTime);

        examInfo.end = this.formatDateTimeLocal(endTime);
        examInfo.endDate = endTime;
        examInfo.endTime = this.formatTimeOnly(endTime);
        examInfo.endFormatted = this.formatDisplayDateTime(endTime);

        lastEndTime = endTime;
      }

      this.success = '已自动填充所有科目的时间（间隔10分钟）';
    },

    /**
     * 验证时间格式
     */
    validateTimeFormat(value, fieldName) {
      if (!value) return true; // 空值由必填验证处理

      // 匹配格式: YYYY/MM/DD HH:mm 或 YYYY-MM-DD HH:mm
      const match = value.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
      if (!match) {
        return `${fieldName}格式不正确，请使用格式：2025/01/01 09:00`;
      }

      const [, year, month, day, hour, minute] = match;
      const y = parseInt(year);
      const m = parseInt(month);
      const d = parseInt(day);
      const h = parseInt(hour);
      const min = parseInt(minute);

      // 验证日期范围
      if (m < 1 || m > 12) return `${fieldName}月份不合法（1-12）`;
      if (d < 1 || d > 31) return `${fieldName}日期不合法（1-31）`;
      if (h < 0 || h > 23) return `${fieldName}小时不合法（0-23）`;
      if (min < 0 || min > 59) return `${fieldName}分钟不合法（0-59）`;

      // 验证日期是否真实存在
      const date = new Date(y, m - 1, d, h, min);
      if (isNaN(date.getTime())) {
        return `${fieldName}日期不存在`;
      }

      // 验证月份和日期是否匹配（防止2月30日等情况）
      if (date.getMonth() !== m - 1 || date.getDate() !== d) {
        return `${fieldName}日期不存在`;
      }

      return true;
    },

    /**
     * 验证结束时间晚于开始时间
     */
    validateEndAfterStart(examInfo) {
      if (!examInfo.startFormatted || !examInfo.endFormatted) return true;

      try {
        const start = new Date(examInfo.start || examInfo.startFormatted.replace(/\//g, '-'));
        const end = new Date(examInfo.end || examInfo.endFormatted.replace(/\//g, '-'));

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return true; // 格式错误由其他验证处理
        }

        if (end <= start) {
          return '结束时间必须晚于开始时间';
        }

        // 检查时长是否合理（不超过24小时）
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (duration > 24) {
          return '考试时长不能超过24小时';
        }

        return true;
      } catch (error) {
        return true;
      }
    },

    /**
     * 验证科目时间不重叠
     */
    validateNoTimeOverlap(currentExamInfo, currentIndex) {
      if (!currentExamInfo.startFormatted || !currentExamInfo.endFormatted) {
        return true; // 时间未设置时不验证重叠
      }

      try {
        const currentStart = new Date(currentExamInfo.start || currentExamInfo.startFormatted.replace(/\//g, '-'));
        const currentEnd = new Date(currentExamInfo.end || currentExamInfo.endFormatted.replace(/\//g, '-'));

        if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime())) {
          return true; // 格式错误由其他验证处理
        }

        // 检查与其他科目的时间重叠
        for (let i = 0; i < this.localConfig.examInfos.length; i++) {
          if (i === currentIndex) continue; // 跳过当前科目

          const otherExamInfo = this.localConfig.examInfos[i];
          if (!otherExamInfo.start || !otherExamInfo.end) continue;

          const otherStart = new Date(otherExamInfo.start);
          const otherEnd = new Date(otherExamInfo.end);

          if (isNaN(otherStart.getTime()) || isNaN(otherEnd.getTime())) continue;

          // 检查时间重叠：当前开始时间在其他时间段内 或 当前结束时间在其他时间段内 或 当前时间段完全包含其他时间段
          const isOverlap = (
            (currentStart >= otherStart && currentStart < otherEnd) || // 当前开始时间在其他时间段内
            (currentEnd > otherStart && currentEnd <= otherEnd) ||     // 当前结束时间在其他时间段内
            (currentStart <= otherStart && currentEnd >= otherEnd)     // 当前时间段完全包含其他时间段
          );

          if (isOverlap) {
            const otherSubjectName = otherExamInfo.name || `第${i + 1}个科目`;
            return `时间与"${otherSubjectName}"重叠`;
          }
        }

        return true;
      } catch (error) {
        return true;
      }
    },

    /**
     * 切换提醒时间模式
     */
    toggleAlertTimeMode() {
      if (!this.enableCustomAlertTime) {
        // 关闭自定义时，将所有提醒时间设为15分钟
        this.localConfig.examInfos.forEach(info => {
          info.alertTime = 15;
        });
      }
    },

    /**
     * 计算考试时长
     */
    getExamDuration(examInfo) {
      if (!examInfo.start || !examInfo.end) return '';

      try {
        const startTime = new Date(examInfo.start);
        const endTime = new Date(examInfo.end);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return '';
        }

        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        if (durationMinutes < 60) {
          return `${durationMinutes}分钟`;
        }

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        if (minutes === 0) {
          return `${hours}小时`;
        } else {
          return `${hours}小时${minutes}分钟`;
        }
      } catch (error) {
        return '';
      }
    },

    /**
     * 从输入框更新开始时间
     */
    updateStartDateTimeFromInput(index) {
      if (index === undefined || !this.localConfig.examInfos[index]) return;

      const examInfo = this.localConfig.examInfos[index];
      const formatted = examInfo.startFormatted;
      if (!formatted) return;

      // 尝试解析输入格式: 2025/01/01 09:00 或 2025-01-01 09:00
      const match = formatted.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
      if (!match) return;

      const [, year, month, day, hour, minute] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

      if (isNaN(date.getTime())) return;

      examInfo.startDate = date;
      examInfo.startTime = this.formatTimeOnly(date);
      examInfo.start = this.formatDateTimeLocal(date);
      this.updateStartDateTime(index);
    },

    /**
     * 从输入框更新结束时间
     */
    updateEndDateTimeFromInput(index) {
      if (index === undefined || !this.localConfig.examInfos[index]) return;

      const examInfo = this.localConfig.examInfos[index];
      const formatted = examInfo.endFormatted;
      if (!formatted) return;

      // 尝试解析输入格式: 2025/01/01 11:00 或 2025-01-01 11:00
      const match = formatted.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
      if (!match) return;

      const [, year, month, day, hour, minute] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

      if (isNaN(date.getTime())) return;

      examInfo.endDate = date;
      examInfo.endTime = this.formatTimeOnly(date);
      examInfo.end = this.formatDateTimeLocal(date);
      this.updateEndDateTime(index);
    },
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

            // 初始化时长（分钟）- 前端计算
            try {
              if (info.start && info.end) {
                const s = new Date(info.start);
                const e = new Date(info.end);
                const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60));
                if (diff > 0 && diff <= 24 * 60) {
                  info.durationMinutes = diff;
                } else {
                  info.durationMinutes = 120;
                }
              } else {
                info.durationMinutes = 120;
              }
            } catch (_) {
              info.durationMinutes = 120;
            }

            // 初始化提醒时间 - 处理数据迁移
            if (info.alertTime === undefined || info.alertTime === null) {
              info.alertTime = 15; // 旧数据默认15分钟
            } else {
              info.alertTime = parseInt(info.alertTime) || 15;
            }
          });

          // 检测是否有自定义提醒时间
          const hasCustomAlertTime = this.localConfig.examInfos.some(
            info => info.alertTime !== 15
          );
          this.enableCustomAlertTime = hasCustomAlertTime;
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
        // 创建保存用的配置副本，只保存核心字段
        const configToSave = {
          examName: this.localConfig.examName,
          message: this.localConfig.message,
          room: this.localConfig.room,
          examInfos: this.localConfig.examInfos.map((info) => ({
            name: info.name,
            start: this.formatDisplayDateTime(info.start),
            end: this.formatDisplayDateTime(info.end),
            alertTime: parseInt(info.alertTime) || 15, // 默认15分钟
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
      // 获取最后一个科目的结束时间，或使用当前时间
      let baseTime = new Date();

      if (this.localConfig.examInfos.length > 0) {
        const lastExamInfo = this.localConfig.examInfos[this.localConfig.examInfos.length - 1];
        if (lastExamInfo.end) {
          baseTime = new Date(lastExamInfo.end);
        }
      }

      // 新科目开始时间 = 上一个科目结束时间 + 10分钟
      const startTime = new Date(baseTime.getTime() + 10 * 60 * 1000);
      // 新科目结束时间 = 开始时间 + 2小时
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const examInfo = {
        name: "",
        start: this.formatDateTimeLocal(startTime),
        end: this.formatDateTimeLocal(endTime),
        durationMinutes: 120,
        alertTime: 15, // 默认提醒时间15分钟
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
     * 复制JSON到剪贴板（存储格式）
     */
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.formattedStorageJson);
        this.$message.success('配置已复制到剪贴板');
        } catch (err) {
        this.error = "复制失败: " + err.message;
      }
    },

    /**
     * 下载为JSON文件
     */
    downloadAsJson() {
      try {
        const blob = new Blob([this.formattedStorageJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.localConfig.examName || 'exam-config'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.$message?.success('已下载 JSON 文件');
        } catch (err) {
        this.error = '下载失败: ' + err.message;
      }
    },

    /**
     * 下载为EA2文件（ExamAware2格式）
     */
    downloadAsEa2() {
      try {
        const blob = new Blob([this.formattedStorageJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.localConfig.examName || 'exam-config'}.ea2`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
                  this.$message?.success('已下载 ExamAware2 知试 （.ea2）文件');


      } catch (err) {
        this.error = '下载失败: ' + err.message;
      }
    },

    /**
     * 复制配置链接（用于ExamSchedule）
     */
    async copyConfigUrl() {
      try {
        // 获取配置的云端访问地址
        const result = await dataProvider.getKeyCloudUrl(`es_${this.configId}`, {
          autoMigrate: true,
          autoConfig: true
        });

        if (result.success && result.url) {
          // 直接复制KV地址
          await navigator.clipboard.writeText(result.url);
          this.$message.success('云端地址已复制到剪贴板');
        } else {
          throw new Error(result.error || '获取云端地址失败');
        }
      } catch (err) {
        this.error = '复制链接失败: ' + err.message;
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
     * 时长提示（人性化显示）
     */
    durationHint(examInfo) {
      const m = parseInt(examInfo?.durationMinutes);
      if (isNaN(m) || m <= 0) return "";
      if (m < 60) return `${m} 分钟`;
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return mm === 0 ? `${h} 小时` : `${h} 小时 ${mm} 分钟`;
    },

    /**
     * 从时长输入更新结束时间
     */
    updateDurationFromInput(index) {
      const examInfo = this.localConfig.examInfos[index];
      let m = parseInt(examInfo.durationMinutes);
      if (isNaN(m) || m <= 0) m = 120;
      if (m > 24 * 60) m = 24 * 60;
      examInfo.durationMinutes = m;

      // 需要有开始时间作为基准
      if (!examInfo.startDate || !examInfo.startTime) {
        // 如果尚未拆分，尝试从 start 解析
        if (examInfo.start) {
          const s = new Date(examInfo.start);
          if (!isNaN(s.getTime())) {
            examInfo.startDate = s;
            examInfo.startTime = this.formatTimeOnly(s);
          }
        }
      }

      if (examInfo.startDate && examInfo.startTime) {
        const s = new Date(examInfo.startDate);
        const [sh, sm] = String(examInfo.startTime).split(":");
        s.setHours(parseInt(sh), parseInt(sm), 0, 0);
        const e = new Date(s.getTime() + m * 60 * 1000);
        examInfo.endDate = e;
        examInfo.endTime = this.formatTimeOnly(e);
        examInfo.end = this.formatDateTimeLocal(e);
        examInfo.endFormatted = this.formatDisplayDateTime(e);
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

      // 根据已有时长或默认2小时自动更新结束时间
      let durationMinutes = parseInt(examInfo.durationMinutes);
      if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
        // 若未设定有效时长，则尝试根据已设结束时间计算
        try {
          let existingEndDate = null;
          if (examInfo.endDate && examInfo.endTime) {
            existingEndDate = new Date(examInfo.endDate);
            const [eh, em] = String(examInfo.endTime).split(":");
            existingEndDate.setHours(parseInt(eh), parseInt(em), 0, 0);
          } else if (examInfo.end) {
            existingEndDate = new Date(examInfo.end);
          }
          if (existingEndDate && !isNaN(existingEndDate.getTime())) {
            const diff = Math.round((existingEndDate.getTime() - date.getTime()) / (1000 * 60));
            if (diff > 0 && diff <= 24 * 60) {
              durationMinutes = diff;
            }
          }
        } catch (_) {}
      }
      if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
        durationMinutes = 120;
      }

      const newEnd = new Date(date.getTime() + durationMinutes * 60 * 1000);
      examInfo.endDate = newEnd;
      examInfo.endTime = this.formatTimeOnly(newEnd);
      examInfo.end = this.formatDateTimeLocal(newEnd);
      examInfo.endFormatted = this.formatDisplayDateTime(newEnd);
      examInfo.durationMinutes = durationMinutes;
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

      // 同步考试时长
      try {
        if (examInfo.startDate && examInfo.startTime) {
          const s = new Date(examInfo.startDate);
          const [sh, sm] = String(examInfo.startTime).split(":");
          s.setHours(parseInt(sh), parseInt(sm), 0, 0);
          const diff = Math.round((date.getTime() - s.getTime()) / (1000 * 60));
          if (diff > 0 && diff <= 24 * 60) {
            examInfo.durationMinutes = diff;
          }
        }
      } catch (_) {}
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
          const examUrl = `https://es.examaware.cn/exam/?configUrl=${encodeURIComponent(result.url)}`;

          // 在新窗口中打开
          window.open(examUrl, '_blank');

          this.success = '配置已在新窗口中打开';
          this.$emit('opened', {configId: this.configId, url: result.url});
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

    /**
     * 拉起EA2播放器
     * 将配置JSON转换为base64并通过examaware://协议打开
     */
    openInEa2Player() {
      try {
        // 获取存储格式的JSON字符串
        const configToSave = {
          examName: this.localConfig.examName,
          message: this.localConfig.message,
          room: this.localConfig.room,
          examInfos: this.localConfig.examInfos.map((info) => ({
            name: info.name,
            start: this.formatDisplayDateTime(info.start),
            end: this.formatDisplayDateTime(info.end),
            alertTime: parseInt(info.alertTime) || 15,
          })),
        };

        const jsonString = JSON.stringify(configToSave);

        // 转换为base64
        const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

        // 构建examaware://协议URL
        const ea2Url = `examaware://player?data=${encodeURIComponent(base64Data)}`;

        // 尝试打开
        window.location.href = ea2Url;

        this.$message?.success('正在拉起 ExamAware2 播放器...');
      } catch (err) {
        this.error = '拉起播放器失败: ' + err.message;
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

.bg-success-lighten-5 {
  background-color: rgba(var(--v-theme-success), 0.08) !important;
}

.bg-error-lighten-5 {
  background-color: rgba(var(--v-theme-error), 0.08) !important;
}

/* 科目编辑项悬停效果 */
.hover-highlight {
  transition: background-color 0.2s ease;
}

.hover-highlight:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
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
