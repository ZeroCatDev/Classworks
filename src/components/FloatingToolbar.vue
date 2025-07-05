<template>
  <v-slide-y-transition>
    <v-card
      class="floating-toolbar"
      elevation="4"
      rounded="xl"
      :class="{ 'toolbar-expanded': isExpanded }"
    >


      <v-btn-group variant="text" class="toolbar-buttons">
        <v-btn
        icon="mdi-chevron-left"
        variant="text"
        @click="$emit('prev-day')"
        :title="'查看昨天'"
        class="toolbar-btn"
        v-ripple
      />
        <v-btn
          icon="mdi-format-font-size-decrease"
          variant="text"
          @click="$emit('zoom', 'out')"
          :title="'缩小字体'"
          class="toolbar-btn"
          v-ripple
        />
        <v-btn
          icon="mdi-format-font-size-increase"
          variant="text"
          @click="$emit('zoom', 'up')"
          :title="'放大字体'"
          class="toolbar-btn"
          v-ripple
        />
        <v-menu location="top" :close-on-content-click="false">
          <template #activator="{ props }">
            <v-btn
              icon="mdi-calendar"
              variant="text"
              v-bind="props"
              :title="'选择日期'"
              class="toolbar-btn"
              v-ripple
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
          icon="mdi-refresh"
          variant="text"
          :loading="loading"
          @click="$emit('refresh')"
          :title="'刷新数据'"
          class="toolbar-btn"
          v-ripple
        />

       <v-btn
        v-if="!isToday"
        icon="mdi-chevron-right"
        variant="text"
        @click="$emit('next-day')"
        :title="'查看明天'"
        class="toolbar-btn"
        v-ripple
      />
      </v-btn-group>


    </v-card>
  </v-slide-y-transition>
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
.floating-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
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
  padding: 0 0px;
}

.floating-toolbar:hover {
  transform: translateX(-50%) translateY(-4px);
  background: rgba(255, 255, 255, 0.8) !important;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: scale(1.05);
}

.toolbar-btn:active {
  transform: scale(0.95);
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
    width: 95%;
    padding: 2px;
  }

  .toolbar-buttons {
    width: 100%;
    justify-content: space-around;
    padding: 4px;
  }

  .toolbar-btn {
    margin: 0;
  }

  .nav-btn {
    margin: 0 2px;
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
}
</style>
