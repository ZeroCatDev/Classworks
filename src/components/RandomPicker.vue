<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
    fullscreen-breakpoint="sm"
    persistent
  >
    <v-card class="random-picker-card" rounded="xl" border>
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon icon="mdi-account-question" class="mr-2" />
        随机点名
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
      </v-card-title>

      <v-card-text v-if="!isPickingStarted" class="text-center py-6">
        <div class="text-h6 mb-4">请选择抽取人数</div>

        <div class="d-flex justify-center align-center counter-container">
          <v-btn
            size="x-large"
            icon="mdi-minus"
            variant="tonal"
            color="primary"
            :disabled="count <= 1"
            @click="decrementCount"
            class="counter-btn"
          />

          <div class="count-display mx-8">
            <span class="text-h2 font-weight-bold">{{ count }}</span>
            <span class="text-subtitle-1 ml-2">人</span>
          </div>

          <v-btn
            size="x-large"
            icon="mdi-plus"
            variant="tonal"
            color="primary"
            :disabled="count >= maxAllowedCount"
            @click="incrementCount"
            class="counter-btn"
          />
        </div>

        <!-- 添加模式切换 -->
        <div class="mode-switch-container mt-6">
          <v-btn-toggle
            v-model="pickerMode"
            color="primary"
            rounded="pill"
            mandatory
            class="mode-toggle"
          >
            <v-btn value="name" prepend-icon="mdi-account">姓名模式</v-btn>
            <v-btn value="number" prepend-icon="mdi-numeric">学号模式</v-btn>
          </v-btn-toggle>
        </div>

        <!-- 学号范围设置 -->
        <div v-if="pickerMode === 'number'" class="number-range-container mt-4">
          <div class="text-subtitle-1 mb-2">学号范围设置</div>
          <div class="d-flex justify-center align-center gap-4">
            <v-text-field
              v-model.number="minNumber"
              label="最小值"
              type="number"
              min="1"
              max="100"
              hide-details
              class="number-input"
              density="compact"
            />
            <span class="mx-2">至</span>
            <v-text-field
              v-model.number="maxNumber"
              label="最大值"
              type="number"
              min="1"
              max="100"
              hide-details
              class="number-input"
              density="compact"
            />
          </div>
        </div>

        <div class="mt-4">
          <v-btn
            size="x-large"
            color="primary"
            prepend-icon="mdi-dice-multiple"
            @click="startPicking"
            :disabled="filteredStudents.length === 0"
            class="start-btn"
          >
            开始抽取
          </v-btn>
        </div>

        <div v-if="filteredStudents.length === 0" class="mt-4 text-error">
          <template v-if="pickerMode === 'name'">
            没有可抽取的学生，请调整过滤选项
          </template>
          <template v-else>
            请设置有效的学号范围
          </template>
        </div>

        <div class="mt-4 text-caption">
          当前可抽取学生: {{ filteredStudents.length }}人
          <v-tooltip v-if="pickerMode === 'name'" location="bottom">
            <template v-slot:activator="{ props }">
              <v-icon
                v-bind="props"
                icon="mdi-information-outline"
                size="small"
                class="ml-1"
              />
            </template>
            <div class="pa-2">
              <div v-if="tempFilters.excludeAbsent">
                • 已排除请假学生 ({{ absentCount }}人)
              </div>
              <div v-if="tempFilters.excludeLate">
                • 已排除迟到学生 ({{ lateCount }}人)
              </div>
              <div v-if="tempFilters.excludeExcluded">
                • 已排除不参与学生 ({{ excludedCount }}人)
              </div>
            </div>
          </v-tooltip>

          <!-- 添加临时过滤选项 -->
          <div v-if="pickerMode === 'name'" class="d-flex flex-wrap justify-center gap-2 mt-4">
            <v-chip
              :color="tempFilters.excludeLate ? 'warning' : 'default'"
              :variant="tempFilters.excludeLate ? 'elevated' : 'text'"
              @click="tempFilters.excludeLate = !tempFilters.excludeLate"
              prepend-icon="mdi-clock-alert"
              class="filter-chip"
            >
              {{ tempFilters.excludeLate ? "排除" : "包含" }}迟到学生
            </v-chip>
            <v-chip
              :color="tempFilters.excludeAbsent ? 'error' : 'default'"
              :variant="tempFilters.excludeAbsent ? 'elevated' : 'text'"
              @click="tempFilters.excludeAbsent = !tempFilters.excludeAbsent"
              prepend-icon="mdi-account-off"
              class="filter-chip"
            >
              {{ tempFilters.excludeAbsent ? "排除" : "包含" }}请假学生
            </v-chip>

            <v-chip
              :color="tempFilters.excludeExcluded ? 'grey' : 'default'"
              :variant="tempFilters.excludeExcluded ? 'elevated' : 'text'"
              @click="tempFilters.excludeExcluded = !tempFilters.excludeExcluded"
              prepend-icon="mdi-account-cancel"
              class="filter-chip"
            >
              {{ tempFilters.excludeExcluded ? "排除" : "包含" }}不参与学生
            </v-chip>
          </div>
        </div>
      </v-card-text>

      <v-card-text v-else class="text-center py-6">
        <div v-if="isAnimating" class="animation-container">
          <div class="animation-wrapper">
            <transition-group
              name="shuffle"
              tag="div"
              class="shuffle-container"
            >
              <div
                v-for="(student, index) in animationStudents"
                :key="student.id"
                class="student-item"
                :class="{ highlighted: highlightedIndices.includes(index) }"
              >
                {{ student.name }}
              </div>
            </transition-group>
          </div>
        </div>

        <div v-else class="result-container">
          <div class="text-h6 mb-4">抽取结果</div>
          <v-card
            v-for="(student, index) in pickedStudents"
            :key="index"
            variant="outlined"
            color="primary"
            class="mb-2 result-card"
          >
            <v-card-text
              class="text-h4 text-center py-4 d-flex align-center justify-center"
            >
              {{ student }}
              <v-btn
                icon="mdi-refresh"
                variant="text"
                size="small"
                class="ml-2 refresh-btn"
                @click="refreshSingleStudent(index)"
                :disabled="remainingStudents.length === 0"
                :title="
                  remainingStudents.length === 0
                    ? '没有更多可用学生'
                    : '重新抽取此学生'
                "
              />
            </v-card-text>
          </v-card>

          <div class="mt-8 d-flex justify-center">
            <v-btn
              color="primary"
              prepend-icon="mdi-refresh"
              @click="resetPicker"
              size="large"
              class="mx-2"
            >
              重新抽取
            </v-btn>
            <v-btn
              color="grey"
              variant="outlined"
              @click="dialog = false"
              size="large"
              class="mx-2"
            >
              关闭
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { getSetting, setSetting } from "@/utils/settings";

