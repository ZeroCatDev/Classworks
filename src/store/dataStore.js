/**
 * Data store module - This handles all data that will be sent to and retrieved from the data provider
 * It provides a clean separation between data management and UI state
 */
import dataProvider from "@/utils/dataProvider";
import { reactive } from "vue";

// Core data structure that mirrors the backend storage format
const initialData = {
  homework: {},
  attendance: {
    absent: [],
    late: [],
    exclude: []
  }
};

// Create a reactive data store
const dataStore = reactive({
  // Main data that will be sent to the server
  boardData: { ...initialData },

  // Metadata
  classNumber: "",
  studentList: [],
  dateString: "",
  synced: false,

  // Methods for data manipulation
  /**
   * Reset data store to initial empty state
   */
  resetData() {
    this.boardData = {
      homework: {},
      attendance: {
        absent: [],
        late: [],
        exclude: []
      }
    };
    this.synced = false;
  },

  /**
   * Set homework content for a subject
   * @param {string} subjectKey - The subject key
   * @param {string} content - The homework content
   */
  setHomework(subjectKey, content) {
    if (!this.boardData.homework[subjectKey]) {
      this.boardData.homework[subjectKey] = {};
    }

    this.boardData.homework[subjectKey].content = content;
    this.synced = false;
  },

  /**
   * Update attendance data
   * @param {Object} attendance - The new attendance data
   */
  updateAttendance(attendance) {
    this.boardData.attendance = {
      absent: [...attendance.absent || []],
      late: [...attendance.late || []],
      exclude: [...attendance.exclude || []]
    };
    this.synced = false;
  },

  /**
   * Get subject data including content
   * @param {string} subjectKey - The subject key
   * @param {Array} availableSubjects - List of available subjects
   * @returns {Object} Subject with name and content
   */
  getSubject(subjectKey, availableSubjects) {
    const name = availableSubjects.find(s => s.key === subjectKey)?.name || subjectKey;
    const content = this.boardData.homework[subjectKey]?.content || "";

    return {
      key: subjectKey,
      name,
      content
    };
  },

  // Data loading and saving methods
  /**
   * Load data from server
   * @param {string} provider - The data provider type
   * @param {string} dataKey - The data key
   * @param {string} dateString - The date string
   * @returns {Promise<boolean>} Success status
   */
  async loadData(provider, dataKey, dateString) {
    try {
      const response = await dataProvider.loadData(provider, dataKey, dateString);

      if (!response.success) {
        if (response.error.code === "NOT_FOUND") {
          this.resetData();
          return true;
        }
        throw new Error(response.error.message);
      }

      // Update the store with the retrieved data
      this.boardData = {
        homework: response.data.homework || {},
        attendance: {
          absent: response.data.attendance?.absent || [],
          late: response.data.attendance?.late || [],
          exclude: response.data.attendance?.exclude || []
        }
      };

      this.synced = true;
      return true;
    } catch (error) {
      console.error("Failed to load data:", error);
      this.resetData();
      throw error;
    }
  },

  /**
   * Save data to server
   * @param {string} provider - The data provider type
   * @param {string} dataKey - The data key
   * @param {string} dateString - The date string
   * @returns {Promise<boolean>} Success status
   */
  async saveData(provider, dataKey, dateString) {
    try {
      const response = await dataProvider.saveData(
        provider,
        dataKey,
        this.boardData,
        dateString
      );

      if (!response.success) {
        throw new Error(response.error.message);
      }

      this.synced = true;
      return true;
    } catch (error) {
      console.error("Failed to save data:", error);
      throw error;
    }
  },

  /**
   * Load student list and config
   * @param {string} provider - The data provider type
   * @param {string} dataKey - The data key
   * @returns {Promise<boolean>} Success status
   */
  async loadConfig(provider, dataKey) {
    try {
      const response = await dataProvider.loadConfig(provider, dataKey);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      this.studentList = response.data.studentList || [];
      return true;
    } catch (error) {
      console.error("Failed to load config:", error);
      throw error;
    }
  }
});

export default dataStore;