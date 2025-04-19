/**
 * Configuration Store - Manages application settings and provides defaults
 */
import { reactive } from "vue";
import { getSetting, watchSettings } from "@/utils/settings";

const configStore = reactive({
  // Server connection config
  serverConfig: {
    provider: getSetting("server.provider"),
    domain: getSetting("server.domain"),
    classNumber: getSetting("server.classNumber")
  },

  // Default subjects
  defaultSubjects: [
    { key: "语文", name: "语文" },
    { key: "数学", name: "数学" },
    { key: "英语", name: "英语" },
    { key: "物理", name: "物理" },
    { key: "化学", name: "化学" },
    { key: "生物", name: "生物" },
    { key: "政治", name: "政治" },
    { key: "历史", name: "历史" },
    { key: "地理", name: "地理" },
    { key: "其他", name: "其他" }
  ],

  // Feature flags
  featureFlags: {
    get autoSave() { return getSetting("edit.autoSave"); },
    get blockNonTodayAutoSave() { return getSetting("edit.blockNonTodayAutoSave"); },
    get confirmNonTodaySave() { return getSetting("edit.confirmNonTodaySave"); },
    get refreshBeforeEdit() { return getSetting("edit.refreshBeforeEdit"); },
    get emptySubjectDisplay() { return getSetting("display.emptySubjectDisplay"); },
    get dynamicSort() { return getSetting("display.dynamicSort"); },
    get showRandomPickerButton() { return getSetting("randomPicker.enabled"); },
    get showAntiScreenBurnCard() { return getSetting("display.showAntiScreenBurnCard"); }
  },

  // Data accessor
  dataKey: "",

  // Methods
  /**
   * Initialize configuration from settings
   */
  initialize() {
    this.updateServerConfig();
  },

  /**
   * Update server configuration from settings
   */
  updateServerConfig() {
    this.serverConfig.provider = getSetting("server.provider");
    this.serverConfig.domain = getSetting("server.domain");
    this.serverConfig.classNumber = getSetting("server.classNumber");

    // Update the data key
    this.dataKey = this.serverConfig.provider === "server"
      ? `${this.serverConfig.domain}/${this.serverConfig.classNumber}`
      : this.serverConfig.classNumber;
  },

  /**
   * Set up settings watcher
   * @param {Function} callback - Function to call when settings change
   * @returns {Function} Unwatch function
   */
  watchSettings(callback) {
    return watchSettings(() => {
      this.updateServerConfig();
      if (callback) callback();
    });
  }
});

export default configStore;