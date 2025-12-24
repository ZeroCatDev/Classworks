<template>
  <div class="d-flex flex-wrap align-center mt-4">
    <v-btn
      v-if="!synced"
      :loading="loadingUpload"
      class="ml-2"
      color="error"
      size="large"
      @click="$emit('upload')"
    >
      上传
    </v-btn>
    <v-btn v-else color="success" size="large" @click="$emit('show-sync-message')">
      同步完成
    </v-btn>
    <v-btn
      v-if="showRandomPickerButton"
      append-icon="mdi-dice-multiple"
      class="ml-2"
      color="amber"
      prepend-icon="mdi-account-question"
      size="large"
      @click="$emit('open-random-picker')"
    >
      随机点名
    </v-btn>
    <v-btn-group
      v-if="showExamScheduleButton"
      class="ml-2"
      color="green"
      variant="elevated"
      divided
    >
      <v-btn
        prepend-icon="mdi-calendar-check"
        size="large"
        @click="$router.push('/examschedule')"
      >
        考试看板
      </v-btn>
      <v-btn
        icon="mdi-plus"
        size="large"
        @click="$emit('add-exam-card')"
      />
    </v-btn-group>
    <v-btn
      v-if="showListCardButton"
      class="ml-2"
      color="primary-darken-1"
      prepend-icon="mdi-list-box"
      size="large"
      @click="$router.push('/list')"
    >
      列表
    </v-btn>
    <v-btn
      v-if="showFullscreenButton"
      :color="isFullscreen ? 'blue-grey' : 'blue'"
      :prepend-icon="
        isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'
      "
      class="ml-2"
      size="large"
      @click="$emit('toggle-fullscreen')"
    >
      {{ isFullscreen ? "退出全屏" : "全屏显示" }}
    </v-btn>
    <v-btn
      v-if="showTestCardButton"
      class="ml-2"
      color="purple"
      prepend-icon="mdi-test-tube"
      size="large"
      @click="$emit('add-test-card')"
    >
      添加测试卡片
    </v-btn>
  </div>

  <v-card
    v-if="showAntiScreenBurnCard"
    border
    class="mt-4 anti-burn-card"
    color="primary"
    variant="tonal"
  >
    <v-card-title class="text-subtitle-1">
      <v-icon icon="mdi-shield-check" size="small" start />
      屏幕保护技术已启用
    </v-card-title>
    <v-card-text class="text-body-2">
      <p>
        为防止OLED/LCD屏幕烧屏，界面元素会定期微调位置。
      </p>
      <p class="text-caption text-grey">
        此功能不会影响正常使用，仅在长时间静止显示时生效。
      </p>
      <p class="text-caption text-grey">
        建议在放学后关闭显示器以节约能源。
      </p>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: "HomeActions",
  props: {
    synced: Boolean,
    loadingUpload: Boolean,
    showRandomPickerButton: Boolean,
    showExamScheduleButton: Boolean,
    showListCardButton: Boolean,
    showFullscreenButton: Boolean,
    isFullscreen: Boolean,
    showAntiScreenBurnCard: Boolean,
    showTestCardButton: Boolean,
  },
  emits: [
    "upload",
    "show-sync-message",
    "open-random-picker",
    "toggle-fullscreen",
    "add-test-card",
  ],
};
</script>