export default {
  name: "RandomPicker",
  props: {
    studentList: {
      type: Array,
      required: true,
    },
    attendance: {
      type: Object,
      required: true,
      default: () => ({ absent: [], late: [], exclude: [] }),
    },
  },
  data() {
    return {
      dialog: false,
      count: getSetting("randomPicker.defaultCount"),
      isPickingStarted: false,
      isAnimating: false,
      pickedStudents: [],
      animationStudents: [],
      highlightedIndices: [],
      animationTimer: null,
      getSetting,
      // 添加临时过滤选项
      tempFilters: {
        excludeAbsent: getSetting("randomPicker.excludeAbsent"),
        excludeLate: getSetting("randomPicker.excludeLate"),
        excludeExcluded: getSetting("randomPicker.excludeExcluded"),
      },
      pickerMode: getSetting("randomPicker.mode"),
      minNumber: getSetting("randomPicker.minNumber"),
      maxNumber: getSetting("randomPicker.maxNumber"),
    };
  },
  computed: {
    // 计算请假、迟到、不参与的学生数量
    absentCount() {
      return this.attendance.absent ? this.attendance.absent.length : 0;
    },
    lateCount() {
      return this.attendance.late ? this.attendance.late.length : 0;
    },
    excludedCount() {
      return this.attendance.exclude ? this.attendance.exclude.length : 0;
    },

    // 添加数字模式的学生列表
    numberModeStudents() {
      if (this.pickerMode !== "number") return [];
      const students = [];
      for (let i = this.minNumber; i <= this.maxNumber; i++) {
        students.push(i.toString().padStart(2, "0") + "号");
      }
      return students;
    },

    // 修改 filteredStudents 计算属性
    filteredStudents() {
      if (this.pickerMode === "number") {
        return this.numberModeStudents;
      }

      if (!this.studentList || !this.studentList.length) return [];

      return this.studentList.filter((student) => {
        if (
          this.tempFilters.excludeAbsent &&
          this.attendance.absent.includes(student)
        ) {
          return false;
        }
        if (
          this.tempFilters.excludeLate &&
          this.attendance.late.includes(student)
        ) {
          return false;
        }
        if (
          this.tempFilters.excludeExcluded &&
          this.attendance.exclude.includes(student)
        ) {
          return false;
        }
        return true;
      });
    },

    // 兼容性：保留原有的 availableStudents 计算属性，但使用新的过滤逻辑
    availableStudents() {
      return this.filteredStudents;
    },

    maxAllowedCount() {
      return Math.min(10, this.filteredStudents.length);
    },

    // 计算剩余可用学生（排除已抽取的学生）
    remainingStudents() {
      return this.filteredStudents.filter(
        (student) => !this.pickedStudents.includes(student)
      );
    },
  },
  watch: {
    dialog(newVal) {
      if (newVal) {
        // 打开对话框时重置状态
        this.count = getSetting("randomPicker.defaultCount");
        this.isPickingStarted = false;
        this.isAnimating = false;
        this.pickedStudents = [];

        // 重置临时过滤选项为设置中的值
        this.tempFilters = {
          excludeAbsent: getSetting("randomPicker.excludeAbsent"),
          excludeLate: getSetting("randomPicker.excludeLate"),
          excludeExcluded: getSetting("randomPicker.excludeExcluded"),
        };
      } else {
        // 关闭对话框时清除计时器
        if (this.animationTimer) {
          clearTimeout(this.animationTimer);
          this.animationTimer = null;
        }
      }
    },

    // 监听过滤选项变化，确保count不超过可用学生数
    tempFilters: {
      handler() {
        if (this.count > this.maxAllowedCount) {
          this.count = Math.max(1, this.maxAllowedCount);
        }
      },
      deep: true,
    },

    // 添加模式切换监听
    pickerMode: {
      handler(newMode) {
        setSetting("randomPicker.mode", newMode);
      },
    },
    minNumber: {
      handler(newValue) {
        if (newValue > this.maxNumber) {
          this.minNumber = this.maxNumber;
        }
        if (newValue < 1) {
          this.minNumber = 1;
        }
        setSetting("randomPicker.minNumber", this.minNumber);
      },
    },
    maxNumber: {
      handler(newValue) {
        if (newValue < this.minNumber) {
          this.maxNumber = this.minNumber;
        }
        if (newValue > 100) {
          this.maxNumber = 100;
        }
        setSetting("randomPicker.maxNumber", this.maxNumber);
      },
    },
  },
  methods: {
    open() {
      this.dialog = true;
    },
    incrementCount() {
      if (this.count < this.maxAllowedCount) {
        this.count++;
      }
    },
    decrementCount() {
      if (this.count > 1) {
        this.count--;
      }
    },
    startPicking() {
      if (this.filteredStudents.length === 0) return;

      this.isPickingStarted = true;

      if (getSetting("randomPicker.animation")) {
        this.startAnimation();
      } else {
        this.finishPicking();
      }
    },
    startAnimation() {
      this.isAnimating = true;

      // 创建动画用的学生列表（添加ID以便于动画）
      this.animationStudents = this.filteredStudents.map((name, index) => ({
        id: `student-${index}`,
        name,
      }));

      // 随机高亮显示
      this.animateHighlight();
    },
    animateHighlight() {
      const totalSteps = 5; // 动画总步数
      let currentStep = 0;
      const intervalTime = 50; // 初始间隔时间

      const animate = () => {
        // 清除之前的高亮
        this.highlightedIndices = [];

        // 随机选择要高亮的索引
        const indices = [];
        for (let i = 0; i < this.count; i++) {
          let randomIndex;
          do {
            randomIndex = Math.floor(
              Math.random() * this.animationStudents.length
            );
          } while (indices.includes(randomIndex));
          indices.push(randomIndex);
        }

        this.highlightedIndices = indices;

        currentStep++;

        // 逐渐增加间隔时间，使动画变慢
        const nextInterval = intervalTime + currentStep * 20;

        if (currentStep < totalSteps) {
          this.animationTimer = setTimeout(animate, nextInterval);
        } else {
          // 动画结束，显示最终结果
          setTimeout(() => {
            this.finishPicking();
          }, 500);
        }
      };

      // 开始动画
      animate();
    },
    finishPicking() {
      this.isAnimating = false;

      // 随机选择学生
      const shuffled = [...this.filteredStudents].sort(
        () => 0.5 - Math.random()
      );
      this.pickedStudents = shuffled.slice(0, this.count);
    },
    resetPicker() {
      this.isPickingStarted = false;
      this.isAnimating = false;
      this.pickedStudents = [];
      if (this.animationTimer) {
        clearTimeout(this.animationTimer);
        this.animationTimer = null;
      }
    },
    // 刷新单个学生
    refreshSingleStudent(index) {
      if (this.remainingStudents.length === 0) return;

      // 从剩余学生中随机选择一个
      const randomIndex = Math.floor(
        Math.random() * this.remainingStudents.length
      );
      const newStudent = this.remainingStudents[randomIndex];

      // 替换指定位置的学生
      this.pickedStudents[index] = newStudent;

      // 添加动画效果
      const resultCards = document.querySelectorAll(".result-card");
      if (resultCards[index]) {
        resultCards[index].classList.add("refresh-animation");
        setTimeout(() => {
          resultCards[index].classList.remove("refresh-animation");
        }, 500);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.random-picker-card {
  overflow: hidden;
}

.counter-container {
  margin: 2rem 0;
}

.counter-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

.count-display {
  min-width: 100px;
  text-align: center;
}

.start-btn {
  min-width: 200px;
  height: 64px;
  border-radius: 32px;
  font-size: 1.2rem;
}

// 过滤选项卡片样式
.filter-options-card {
  max-width: 450px;
  margin: 0 auto;
}

.filter-chip {
  cursor: pointer;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.95);
  }
}

// 学生列表提示框样式
.student-list-tooltip {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 5px;
  font-size: 0.9em;
}

.animation-container {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.animation-wrapper {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.shuffle-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.student-item {
  padding: 10px 15px;
  background-color: rgba(var(--v-theme-surface-variant), 0.7);
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 1.2rem;

  &.highlighted {
    background-color: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-on-primary));
    transform: scale(1.1);
    font-weight: bold;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
}

.result-container {
  min-height: 300px;
}

.result-card {
  max-width: 400px;
  margin: 0 auto;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-4px);

    .refresh-btn {
      opacity: 1;
    }
  }
}

.refresh-btn {
  opacity: 0.7;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
}

// 刷新动画
@keyframes refresh-pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(var(--v-theme-primary), 0.5);
  }

  50% {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(var(--v-theme-primary), 0.7);
  }

  100% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(var(--v-theme-primary), 0.5);
  }
}

