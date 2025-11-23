<template>
  <v-app-bar class="no-select">
    <v-app-bar-title>
      {{ titleText }}
    </v-app-bar-title>

    <v-spacer />

    <template #append>
      <!-- 只读 Token 警告 -->
      <v-chip
        v-if="tokenDisplayInfo.readonly"
        class="mx-2"
        color="warning"
        prepend-icon="mdi-lock-alert"
        variant="tonal"
      >
        只读
      </v-chip>

      <!-- 学生名称显示 chip（始终蓝色） -->
      <v-chip
        v-if="tokenDisplayInfo.show"
        :style="{ cursor: tokenDisplayInfo.disabled ? 'default' : 'pointer' }"
        class="mx-2"
        color="primary"
        prepend-icon="mdi-account"
        variant="tonal"
        @click="handleTokenChipClick"
      >
        {{ tokenDisplayInfo.text }}
      </v-chip>

      <v-btn
        v-if="shouldShowUrgentTestButton"
        prepend-icon="mdi-chat"
        @click="urgentTestDialog = true"
        variant="tonal"
        >发送通知</v-btn
      >
      <v-btn icon="mdi-chat" variant="text" @click="isChatOpen = true" />
      <v-btn
        :badge="unreadCount || undefined"
        :badge-color="unreadCount ? 'error' : undefined"
        icon="mdi-bell"
        variant="text"
        @click="$refs.messageLog.drawer = true"
      />
      <v-btn icon="mdi-cog" variant="text" @click="$router.push('/settings')" />
    </template>
  </v-app-bar>
  <!-- 初始化选择卡片，仅在首页且需要授权时显示；不影响顶栏 -->
  <init-service-chooser
    v-if="shouldShowInit"
    :preconfig="preconfigData"
    @done="settingsTick++"
  />

  <!-- 学生姓名管理组件 -->
  <StudentNameManager
    v-if="!shouldShowInit"
    ref="studentNameManager"
    @token-info-updated="updateTokenDisplayInfo"
  />

  <div v-if="!shouldShowInit" class="d-flex">
    <!-- 主要内容区域 -->
    <v-container class="main-window flex-grow-1 no-select" fluid>
      <!-- 有内容的科目卡片 -->
      <div ref="gridContainer" class="grid-masonry">
        <TransitionGroup name="grid">
          <div
            v-for="item in sortedItems"
            :key="item.key"
            :style="{
              'grid-row-end': `span ${item.rowSpan}`,
              order: item.order,
            }"
            class="grid-item"
          >
            <v-card
              :class="{ 'glow-highlight': highlightedCards[item.key] }"
              border
              class="glow-track"
              height="100%"
              @click="!isEditingDisabled && openDialog(item.key)"
              @mousemove="handleMouseMove"
              @touchmove="handleTouchMove"
            >
              <v-card-title>{{ item.name }}</v-card-title>
              <v-card-text :style="state.contentStyle">
                <v-list>
                  <v-list-item
                    v-for="text in splitPoint(item.content)"
                    :key="text"
                  >
                    {{ text }}
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </div>
        </TransitionGroup>
      </div>

      <!-- 单独显示空科目 -->
      <div class="empty-subjects mt-4">
        <template v-if="emptySubjectDisplay === 'button'">
          <v-btn-group divided variant="tonal">
            <v-btn
              v-for="subject in unusedSubjects"
              :key="subject.name"
              :disabled="isEditingDisabled"
              @click="openDialog(subject.name)"
            >
              <v-icon start> mdi-plus</v-icon>
              {{ subject.name }}
            </v-btn>
          </v-btn-group>
        </template>
        <div v-else class="empty-subjects-grid">
          <TransitionGroup name="v-list">
            <v-card
              v-for="subject in unusedSubjects"
              :key="subject.name"
              :disabled="isEditingDisabled"
              border
              class="empty-subject-card"
              @click="openDialog(subject.name)"
            >
              <v-card-title class="text-subtitle-1">
                {{ subject.name }}
              </v-card-title>
              <v-card-text class="text-center">
                <v-icon color="grey" size="small"> mdi-plus</v-icon>
                <div class="text-caption text-grey">点击添加作业</div>
              </v-card-text>
            </v-card>
          </TransitionGroup>
        </div>
      </div>
      <v-btn
        v-if="!state.synced"
        :loading="loading.upload"
        class="ml-2"
        color="error"
        size="large"
        @click="manualUpload"
      >
        上传
      </v-btn>
      <v-btn v-else color="success" size="large" @click="showSyncMessage">
        同步完成
      </v-btn>
      <v-btn
        v-if="showRandomPickerButton"
        append-icon="mdi-dice-multiple"
        class="ml-2"
        color="amber"
        prepend-icon="mdi-account-question"
        size="large"
        @click="openRandomPicker"
      >
        随机点名
      </v-btn>
      <v-btn
        v-if="showExamScheduleButton"
        class="ml-2"
        color="green"
        prepend-icon="mdi-calendar-check"
        size="large"
        @click="$router.push('/examschedule')"
      >
        考试看板
      </v-btn>
      <v-btn
        v-if="showListCardButton"
        class="ml-2"
        color="primary-darken-1"
        prepend-icon="mdi-list-box"
        size="large"
        @click="$router.push('/list')"
      >
        列表
      </v-btn>
      <v-btn
        v-if="showFullscreenButton"
        :color="state.isFullscreen ? 'blue-grey' : 'blue'"
        :prepend-icon="
          state.isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'
        "
        class="ml-2"
        size="large"
        @click="toggleFullscreen"
      >
        {{ state.isFullscreen ? "退出全屏" : "全屏显示"
        }}<!-- 修改防烧屏提示卡片，使用 tonal 样式减少信息密度 -->
      </v-btn>
      <v-card
        v-if="showAntiScreenBurnCard"
        border
        class="mt-4 anti-burn-card"
        color="primary"
        variant="tonal"
      >
        <v-card-title class="text-subtitle-1">
          <v-icon icon="mdi-shield-check" size="small" start />
          屏幕保护技术已启用
        </v-card-title>
        <v-card-text class="text-body-2">
          <p>
            本应用采用独立自研的动态像素偏移技术(DPO™)，有效防止LCD屏幕烧屏现象。
          </p>
          <p class="text-caption text-grey">
            *研究显示动态像素偏移技术可以修复屏幕坏点，起到保护屏幕的作用，数据来自实验室。<a
              href="https://patentscope.wipo.int/search/zh/detail.jsf?docId=CN232281523&_cid=P20-M8L0YX-67061-1"
              target="_blank"
              >专利号CN108648692
            </a>
          </p>
          <p class="text-caption text-grey">
            *技术已自动适配您的设备，无需手动调整
          </p>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- 出勤统计区域 -->
    <v-col
      v-if="state.studentList && state.studentList.length"
      v-ripple="{
        class: `text-${
          ['primary', 'secondary', 'info', 'success', 'warning', 'error'][
            Math.floor(Math.random() * 6)
          ]
        }`,
      }"
      class="attendance-area no-select"
      cols="1"
      @click="setAttendanceArea()"
    >
      <h1>出勤</h1>
      <h2>
        <snap style="white-space: nowrap"> 应到</snap>
        :
        <snap style="white-space: nowrap">
          {{
            state.studentList.length -
            state.boardData.attendance.exclude.length
          }}人
        </snap>
      </h2>
      <h2>
        <snap style="white-space: nowrap"> 实到</snap>
        :
        <snap style="white-space: nowrap">
          {{
            state.studentList.length -
            state.boardData.attendance.absent.length -
            state.boardData.attendance.late.length -
            state.boardData.attendance.exclude.length
          }}人
        </snap>
      </h2>
      <h2>
        <snap style="white-space: nowrap"> 请假</snap>
        :
        <snap style="white-space: nowrap">
          {{ state.boardData.attendance.absent.length }}人
        </snap>
      </h2>
      <h3
        v-for="(name, index) in state.boardData.attendance.absent"
        :key="'absent-' + index"
        class="gray-text"
      >
        <span v-if="useDisplay().lgAndUp.value">{{ `${index + 1}. ` }}</span
        ><span style="white-space: nowrap">{{ name }}</span>
      </h3>
      <h2>
        <snap style="white-space: nowrap">迟到</snap>
        :
        <snap style="white-space: nowrap">
          {{ state.boardData.attendance.late.length }}人
        </snap>
      </h2>
      <h3
        v-for="(name, index) in state.boardData.attendance.late"
        :key="'late-' + index"
        class="gray-text"
      >
        <span v-if="useDisplay().lgAndUp.value">{{ `${index + 1}. ` }}</span
        ><span style="white-space: nowrap">{{ name }}</span>
      </h3>
      <h2>
        <snap style="white-space: nowrap">不参与</snap>
        :
        <snap style="white-space: nowrap">
          {{ state.boardData.attendance.exclude.length }}人
        </snap>
      </h2>
      <h3
        v-for="(name, index) in state.boardData.attendance.exclude"
        :key="'exclude-' + index"
        class="gray-text"
      >
        <span v-if="useDisplay().lgAndUp.value">{{ `${index + 1}. ` }}</span
        ><span style="white-space: nowrap">{{ name }}</span>
      </h3>
    </v-col>
  </div>

  <homework-edit-dialog
    v-model="state.dialogVisible"
    :auto-save="autoSave"
    :initial-content="state.textarea"
    :title="state.dialogTitle"
    @save="handleHomeworkSave"
  />

  <v-snackbar v-model="state.snackbar" :timeout="2000">
    {{ state.snackbarText }}
  </v-snackbar>

  <v-dialog
    v-model="state.attendanceDialog"
    fullscreen-breakpoint="sm"
    max-width="900"
    @update:model-value="handleAttendanceDialogClose"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" icon="mdi-account-group" />
        出勤状态管理
        <v-spacer />
        <v-chip class="ml-2" color="primary" size="small">
          {{ state.dateString }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- 批量操作和搜索 -->
        <v-row class="mb-4">
          <v-col cols="12" md="12">
            <v-text-field
              v-model="attendanceSearch"
              clearable
              hint="支持筛选姓氏，如输入'孙'可筛选所有姓孙的学生"
              label="搜索学生"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              @update:model-value="handleSearchChange"
            />

            <!-- 姓氏筛选 -->
            <div class="d-flex flex-wrap mt-2 gap-1">
              <v-btn
                v-for="surname in extractedSurnames"
                :key="surname.name"
                :color="attendanceSearch === surname.name ? 'primary' : ''"
                :variant="
                  attendanceSearch === surname.name ? 'elevated' : 'text'
                "
                @click="
                  attendanceSearch =
                    attendanceSearch === surname.name ? '' : surname.name
                "
              >
                {{ surname.name }}
                ({{ surname.count }})
              </v-btn>
            </div>
          </v-col>
        </v-row>

        <!-- 过滤器 -->
        <div class="d-flex flex-wrap mb-4 gap-2">
          <div>
            <v-chip
              :append-icon="
                attendanceFilter.includes('present') ? 'mdi-check' : ''
              "
              :color="attendanceFilter.includes('present') ? 'success' : ''"
              :variant="
                attendanceFilter.includes('present') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              prepend-icon="mdi-account-check"
              value="present"
              @click="toggleFilter('present')"
            >
              到课
            </v-chip>

            <v-chip
              :append-icon="
                attendanceFilter.includes('absent') ? 'mdi-check' : ''
              "
              :color="attendanceFilter.includes('absent') ? 'error' : ''"
              :variant="
                attendanceFilter.includes('absent') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              prepend-icon="mdi-account-off"
              value="absent"
              @click="toggleFilter('absent')"
            >
              请假
            </v-chip>
            <v-chip
              :append-icon="
                attendanceFilter.includes('late') ? 'mdi-check' : ''
              "
              :color="attendanceFilter.includes('late') ? 'warning' : ''"
              :variant="
                attendanceFilter.includes('late') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              prepend-icon="mdi-clock-alert"
              value="late"
              @click="toggleFilter('late')"
            >
              迟到
            </v-chip>
            <v-chip
              :append-icon="
                attendanceFilter.includes('exclude') ? 'mdi-check' : ''
              "
              :color="attendanceFilter.includes('exclude') ? 'grey' : ''"
              :variant="
                attendanceFilter.includes('exclude') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              prepend-icon="mdi-account-cancel"
              value="exclude"
              @click="toggleFilter('exclude')"
            >
              不参与
            </v-chip>
          </div>
        </div>

        <!-- 学生列表 -->
        <v-row>
          <v-col
            v-for="student in filteredStudents"
            :key="student"
            cols="12"
            lg="4"
            md="6"
            sm="6"
          >
            <v-card border class="student-card">
              <v-card-text class="d-flex align-center pa-2">
                <div class="flex-grow-1">
                  <div class="d-flex align-center">
                    <v-avatar
                      :color="
                        getStudentStatusColor(
                          state.studentList.indexOf(student)
                        )
                      "
                      class="mr-2"
                      size="24"
                    >
                      <v-icon size="small"
                        >{{
                          getStudentStatusIcon(
                            state.studentList.indexOf(student)
                          )
                        }}
                      </v-icon>
                    </v-avatar>
                    <div class="text-subtitle-1">{{ student }}</div>
                  </div>
                </div>
                <div class="attendance-actions">
                  <v-btn
                    :color="
                      isPresent(state.studentList.indexOf(student))
                        ? 'success'
                        : ''
                    "
                    :title="'设为到课'"
                    icon="mdi-account-check"
                    size="small"
                    variant="text"
                    @click="setPresent(state.studentList.indexOf(student))"
                  />
                  <v-btn
                    :color="
                      isAbsent(state.studentList.indexOf(student))
                        ? 'error'
                        : ''
                    "
                    :title="'设为请假'"
                    icon="mdi-account-off"
                    size="small"
                    variant="text"
                    @click="setAbsent(state.studentList.indexOf(student))"
                  />
                  <v-btn
                    :color="
                      isLate(state.studentList.indexOf(student))
                        ? 'warning'
                        : ''
                    "
                    :title="'设为迟到'"
                    icon="mdi-clock-alert"
                    size="small"
                    variant="text"
                    @click="setLate(state.studentList.indexOf(student))"
                  />
                  <v-btn
                    :color="
                      isExclude(state.studentList.indexOf(student))
                        ? 'grey'
                        : ''
                    "
                    :title="'设为不参与'"
                    icon="mdi-account-cancel"
                    size="small"
                    variant="text"
                    @click="setExclude(state.studentList.indexOf(student))"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="12">
            <v-card class="mb-4" color="primary" variant="tonal">
              <v-card-text>
                <div class="text-subtitle-2 mb-2">批量操作</div>
                <v-btn-group>
                  <v-btn
                    color="success"
                    prepend-icon="mdi-account-check"
                    @click="setAllPresent"
                  >
                    全部到齐
                  </v-btn>
                  <v-btn
                    color="error"
                    prepend-icon="mdi-account-off"
                    @click="setAllAbsent"
                  >
                    全部请假
                  </v-btn>
                </v-btn-group>
                <v-btn-group>
                  <v-btn
                    color="warning"
                    prepend-icon="mdi-clock-alert"
                    @click="setAllLate"
                  >
                    全部迟到
                  </v-btn>
                  <v-btn
                    color="grey"
                    prepend-icon="mdi-account-cancel"
                    @click="setAllExclude"
                  >
                    全部不参与
                  </v-btn>
                </v-btn-group>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />

        <v-btn color="primary" @click="saveAttendance">
          <v-icon start>mdi-content-save</v-icon>
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <message-log ref="messageLog" />

  <!-- 添加悬浮工具栏 -->
  <floating-toolbar
    :is-today="isToday"
    :loading="loading.download"
    :selected-date="state.selectedDateObj"
    :unread-count="unreadCount"
    @refresh="downloadData"
    @zoom="zoom"
    @open-messages="$refs.messageLog.drawer = true"
    @open-settings="$router.push('/settings')"
    @date-select="handleDateSelect"
    @prev-day="navigateDay(-1)"
    @next-day="navigateDay(1)"
  />

  <!-- 添加ICP备案悬浮组件 -->
  <FloatingICP />

  <!-- 设备聊天室（右下角浮窗） -->
  <ChatWidget v-model="isChatOpen" :show-button="false" />

  <!-- 紧急通知测试对话框 -->
  <UrgentTestDialog v-model="urgentTestDialog" />

  <!-- 添加确认对话框 -->
  <v-dialog v-model="confirmDialog.show" max-width="400">
    <v-card>
      <v-card-title class="text-h6"> 确认保存</v-card-title>
      <v-card-text>
        您正在修改 {{ state.dateString }} 的数据，确定要保存吗？
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="confirmDialog.reject">
          取消
        </v-btn>
        <v-btn color="primary" @click="confirmDialog.resolve"> 确认保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 添加随机点名组件 -->
  <random-picker
    ref="randomPicker"
    :attendance="state.boardData.attendance"
    :student-list="state.studentList"
  />

  <!-- 添加URL配置确认对话框 -->
  <v-dialog v-model="urlConfigDialog.show" max-width="500">
    <v-card>
      <v-card-title class="text-h6"> 确认应用URL配置</v-card-title>
      <v-card-text>
        <p>以下配置将应用于当前班级：</p>
        <v-list density="compact">
          <v-list-item
            v-for="change in urlConfigDialog.changes"
            :key="change.key"
          >
            <template #prepend>
              <v-icon :icon="change.icon" class="mr-2" size="small" />
            </template>
            <v-list-item-title class="d-flex align-center">
              <span class="text-subtitle-1">{{ change.name }}</span>
              <v-tooltip activator="parent" location="top"
                >{{ change.description || change.key }}
              </v-tooltip>
            </v-list-item-title>
            <v-list-item-subtitle>
              <span class="text-grey-darken-1">{{ change.oldValue }}</span>
              <v-icon class="mx-1" icon="mdi-arrow-right" size="small" />
              <span class="text-primary font-weight-medium">{{
                change.newValue
              }}</span>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="grey"
          variant="text"
          @click="urlConfigDialog.cancelHandler"
        >
          取消
        </v-btn>
        <v-btn color="primary" @click="urlConfigDialog.confirmHandler">
          确认应用
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <br /><br /><br />
</template>

<script>
import MessageLog from "@/components/MessageLog.vue";
import RandomPicker from "@/components/RandomPicker.vue";
import FloatingToolbar from "@/components/FloatingToolbar.vue";
import FloatingICP from "@/components/FloatingICP.vue";
import ChatWidget from "@/components/ChatWidget.vue";
import HomeworkEditDialog from "@/components/HomeworkEditDialog.vue";
import InitServiceChooser from "@/components/InitServiceChooser.vue";
import StudentNameManager from "@/components/StudentNameManager.vue";
import UrgentTestDialog from "@/components/UrgentTestDialog.vue";
import dataProvider from "@/utils/dataProvider";
import {
  getSetting,
  watchSettings,
  setSetting,
  settingsDefinitions,
} from "@/utils/settings";
import { kvServerProvider } from "@/utils/providers/kvServerProvider";
import { useDisplay } from "vuetify";
import "../styles/index.scss";
import "../styles/transitions.scss";
import "../styles/global.scss";
import { pinyin } from "pinyin-pro";
import { debounce, throttle } from "@/utils/debounce";
import { Base64 } from "js-base64";
import {
  getSocket,
  on as socketOn,
  joinToken,
  leaveAll,
  onConnect as onSocketConnect,
} from "@/utils/socketClient";
import { createDeviceEventHandler } from "@/utils/deviceEvents";
import axios from "@/axios/axios";

export default {
  name: "Classworks 作业板",
  components: {
    MessageLog,
    RandomPicker,
    FloatingToolbar,
    FloatingICP,
    HomeworkEditDialog,
    InitServiceChooser,
    ChatWidget,
    StudentNameManager,
    UrgentTestDialog,
  },
  data() {
    const defaultSubjects = [
      { name: "语文", order: 0 },
      { name: "数学", order: 1 },
      { name: "英语", order: 2 },
      { name: "物理", order: 3 },
      { name: "化学", order: 4 },
      { name: "生物", order: 5 },
      { name: "政治", order: 6 },
      { name: "历史", order: 7 },
      { name: "地理", order: 8 },
      { name: "其他", order: 9 },
    ];

    return {
      dataKey: "",
      provider: "",
      useDisplay: useDisplay,
      state: {
        classNumber: "",
        // 当前命名空间/设备信息（从云端加载）
        namespaceInfo: null,
        deviceName: "",
        studentList: [],
        boardData: {
          homework: {},
          attendance: {
            absent: [],
            late: [],
            exclude: [],
          },
        },
        dialogVisible: false,
        dialogTitle: "",
        textarea: "",
        dateString: "",
        synced: false,
        attendDialogVisible: false,
        contentStyle: { "font-size": `${getSetting("font.size")}px` },
        uploadLoading: false,
        downloadLoading: false,
        snackbar: false,
        snackbarText: "",
        fontSize: getSetting("font.size"),
        datePickerDialog: false,
        selectedDate: new Date().toISOString().split("T")[0].replace(/-/g, ""),
        selectedDateObj: new Date(),
        refreshInterval: null,
        showNoDataMessage: false,
        noDataMessage: "",
        isToday: false,
        attendanceDialog: false,
        availableSubjects: defaultSubjects,
        isFullscreen: false,
      },
      loading: {
        download: false,
        upload: false,
        students: false,
      },
      debouncedUpload: null,
      throttledReflow: null,
      sortedItemsCache: {
        key: "",
        value: [],
      },
      confirmDialog: {
        show: false,
        resolve: null,
        reject: null,
      },
      attendanceSearch: "",
      attendanceFilter: [],
      urlConfigDialog: {
        show: false,
        config: null,
        changes: [],
        validSettings: {},
        confirmHandler: null,
        cancelHandler: null,
        icons: {},
      },
      settingsTick: 0,
      isChatOpen: false,
      highlightedCards: {}, // 记录哪些卡片需要高亮
      // Token 显示信息（统一显示 token 信息和学生姓名）
      tokenDisplayInfo: {
        show: false,
        readonly: false, // 是否是只读 token
        text: "",
        color: "primary",
        variant: "tonal",
        icon: "mdi-account",
        disabled: false,
      },
      // 实时刷新信息
      realtimeInfo: {
        show: false,
        time: "",
        key: "",
      },
      $offKvChanged: null,
      $offConnect: null,
      debouncedRealtimeRefresh: null,
      // 预配数据
      preconfigData: {
        namespace: null,
        authCode: null,
        autoOpen: false,
        autoExecute: false,
      },
      // 紧急通知测试对话框
      urgentTestDialog: false,
      // 令牌信息
      tokenInfo: null,
    };
  },

  computed: {
    isMobile() {
      return useDisplay().mobile.value;
    },
    titleText() {
      // 优先展示当前设备名称（如果已从云端获取）
      const deviceName =
        this.state.namespaceInfo?.device?.name ||
        this.state.classNumber ||
        "高三八班";

      const today = this.getToday();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const currentDateStr = this.state.dateString;
      const todayStr = this.formatDate(today);
      const yesterdayStr = this.formatDate(yesterday);

      if (currentDateStr === todayStr) {
        return deviceName + " - 今天的作业";
      } else if (currentDateStr === yesterdayStr) {
        return deviceName + " - 昨天的作业";
      } else {
        return `${deviceName} - ${currentDateStr}的作业`;
      }
    },
    sortedItems() {
      const key = `${JSON.stringify(
        this.state.boardData.homework
      )}_${this.subjectOrder.join()}_${this.dynamicSort}`;
      if (this.sortedItemsCache.key === key) {
        return this.sortedItemsCache.value;
      }

      const items = Object.entries(this.state.boardData.homework)
        .filter(([, value]) => value.content?.trim())
        .map(([key, value]) => ({
          key,
          name:
            this.state.availableSubjects.find((s) => s.name === key)?.name ||
            key,
          content: value.content,
          order: this.subjectOrder.indexOf(key),
          rowSpan: Math.ceil(
            (value.content.split("\n").filter((line) => line.trim()).length +
              1) *
              0.8
          ),
        }));

      const result = this.dynamicSort
        ? this.optimizeGridLayout(items)
        : items.sort((a, b) => a.order - b.order);

      this.updateSortedItemsCache(key, result);

      return result;
    },
    unusedSubjects() {
      const usedKeys = Object.keys(this.state.boardData.homework).filter(
        (key) => this.state.boardData.homework[key].content?.trim()
      );
      return this.state.availableSubjects
        .filter((subject) => !usedKeys.includes(subject.name))
        .sort((a, b) => a.order - b.order);
    },
    emptySubjects() {
      if (this.emptySubjectDisplay !== "button") return [];
      return this.unusedSubjects;
    },
    autoSave() {
      return getSetting("edit.autoSave");
    },
    blockNonTodayAutoSave() {
      return getSetting("edit.blockNonTodayAutoSave");
    },
    isToday() {
      const today = (() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        return `${yyyy}${mm}${dd}`;
      })();
      return this.state.dateString === today;
    },
    canAutoSave() {
      return this.autoSave && (!this.blockNonTodayAutoSave || this.isToday);
    },
    needConfirmSave() {
      return !this.isToday && this.confirmNonTodaySave;
    },
    shouldShowBlockedMessage() {
      return !this.isToday && this.autoSave && this.blockNonTodayAutoSave;
    },
    refreshBeforeEdit() {
      return getSetting("edit.refreshBeforeEdit");
    },
    emptySubjectDisplay() {
      return getSetting("display.emptySubjectDisplay");
    },
    dynamicSort() {
      return getSetting("display.dynamicSort");
    },
    isEditingDisabled() {
      return this.state.uploadLoading || this.state.downloadLoading;
    },
    unreadCount() {
      return this.$refs.messageLog?.unreadCount || 0;
    },
    showRandomPickerButton() {
      return getSetting("randomPicker.enabled");
    },
    showListCardButton() {
      return getSetting("display.showListCard");
    },
    confirmNonTodaySave() {
      return getSetting("edit.confirmNonTodaySave");
    },
    shouldShowSaveConfirm() {
      return !this.isToday && this.confirmNonTodaySave;
    },
    shouldBlockAutoSave() {
      return !this.isToday && this.autoSave && this.blockNonTodayAutoSave;
    },
    showFullscreenButton() {
      return getSetting("display.showFullscreenButton");
    },
    showExamScheduleButton() {
      return getSetting("display.showExamScheduleButton");
    },
    showAntiScreenBurnCard() {
      return getSetting("display.showAntiScreenBurnCard");
    },
    shouldShowInit() {
      const provider = getSetting("server.provider");
      const isKv = provider === "kv-server" || provider === "classworkscloud";
      const token = getSetting("server.kvToken");
      // 仅首页
      const onHome = this.$route?.path === "/";
      // 依赖 settingsTick 使其在设置变更时重新计算
      void this.settingsTick;
      return onHome && isKv && (!token || token === "");
    },
    // 是否显示紧急通知测试按钮（仅教师和课堂令牌）
    shouldShowUrgentTestButton() {
      // 检查是否使用 KV 服务器
      const provider = getSetting("server.provider");
      const isKv = provider === "kv-server" || provider === "classworkscloud";
      if (!isKv) return false;

      // 检查是否有令牌
      const kvToken = getSetting("server.kvToken");
      if (!kvToken) return false;

      // 检查令牌信息是否已加载
      if (!this.tokenInfo) return false;

      // 只有 teacher 或 classroom 类型的令牌才显示
      return (
        this.tokenInfo.deviceType === "teacher" ||
        this.tokenInfo.deviceType === "classroom"
      );
    },
    filteredStudents() {
      let students = [...this.state.studentList];

      if (this.attendanceSearch) {
        const searchTerm = this.attendanceSearch.toLowerCase();
        students = students.filter((student) =>
          student.toLowerCase().includes(searchTerm)
        );
      }

      if (this.attendanceFilter && this.attendanceFilter.length > 0) {
        students = students.filter((student) => {
          const index = this.state.studentList.indexOf(student);
          if (
            this.attendanceFilter.includes("present") &&
            this.isPresent(index)
          )
            return true;
          if (this.attendanceFilter.includes("absent") && this.isAbsent(index))
            return true;
          if (this.attendanceFilter.includes("late") && this.isLate(index))
            return true;
          if (
            this.attendanceFilter.includes("exclude") &&
            this.isExclude(index)
          )
            return true;
          return false;
        });
      }

      return students;
    },
    extractedSurnames() {
      if (!this.state.studentList || this.state.studentList.length === 0) {
        return [];
      }

      const surnameMap = new Map();

      this.state.studentList.forEach((student) => {
        if (student && student.length > 0) {
          const surname = student.charAt(0);
          if (surnameMap.has(surname)) {
            surnameMap.set(surname, surnameMap.get(surname) + 1);
          } else {
            surnameMap.set(surname, 1);
          }
        }
      });

      return Array.from(surnameMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          const pinyinA = pinyin(a.name, { toneType: "none", mode: "surname" });
          const pinyinB = pinyin(b.name, { toneType: "none", mode: "surname" });
          return pinyinA.localeCompare(pinyinB);
        });
    },
    subjectOrder() {
      return [...this.state.availableSubjects]
        .sort((a, b) => a.order - b.order)
        .map((subject) => subject.name);
    },
  },

  watch: {
    homeworkData: {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.waterfall) {
            this.$refs.waterfall.reflow();
          }
        });
      },
      deep: true,
    },
    "$vuetify.display.width": {
      handler() {
        this.throttledReflow();
      },
      deep: true,
    },
  },

  created() {
    this.debouncedUpload = debounce(this.uploadData, 2000);
    this.throttledReflow = throttle(() => {
      if (this.$refs.gridContainer) {
        this.optimizeGridLayout(this.sortedItems);
      }
    }, 200);
  },

  async mounted() {
    try {
      this.updateBackendUrl();
      await this.initializeData();
      // 拉取设备/命名空间信息用于标题显示
      await this.loadDeviceInfo();
      this.setupAutoRefresh();
      this.unwatchSettings = watchSettings(() => {
        this.updateSettings();
      });

      // 连接学生姓名管理组件
      this.$nextTick(() => {
        const studentNameManager = this.$refs.studentNameManager;
        if (studentNameManager) {
          this.studentNameInfo.name = studentNameManager.currentStudentName;
          this.studentNameInfo.isStudent = studentNameManager.isStudentToken;
          this.studentNameInfo.openDialog = () =>
            studentNameManager.openDialog();

          // 监听学生姓名变化
          this.$watch(
            () => studentNameManager.currentStudentName,
            (newName) => {
              this.studentNameInfo.name = newName;
            }
          );
          this.$watch(
            () => studentNameManager.isStudentToken,
            (isStudent) => {
              this.studentNameInfo.isStudent = isStudent;
            }
          );
        }
      });

      document.addEventListener(
        "fullscreenchange",
        this.fullscreenChangeHandler
      );
      document.addEventListener(
        "webkitfullscreenchange",
        this.fullscreenChangeHandler
      );
      document.addEventListener(
        "mozfullscreenchange",
        this.fullscreenChangeHandler
      );
      document.addEventListener(
        "MSFullscreenChange",
        this.fullscreenChangeHandler
      );

      this.checkHashForRandomPicker();

      window.addEventListener("hashchange", this.checkHashForRandomPicker);

      // 实时频道：加入设备房间并监听键变化
      this.setupRealtimeChannel();

      // 初始化 Token 显示信息
      this.$nextTick(() => {
        this.updateTokenDisplayInfo();
      });

      // 获取令牌信息
      await this.loadTokenInfo();
    } catch (err) {
      console.error("初始化失败:", err);
      this.showError("初始化失败，请刷新页面重试");
    }
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
    }

    document.removeEventListener(
      "fullscreenchange",
      this.fullscreenChangeHandler
    );
    document.removeEventListener(
      "webkitfullscreenchange",
      this.fullscreenChangeHandler
    );
    document.removeEventListener(
      "mozfullscreenchange",
      this.fullscreenChangeHandler
    );
    document.removeEventListener(
      "MSFullscreenChange",
      this.fullscreenChangeHandler
    );

    window.removeEventListener("hashchange", this.checkHashForRandomPicker);

    // 退出设备房间并清理监听
    try {
      if (this.$offKvChanged && typeof this.$offKvChanged === "function") {
        this.$offKvChanged();
        this.$offKvChanged = null;
      }
      if (this.$offDeviceEvent && typeof this.$offDeviceEvent === "function") {
        this.$offDeviceEvent();
        this.$offDeviceEvent = null;
      }
      if (this.$offConnect && typeof this.$offConnect === "function") {
        this.$offConnect();
        this.$offConnect = null;
      }
      leaveAll();
    } catch (e) {
      console.warn("主页面事件清理失败:", e);
    }
  },

  methods: {
    // 加载设备/命名空间信息（仅云端模式）
    async loadDeviceInfo() {
      try {
        const provider = getSetting("server.provider");
        const useServer =
          provider === "kv-server" || provider === "classworkscloud";
        if (!useServer) return;

        const res = await kvServerProvider.loadNamespaceInfo();
        if (res && res.success === false) return; // 忽略错误

        this.state.namespaceInfo = res || null;
        // 兜底填充设备名，避免重复解析
        this.state.deviceName = res?.account?.deviceName || "";
      } catch (e) {
        console.warn("加载设备信息失败:", e);
      }
    },

    // 获取令牌信息
    async loadTokenInfo() {
      try {
        const provider = getSetting("server.provider");
        const isKv = provider === "kv-server" || provider === "classworkscloud";
        if (!isKv) return;

        const kvToken = getSetting("server.kvToken");
        if (!kvToken) return;

        const serverUrl = getSetting("server.domain");
        if (!serverUrl) return;

        // 获取 Token 信息
        const tokenResponse = await axios.get(`${serverUrl}/kv/_token`, {
          headers: {
            Authorization: `Bearer ${kvToken}`,
          },
        });

        this.tokenInfo = tokenResponse.data;
        console.log("Token info loaded:", this.tokenInfo);
      } catch (error) {
        console.warn("Failed to load token info:", error);
        this.tokenInfo = null;
      }
    },

    // 更新 Token 显示信息
    updateTokenDisplayInfo() {
      const manager = this.$refs.studentNameManager;
      if (!manager || !manager.hasToken) {
        this.tokenDisplayInfo.show = false;
        this.tokenDisplayInfo.readonly = false;
        return;
      }

      const displayName = manager.displayName;
      const isReadOnly = manager.isReadOnly;
      const isStudent = manager.isStudentToken;

      // 设置只读状态（对所有类型的 token 都显示）
      this.tokenDisplayInfo.readonly = isReadOnly;

      // 只有学生类型的 token 才显示名称 chip
      if (!isStudent) {
        this.tokenDisplayInfo.show = false;
        return;
      }

      // 设置学生名称显示（始终蓝色）
      this.tokenDisplayInfo.text = displayName;
      this.tokenDisplayInfo.color = "primary";
      this.tokenDisplayInfo.icon = "mdi-account";
      this.tokenDisplayInfo.disabled = isReadOnly; // 只读时不可点击
      this.tokenDisplayInfo.show = true;
    },

    // 处理 Token Chip 点击
    handleTokenChipClick() {
      console.log("Token chip clicked");
      const manager = this.$refs.studentNameManager;
      console.log("Manager:", manager);
      console.log("Is student token:", manager?.isStudentToken);

      if (manager && manager.isStudentToken) {
        console.log("Opening dialog...");
        manager.openDialog();
      } else {
        console.log("Cannot open dialog - conditions not met");
      }
    },

    ensureDate(dateInput) {
      if (dateInput instanceof Date) {
        return dateInput;
      }
      if (typeof dateInput === "string") {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      return new Date();
    },

    formatDate(dateInput) {
      const date = this.ensureDate(dateInput);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}${month}${day}`;
    },

    getToday() {
      return new Date();
    },

    async initializeData() {
      // 解析预配数据
      this.parsePreconfigData();

      const configApplied = await this.parseUrlConfig();

      const urlParams = new URLSearchParams(window.location.search);
      const dateFromUrl = urlParams.get("date");
      const today = this.getToday();

      let currentDate = today;
      if (dateFromUrl) {
        if (/^\d{8}$/.test(dateFromUrl)) {
          const year = dateFromUrl.substring(0, 4);
          const month = dateFromUrl.substring(4, 6);
          const day = dateFromUrl.substring(6, 8);
          currentDate = new Date(`${year}-${month}-${day}`);
        } else {
          currentDate = new Date(dateFromUrl);
        }
        if (isNaN(currentDate.getTime())) {
          currentDate = today;
        }
      }

      this.state.dateString = this.formatDate(currentDate);
      this.state.selectedDate = this.state.dateString;
      this.state.selectedDateObj = currentDate;
      this.state.isToday =
        this.formatDate(currentDate) === this.formatDate(today);
      if (!configApplied) {
        this.provider = getSetting("server.provider");
        const classNum = getSetting("server.classNumber");

        this.state.classNumber = classNum;
      }
      await Promise.all([this.downloadData(), this.loadConfig()]);
    },

    async downloadData(forceClear = false) {
      if (this.loading.download) return;

      try {
        this.loading.download = true;
        const response = await dataProvider.loadData(
          "classworks-data-" + this.state.dateString
        );

        if (response.success == false) {
          if (response.error.code === "NOT_FOUND") {
            this.state.showNoDataMessage = true;
            this.state.noDataMessage = response.error.message;
            // 如果强制清空或当前没有数据时才设置为空
            if (
              forceClear ||
              !this.state.boardData ||
              (!this.state.boardData.homework &&
                !this.state.boardData.attendance)
            ) {
              this.state.boardData = {
                homework: {},
                attendance: { absent: [], late: [], exclude: [] },
              };
            }
          } else {
            throw new Error(response.error.message);
          }
        } else {
          this.state.boardData = {
            homework: response.homework || {},
            attendance: {
              absent: response.attendance?.absent || [],
              late: response.attendance?.late || [],
              exclude: response.attendance?.exclude || [],
            },
          };
          this.state.synced = true;
          this.state.showNoDataMessage = false;
          this.$message.success("下载成功", "数据已更新");
        }
      } catch (error) {
        // 数据加载失败时的处理
        console.error("数据加载失败:", error);
        this.$message.error("下载失败", error.message);
        // 如果强制清空或当前没有任何数据，才初始化为空数据
        if (
          forceClear ||
          !this.state.boardData ||
          (!this.state.boardData.homework && !this.state.boardData.attendance)
        ) {
          this.state.boardData = {
            homework: {},
            attendance: { absent: [], late: [], exclude: [] },
          };
        }
      } finally {
        this.loading.download = false;
      }
    },

    async trySave(isAutoSave = false) {
      if (isAutoSave && !this.canAutoSave) {
        if (this.shouldShowBlockedMessage) {
          this.showMessage(
            "需要手动保存",
            "已禁止自动保存非当天数据",
            "warning"
          );
        }
        return false;
      }

      if (!isAutoSave && this.needConfirmSave) {
        try {
          await this.showConfirmDialog();
        } catch {
          return false;
        }
      }

      try {
        await this.uploadData();
        return true;
      } catch (error) {
        this.$message.error("保存失败", error.message || "请重试");
        return false;
      }
    },

    async handleClose() {
      if (!this.currentEditSubject) return;

      const content = this.state.textarea.trim();
      const originalContent =
        this.state.boardData.homework[this.currentEditSubject]?.content || "";

      if (content !== originalContent.trim()) {
        this.state.boardData.homework[this.currentEditSubject] = {
          content: content,
        };

        this.state.synced = false;

        if (this.autoSave) {
          await this.trySave(true);
        }
      }

      this.state.dialogVisible = false;
    },

    async uploadData() {
      if (this.loading.upload) return;

      try {
        this.loading.upload = true;
        const response = await dataProvider.saveData(
          "classworks-data-" + this.state.dateString,
          this.state.boardData
        );
        if (response.success == false) {
          throw new Error(response.error.message);
        }

        this.state.synced = true;
        this.$message.success(response.message || "保存成功");
      } finally {
        this.loading.upload = false;
      }
    },

    async loadConfig() {
      try {
        // 加载学生列表
        try {
          const response = await dataProvider.loadData("classworks-list-main");

          if (response.success != false && Array.isArray(response)) {
            this.state.studentList = response.map((student) => student.name);
          }
        } catch (error) {
          console.warn(
            "Failed to load student list from dedicated key, falling back to config",
            error
          );
        }

        await this.loadSubjects();
      } catch (error) {
        console.error("加载配置失败:", error);
        this.$message.error("加载配置失败", error.message);
      }
    },

    async loadSubjects() {
      try {
        const subjectsResponse = await dataProvider.loadData(
          "classworks-config-subject"
        );
        if (subjectsResponse && Array.isArray(subjectsResponse)) {
          // 更新科目列表
          this.state.availableSubjects = subjectsResponse;
        }
      } catch (error) {
        console.warn("Failed to load subject configuration:", error);
        // 保持默认科目列表
      }
    },

    showSyncMessage() {
      this.$message.success("数据已同步", "数据已完成与服务器同步");
    },

    async openDialog(subject) {
      if (this.refreshBeforeEdit) {
        try {
          await this.downloadData();
        } catch (err) {
          console.error("刷新数据失败:", err);
          this.$message.error("刷新数据失败，可能显示的不是最新数据");
        }
      }

      this.currentEditSubject = subject;
      if (!this.state.boardData.homework[subject]) {
        this.state.boardData.homework[subject] = {
          content: "",
        };
      }
      this.state.dialogTitle =
        this.state.availableSubjects.find((s) => s.name === subject)?.name ||
        subject;
      this.state.textarea = this.state.boardData.homework[subject].content;
      this.state.dialogVisible = true;
    },

    async handleHomeworkSave(content) {
      if (!this.currentEditSubject) return;

      this.state.boardData.homework[this.currentEditSubject] = {
        content: content,
      };

      this.state.synced = false;

      if (this.autoSave) {
        await this.trySave(true);
      }
    },

    splitPoint(content) {
      return content.split("\n").filter((text) => text.trim());
    },

    setAttendanceArea() {
      this.state.attendanceDialog = true;
    },

    toggleStudentStatus(index) {
      const student = this.state.studentList[index];
      if (this.state.boardData.attendance.absent.includes(student)) {
        this.state.boardData.attendance.absent =
          this.state.boardData.attendance.absent.filter(
            (name) => name !== student
          );
        this.state.boardData.attendance.late.push(student);
      } else if (this.state.boardData.attendance.late.includes(student)) {
        this.state.boardData.attendance.late =
          this.state.boardData.attendance.late.filter(
            (name) => name !== student
          );
        this.state.boardData.attendance.exclude.push(student);
      } else if (this.state.boardData.attendance.exclude.includes(student)) {
        this.state.boardData.attendance.exclude =
          this.state.boardData.attendance.exclude.filter(
            (name) => name !== student
          );
      } else {
        this.state.boardData.attendance.absent.push(student);
      }
      this.state.synced = false;
      if (this.canAutoSave) {
        this.uploadData();
      }
    },

    cleanstudentslist() {
      this.state.boardData.attendance.absent = [];
      this.state.boardData.attendance.late = [];
      this.state.boardData.attendance.exclude = [];
      this.state.synced = false;
      if (this.canAutoSave) {
        this.uploadData();
      }
    },

    zoom(direction) {
      const step = 2;
      if (direction === "up" && this.state.fontSize < 100) {
        this.state.fontSize += step;
      } else if (direction === "out" && this.state.fontSize > 16) {
        this.state.fontSize -= step;
      }
      this.state.contentStyle = {
        "font-size": `${this.state.fontSize}px`,
      };
      setSetting("font.size", this.state.fontSize);
    },

    updateBackendUrl() {
      const provider = getSetting("server.provider");
      const classNum = getSetting("server.classNumber");

      this.provider = provider;

      this.state.classNumber = classNum;
    },

    setupAutoRefresh() {
      const autoRefresh = getSetting("refresh.auto");
      const interval = getSetting("refresh.interval");
      if (this.state.refreshInterval) {
        clearInterval(this.state.refreshInterval);
      }
      if (autoRefresh) {
        this.state.refreshInterval = setInterval(() => {
          if (!this.shouldSkipRefresh()) {
            this.downloadData();
          }
        }, interval * 1000);
      }
    },

    shouldSkipRefresh() {
      if (this.state.dialogVisible) return true;

      if (this.state.attendanceDialog) return true;

      if (this.confirmDialog.show) return true;

      if (this.state.datePickerDialog) return true;

      if (this.loading.upload || this.loading.download) return true;

      if (!this.state.synced) return true;

      return false;
    },

    updateSettings() {
      this.state.fontSize = getSetting("font.size");
      this.state.contentStyle = { "font-size": `${this.state.fontSize}px` };
      this.setupAutoRefresh();
      this.updateBackendUrl();
      // 设置更新时尝试刷新设备名称（例如 Token 或域名变更）
      this.loadDeviceInfo();
      // 重新加载令牌信息（Token 可能已变更）
      this.loadTokenInfo();
      // 触发依赖刷新（例如 shouldShowInit）
      this.settingsTick++;
    },

    async handleDateSelect(newDate) {
      if (!newDate) return;

      try {
        const selectedDate = this.ensureDate(newDate);
        const formattedDate = this.formatDate(selectedDate);

        if (this.state.dateString !== formattedDate) {
          this.state.dateString = formattedDate;
          this.state.selectedDate = formattedDate;
          this.state.selectedDateObj = selectedDate;
          this.state.isToday =
            formattedDate === this.formatDate(this.getToday());

          this.$router
            .replace({
              query: { date: formattedDate },
            })
            .catch(() => {});

          // Load both data and subjects in parallel, force clear data when switching dates
          await Promise.all([this.downloadData(true), this.loadSubjects()]);
        }
      } catch (error) {
        console.error("Date processing error:", error);
        this.$message.error("日期处理错误", "请重新选择日期");
      }
    },

    optimizeGridLayout(items) {
      const maxColumns = Math.min(3, Math.floor(window.innerWidth / 300));
      if (maxColumns <= 1) return items;

      const columns = Array.from({ length: maxColumns }, () => ({
        height: 0,
        items: [],
      }));

      items.forEach((item) => {
        const shortestColumn = columns.reduce(
          (min, col, i) => (col.height < columns[min].height ? i : min),
          0
        );
        columns[shortestColumn].items.push(item);
        columns[shortestColumn].height += item.rowSpan;
      });

      return columns
        .flatMap((col) => col.items)
        .map((item, index) => ({
          ...item,
          order: index,
        }));
    },

    // 实时频道：加入设备房间并监听键变化
    setupRealtimeChannel() {
      try {
        const token = getSetting("server.kvToken");
        if (!token) {
          console.warn("未配置 KV Token，无法加入实时频道");
          return;
        }

        // Ensure socket created
        getSocket();
        joinToken(token);

        // Re-join on reconnect
        this.$offConnect = onSocketConnect(() => joinToken(token));

        // Debounce refresh to avoid storms
        if (!this.debouncedRealtimeRefresh) {
          this.debouncedRealtimeRefresh = debounce(async () => {
            const oldHomework = JSON.parse(
              JSON.stringify(this.state.boardData.homework)
            );
            await this.downloadData();
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, "0");
            const mm = String(now.getMinutes()).padStart(2, "0");
            const ss = String(now.getSeconds()).padStart(2, "0");

            // 使用消息记录工具发送通知
            this.$message?.info(
              "数据已更新",
              `已于 ${hh}:${mm}:${ss} 自动刷新`
            ); // 检测哪些科目发生了变化
            const changed = {};
            for (const key in this.state.boardData.homework) {
              const oldContent = oldHomework[key]?.content || "";
              const newContent =
                this.state.boardData.homework[key]?.content || "";
              if (oldContent !== newContent) {
                changed[key] = true;
              }
            }
            // 删除的科目也算变化
            for (const key in oldHomework) {
              if (!this.state.boardData.homework[key]) {
                changed[key] = true;
              }
            }

            // 设置高亮
            this.highlightedCards = changed;
            // 3秒后移除高亮
            setTimeout(() => {
              this.highlightedCards = {};
            }, 10000);
          }, 800);
        }

        const handler = (msg) => {
          // Expect msg = { uuid, key, action, created?, updatedAt?, deletedAt?, batch? }
          if (!msg) return;
          // We only care about current date key changes
          const expectedKey = `classworks-data-${this.state.dateString}`;
          if (msg.key !== expectedKey) return;
          if (msg.action !== "upsert" && msg.action !== "delete") return;
          // Trigger a debounced refresh
          this.debouncedRealtimeRefresh?.(msg.key);
        };

        // 监听 KV 变化事件（支持新旧格式）
        const kvHandler = (eventData) => {
          let msg = eventData;

          // 新格式：直接事件数据
          if (eventData.content && eventData.timestamp) {
            msg = {
              uuid: eventData.senderId || "realtime",
              key: eventData.content.key,
              action: eventData.content.action,
              created: eventData.content.created,
              updatedAt: eventData.content.updatedAt || eventData.timestamp,
              deletedAt: eventData.content.deletedAt,
              batch: eventData.content.batch,
            };
          }

          handler(msg);
        };

        this.$offKvChanged = socketOn("kv-key-changed", kvHandler);

        // 保留设备事件监听（为未来扩展）
        this.deviceEventHandler = createDeviceEventHandler({
          onKvChanged: handler,
          enableLegacySupport: true,
        });
        this.$offDeviceEvent = socketOn(
          "device-event",
          this.deviceEventHandler
        );
      } catch (e) {
        console.warn("实时频道初始化失败", e);
      }
    },

    setAllPresent() {
      this.state.boardData.attendance = {
        absent: [],
        late: [],
        exclude: [],
      };
      this.state.synced = false;
    },

    setAllAbsent() {
      this.state.boardData.attendance.absent = [...this.state.studentList];
      this.state.boardData.attendance.late = [];
      this.state.boardData.attendance.exclude = [];
      this.state.synced = false;
    },

    setAllLate() {
      this.state.boardData.attendance.absent = [];
      this.state.boardData.attendance.late = [...this.state.studentList];
      this.state.boardData.attendance.exclude = [];
      this.state.synced = false;
    },
    setAllExclude() {
      this.state.boardData.attendance.absent = [];
      this.state.boardData.attendance.late = [];
      this.state.boardData.attendance.exclude = [...this.state.studentList];
      this.state.synced = false;
    },

    isPresent(index) {
      const student = this.state.studentList[index];
      const { absent, late, exclude } = this.state.boardData.attendance;
      return (
        !absent.includes(student) &&
        !late.includes(student) &&
        !exclude.includes(student)
      );
    },

    isAbsent(index) {
      return this.state.boardData.attendance.absent.includes(
        this.state.studentList[index]
      );
    },

    isLate(index) {
      return this.state.boardData.attendance.late.includes(
        this.state.studentList[index]
      );
    },

    isExclude(index) {
      return this.state.boardData.attendance.exclude.includes(
        this.state.studentList[index]
      );
    },

    setPresent(index) {
      const student = this.state.studentList[index];
      this.state.boardData.attendance.absent =
        this.state.boardData.attendance.absent.filter(
          (name) => name !== student
        );
      this.state.boardData.attendance.late =
        this.state.boardData.attendance.late.filter((name) => name !== student);
      this.state.boardData.attendance.exclude =
        this.state.boardData.attendance.exclude.filter(
          (name) => name !== student
        );
      this.state.synced = false;
    },

    setAbsent(index) {
      const student = this.state.studentList[index];
      this.setPresent(index);
      this.state.boardData.attendance.absent.push(student);
      this.state.synced = false;
    },

    setLate(index) {
      const student = this.state.studentList[index];
      this.setPresent(index);
      this.state.boardData.attendance.late.push(student);
      this.state.synced = false;
    },

    setExclude(index) {
      const student = this.state.studentList[index];
      this.setPresent(index);
      this.state.boardData.attendance.exclude.push(student);
      this.state.synced = false;
    },

    async saveAttendance() {
      try {
        await this.trySave(true);
        this.state.attendanceDialog = false;
      } catch (error) {
        console.error("保存出勤状态失败:", error);
        this.$message.error("保存失败", "请重试");
      }
    },

    showMessage(title, content = "", type = "success") {
      this.$message[type](title, content);
    },

    updateSortedItemsCache(key, value) {
      this._sortedItemsCache = {
        key,
        value,
      };
    },

    handleMouseMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--x", `${x}%`);
      card.style.setProperty("--y", `${y}%`);
    },

    handleTouchMove(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--x", `${x}%`);
        card.style.setProperty("--y", `${y}%`);
      }
    },

    showConfirmDialog() {
      return new Promise((resolve, reject) => {
        this.confirmDialog = {
          show: true,
          resolve: () => {
            this.confirmDialog.show = false;
            resolve();
          },
          reject: () => {
            this.confirmDialog.show = false;
            reject(new Error("用户取消保存"));
          },
        };
      });
    },

    confirmSave() {
      this.confirmDialog.show = false;
      if (this.confirmDialog.resolve) {
        this.confirmDialog.resolve(true);
      }
    },

    cancelSave() {
      this.confirmDialog.show = false;
      if (this.confirmDialog.reject) {
        this.confirmDialog.reject(new Error("用户取消保存"));
      }
    },

    async manualUpload() {
      return this.trySave(false);
    },

    async handleAttendanceDialogClose(newValue) {
      if (!newValue && !this.state.synced) {
        await this.trySave(true);
      }
    },

    toggleFullscreen() {
      if (!this.state.isFullscreen) {
        this.enterFullscreen();
      } else {
        this.exitFullscreen();
      }
    },

    enterFullscreen() {
      const docElm = document.documentElement;

      if (docElm.requestFullscreen) {
        docElm.requestFullscreen();
      } else if (docElm.webkitRequestFullScreen) {
        docElm.webkitRequestFullScreen();
      } else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
      } else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
      }
    },

    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    },

    fullscreenChangeHandler() {
      this.state.isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
    },

    getStudentStatusColor(index) {
      const studentName = this.state.studentList[index];
      if (this.state.boardData.attendance.absent.includes(studentName))
        return "error";
      if (this.state.boardData.attendance.late.includes(studentName))
        return "warning";
      if (this.state.boardData.attendance.exclude.includes(studentName))
        return "grey";
      return "success";
    },

    getStudentStatusVariant(index) {
      const studentName = this.state.studentList[index];
      if (
        this.state.boardData.attendance.absent.includes(studentName) ||
        this.state.boardData.attendance.late.includes(studentName) ||
        this.state.boardData.attendance.exclude.includes(studentName)
      ) {
        return "tonal";
      }
      return "outlined";
    },

    getStudentStatusIcon(index) {
      const studentName = this.state.studentList[index];
      if (this.state.boardData.attendance.absent.includes(studentName))
        return "mdi-account-off";
      if (this.state.boardData.attendance.late.includes(studentName))
        return "mdi-clock-alert";
      if (this.state.boardData.attendance.exclude.includes(studentName))
        return "mdi-account-cancel";
      return "mdi-account-check";
    },

    getStudentStatusText(index) {
      const studentName = this.state.studentList[index];
      if (this.state.boardData.attendance.absent.includes(studentName))
        return "请假";
      if (this.state.boardData.attendance.late.includes(studentName))
        return "迟到";
      if (this.state.boardData.attendance.exclude.includes(studentName))
        return "不参与";
      return "到课";
    },

    toggleFilter(filter) {
      const index = this.attendanceFilter.indexOf(filter);
      if (index === -1) {
        this.attendanceFilter.push(filter);
      } else {
        this.attendanceFilter.splice(index, 1);
      }
    },

    openRandomPicker() {
      if (this.$refs.randomPicker) {
        this.$refs.randomPicker.open();
      }
    },

    checkHashForRandomPicker() {
      if (window.location.hash === "#random-picker") {
        this.$nextTick(() => {
          console.log("打开随机点名");
          window.location.hash = "";
          this.openRandomPicker();
        });
      }
    },

    parseUrlConfig() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const configParam = urlParams.get("config");

        if (!configParam) return false;

        try {
          const binaryString = atob(configParam);
          const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
          const decodedString = new TextDecoder().decode(bytes);
          const decodedConfig = JSON.parse(decodedString);
          console.log("从URL读取配置:", decodedConfig);

          const changes = [];
          const validSettings = {};
          const icons = {};

          this.processSpecialSettings(decodedConfig, changes, validSettings);

          this.processStandardSettings(
            decodedConfig,
            changes,
            validSettings,
            icons
          );

          if (Object.keys(validSettings).length === 0) {
            console.log("URL配置与当前配置相同，无需应用");
            return false;
          }

          return new Promise((resolve) => {
            this.urlConfigDialog = {
              show: true,
              config: decodedConfig,
              changes: changes,
              validSettings: validSettings,
              icons: icons,
              confirmHandler: () => {
                this.urlConfigDialog.show = false;
                this.applyUrlConfig(validSettings);
                resolve(true);
              },
              cancelHandler: () => {
                this.urlConfigDialog.show = false;
                resolve(false);
              },
            };
          });
        } catch (e) {
          console.error("解析URL配置错误:", e);
          this.$message.error("URL配置错误", "无法解析配置数据");
          return false;
        }
      } catch (e) {
        console.error("处理URL配置错误:", e);
        return false;
      }
    },

    processSpecialSettings(decodedConfig, changes, validSettings) {
      if (decodedConfig.classNumber !== undefined) {
        const current = getSetting("server.classNumber");
        if (decodedConfig.classNumber !== current) {
          changes.push({
            key: "server.classNumber",
            name: "班级",
            oldValue: current,
            newValue: decodedConfig.classNumber,
            description:
              settingsDefinitions["server.classNumber"]?.description ||
              "班级编号",
            icon:
              settingsDefinitions["server.classNumber"]?.icon ||
              "mdi-account-group",
          });
          validSettings["server.classNumber"] = decodedConfig.classNumber;
        }
      }

      if (decodedConfig.date !== undefined) {
        if (decodedConfig.date !== this.state.dateString) {
          changes.push({
            key: "date",
            name: "日期",
            oldValue: this.state.dateString,
            newValue: decodedConfig.date,
            description: "查看的日期",
            icon: "mdi-calendar",
          });
          validSettings.date = decodedConfig.date;
        }
      }

      if (decodedConfig.subjects && Array.isArray(decodedConfig.subjects)) {
        changes.push({
          key: "subjects",
          name: "科目列表",
          oldValue: `${this.state.availableSubjects.length}个科目`,
          newValue: `${decodedConfig.subjects.length}个科目`,
          description: "可用科目列表",
          icon: "mdi-notebook",
        });
        validSettings.subjects = decodedConfig.subjects;
      }
    },

    processStandardSettings(decodedConfig, changes, validSettings, icons) {
      Object.entries(decodedConfig).forEach(([key, value]) => {
        if (["classNumber", "date", "subjects"].includes(key)) {
          return;
        }

        let settingKey = key;
        let definition = settingsDefinitions[key];

        if (!definition && !key.includes(".")) {
          const prefixes = [
            "server.",
            "display.",
            "theme.",
            "edit.",
            "refresh.",
            "font.",
            "randomPicker.",
          ];
          for (const prefix of prefixes) {
            const prefixedKey = `${prefix}${key}`;
            if (settingsDefinitions[prefixedKey]) {
              settingKey = prefixedKey;
              definition = settingsDefinitions[prefixedKey];
              break;
            }
          }
        }

        if (definition) {
          let typedValue = this.convertValueToCorrectType(
            value,
            definition.type
          );

          if (definition.validate && !definition.validate(typedValue)) {
            console.warn(`URL配置项 ${settingKey} 的值无效: ${value}`);
            return;
          }

          const currentValue = getSetting(settingKey);
          if (typedValue !== currentValue) {
            changes.push({
              key: settingKey,
              name: this.getSettingDisplayName(settingKey),
              oldValue: this.formatSettingValue(currentValue),
              newValue: this.formatSettingValue(typedValue),
              description: definition.description || settingKey,
              icon: definition.icon || "mdi-cog",
            });
            validSettings[settingKey] = typedValue;
            icons[settingKey] = definition.icon || "mdi-cog";
          }
        } else {
          changes.push({
            key: key,
            name: this.getSettingDisplayName(key),
            oldValue: "未知",
            newValue: this.formatSettingValue(value),
            description: "自定义配置项",
            icon: "mdi-cog-outline",
          });
          validSettings[key] = value;
          icons[key] = "mdi-cog-outline";
        }
      });
    },

    convertValueToCorrectType(value, type) {
      if (type === "boolean") {
        return Boolean(value);
      } else if (type === "number") {
        return Number(value);
      } else {
        return String(value);
      }
    },

    formatSettingValue(value) {
      if (typeof value === "boolean") {
        return value ? "开启" : "关闭";
      } else if (value === "" || value === null || value === undefined) {
        return "空";
      }
      return value.toString();
    },

    getSettingDisplayName(key) {
      const parts = key.split(".");
      const lastPart = parts[parts.length - 1];

      const nameMap = {
        provider: "数据提供方",
        domain: "服务器域名",
        classNumber: "班级编号",

        emptySubjectDisplay: "空科目显示方式",
        dynamicSort: "动态排序",
        showRandomButton: "随机按钮",
        showFullscreenButton: "全屏按钮",
        cardHoverEffect: "卡片悬浮效果",
        enhancedTouchMode: "增强触摸模式",
        showAntiScreenBurnCard: "防烧屏卡片",

        mode: "主题模式",

        size: "字体大小",

        autoSave: "自动保存",
        blockNonTodayAutoSave: "禁止自动保存非当日",
        refreshBeforeEdit: "编辑前刷新",
        confirmNonTodaySave: "非当日保存确认",

        auto: "自动刷新",
        interval: "刷新间隔",
      };

      return nameMap[lastPart] || lastPart;
    },

    safeBase64Decode(base64String) {
      try {
        return Base64.decode(base64String);
      } catch (e) {
        console.error("Base64解码错误:", e);
        throw new Error("无法解码配置数据");
      }
    },

    applyUrlConfig(validSettings) {
      for (const [key, value] of Object.entries(validSettings)) {
        if (key === "date") {
          this.handleDateSelect(value);
          continue;
        }

        if (key === "subjects") {
          this.state.availableSubjects = value;
          continue;
        }

        setSetting(key, value);

        if (key === "server.classNumber") {
          this.state.classNumber = value;
        }
      }

      this.updateBackendUrl();
      this.$message.success("URL配置已应用", "已从URL加载配置");
      return true;
    },

    navigateDay(offset) {
      const currentDate = new Date(this.state.selectedDateObj);
      currentDate.setDate(currentDate.getDate() + offset);
      this.handleDateSelect(currentDate);
    },

    // 解析预配数据
    parsePreconfigData() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const namespace = urlParams.get("namespace");
        const authCode =
          urlParams.get("authCode") || urlParams.get("auth_code");
        const autoExecute =
          urlParams.get("autoExecute") || urlParams.get("auto_execute");

        if (namespace) {
          this.preconfigData.namespace = namespace;
          this.preconfigData.authCode = authCode;
          this.preconfigData.autoOpen = true;
          // 解析自动执行参数，支持 true/false、1/0、yes/no
          this.preconfigData.autoExecute = this.parseBoolean(autoExecute);

          console.log("检测到预配数据:", {
            namespace: this.preconfigData.namespace,
            hasAuthCode: !!this.preconfigData.authCode,
            autoExecute: this.preconfigData.autoExecute,
          });

          // 清理URL参数，避免重复处理
          this.cleanupUrlParams([
            "namespace",
            "authCode",
            "auth_code",
            "autoExecute",
            "auto_execute",
          ]);
        }
      } catch (error) {
        console.error("解析预配数据失败:", error);
      }
    },

    // 解析布尔值参数
    parseBoolean(value) {
      if (!value) return false;
      const lowerValue = value.toLowerCase();
      return (
        lowerValue === "true" || lowerValue === "1" || lowerValue === "yes"
      );
    },

    // 清理URL参数
    cleanupUrlParams(params) {
      try {
        const url = new URL(window.location);
        let hasChanged = false;

        params.forEach((param) => {
          if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            hasChanged = true;
          }
        });

        if (hasChanged) {
          // 使用 replaceState 避免创建新的历史记录
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (error) {
        console.error("清理URL参数失败:", error);
      }
    },
  },
};
</script>
