<template>
  <v-slide-x-transition>
    <v-card
      class="floating-icp"
      elevation="2"
      rounded="pill"
      variant="tonal"
      color="surface-variant"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <v-btn
        variant="text"
        class="icp-button"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <v-icon
          icon="mdi-shield-check"
          size="small"
          :class="{ 'rotate-icon': isHovered }"
          class="mr-1"
        />
        <span class="text-caption">浙ICP备2024068645号</span>
      </v-btn>
    </v-card>
  </v-slide-x-transition>
</template>

<script>
export default {
  name: 'FloatingICP',
  data() {
    return {
      isHovered: false
    }
  }
}
</script>

<style scoped>
.floating-icp {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.floating-icp:hover {
  transform: translateX(-4px);
}

.icp-button {
  padding: 0 16px;
  height: 32px;
  min-width: unset;
}

.rotate-icon {
  transform: rotate(360deg);
  transition: transform 0.6s ease;
}

@media (max-width: 600px) {
  .floating-icp {
    right: 16px;
    bottom: 80px; /* 避免与其他悬浮组件重叠 */
  }

  .icp-button {
    padding: 0 12px;
  }
}
</style>