<template>
  <v-snackbar
    v-model="snackbar"
    :color="colors[message?.type] || colors.info"
    :timeout="4000"
    location="bottom"
    class="global-snackbar"
    multi-line
  >
    <div class="d-flex align-center">
      <v-icon :icon="icons[message?.type] || icons.info" class="mr-2" />
      <div>
        <div class="text-subtitle-2 font-weight-medium">{{ message?.title }}</div>
        <div v-if="message?.content" class="text-body-2">{{ message?.content }}</div>
      </div>
    </div>
    <template #actions>
      <v-btn variant="text" icon="mdi-close" @click="snackbar = false" />
    </template>
  </v-snackbar>
</template>

<script>
import { defineComponent, ref, onBeforeUnmount } from 'vue';
import messageService from '@/utils/message';

export default defineComponent({
  name: 'GlobalMessage',
  setup() {
    const snackbar = ref(false);
    const message = ref(null);

    const icons = {
      success: 'mdi-check-circle',
      error: 'mdi-alert-circle',
      warning: 'mdi-alert',
      info: 'mdi-information'
    };

    const colors = {
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };

    const unsubscribe = messageService?.onSnackbar?.((msg) => {
      if (!msg) return;
      message.value = msg;
      snackbar.value = true;
    });

    onBeforeUnmount(() => unsubscribe?.());

    return { snackbar, message, icons, colors };
  }
});
</script>

<style scoped>
.global-snackbar {
  max-width: 400px;
  margin: 0 auto;
}
</style>
