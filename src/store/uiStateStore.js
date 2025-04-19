/**
 * UI State Store - Manages UI-specific state that doesn't need to be persisted to the server
 */
import { reactive } from "vue";
import { getSetting, setSetting } from "@/utils/settings";
import { formatDate } from "@/utils/dateUtils";

const uiStateStore = reactive({
  // UI State
  fontSize: getSetting("font.size"),
  contentStyle: { "font-size": `${getSetting("font.size")}px` },
  datePickerVisible: false,
  selectedDateObj: new Date(),
  confirmDialogVisible: false,
  confirmDialogResolve: null,
  confirmDialogReject: null,
  currentSubjectKey: null,
  loadingState: {
    download: false,
    upload: false
  },
  refreshInterval: null,
  snackbar: {
    visible: false,
    text: "",
    timeout: 2000
  },

  // UI State methods
  /**
   * Update font size
   * @param {string} direction - "up" or "out"
   */
  zoom(direction) {
    const step = 2;
    if (direction === "up" && this.fontSize < 100) {
      this.fontSize += step;
    } else if (direction === "out" && this.fontSize > 16) {
      this.fontSize -= step;
    }
    this.contentStyle = {
      "font-size": `${this.fontSize}px`
    };
    setSetting("font.size", this.fontSize);
  },

  /**
   * Show a snackbar message
   * @param {string} text - Message text
   * @param {number} timeout - Message timeout in ms
   */
  showSnackbar(text, timeout = 2000) {
    this.snackbar.text = text;
    this.snackbar.timeout = timeout;
    this.snackbar.visible = true;
  },

  /**
   * Show a confirmation dialog
   * @returns {Promise} - Resolves when confirmed, rejects when cancelled
   */
  showConfirmDialog() {
    return new Promise((resolve, reject) => {
      this.confirmDialogVisible = true;
      this.confirmDialogResolve = () => {
        this.confirmDialogVisible = false;
        resolve(true);
      };
      this.confirmDialogReject = () => {
        this.confirmDialogVisible = false;
        reject(new Error("User cancelled"));
      };
    });
  },

  /**
   * Set current subject for editing
   * @param {string} subjectKey - Subject key
   */
  setCurrentSubject(subjectKey) {
    this.currentSubjectKey = subjectKey;
  },

  /**
   * Handle date selection
   * @param {Date} newDate - The selected date
   * @returns {string} Formatted date string
   */
  selectDate(newDate) {
    if (!newDate) return null;

    this.selectedDateObj = new Date(newDate);
    return formatDate(this.selectedDateObj);
  },

  /**
   * Set up auto refresh
   * @param {Function} refreshCallback - Function to call on refresh
   */
  setupAutoRefresh(refreshCallback, shouldSkipRefreshFn) {
    const autoRefresh = getSetting("refresh.auto");
    const interval = getSetting("refresh.interval");

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    if (autoRefresh && refreshCallback) {
      this.refreshInterval = setInterval(() => {
        if (!shouldSkipRefreshFn()) {
          refreshCallback();
        }
      }, interval * 1000);
    }
  },

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  },

  /**
   * Update UI settings from app settings
   */
  updateFromSettings() {
    this.fontSize = getSetting("font.size");
    this.contentStyle = { "font-size": `${this.fontSize}px` };
  }
});

export default uiStateStore;