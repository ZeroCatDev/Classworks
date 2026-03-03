<template>
  <div class="async-loading-placeholder d-flex justify-center align-center" :style="{ minHeight: height }">
    <v-progress-circular indeterminate color="primary" size="28" width="2" />
  </div>
</template>

<script setup>
defineProps({
  height: {
    type: String,
    default: '120px'
  }
})
</script>

<style scoped>
.async-loading-placeholder {
  width: 100%;
  opacity: 0.6;
}
</style>