.refresh-animation {
  animation: refresh-pulse 0.5s ease;
}

// 动画效果
.shuffle-enter-active,
.shuffle-leave-active {
  transition: all 0.5s ease;
}

.shuffle-enter-from,
.shuffle-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.shuffle-move {
  transition: transform 0.5s ease;
}

// 触摸屏优化
@media (hover: none) {
  .counter-btn,
  .start-btn {
    min-height: 72px;
  }

  .student-item {
    padding: 12px 20px;
    font-size: 1.4rem;
  }

  .refresh-btn {
    opacity: 1;
    min-width: 36px;
    min-height: 36px;
  }

  .filter-chip {
    min-height: 40px;
    font-size: 1rem;
  }
}

// 添加模式切换样式
.mode-switch-container {
  .mode-toggle {
    border: 1px solid rgba(var(--v-theme-primary), 0.2);
    border-radius: 50px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .v-btn {
      min-width: 120px;
      height: 40px;
      font-weight: 500;
      letter-spacing: 0.5px;

      &.v-btn--active {
        transform: scale(1.02);
        font-weight: 600;
      }
    }
  }
}

// 添加学号范围设置样式
.number-range-container {
  max-width: 300px;
  margin: 0 auto;
  padding: 16px;
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-primary), 0.1);

  .number-input {
    width: 100px;

    :deep(.v-field) {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
  }
}
</style>
