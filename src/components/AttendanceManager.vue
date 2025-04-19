<template>
  <div>
    <v-dialog v-model="dialogVisible" max-width="900" fullscreen-breakpoint="sm" @update:model-value="handleDialogClose">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-account-group" class="mr-2" />
          出勤状态管理
          <v-spacer />
          <v-chip color="primary" size="small" class="ml-2">
            {{ dateString }}
          </v-chip>
        </v-card-title>

        <v-card-text>
          <!-- 批量操作和搜索 -->
          <v-row class="mb-4">
            <v-col cols="12" md="12">
              <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="搜索学生"
                hint="支持筛选姓氏，如输入'孙'可筛选所有姓孙的学生" variant="outlined" clearable @update:model-value="handleSearchChange" />

              <!-- 姓氏筛选 -->
              <div class="d-flex flex-wrap mt-2 gap-1">
                <v-btn v-for="surname in extractedSurnames" :key="surname.name"
                  :variant="search === surname.name ? 'elevated' : 'text'"
                  :color="search === surname.name ? 'primary' : ''"
                  @click="search = search === surname.name ? '' : surname.name">
                  {{ surname.name }}
                  ({{ surname.count }})
                </v-btn>
              </div>
            </v-col>
          </v-row>

          <!-- 过滤器 -->
          <div class="d-flex flex-wrap mb-4 gap-2">
            <div>
              <v-chip value="present" :color="filter.includes('present') ? 'success' : ''"
                :variant="filter.includes('present') ? 'elevated' : 'tonal'" class="px-2 filter-chip"
                @click="toggleFilter('present')" prepend-icon="mdi-account-check"
                :append-icon="filter.includes('present') ? 'mdi-check' : ''">
                到课
              </v-chip>

              <v-chip value="absent" :color="filter.includes('absent') ? 'error' : ''"
                :variant="filter.includes('absent') ? 'elevated' : 'tonal'" class="px-2 filter-chip"
                @click="toggleFilter('absent')" prepend-icon="mdi-account-off"
                :append-icon="filter.includes('absent') ? 'mdi-check' : ''">
                请假
              </v-chip>
              <v-chip value="late" :color="filter.includes('late') ? 'warning' : ''"
                :variant="filter.includes('late') ? 'elevated' : 'tonal'" class="px-2 filter-chip"
                @click="toggleFilter('late')" prepend-icon="mdi-clock-alert"
                :append-icon="filter.includes('late') ? 'mdi-check' : ''">
                迟到
              </v-chip>
              <v-chip value="exclude" :color="filter.includes('exclude') ? 'grey' : ''"
                :variant="filter.includes('exclude') ? 'elevated' : 'tonal'" class="px-2 filter-chip"
                @click="toggleFilter('exclude')" prepend-icon="mdi-account-cancel"
                :append-icon="filter.includes('exclude') ? 'mdi-check' : ''">
                不参与
              </v-chip>
            </div>
          </div>

          <!-- 学生列表 -->
          <v-row>
            <v-col v-for="student in filteredStudents" :key="student" cols="12" sm="6" md="6" lg="4">
              <v-card class="student-card" border>
                <v-card-text class="d-flex align-center pa-2">
                  <div class="flex-grow-1">
                    <div class="d-flex align-center">
                      <v-avatar :color="getStudentStatusColor(studentList.indexOf(student))" size="24" class="mr-2">
                        <v-icon size="small">{{ getStudentStatusIcon(studentList.indexOf(student)) }}</v-icon>
                      </v-avatar>
                      <div class="text-subtitle-1">{{ student }}</div>
                    </div>
                  </div>
                  <div class="attendance-actions">
                    <v-btn :color="isPresent(studentList.indexOf(student)) ? 'success' : ''"
                      icon="mdi-account-check" size="small" variant="text"
                      @click="setPresent(studentList.indexOf(student))" :title="'设为到课'" />
                    <v-btn :color="isAbsent(studentList.indexOf(student)) ? 'error' : ''" icon="mdi-account-off"
                      size="small" variant="text" @click="setAbsent(studentList.indexOf(student))"
                      :title="'设为请假'" />
                    <v-btn :color="isLate(studentList.indexOf(student)) ? 'warning' : ''" icon="mdi-clock-alert"
                      size="small" variant="text" @click="setLate(studentList.indexOf(student))" :title="'设为迟到'" />
                    <v-btn :color="isExclude(studentList.indexOf(student)) ? 'grey' : ''" icon="mdi-account-cancel"
                      size="small" variant="text" @click="setExclude(studentList.indexOf(student))"
                      :title="'设为不参与'" />
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
                    <v-btn color="success" prepend-icon="mdi-account-check" @click="setAllPresent">
                      全部到齐
                    </v-btn>
                    <v-btn color="error" prepend-icon="mdi-account-off" @click="setAllAbsent">
                      全部请假
                    </v-btn>
                  </v-btn-group>
                  <v-btn-group>
                    <v-btn color="warning" prepend-icon="mdi-clock-alert" @click="setAllLate">
                      全部迟到
                    </v-btn>
                    <v-btn color="grey" prepend-icon="mdi-account-cancel" @click="setAllExclude">
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

    <!-- 出勤统计区域 -->
    <v-col v-if="studentList && studentList.length" class="attendance-area no-select" cols="1" @click="openDialog">
      <h1>出勤</h1>
      <h2>
        <snap style="white-space: nowrap"> 应到 </snap>:
        <snap style="white-space: nowrap">
          {{ studentList.length - localAttendance.exclude.length }}人
        </snap>
      </h2>
      <h2>
        <snap style="white-space: nowrap"> 实到 </snap>:
        <snap style="white-space: nowrap">
          {{ studentList.length - localAttendance.absent.length - localAttendance.late.length - localAttendance.exclude.length }}人
        </snap>
      </h2>
      <h2>
        <snap style="white-space: nowrap"> 请假 </snap>:
        <snap style="white-space: nowrap">
          {{ localAttendance.absent.length }}人
        </snap>
      </h2>
      <h3 class="gray-text" v-for="(name, index) in localAttendance.absent" :key="'absent-' + index">
        <span v-if="lgAndUp">{{ `${index + 1}. ` }}</span><span style="white-space: nowrap">{{ name }}</span>
      </h3>
      <h2>
        <snap style="white-space: nowrap">迟到</snap>:
        <snap style="white-space: nowrap">
          {{ localAttendance.late.length }}人
        </snap>
      </h2>
      <h3 class="gray-text" v-for="(name, index) in localAttendance.late" :key="'late-' + index">
        <span v-if="lgAndUp">{{ `${index + 1}. ` }}</span><span style="white-space: nowrap">{{ name }}</span>
      </h3>
      <h2>
        <snap style="white-space: nowrap">不参与</snap>:
        <snap style="white-space: nowrap">
          {{ localAttendance.exclude.length }}人
        </snap>
      </h2>
      <h3 class="gray-text" v-for="(name, index) in localAttendance.exclude" :key="'exclude-' + index">
        <span v-if="lgAndUp">{{ `${index + 1}. ` }}</span><span style="white-space: nowrap">{{ name }}</span>
      </h3>
    </v-col>
  </div>
