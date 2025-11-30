<template>
  <div class="floating-toolbar-container">
    <v-slide-y-transition>
      <v-card
        :class="{ 'toolbar-expanded': isExpanded }"
        class="floating-toolbar"
        elevation="4"
        rounded="xl"
      >
        <v-btn-group class="toolbar-buttons" variant="text">
          <v-btn
            v-ripple
            :title="'查看昨天'"
            class="toolbar-btn"
            icon="mdi-chevron-left"
            variant="text"
            @click="$emit('prev-day')"
          />
          <v-btn
            v-ripple
            :title="'缩小字体'"
            class="toolbar-btn"
            icon="mdi-format-font-size-decrease"
            variant="text"
            @click="$emit('zoom', 'out')"
          />
          <v-btn
            v-ripple
            :title="'放大字体'"
            class="toolbar-btn"
            icon="mdi-format-font-size-increase"
            variant="text"
            @click="$emit('zoom', 'up')"
          />
          <v-menu :close-on-content-click="false" location="top">
            <template #activator="{ props }">
              <v-btn
                v-ripple
                :title="'选择日期'"
                class="toolbar-btn"
                icon="mdi-calendar"
                v-bind="props"
                variant="text"
              />
            </template>
            <v-card border class="date-picker-card">
              <v-date-picker
                :model-value="selectedDate"
                color="primary"
                @update:model-value="handleDateSelect"
              />
            </v-card>
          </v-menu>
          <v-btn
            v-ripple
            :loading="loading"
            :title="'刷新数据'"
            class="toolbar-btn"
            icon="mdi-refresh"
            variant="text"
            @click="$emit('refresh')"
          />

          <v-btn
            v-if="!isToday"
            v-ripple
            :title="'查看明天'"
            class="toolbar-btn"
            icon="mdi-chevron-right"
            variant="text"
            @click="$emit('next-day')"
          />
        </v-btn-group>
      </v-card>
    </v-slide-y-transition>

    <!-- Side Action Button -->
    <v-slide-x-reverse-transition>
      <v-btn
        v-if="!isToday"
        :loading="copyToTodayLoading"
        :disabled="copyToTodayLoading"
        class="side-action-btn"
        color="primary"
        elevation="4"
        prepend-icon="mdi-content-copy"
        rounded="xl"
        size="large"
        text="复制作业内容到今天"
        @click="$emit('copy-to-today')"
      >复制到今天</v-btn>
    </v-slide-x-reverse-transition>
  </div>
</template>

<script>
export default {
  name: "FloatingToolbar",
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    selectedDate: {
      type: [String, Date],
      required: true,
    },
    isToday: {
      type: Boolean,
      required: true,
    },
    copyToTodayLoading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isExpanded: false,
    };
  },
  methods: {
    handleDateSelect(newDate) {
      this.$emit("date-select", newDate);
    },
  },
};
</script>

<style scoped>
.floating-toolbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.floating-toolbar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);

  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.7) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  pointer-events: auto;
  will-change: transform;
}

.floating-toolbar:hover {
  transform: translateX(-50%) translateY(-4px);
  background: rgba(255, 255, 255, 0.8) !important;
}

.toolbar-buttons {
  display: flex;
  align-items: center;
}

.toolbar-btn {
  margin: 0 2px;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: scale(1.05);
}

.toolbar-btn:active {
  transform: scale(0.95);
}

.side-action-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  pointer-events: auto;
  z-index: 101;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.date-picker-card {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 600px) {
  .floating-toolbar {
    bottom: 16px;
    width: auto;
    max-width: 95%;
    padding: 2px;
  }

  .toolbar-buttons {
    width: 100%;
    justify-content: space-around;
    padding: 4px;
  }

  .toolbar-btn {
    margin: 0;
    min-width: 40px; /* Ensure touch target */
  }

  .side-action-btn {
    bottom: 80px; /* Move above toolbar on mobile */
    right: 16px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .floating-toolbar {
    background: rgba(30, 30, 30, 0.7) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .floating-toolbar:hover {
    background: rgba(30, 30, 30, 0.8) !important;
  }

  .toolbar-btn:hover {
    background: rgba(255, 255, 255, 0.1) !important;
  }

  .date-picker-card {
    background: rgba(30, 30, 30, 0.9) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .side-action-btn {
    background: rgba(30, 30, 30, 0.9) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white !important;
  }
}
</style>
