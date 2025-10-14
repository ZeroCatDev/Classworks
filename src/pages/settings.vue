<template>
  <div class="settings-page">
    <v-app-bar elevation="1">
      <template #prepend>
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          @click="$router.push('/')"
        />
        <v-btn
          icon="mdi-menu"
          variant="text"
          class="d-md-none"
          @click="drawer = !drawer"
        />
      </template>
      <v-app-bar-title class="text-h6">
        设置
      </v-app-bar-title>
    </v-app-bar>

    <v-container fluid>
      <v-navigation-drawer
        v-model="drawer"
        :permanent="!isMobile"
        :temporary="isMobile"
      >
        <v-list>
          <v-list-item
            v-for="tab in settingsTabs"
            :key="tab.value"
            :active="settingsTab === tab.value"
            :prepend-icon="tab.icon"
            class="rounded-e-xl"
            :color="settingsTab === tab.value ? 'primary' : 'default'"
            @click="settingsTab = tab.value"
          >
            <v-list-item-title>{{ tab.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-tabs-window
        v-model="settingsTab"
        style="width: 100%"
        direction="vertical"
      >
        <v-tabs-window-item value="index">
          <v-card
            title="Classworks"
            subtitle="设置"
            class="rounded-xl"
            border
          >
            <v-card-text>
              <v-alert
                color="error"
                variant="tonal"
                icon="mdi-alert-circle"
                class="rounded-xl"
              >
                Classworks
                是开源免费的软件，官方没有提供任何形式的付费支持服务，源代码仓库地址在
                <a
                  href="https://github.com/ZeroCatDev/Classworks"
                  target="_blank"
                >https://github.com/ZeroCatDev/Classworks</a>。如果您通过有偿协助等付费方式取得本应用，在遇到问题时请在与卖家约定的服务框架下，优先向卖家求助。如果卖家没有提供您预期的服务，请退款或通过其它形式积极维护您的合法权益。
              </v-alert>
              <v-alert
                class="mt-4 rounded-xl"
                color="info"
                variant="tonal"
                icon="mdi-information"
              >
                请不要使用浏览器清除缓存功能，否则会导致配置丢失。<del>恶意的操作可能导致您受到贵校教师的处理</del>
              </v-alert>
              <v-alert
                class="mt-4 rounded-xl"
                color="warning"
                variant="tonal"
                icon="mdi-information"
              >
                <p>
                  请不要使用包括但不限于360极速浏览器、360安全浏览器、夸克浏览器、QQ浏览器等浏览器使用
                  Classworks
                  ，这些浏览器过时且存在严重的一致性问题。在Windows上，使用新版
                  Microsoft Edge 浏览器是最推荐的选择。
                </p>
                <p style="color: #666">
                  上述浏览器商标为其所属公司所有，Classworks™
                  与上述浏览器所属公司暂无竞争关系。
                </p>
                <br><v-btn
                  href="https://www.microsoft.com/zh-cn/windows/microsoft-edge"
                  target="_blank"
                  color="warning"
                  variant="tonal"
                  class="text-none rounded-xl"
                  append-icon="mdi-open-in-new"
                >
                  下载 Microsoft Edge（微软边缘浏览器）
                </v-btn>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-tabs-window-item>

        <v-tabs-window-item value="server">
          <server-settings-card
            border
            :loading="loading.server"
            @saved="onSettingsSaved"
          />
          <data-provider-settings-card
            border
            class="mt-4"
          />
          <kv-database-card
            border
            class="mt-4"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="student">
          <student-list-card
            border
            :is-mobile="isMobile"
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="share">
          <settings-link-generator
            border
            class="mt-4"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="refresh">
          <refresh-settings-card
            border
            :loading="loading.refresh"
            @saved="onSettingsSaved"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="edit">
          <edit-settings-card
            border
            :loading="loading.edit"
            @saved="onSettingsSaved"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="display">
          <display-settings-card
            border
            :loading="loading.display"
            @saved="onSettingsSaved"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="theme">
          <theme-settings-card
            border
            :loading="loading.theme"
            @saved="onSettingsSaved"
          />
        </v-tabs-window-item>


        <v-tabs-window-item value="randomPicker">
          <random-picker-card
            border
            :is-mobile="isMobile"
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="subject">
          <subject-management-card border /> <br>
          <homework-template-card border />
        </v-tabs-window-item>

        <v-tabs-window-item value="developer">
          <settings-card
            border
            title="开发者选项"
            icon="mdi-developer-board"
          >
            <v-list>
              <v-list-item>
                <template #prepend>
                  <v-icon
                    icon="mdi-code-tags"
                    class="mr-3"
                  />
                </template>
                <v-list-item-title>启用开发者选项</v-list-item-title>
                <v-list-item-subtitle>
                  启用后可以查看和修改开发者设置
                </v-list-item-subtitle>
                <template #append>
                  <v-switch
                    v-model="settings.developer.enabled"
                    density="comfortable"
                    hide-details
                    @change="handleDeveloperChange"
                  />
                </template>
              </v-list-item>
            </v-list>
          </settings-card>
          <developer-settings-card
            border
            :loading="loading.developer"
            @saved="onSettingsSaved"
          />
          <template v-if="settings.developer.enabled">
            <v-card
              border
              class="mt-4 rounded-lg"
            >
              <v-card-title class="d-flex align-center">
                <v-icon
                  icon="mdi-cog-outline"
                  class="mr-2"
                />
                所有设置
              </v-card-title>
              <v-card-subtitle> 浏览和修改所有可用设置 </v-card-subtitle>
              <v-card-text>
                <settings-explorer @update="onSettingUpdate" />
              </v-card-text>
            </v-card>
          </template>
          <v-col
            v-if="settings.developer.enabled"
            cols="12"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="about">
          <about-card />
          <echo-chamber-card
            border
            class="mt-4"
          />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-container>

    <!-- 消息记录组件 -->
    <message-log ref="messageLog" />
  </div>
</template>

<script>
import { useDisplay } from "vuetify";
import ServerSettingsCard from "@/components/settings/cards/ServerSettingsCard.vue";
import EditSettingsCard from "@/components/settings/cards/EditSettingsCard.vue";
import RefreshSettingsCard from "@/components/settings/cards/RefreshSettingsCard.vue";
import DisplaySettingsCard from "@/components/settings/cards/DisplaySettingsCard.vue";
import DataProviderSettingsCard from "@/components/settings/cards/DataProviderSettingsCard.vue";
import ThemeSettingsCard from "@/components/settings/cards/ThemeSettingsCard.vue";
import EchoChamberCard from "@/components/settings/cards/EchoChamberCard.vue";
import {
  getSetting,
  setSetting,
  resetSetting,
  watchSettings,
} from "@/utils/settings";
import MessageLog from "@/components/MessageLog.vue";
import SettingsCard from "@/components/SettingsCard.vue";
import StudentListCard from "@/components/settings/StudentListCard.vue";
import AboutCard from "@/components/settings/AboutCard.vue";
import "../styles/settings.scss";
import SettingsExplorer from "@/components/settings/SettingsExplorer.vue";
import SettingsLinkGenerator from "@/components/SettingsLinkGenerator.vue";
import RandomPickerCard from "@/components/settings/cards/RandomPickerCard.vue";
import HomeworkTemplateCard from "@/components/settings/cards/HomeworkTemplateCard.vue";
import SubjectManagementCard from "@/components/settings/cards/SubjectManagementCard.vue";
import KvDatabaseCard from "@/components/settings/cards/KvDatabaseCard.vue";
export default {
  name: "Settings",
  components: {
    ServerSettingsCard,
    EditSettingsCard,
    RefreshSettingsCard,
    DisplaySettingsCard,
    MessageLog,
    SettingsCard,
    StudentListCard,
    AboutCard,
    DataProviderSettingsCard,
    ThemeSettingsCard,
    EchoChamberCard,
    SettingsExplorer,
    SettingsLinkGenerator,
    RandomPickerCard,
    HomeworkTemplateCard,
    SubjectManagementCard,
    KvDatabaseCard,
  },
  setup() {
    const { mobile } = useDisplay();
    return { isMobile: mobile };
  },
  data() {
    const provider = getSetting("server.provider");

    const settings = {
      server: {
        domain: getSetting("server.domain"),
        classNumber: getSetting("server.classNumber"),
        provider: getSetting("server.provider"),
      },
      refresh: {
        auto: getSetting("refresh.auto"),
        interval: getSetting("refresh.interval"),
      },
      font: {
        size: getSetting("font.size"),
      },
      edit: {
        autoSave: getSetting("edit.autoSave"),
        blockNonTodayAutoSave: getSetting("edit.blockNonTodayAutoSave"),
        confirmNonTodaySave: getSetting("edit.confirmNonTodaySave"),
        refreshBeforeEdit: getSetting("edit.refreshBeforeEdit"),
      },
      display: {
        emptySubjectDisplay: getSetting("display.emptySubjectDisplay"),
        dynamicSort: getSetting("display.dynamicSort"),
        showRandomButton: getSetting("display.showRandomButton"),
        showFullscreenButton: getSetting("display.showFullscreenButton"),
      },
      developer: {
        enabled: getSetting("developer.enabled"),
        showDebugConfig: getSetting("developer.showDebugConfig"),
      },
      message: {
        showSidebar: getSetting("message.showSidebar"),
        maxActiveMessages: getSetting("message.maxActiveMessages"),
        timeout: getSetting("message.timeout"),
        saveHistory: getSetting("message.saveHistory"),
      },
    };
    return {
      settings,
      dataProviders: [
        { title: "服务器", value: "server" },
        { title: "本地数据库", value: "indexedDB" },
      ],
      studentData: {
        list: [],
        text: "",
        advanced: false,
      },
      newStudent: "",
      editingIndex: -1,
      editingName: "",
      deleteDialog: false,
      studentToDelete: null,
      numberDialog: false,
      newPosition: "",
      studentToMove: null,
      touchStartTime: 0,
      touchTimeout: null,
      studentsLoading: false,
      studentsError: null,
      debugConfig: "",
      loading: {
        server: false,
        students: false,
      },
      hasUnsavedChanges: false,
      lastSavedData: null,
      settingsTab: "index",
      settingsTabs: [
        {
          title: "首页",
          icon: "mdi-home",
          value: "index",
        },
        {
          title: "服务器",
          icon: "mdi-server",
          value: "server",
        },
        {
          title: "科目",
          icon: "mdi-book-edit",
          value: "subject",
        },
        {
          title: "学生列表",
          icon: "mdi-account-group",
          value: "student",
        },
        {
          title: "分享设置",
          icon: "mdi-share",
          value: "share",
        },
        {
          title: "刷新",
          icon: "mdi-refresh",
          value: "refresh",
        },
        {
          title: "编辑",
          icon: "mdi-pencil",
          value: "edit",
        },
        {
          title: "显示",
          icon: "mdi-eye",
          value: "display",
        },
        {
          title: "主题",
          icon: "mdi-theme-light-dark",
          value: "theme",
        },

        {
          title: "随机点名",
          icon: "mdi-dice-multiple",
          value: "randomPicker",
        },

        {
          title: "开发者",
          icon: "mdi-developer-board",
          value: "developer",
        },
        {
          title: "关于",
          icon: "mdi-information",
          value: "about",
        },
      ],
      drawer: false,
    };
  },

  watch: {
    settings: {
      handler(newSettings) {
        this.handleSettingsChange(newSettings);
      },
      deep: true,
    },
    isMobile: {
      handler(newValue) {
        this.drawer = !newValue;
      },
      immediate: true,
    },
    studentData: {
      handler(newData) {
        // 只检查是否有未保存的更改
        if (this.lastSavedData) {
          this.hasUnsavedChanges =
            JSON.stringify(newData.list) !== JSON.stringify(this.lastSavedData);
        }
        // 更新文本显示
        this.studentData.text = newData.list.join("\n");
      },
      deep: true,
    },
  },

  mounted() {
    this.loadAllSettings();
    this.unwatchSettings = watchSettings(() => {
      this.loadAllSettings();
    });
    // 初始化抽屉状态，在非移动设备上默认打开
    this.drawer = !this.isMobile;
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }
  },

  methods: {
    loadAllSettings() {
      Object.keys(this.settings).forEach((section) => {
        Object.keys(this.settings[section]).forEach((key) => {
          this.settings[section][key] = getSetting(`${section}.${key}`);
        });
      });
    },

    handleSettingsChange(newSettings) {
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
                this.showMessage("设置已更新", `${settingKey} 已保存`);
              } else {
                this.showError("保存失败", `${settingKey} 设置失败`);
                this.settings[section][key] = currentValue;
              }
            }
          });
        });
      }, 100);
    },

    showMessage(title, content = "", type = "success") {
      this.$message[type](title, content);
    },

    showError(title, content = "") {
      this.$message.error(title, content);
    },

    saveEdit() {
      if (this.editingIndex !== -1) {
        const newName = this.editingName.trim();
        if (newName && newName !== this.studentData.list[this.editingIndex]) {
          this.studentData.list[this.editingIndex] = newName;
        }
        this.editingIndex = -1;
        this.editingName = "";
      }
    },

    startEdit(index, name) {
      this.editingIndex = index;
      this.editingName = name;
    },

    confirmDelete(index) {
      this.studentToDelete = {
        index,
        name: this.studentData.list[index],
      };
      this.deleteDialog = true;
    },

    moveStudent(index, direction) {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < this.studentData.list.length) {
        [this.studentData.list[index], this.studentData.list[newIndex]] = [
          this.studentData.list[newIndex],
          this.studentData.list[index],
        ];
      }
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
      this.newPosition = "";
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
        this.newStudent = "";
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
      resetSetting("font.size");
      this.settings.font.size = getSetting("font.size");
      this.showMessage("字体已重置", "字体大小已恢复默认值");
    },

    handleDeveloperChange(enabled) {
      if (!enabled) {
        // 关闭开发者选项时重置相关设置
        this.settings.message = {
          showSidebar: true,
          maxActiveMessages: 5,
          timeout: 5000,
          saveHistory: true,
        };
        // 不需要手动调用 saveSettings，watch 会自动处理
      }
    },

    resetDeveloperSettings() {
      this.settings.developer = {
        enabled: false,
      };
      this.settings.message = {
        showSidebar: true,
        maxActiveMessages: 5,
        timeout: 5000,
        saveHistory: true,
      };
      this.handleSettingsChange(this.settings);
      this.showMessage("已重置", "开发者设置已重置为默认值", "warning");
    },

    adjustFontSize(direction) {
      const step = 2;
      const size = this.settings.font.size;
      if (direction === "up" && size < 100) {
        this.settings.font.size = size + step;
      } else if (direction === "down" && size > 16) {
        this.settings.font.size = size - step;
      }
      this.handleSettingsChange(this.settings);
    },

    onSettingsSaved() {
      this.showMessage("设置已更新", "您的设置已成功保存");
    },

    onSettingUpdate(key, value) {
      this.showMessage("设置已更新", `${key} 已保存为 ${value}`);
    },
  },
};
</script>

<style lang="scss">
.settings-page {
  .v-card {
    transition: transform 0.2s, box-shadow 0.2s;
    &:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
    }
  }
}
</style>