</template>

<script>
import { useDisplay } from "vuetify";
import { pinyin } from "pinyin-pro";

export default {
  name: 'AttendanceManager',
  props: {
    studentList: {
      type: Array,
      default: () => []
    },
    attendance: {
      type: Object,
      default: () => ({
        absent: [],
        late: [],
        exclude: []
      })
    },
    dateString: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      dialogVisible: false,
      search: '',
      filter: [],
      localAttendance: {
        absent: [],
        late: [],
        exclude: []
      }
    };
  },

  computed: {
    lgAndUp() {
      return useDisplay().lgAndUp.value;
    },

    filteredStudents() {
      let students = [...this.studentList];

      // 应用搜索过滤
      if (this.search) {
        const searchTerm = this.search.toLowerCase();
        students = students.filter(student =>
          student.toLowerCase().includes(searchTerm)
        );
      }

      // 应用状态过滤
      if (this.filter && this.filter.length > 0) {
        students = students.filter(student => {
          const index = this.studentList.indexOf(student);
          if (this.filter.includes('present') && this.isPresent(index)) return true;
          if (this.filter.includes('absent') && this.isAbsent(index)) return true;
          if (this.filter.includes('late') && this.isLate(index)) return true;
          if (this.filter.includes('exclude') && this.isExclude(index)) return true;
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

      this.studentList.forEach(student => {
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
          const pinyinA = pinyin(a.name, { toneType: "none", mode: 'surname' });
          const pinyinB = pinyin(b.name, { toneType: "none", mode: 'surname' });
          return pinyinA.localeCompare(pinyinB);
        });
    }
  },

  watch: {
    attendance: {
      handler(newValue) {
        // Deep copy the attendance object to local state
        this.localAttendance = {
          absent: [...newValue.absent || []],
          late: [...newValue.late || []],
          exclude: [...newValue.exclude || []]
        };
      },
      immediate: true,
      deep: true
    }
  },

  methods: {
    openDialog() {
      this.dialogVisible = true;
    },

    handleDialogClose(isOpen) {
      if (!isOpen) {
        this.$emit('update', this.localAttendance);
      }
    },

    getStudentStatusColor(index) {
      const studentName = this.studentList[index];
      if (this.localAttendance.absent.includes(studentName)) return 'error';
      if (this.localAttendance.late.includes(studentName)) return 'warning';
      if (this.localAttendance.exclude.includes(studentName)) return 'grey';
      return 'success';
    },

    getStudentStatusIcon(index) {
      const studentName = this.studentList[index];
      if (this.localAttendance.absent.includes(studentName)) return 'mdi-account-off';
      if (this.localAttendance.late.includes(studentName)) return 'mdi-clock-alert';
      if (this.localAttendance.exclude.includes(studentName)) return 'mdi-account-cancel';
      return 'mdi-account-check';
    },

    isPresent(index) {
      // Check if the student is neither absent, late, nor excluded
      return !this.isAbsent(index) && !this.isLate(index) && !this.isExclude(index);
    },

    isAbsent(index) {
      return this.localAttendance.absent.includes(this.studentList[index]);
    },

    isLate(index) {
      return this.localAttendance.late.includes(this.studentList[index]);
    },

    isExclude(index) {
      return this.localAttendance.exclude.includes(this.studentList[index]);
    },

    setPresent(index) {
      const student = this.studentList[index];
      this.localAttendance.absent = this.localAttendance.absent.filter(name => name !== student);
      this.localAttendance.late = this.localAttendance.late.filter(name => name !== student);
      this.localAttendance.exclude = this.localAttendance.exclude.filter(name => name !== student);
      this.$emit('change');
    },

    setAbsent(index) {
      const student = this.studentList[index];
      this.setPresent(index);
      this.localAttendance.absent.push(student);
      this.$emit('change');
    },

    setLate(index) {
      const student = this.studentList[index];
      this.setPresent(index);
      this.localAttendance.late.push(student);
      this.$emit('change');
    },

    setExclude(index) {
      const student = this.studentList[index];
      this.setPresent(index);
      this.localAttendance.exclude.push(student);
      this.$emit('change');
    },

    setAllPresent() {
      this.localAttendance.absent = [];
      this.localAttendance.late = [];
      this.localAttendance.exclude = [];
      this.$emit('change');
    },

    setAllAbsent() {
      this.localAttendance.absent = [...this.studentList];
      this.localAttendance.late = [];
      this.localAttendance.exclude = [];
      this.$emit('change');
    },

    setAllLate() {
      this.localAttendance.absent = [];
      this.localAttendance.late = [...this.studentList];
      this.localAttendance.exclude = [];
      this.$emit('change');
    },

    setAllExclude() {
      this.localAttendance.absent = [];
      this.localAttendance.late = [];
      this.localAttendance.exclude = [...this.studentList];
      this.$emit('change');
    },

    toggleFilter(filter) {
      const index = this.filter.indexOf(filter);
      if (index === -1) {
        this.filter.push(filter);
      } else {
        this.filter.splice(index, 1);
      }
    },

    handleSearchChange() {
      // Just a placeholder for future functionality
    },

    saveAttendance() {
      this.$emit('save', this.localAttendance);
      this.dialogVisible = false;
    }
  }
}
</script>

<style scoped>
.attendance-area {
  border-left: 1px solid var(--v-border-color);
  padding: 1rem;
  min-width: 150px;
}

.gray-text {
  color: #777;
}

.student-card {
  transition: all 0.3s ease;
}

.student-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.filter-chip {
  transition: all 0.2s ease;
}
</style>