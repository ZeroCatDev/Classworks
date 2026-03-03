<template>
  <!-- 纯 CSS 骨架屏，避免使用 VSkeletonLoader 引起的渲染冲突 -->
  <v-container class="main-window" fluid>
    <div class="skeleton-grid">
      <div
        v-for="n in cardCount"
        :key="n"
        class="skeleton-card"
      >
        <div class="skeleton-heading skeleton-pulse" />
        <div class="skeleton-line skeleton-pulse" />
        <div class="skeleton-line skeleton-line--short skeleton-pulse" />
      </div>
    </div>
    <div class="d-flex justify-center mt-6 ga-3">
      <div class="skeleton-btn skeleton-pulse" />
      <div class="skeleton-btn skeleton-pulse" />
    </div>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const cardCount = computed(() => mobile.value ? 3 : 6)
</script>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.skeleton-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
  border-radius: 12px;
  padding: 16px;
}
.skeleton-heading {
  height: 24px;
  width: 60%;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 4px;
  margin-bottom: 12px;
}
.skeleton-line {
  height: 14px;
  width: 100%;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 4px;
  margin-bottom: 8px;
}
.skeleton-line--short {
  width: 40%;
}
.skeleton-btn {
  height: 36px;
  width: 100px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}
.skeleton-pulse {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
