<template>
  <div class="warning-container">
    <v-chip
      v-if="show"
      color="warning"
      size="small"
      class="warning-chip"
    >
      {{ message }}
    </v-chip>
  </div>
</template>

<script>
export default {
  name: 'UnsavedWarning',
  props: {
    show: Boolean,
    message: {
      type: String,
      default: '未保存'
    }
  }
}
</script>

<style scoped>
.warning-container {
  display: inline-block;
  margin-right: 8px;
}

.warning-chip {
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
