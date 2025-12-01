<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="isMobile"
    fullscreen-breakpoint="sm"
    max-width="900"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" icon="mdi-account-group" />
        出勤状态管理
        <v-spacer />
        <v-chip v-if="!isMobile" class="ml-2" color="primary" size="small">
          {{ dateString }}
        </v-chip>
        <v-btn v-if="isMobile" icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)" />
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
                      :color="getStudentStatusColor(student)"
                      class="mr-2"
                      size="24"
                    >
                      <v-icon size="small"
                        >{{ getStudentStatusIcon(student) }}
                      </v-icon>
                    </v-avatar>
                    <div class="text-subtitle-1">{{ student }}</div>
                  </div>
                </div>
                <div class="attendance-actions">
                  <v-btn
                    :color="isPresent(student) ? 'success' : ''"
                    :title="'设为到课'"
                    icon="mdi-account-check"
                    :size="isMobile ? 'default' : 'small'"
                    variant="text"
                    @click="setPresent(student)"
                  />
                  <v-btn
                    :color="isAbsent(student) ? 'error' : ''"
                    :title="'设为请假'"
                    icon="mdi-account-off"
                    :size="isMobile ? 'default' : 'small'"
                    variant="text"
                    @click="setAbsent(student)"
                  />
                  <v-btn
                    :color="isLate(student) ? 'warning' : ''"
                    :title="'设为迟到'"
                    icon="mdi-clock-alert"
                    :size="isMobile ? 'default' : 'small'"
                    variant="text"
                    @click="setLate(student)"
                  />
                  <v-btn
                    :color="isExclude(student) ? 'grey' : ''"
                    :title="'设为不参与'"
                    icon="mdi-account-cancel"
                    :size="isMobile ? 'default' : 'small'"
                    variant="text"
                    @click="setExclude(student)"
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
                <div class="d-flex flex-wrap gap-2">
                  <v-btn
                    class="flex-grow-1"
                    color="success"
                    prepend-icon="mdi-account-check"
                    @click="setAllPresent"
                  >
                    全部到齐
                  </v-btn>
                  <v-btn
                    class="flex-grow-1"
                    color="error"
                    prepend-icon="mdi-account-off"
                    @click="setAllAbsent"
                  >
                    全部请假
                  </v-btn>
                  <v-btn
                    class="flex-grow-1"
                    color="warning"
                    prepend-icon="mdi-clock-alert"
                    @click="setAllLate"
                  >
                    全部迟到
                  </v-btn>
                  <v-btn
                    class="flex-grow-1"
                    color="grey"
                    prepend-icon="mdi-account-cancel"
                    @click="setAllExclude"
                  >
                    全部不参与
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />

        <v-btn color="primary" @click="$emit('save')">
          <v-icon start>mdi-content-save</v-icon>
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { pinyin } from "pinyin-pro";
import { useDisplay } from "vuetify";

export default {
  name: "AttendanceManagementDialog",
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    studentList: {
      type: Array,
      required: true,
    },
    attendance: {
      type: Object,
      required: true,
    },
    dateString: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue", "save", "change"],
  setup() {
    const { mobile } = useDisplay();
    return { isMobile: mobile };
  },
  data() {
    return {
      attendanceSearch: "",
      attendanceFilter: [],
    };
  },
  computed: {
    filteredStudents() {
      let students = [...this.studentList];

      if (this.attendanceSearch) {
        const searchTerm = this.attendanceSearch.toLowerCase();
        students = students.filter((student) =>
          student.toLowerCase().includes(searchTerm)
        );
      }

      if (this.attendanceFilter && this.attendanceFilter.length > 0) {
        students = students.filter((student) => {
          if (this.attendanceFilter.includes("present") && this.isPresent(student))
            return true;
          if (this.attendanceFilter.includes("absent") && this.isAbsent(student))
            return true;
          if (this.attendanceFilter.includes("late") && this.isLate(student))
            return true;
          if (this.attendanceFilter.includes("exclude") && this.isExclude(student))
            return true;
          return false;
        });
      }

      return students;
    },
    extractedSurnames() {
      if (!this.studentList || this.studentList.length === 0) {
        return [];
      }

      const surnameMap = new Map();

      this.studentList.forEach((student) => {
        if (student && student.length > 0) {
          const surname = student.charAt(0);
          surnameMap.set(surname, (surnameMap.get(surname) || 0) + 1);
        }
      });

      return Array.from(surnameMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          const pinyinA = pinyin(a.name, { toneType: "none" });
          const pinyinB = pinyin(b.name, { toneType: "none" });
          return pinyinA.localeCompare(pinyinB);
        });
    },
  },
  methods: {
    toggleFilter(filter) {
      const index = this.attendanceFilter.indexOf(filter);
      if (index === -1) {
        this.attendanceFilter.push(filter);
      } else {
        this.attendanceFilter.splice(index, 1);
      }
    },
    isPresent(student) {
      const { absent, late, exclude } = this.attendance;
      return (
        !absent.includes(student) &&
        !late.includes(student) &&
        !exclude.includes(student)
      );
    },
    isAbsent(student) {
      return this.attendance.absent.includes(student);
    },
    isLate(student) {
      return this.attendance.late.includes(student);
    },
    isExclude(student) {
      return this.attendance.exclude.includes(student);
    },
    getStudentStatusColor(student) {
      if (this.attendance.absent.includes(student)) return "error";
      if (this.attendance.late.includes(student)) return "warning";
      if (this.attendance.exclude.includes(student)) return "grey";
      return "success";
    },
    getStudentStatusIcon(student) {
      if (this.attendance.absent.includes(student)) return "mdi-account-off";
      if (this.attendance.late.includes(student)) return "mdi-clock-alert";
      if (this.attendance.exclude.includes(student)) return "mdi-account-cancel";
      return "mdi-account-check";
    },
    removeFromAll(student) {
      const idxAbsent = this.attendance.absent.indexOf(student);
      if (idxAbsent > -1) this.attendance.absent.splice(idxAbsent, 1);

      const idxLate = this.attendance.late.indexOf(student);
      if (idxLate > -1) this.attendance.late.splice(idxLate, 1);

      const idxExclude = this.attendance.exclude.indexOf(student);
      if (idxExclude > -1) this.attendance.exclude.splice(idxExclude, 1);
    },
    setPresent(student) {
      this.removeFromAll(student);
      this.$emit("change");
    },
    setAbsent(student) {
      this.removeFromAll(student);
      this.attendance.absent.push(student);
      this.$emit("change");
    },
    setLate(student) {
      this.removeFromAll(student);
      this.attendance.late.push(student);
      this.$emit("change");
    },
    setExclude(student) {
      this.removeFromAll(student);
      this.attendance.exclude.push(student);
      this.$emit("change");
    },
    setAllPresent() {
      this.attendance.absent.splice(0, this.attendance.absent.length);
      this.attendance.late.splice(0, this.attendance.late.length);
      this.attendance.exclude.splice(0, this.attendance.exclude.length);
      this.$emit("change");
    },
    setAllAbsent() {
      this.setAllPresent(); // Clear first
      this.attendance.absent.push(...this.studentList);
      this.$emit("change");
    },
    setAllLate() {
      this.setAllPresent(); // Clear first
      this.attendance.late.push(...this.studentList);
      this.$emit("change");
    },
    setAllExclude() {
      this.setAllPresent(); // Clear first
      this.attendance.exclude.push(...this.studentList);
      this.$emit("change");
    },
  },
};
</script>

<style scoped>
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
</style>
