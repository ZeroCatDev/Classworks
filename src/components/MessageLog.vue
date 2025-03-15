<template>
  <v-navigation-drawer v-model="drawer" location="right" temporary width="400">
    <v-toolbar color="primary">
      <v-toolbar-title>
        消息记录
        <v-chip v-if="unreadCount" color="error" size="x-small" class="ml-2">
          {{ unreadCount }}
        </v-chip>
      </v-toolbar-title>
      <template #append>
        <v-btn icon="mdi-delete" variant="text" color="white" @click="clear" />
      </template>
    </v-toolbar>

    <v-list class="pa-4">
      <template v-if="visibleMessages.length">
        <v-slide-y-transition group>
          <v-list-item
            v-for="msg in visibleMessages"
            :key="msg.id"
            :active="!msg.read"
            class="mb-3"
            rounded
            @click="markAsRead(msg.id)"
          >
            <template #prepend>
              <v-icon :icon="icons[msg.type]" :color="colors[msg.type]" size="20" />
            </template>

            <div class="d-flex flex-column flex-grow-1 px-3">
              <v-list-item-title>{{ msg.title }}</v-list-item-title>
              <v-list-item-subtitle v-if="msg.content">{{ msg.content }}</v-list-item-subtitle>
              <span class="text-caption text-grey">{{ new Date(msg.timestamp).toLocaleTimeString() }}</span>
            </div>

            <template #append>
              <v-btn icon="mdi-delete" variant="text" size="small" @click.stop="deleteMessage(msg.id)" />
            </template>
          </v-list-item>
        </v-slide-y-transition>

        <v-btn v-if="hasMore" variant="tonal" block class="mt-4" @click="loadMore">
          加载更多
        </v-btn>
      </template>
      <v-list-item v-else>
        <template #prepend>
          <v-icon icon="mdi-inbox" color="grey" />
        </template>
        <v-list-item-title class="text-grey">暂无消息</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
import { defineComponent, ref, computed, onBeforeUnmount } from 'vue';
import messageService from '@/utils/message';

export default defineComponent({
  name: 'MessageLog',
  setup() {
    const drawer = ref(false);
    const messages = ref([]);
    const unreadCount = ref(0);
    const page = ref(1);
    const PAGE_SIZE = 20;

    const visibleMessages = computed(() => messages.value.slice(0, page.value * PAGE_SIZE));
    const hasMore = computed(() => visibleMessages.value.length < messages.value.length);

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
      info: 'primary'
    };

    const unsubscribe = messageService?.onLog?.(msgs => {
      if (!msgs) return;
      messages.value = msgs.reverse();
      unreadCount.value = messageService.getUnreadCount();
    });

    onBeforeUnmount(() => unsubscribe?.());

    return {
      drawer,
      unreadCount,
      visibleMessages,
      hasMore,
      icons,
      colors,
      loadMore: () => page.value++,
      markAsRead: id => messageService?.markAsRead?.(id),
      deleteMessage: id => messageService?.deleteMessage?.(id),
      clear: () => {
        messageService?.clearMessages?.();
        messages.value = [];
      }
    };
  }
});
</script>
