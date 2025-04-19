<template>
  <v-app-bar class="no-select">
    <template #prepend>
      <v-app-bar-nav-icon icon="mdi-home" />
    </template>

    <v-app-bar-title>
      {{ state.classNumber }} - {{ titleText }}
    </v-app-bar-title>

    <v-spacer />

    <template #append>
      <v-btn
        icon="mdi-format-font-size-decrease"
        variant="text"
        @click="zoom('out')"
      />
      <v-btn
        icon="mdi-format-font-size-increase"
        variant="text"
        @click="zoom('up')"
      />
      <v-menu v-model="state.datePickerDialog" :close-on-content-click="false">
        <template #activator="{ props }">
          <v-btn icon="mdi-calendar" variant="text" v-bind="props" />
        </template>
        <v-card border>
          <v-date-picker
            v-model="state.selectedDateObj"
            :model-value="state.selectedDateObj"
            color="primary"
            @update:model-value="handleDateSelect"
          />
        </v-card>
      </v-menu>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        :loading="loading.download"
        @click="downloadData"
      />
      <v-btn
        icon="mdi-bell"
        variant="text"
        :badge="unreadCount || undefined"
        :badge-color="unreadCount ? 'error' : undefined"
        @click="$refs.messageLog.drawer = true"
      />
      <v-btn icon="mdi-cog" variant="text" @click="$router.push('/settings')" />
    </template>
  </v-app-bar>
  <div class="d-flex">
    <!-- 主要内容区域 -->
    <v-container class="main-window flex-grow-1 no-select" fluid>
      <!-- 有内容的科目卡片 -->
      <div ref="gridContainer" class="grid-masonry">
        <TransitionGroup name="grid">
          <div
            v-for="item in sortedItems"
            :key="item.key"
            class="grid-item"
            :style="{
              'grid-row-end': `span ${item.rowSpan}`,
              order: item.order,
            }"
          >
            <v-card
              border
              height="100%"
              class="glow-track"
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
          <v-btn-group divided variant="outlined">
            <v-btn
              v-for="subject in unusedSubjects"
              :key="subject.key"
              :disabled="isEditingDisabled"
              @click="openDialog(subject.key)"
            >
              <v-icon start> mdi-plus </v-icon>
              {{ subject.name }}
            </v-btn>
          </v-btn-group>
        </template>
        <div v-else class="empty-subjects-grid">
          <TransitionGroup name="v-list">
            <v-card
              v-for="subject in unusedSubjects"
              :key="subject.key"
              border
              class="empty-subject-card"
              :disabled="isEditingDisabled"
              @click="openDialog(subject.key)"
            >
              <v-card-title class="text-subtitle-1">
                {{ subject.name }}
              </v-card-title>
              <v-card-text class="text-center">
                <v-icon size="small" color="grey"> mdi-plus </v-icon>
                <div class="text-caption text-grey">点击添加作业</div>
              </v-card-text>
            </v-card>
          </TransitionGroup>
        </div>
      </div>
      <v-btn
        v-if="!state.synced"
        color="error"
        size="large"
        :loading="loading.upload"
        class="ml-2"
        @click="manualUpload"
      >
        上传
      </v-btn>
      <v-btn v-else color="success" size="large" @click="showSyncMessage">
        同步完成
      </v-btn>
      <v-btn
        v-if="showRandomPickerButton"
        color="amber"
        prepend-icon="mdi-account-question"
        append-icon="mdi-dice-multiple"
        size="large"
        class="ml-2"
        @click="openRandomPicker"
      >
        随机点名
      </v-btn>
      <v-btn
        v-if="showFullscreenButton"
        :color="state.isFullscreen ? 'blue-grey' : 'blue'"
        :prepend-icon="
          state.isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'
        "
        size="large"
        class="ml-2"
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
          <v-icon start icon="mdi-shield-check" size="small" />
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
      class="attendance-area no-select"
      cols="1"
      @click="setAttendanceArea()"
    >
      <h1>出勤</h1>
      <h2>
        <snap style="white-space: nowrap"> 应到 </snap>:
        <snap style="white-space: nowrap">
          {{
            state.studentList.length -
            state.boardData.attendance.exclude.length
          }}人
        </snap>
      </h2>
      <h2>
        <snap style="white-space: nowrap"> 实到 </snap>:
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
        <snap style="white-space: nowrap"> 请假 </snap>:
        <snap style="white-space: nowrap">
          {{ state.boardData.attendance.absent.length }}人
        </snap>
      </h2>
      <h3
        class="gray-text"
        v-for="(name, index) in state.boardData.attendance.absent"
        :key="'absent-' + index"
      >
        <span v-if="useDisplay().lgAndUp.value">{{ `${index + 1}. ` }}</span
        ><span style="white-space: nowrap">{{ name }}</span>
      </h3>
      <h2>
        <snap style="white-space: nowrap">迟到</snap>:
        <snap style="white-space: nowrap">
          {{ state.boardData.attendance.late.length }}人
        </snap>
      </h2>
      <h3
        class="gray-text"
        v-for="(name, index) in state.boardData.attendance.late"
        :key="'late-' + index"
      >
        <span v-if="useDisplay().lgAndUp.value">{{ `${index + 1}. ` }}</span
        ><span style="white-space: nowrap">{{ name }}</span>
      </h3>
      <h2>
        <snap style="white-space: nowrap">不参与</snap>:
        <snap style="white-space: nowrap">
          {{ state.boardData.attendance.exclude.length }}人
        </snap>
      </h2>
      <h3
        class="gray-text"
        v-for="(name, index) in state.boardData.attendance.exclude"
        :key="'exclude-' + index"
      >
        <span v-if="useDisplay().lgAndUp.value">{{ `${index + 1}. ` }}</span
        ><span style="white-space: nowrap">{{ name }}</span>
      </h3>
    </v-col>
  </div>

  <v-dialog
    v-model="state.dialogVisible"
    width="500"
    @click:outside="handleClose"
  >
    <v-card border>
      <v-card-title>{{ state.dialogTitle }}</v-card-title>
      <v-card-subtitle>
        {{ autoSave ? "喵？喵呜！" : "写完后点击上传谢谢喵" }}
      </v-card-subtitle>
      <v-card-text>
        <v-textarea
          ref="inputRef"
          v-model="state.textarea"
          auto-grow
          placeholder="使用换行表示分条"
          rows="5"
        />
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="state.snackbar" :timeout="2000">
    {{ state.snackbarText }}
  </v-snackbar>

  <v-dialog
    v-model="state.attendanceDialog"
    max-width="900"
    fullscreen-breakpoint="sm"
    @update:model-value="handleAttendanceDialogClose"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-account-group" class="mr-2" />
        出勤状态管理
        <v-spacer />
        <v-chip color="primary" size="small" class="ml-2">
          {{ state.dateString }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- 批量操作和搜索 -->
        <v-row class="mb-4">
          <v-col cols="12" md="12">
            <v-text-field
              v-model="attendanceSearch"
              prepend-inner-icon="mdi-magnify"
              label="搜索学生"
              hint="支持筛选姓氏，如输入'孙'可筛选所有姓孙的学生"
              variant="outlined"
              clearable
              @update:model-value="handleSearchChange"
            />

            <!-- 姓氏筛选 -->
            <div class="d-flex flex-wrap mt-2 gap-1">
              <v-btn
                v-for="surname in extractedSurnames"
                :key="surname.name"
                :variant="
                  attendanceSearch === surname.name ? 'elevated' : 'text'
                "
                :color="attendanceSearch === surname.name ? 'primary' : ''"
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
              value="present"
              :color="attendanceFilter.includes('present') ? 'success' : ''"
              :variant="
                attendanceFilter.includes('present') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              @click="toggleFilter('present')"
              prepend-icon="mdi-account-check"
              :append-icon="
                attendanceFilter.includes('present') ? 'mdi-check' : ''
              "
            >
              到课
            </v-chip>

            <v-chip
              value="absent"
              :color="attendanceFilter.includes('absent') ? 'error' : ''"
              :variant="
                attendanceFilter.includes('absent') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              @click="toggleFilter('absent')"
              prepend-icon="mdi-account-off"
              :append-icon="
                attendanceFilter.includes('absent') ? 'mdi-check' : ''
              "
            >
              请假
            </v-chip>
            <v-chip
              value="late"
              :color="attendanceFilter.includes('late') ? 'warning' : ''"
              :variant="
                attendanceFilter.includes('late') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              @click="toggleFilter('late')"
              prepend-icon="mdi-clock-alert"
              :append-icon="
                attendanceFilter.includes('late') ? 'mdi-check' : ''
              "
            >
              迟到
            </v-chip>
            <v-chip
              value="exclude"
              :color="attendanceFilter.includes('exclude') ? 'grey' : ''"
              :variant="
                attendanceFilter.includes('exclude') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              @click="toggleFilter('exclude')"
              prepend-icon="mdi-account-cancel"
              :append-icon="
                attendanceFilter.includes('exclude') ? 'mdi-check' : ''
              "
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
            sm="6"
            md="6"
            lg="4"
          >
            <v-card class="student-card" border>
              <v-card-text class="d-flex align-center pa-2">
                <div class="flex-grow-1">
                  <div class="d-flex align-center">
                    <v-avatar
                      :color="
                        getStudentStatusColor(
                          state.studentList.indexOf(student)
                        )
                      "
                      size="24"
                      class="mr-2"
                    >
                      <v-icon size="small">{{
                        getStudentStatusIcon(state.studentList.indexOf(student))
                      }}</v-icon>
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
                    icon="mdi-account-check"
                    size="small"
                    variant="text"
                    @click="setPresent(state.studentList.indexOf(student))"
                    :title="'设为到课'"
                  />
                  <v-btn
                    :color="
                      isAbsent(state.studentList.indexOf(student))
                        ? 'error'
                        : ''
                    "
                    icon="mdi-account-off"
                    size="small"
                    variant="text"
                    @click="setAbsent(state.studentList.indexOf(student))"
                    :title="'设为请假'"
                  />
                  <v-btn
                    :color="
                      isLate(state.studentList.indexOf(student))
                        ? 'warning'
                        : ''
                    "
                    icon="mdi-clock-alert"
                    size="small"
                    variant="text"
                    @click="setLate(state.studentList.indexOf(student))"
                    :title="'设为迟到'"
                  />
                  <v-btn
                    :color="
                      isExclude(state.studentList.indexOf(student))
                        ? 'grey'
                        : ''
                    "
                    icon="mdi-account-cancel"
                    size="small"
                    variant="text"
                    @click="setExclude(state.studentList.indexOf(student))"
                    :title="'设为不参与'"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="12">
            <v-card variant="tonal" color="primary" class="mb-4">
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
          </v-col></v-row
        >
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

  <!-- 添加确认对话框 -->
  <v-dialog v-model="confirmDialog.show" max-width="400">
    <v-card>
      <v-card-title class="text-h6"> 确认保存 </v-card-title>
      <v-card-text>
        您正在修改 {{ state.dateString }} 的数据，确定要保存吗？
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="confirmDialog.reject">
          取消
        </v-btn>
        <v-btn color="primary" @click="confirmDialog.resolve"> 确认保存 </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 添加随机点名组件 -->
  <random-picker
    ref="randomPicker"
    :student-list="state.studentList"
    :attendance="state.boardData.attendance"
  />

  <!-- 添加URL配置确认对话框 -->
  <v-dialog v-model="urlConfigDialog.show" max-width="500">
    <v-card>
      <v-card-title class="text-h6"> 确认应用URL配置 </v-card-title>
      <v-card-text>
        <p>以下配置将应用于当前班级：</p>
        <v-list density="compact">
          <v-list-item
            v-for="change in urlConfigDialog.changes"
            :key="change.key"
          >
            <template #prepend>
              <v-icon :icon="change.icon" size="small" class="mr-2" />
            </template>
            <v-list-item-title class="d-flex align-center">
              <span class="text-subtitle-1">{{ change.name }}</span>
              <v-tooltip activator="parent" location="top">{{
                change.description || change.key
              }}</v-tooltip>
            </v-list-item-title>
            <v-list-item-subtitle>
              <span class="text-grey-darken-1">{{ change.oldValue }}</span>
              <v-icon icon="mdi-arrow-right" size="small" class="mx-1" />
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
</template>

<script>
import MessageLog from "@/components/MessageLog.vue";
import RandomPicker from "@/components/RandomPicker.vue"; // 导入随机点名组件
import dataProvider from "@/utils/dataProvider";
import {
  getSetting,
  watchSettings,
  setSetting,
  settingsDefinitions,
} from "@/utils/settings";
import { useDisplay } from "vuetify";
import "../styles/index.scss";
import "../styles/transitions.scss"; // 添加新的样式导入
import { debounce, throttle } from "@/utils/debounce";
import "../styles/global.scss";
import { pinyin } from "pinyin-pro";

export default {
  name: "Classworks 作业板",
  components: {
    MessageLog,
    RandomPicker, // 注册随机点名组件
  },
  data() {
    return {
      dataKey: "",
      provider: "",
      useDisplay: useDisplay,
      state: {
        classNumber: "",
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
        dateString: "", // 从 state 内统一管理日期
        synced: false,
        attendDialogVisible: false,
        contentStyle: { "font-size": `${getSetting("font.size")}px` },
        uploadLoading: false,
        downloadLoading: false,
        snackbar: false,
        snackbarText: "",
        fontSize: getSetting("font.size"),
        datePickerDialog: false,
        selectedDate: new Date().toISOString().split("T")[0],
        selectedDateObj: new Date(this.selectedDate),
        refreshInterval: null,
        subjectOrder: [
          "语文",
          "数学",
          "英语",
          "物理",
          "化学",
          "生物",
          "政治",
          "历史",
          "地理",
          "其他",
        ],
        showNoDataMessage: false,
        noDataMessage: "",
        isToday: false,
        attendanceDialog: false,
        availableSubjects: [
          { key: "语文", name: "语文" },
          { key: "数学", name: "数学" },
          { key: "英语", name: "英语" },
          { key: "物理", name: "物理" },
          { key: "化学", name: "化学" },
          { key: "生物", name: "生物" },
          { key: "政治", name: "政治" },
          { key: "历史", name: "历史" },
          { key: "地理", name: "地理" },
          { key: "其他", name: "其他" },
        ],
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
      // 添加URL配置确认对话框
      urlConfigDialog: {
        show: false,
        config: null,
        changes: [],
        validSettings: {},
        confirmHandler: null,
        cancelHandler: null,
        // 添加图标映射数据
        icons: {},
      },
    };
  },

  computed: {
    isMobile() {
      return useDisplay().mobile.value;
    },
    titleText() {
      const today = this.getToday();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const currentDateStr = this.state.dateString;
      const todayStr = this.formatDate(today);
      const yesterdayStr = this.formatDate(yesterday);

      if (currentDateStr === todayStr) {
        return "今天的作业";
      } else if (currentDateStr === yesterdayStr) {
        return "昨天的作业";
      } else {
        return `${currentDateStr}的作业`;
      }
    },
    sortedItems() {
      const key = `${JSON.stringify(
        this.state.boardData.homework
      )}_${this.state.subjectOrder.join()}_${this.dynamicSort}`;
      if (this.sortedItemsCache.key === key) {
        return this.sortedItemsCache.value;
      }

      const items = Object.entries(this.state.boardData.homework)
        .filter(([, value]) => value.content?.trim())
        .map(([key, value]) => ({
          key,
          name:
            this.state.availableSubjects.find((s) => s.key === key)?.name ||
            key,
          content: value.content,
          order: this.state.subjectOrder.indexOf(key),
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
      return this.state.availableSubjects.filter(
        (subject) => !usedKeys.includes(subject.key)
      );
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
      const today = new Date().toISOString().split("T")[0];
      return this.state.dateString === today;
    },
    canAutoSave() {
      // 只考虑自动保存开关和非当天限制
      return this.autoSave && (!this.blockNonTodayAutoSave || this.isToday);
    },
    needConfirmSave() {
      // 只在非今天且开启了确认选项时需要确认
      return !this.isToday && this.confirmNonTodaySave;
    },
    shouldShowBlockedMessage() {
      // 只在非今天且开启了自动保存和禁止非当天自动保存时提示
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
    showAntiScreenBurnCard() {
      return getSetting("display.showAntiScreenBurnCard");
    },
    filteredStudents() {
      let students = [...this.state.studentList];

      // 应用搜索过滤
      if (this.attendanceSearch) {
        const searchTerm = this.attendanceSearch.toLowerCase();
        students = students.filter((student) =>
          student.toLowerCase().includes(searchTerm)
        );
      }

      // 应用状态过滤
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
      // 从学生名单中提取姓氏并统计数量
      if (!this.state.studentList || this.state.studentList.length === 0) {
        return [];
      }

      const surnameMap = new Map();

      this.state.studentList.forEach((student) => {
        if (student && student.length > 0) {
          // 中文姓名通常姓在前，取第一个字作为姓氏
          const surname = student.charAt(0);
          if (surnameMap.has(surname)) {
            surnameMap.set(surname, surnameMap.get(surname) + 1);
          } else {
            surnameMap.set(surname, 1);
          }
        }
      });

      // 转换为数组并按拼音排序
      return Array.from(surnameMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          const pinyinA = pinyin(a.name, { toneType: "none", mode: "surname" });
          const pinyinB = pinyin(b.name, { toneType: "none", mode: "surname" });
          return pinyinA.localeCompare(pinyinB);
        });
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
    // 创建防抖的上传函数
    this.debouncedUpload = debounce(this.uploadData, 2000);
    // 创建节流的重排函数
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
      this.setupAutoRefresh();
      this.unwatchSettings = watchSettings(() => {
        this.updateSettings();
      });

      // 监听全屏变化事件
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

      // 检查URL哈希值，如果包含#pick则自动打开随机点名
      this.checkHashForRandomPicker();

      // 添加哈希变化监听器
      window.addEventListener("hashchange", this.checkHashForRandomPicker);
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
      // 注意刷新间隔存放在 state 内
      clearInterval(this.state.refreshInterval);
    }

    // 移除全屏变化事件监听
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

    // 移除哈希变化监听器
    window.removeEventListener("hashchange", this.checkHashForRandomPicker);
  },

  methods: {
    // 添加新的日期辅助方法
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
      return new Date(); // 如果无法解析，返回当前日期
    },

    formatDate(dateInput) {
      const date = this.ensureDate(dateInput);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },

    getToday() {
      return new Date();
    },

    async initializeData() {
      // 尝试从URL读取配置
      const configApplied = await this.parseUrlConfig();

      // 如果没有从URL应用配置，使用本地设置
      if (!configApplied) {
        this.provider = getSetting("server.provider");
        const domain = getSetting("server.domain");
        const classNum = getSetting("server.classNumber");

        this.dataKey =
          this.provider === "server" ? `${domain}/${classNum}` : classNum;
        this.state.classNumber = classNum;
      }

      // 从 URL 获取日期，如果没有则使用今天的日期
      const urlParams = new URLSearchParams(window.location.search);
      const dateFromUrl = urlParams.get("date");
      const today = this.getToday();

      // 确保日期格式正确
      const currentDate = dateFromUrl ? new Date(dateFromUrl) : today;
      this.state.dateString = this.formatDate(currentDate);
      this.state.selectedDate = this.state.dateString;
      this.state.isToday =
        this.formatDate(currentDate) === this.formatDate(today);

      await Promise.all([this.downloadData(), this.loadConfig()]);
    },

    async downloadData() {
      if (this.loading.download) return;

      try {
        this.loading.download = true;
        const response = await dataProvider.loadData(
          this.provider,
          this.dataKey,
          this.state.dateString
        );

        if (!response.success) {
          if (response.error.code === "NOT_FOUND") {
            this.state.showNoDataMessage = true;
            this.state.noDataMessage = response.error.message;
            // 确保数据结构完整
            this.state.boardData = {
              homework: {},
              attendance: { absent: [], late: [], exclude: [] },
            };
          } else {
            throw new Error(response.error.message);
          }
        } else {
          // 确保数据结构完整
          this.state.boardData = {
            homework: response.data.homework || {},
            attendance: {
              absent: response.data.attendance?.absent || [],
              late: response.data.attendance?.late || [],
              exclude: response.data.attendance?.exclude || [],
            },
          };
          this.state.synced = true;
          this.state.showNoDataMessage = false;
          this.$message.success("下载成功", "数据已更新");
        }
      } catch (error) {
        // 发生错误时也要确保数据结构完整
        this.state.boardData = {
          homework: {},
          attendance: { absent: [], late: [], exclude: [] },
        };
        this.$message.error("下载失败", error.message);
      } finally {
        this.loading.download = false;
      }
    },

    async trySave(isAutoSave = false) {
      // 如果是自动保存但不满足自动保存条件
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

      // 如果需要确认且不是自动保存
      if (!isAutoSave && this.needConfirmSave) {
        try {
          await this.showConfirmDialog();
        } catch {
          return false;
        }
      }

      // 尝试保存
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

      // 如果内容发生变化(包括清空)，就视为修改
      if (content !== originalContent.trim()) {
        // 无论内容是否为空，都保留科目结构
        this.state.boardData.homework[this.currentEditSubject] = {
          content: content,
        };

        this.state.synced = false;

        // 处理自动保存
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
          this.provider,
          this.dataKey,
          this.state.boardData,
          this.state.dateString // 添加dateString参数
        );

        if (!response.success) {
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
        const response = await dataProvider.loadConfig(
          this.provider,
          this.dataKey
        );

        if (!response.success) {
          throw new Error(response.error.message);
        }

        this.state.studentList = response.data.studentList || [];
      } catch (error) {
        console.error("加载配置失败:", error);
        this.$message.error("加载配置失败", error.message);
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
      // 如果是新科目，需要创建对应的精简数据结构
      if (!this.state.boardData.homework[subject]) {
        this.state.boardData.homework[subject] = {
          content: "",
        };
      }
      this.state.dialogTitle =
        this.state.availableSubjects.find((s) => s.key === subject)?.name ||
        subject;
      this.state.textarea = this.state.boardData.homework[subject].content;
      this.state.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.inputRef) {
          this.$refs.inputRef.focus();
        }
      });
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
      const domain = getSetting("server.domain");
      const classNum = getSetting("server.classNumber");

      this.provider = provider;
      this.dataKey = provider === "server" ? `${domain}/${classNum}` : classNum;
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
          // 检查是否应该跳过刷新
          if (!this.shouldSkipRefresh()) {
            this.downloadData();
          }
        }, interval * 1000);
      }
    },

    // 新增方法：检查是否应该跳过自动刷新
    shouldSkipRefresh() {
      // 如果对话框打开，跳过刷新
      if (this.state.dialogVisible) return true;

      // 如果出勤对话框打开，跳过刷新
      if (this.state.attendanceDialog) return true;

      // 如果确认对话框打开，跳过刷新
      if (this.confirmDialog.show) return true;

      // 如果日期选择器打开，跳过刷新
      if (this.state.datePickerDialog) return true;

      // 如果正在上传或下载数据，跳过刷新
      if (this.loading.upload || this.loading.download) return true;

      // 如果数据未同步（有未保存的更改），跳过刷新
      if (!this.state.synced) return true;

      // 没有特殊状态，可以刷新
      return false;
    },

    updateSettings() {
      this.state.fontSize = getSetting("font.size");
      this.state.contentStyle = { "font-size": `${this.state.fontSize}px` };
      this.setupAutoRefresh();
      this.updateBackendUrl();
    },

    handleDateSelect(newDate) {
      if (!newDate) return;

      try {
        const selectedDate = this.ensureDate(newDate);
        const formattedDate = this.formatDate(selectedDate);

        // 只有当日期真正改变时才更新
        if (this.state.dateString !== formattedDate) {
          this.state.dateString = formattedDate;
          this.state.selectedDate = formattedDate;
          this.state.isToday =
            formattedDate === this.formatDate(this.getToday());

          // 使用 replace 而不是 push 来避免创建新的历史记录
          this.$router
            .replace({
              query: { date: formattedDate },
            })
            .catch(() => {});
          this.downloadData();
        }
      } catch (error) {
        console.error("Date processing error:", error);
        this.$message.error("日期处理错误", "请重新选择日期");
      }
    },

    optimizeGridLayout(items) {
      // 设置最大列数
      const maxColumns = Math.min(3, Math.floor(window.innerWidth / 300));
      if (maxColumns <= 1) return items;

      // 使用贪心算法分配
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

      // 展平结果并添加顺序
      return columns
        .flatMap((col) => col.items)
        .map((item, index) => ({
          ...item,
          order: index,
        }));
    },

    fixedGridLayout(items) {
      const rowSubjects = [
        ["语文", "数学", "英语"],
        ["物理", "化学", "生物"],
        ["政治", "历史", "地理", "其他"],
      ];
      return items
        .sort((a, b) => {
          const getRowIndex = (subject) => {
            for (let i = 0; i < rowSubjects.length; i++) {
              if (rowSubjects[i].includes(subject)) {
                return i;
              }
            }
            return rowSubjects.length;
          };
          const getColumnIndex = (subject) => {
            for (const row of rowSubjects) {
              const index = row.indexOf(subject);
              if (index !== -1) return index;
            }
            return 999;
          };
          const rowA = getRowIndex(a.key);
          const rowB = getRowIndex(b.key);
          if (rowA !== rowB) {
            return rowA - rowB;
          }
          const colA = getColumnIndex(a.key);
          const colB = getColumnIndex(b.key);
          return colA - colB;
        })
        .map((item, index) => ({
          ...item,
          order: index,
          rowSpan: item.content ? 2 : 1,
        }));
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
      // 从所有状态列表中移除该学生
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
      // 先从所有状态列表中移除该学生
      this.setPresent(index);
      // 然后添加到请假列表
      this.state.boardData.attendance.absent.push(student);
      this.state.synced = false;
    },

    setLate(index) {
      const student = this.state.studentList[index];
      // 先从所有状态列表中移除该学生
      this.setPresent(index);
      // 然后添加到迟到列表
      this.state.boardData.attendance.late.push(student);
      this.state.synced = false;
    },

    setExclude(index) {
      const student = this.state.studentList[index];
      // 先从所有状态列表中移除该学生
      this.setPresent(index);
      // 然后添加到不参与列表
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

    // 点击上传按钮时调用
    async manualUpload() {
      return this.trySave(false);
    },

    async handleAttendanceDialogClose(newValue) {
      if (!newValue && !this.state.synced) {
        // 对话框关闭且数据未同步时尝试保存
        await this.trySave(true);
      }
    },

    // 全屏相关方法
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

    // 添加URL配置解析功能
    parseUrlConfig() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const configParam = urlParams.get("config");

        if (!configParam) return false;

        try {
          // 解码base64并解析JSON
          // 使用更安全的base64解码方式，确保支持UTF-8字符（包括中文）
          const decodedString = this.safeBase64Decode(configParam);
          const decodedConfig = JSON.parse(decodedString);
          console.log("从URL读取配置:", decodedConfig);

          // 准备配置变更列表和有效配置项
          const changes = [];
          const validSettings = {};
          const icons = {};

          // 处理特殊配置项
          this.processSpecialSettings(decodedConfig, changes, validSettings);

          // 处理标准配置项
          this.processStandardSettings(
            decodedConfig,
            changes,
            validSettings,
            icons
          );

          // 如果没有有效变更，直接返回
          if (Object.keys(validSettings).length === 0) {
            console.log("URL配置与当前配置相同，无需应用");
            return false;
          }

          // 显示确认对话框
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

    // 处理特殊配置项
    processSpecialSettings(decodedConfig, changes, validSettings) {
      // 处理班级号配置
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

      // 处理日期配置
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

      // 处理科目列表配置
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

    // 处理标准配置项
    processStandardSettings(decodedConfig, changes, validSettings, icons) {
      Object.entries(decodedConfig).forEach(([key, value]) => {
        // 跳过已处理的特殊配置项
        if (["classNumber", "date", "subjects"].includes(key)) {
          return;
        }

        // 尝试查找设置定义
        let settingKey = key;
        let definition = settingsDefinitions[key];

        // 如果没有找到定义，尝试添加前缀
        if (!definition && !key.includes(".")) {
          // 常见前缀列表
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

        // 如果找到了定义
        if (definition) {
          // 验证类型和值
          let typedValue = this.convertValueToCorrectType(
            value,
            definition.type
          );

          // 验证值是否有效
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
          // 未知配置项，尝试作为自定义配置处理
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

    // 将值转换为正确类型
    convertValueToCorrectType(value, type) {
      if (type === "boolean") {
        return Boolean(value);
      } else if (type === "number") {
        return Number(value);
      } else {
        return String(value);
      }
    },

    // 格式化设置值显示
    formatSettingValue(value) {
      if (typeof value === "boolean") {
        return value ? "开启" : "关闭";
      } else if (value === "" || value === null || value === undefined) {
        return "空";
      }
      return value.toString();
    },

    // 获取设置显示名称
    getSettingDisplayName(key) {
      // 从key中提取最后一部分作为显示名
      const parts = key.split(".");
      const lastPart = parts[parts.length - 1];

      // 根据常见key返回中文名
      const nameMap = {
        // 服务器设置
        provider: "数据提供方",
        domain: "服务器域名",
        classNumber: "班级编号",

        // 显示设置
        emptySubjectDisplay: "空科目显示方式",
        dynamicSort: "动态排序",
        showRandomButton: "随机按钮",
        showFullscreenButton: "全屏按钮",
        cardHoverEffect: "卡片悬浮效果",
        enhancedTouchMode: "增强触摸模式",
        showAntiScreenBurnCard: "防烧屏卡片",

        // 主题设置
        mode: "主题模式",

        // 字体设置
        size: "字体大小",

        // 编辑设置
        autoSave: "自动保存",
        blockNonTodayAutoSave: "禁止自动保存非当日",
        refreshBeforeEdit: "编辑前刷新",
        confirmNonTodaySave: "非当日保存确认",

        // 刷新设置
        auto: "自动刷新",
        interval: "刷新间隔",
      };

      return nameMap[lastPart] || lastPart;
    },

    // 安全的Base64解码函数，支持UTF-8字符（包括中文）
    safeBase64Decode(base64String) {
      try {
        // 替换URL安全base64中的特殊字符
        const normalizedString = base64String
          .replace(/-/g, "+")
          .replace(/_/g, "/");

        // 添加填充字符
        const paddedString = normalizedString.padEnd(
          normalizedString.length +
            ((4 - (normalizedString.length % 4 || 4)) % 4),
          "="
        );

        // 解码base64为二进制字符串
        const binaryString = atob(paddedString);

        // 将二进制字符串转换为Uint8Array
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // 将Uint8Array解码为UTF-8字符串
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(bytes);
      } catch (e) {
        console.error("Base64解码错误:", e);
        throw new Error("无法解码配置数据");
      }
    },

    applyUrlConfig(validSettings) {
      // 应用所有有效的配置项
      for (const [key, value] of Object.entries(validSettings)) {
        if (key === "date") {
          this.handleDateSelect(value);
          continue;
        }

        if (key === "subjects") {
          this.state.availableSubjects = value;
          continue;
        }

        // 应用标准设置项
        setSetting(key, value);

        // 更新相关状态
        if (key === "server.classNumber") {
          this.state.classNumber = value;
        }
      }

      // 更新后端URL和其他可能受到配置影响的属性
      this.updateBackendUrl();
      this.$message.success("URL配置已应用", "已从URL加载配置");
      return true;
    },
  },
};
</script>
