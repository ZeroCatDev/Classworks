<template>
  <!-- 侧边栏 -->
  <v-navigation-drawer
    v-model="drawer"
    location="right"
    temporary
    width="400"
  >
    <v-toolbar color="primary">
      <v-toolbar-title class="text-white">
        消息记录
        <v-chip
          v-if="unreadCount"
          color="error"
          size="small"
          class="ml-2"
        >
          {{ unreadCount }}
        </v-chip>
      </v-toolbar-title>
      <v-spacer />
      <v-btn
        icon="mdi-delete"
        variant="text"
        color="white"
        @click="clearMessages"
      />
    </v-toolbar>

    <v-list class="message-list">
      <template v-for="(msg, index) in visibleMessages" :key="msg.id">
        <v-list-item
          :class="{ 'unread': !msg.read }"
          class="message-item mb-2"
          @click="markAsRead(msg.id)"
        >
          <template #prepend>
            <v-icon
              :icon="getIcon(msg.type)"
              :color="getColor(msg.type)"
              size="small"
            />
          </template>

          <v-list-item-title>{{ msg.title }}</v-list-item-title>
          <v-list-item-subtitle v-if="msg.content">
            {{ msg.content }}
          </v-list-item-subtitle>
          <v-list-item-subtitle class="text-caption">
            {{ formatTime(msg.timestamp) }}
          </v-list-item-subtitle>

          <template #append>
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              @click.stop="deleteMessage(msg.id)"
            />
          </template>
        </v-list-item>
        <v-divider v-if="index < visibleMessages.length - 1" />
      </template>

      <v-btn
        v-if="hasMoreMessages"
        block
        variant="text"
        @click="loadMoreMessages"
      >
        加载更多
      </v-btn>
    </v-list>
  </v-navigation-drawer>

  <!-- 消息提示组 -->
  <div class="message-container">
    <TransitionGroup name="message">
      <v-alert
        v-for="msg in activeMessages"
        :key="msg.id"
        :type="msg.type"
        variant="tonal"
        closable
        class="message-alert mb-2"
        @click:close="removeActiveMessage(msg.id)"
      >
        <div class="d-flex align-center">
          <span class="font-weight-medium">{{ msg.title }}</span>
          <v-spacer />
          <span class="text-caption">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <div
          v-if="msg.content"
          class="message-content mt-1"
        >
          {{ msg.content }}
        </div>
      </v-alert>
    </TransitionGroup>
  </div>
</template>

<script>
import messageService from '@/utils/message';
import { getSetting } from '@/utils/settings';
import { debounce } from '@/utils/debounce';

export default {
  name: 'MessageLog',
  data: () => ({
    drawer: false,
    messages: [],
    activeMessages: [],
    unreadCount: 0,
    maxActiveMessages: getSetting('message.maxActiveMessages'),
    messageTimeout: getSetting('message.timeout'),
    showSidebar: getSetting('message.showSidebar'),
    saveHistory: getSetting('message.saveHistory'),
    pageSize: 20,
    currentPage: 1,
  }),

  computed: {
    visibleMessages() {
      return this.messages.slice(0, this.currentPage * this.pageSize);
    },
    hasMoreMessages() {
      return this.visibleMessages.length < this.messages.length;
    }
  },

  created() {
    this.debouncedUpdateMessages = debounce(this.updateMessages, 300);
  },

  mounted() {
    messageService.initialize();
    messageService.onSnackbar(this.showMessage);
    messageService.onLog(this.debouncedUpdateMessages);
  },

  methods: {
    loadMoreMessages() {
      this.currentPage++;
    },

    showMessage(message) {
      if (!this.showSidebar) return;

      this.activeMessages.unshift(message);
      if (this.activeMessages.length > this.maxActiveMessages) {
        this.activeMessages.pop();
      }

      setTimeout(() => {
        this.removeActiveMessage(message.id);
      }, this.messageTimeout);
    },

    removeActiveMessage(id) {
      const index = this.activeMessages.findIndex(m => m.id === id);
      if (index !== -1) {
        this.activeMessages.splice(index, 1);
      }
    },

    updateMessages(messages) {
      if (this.saveHistory) {
        this.messages = [...messages].reverse();
        this.unreadCount = messageService.getUnreadCount();
      }
    },

    markAsRead(id) {
      messageService.markAsRead(id);
    },

    deleteMessage(id) {
      messageService.deleteMessage(id);
    },

    clearMessages() {
      messageService.clearMessages();
      this.messages = [];
      this.activeMessages = [];
    },

    getIcon(type) {
      const icons = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information'
      };
      return icons[type] || icons.info;
    },

    getColor(type) {
      const colors = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'primary'
      };
      return colors[type] || colors.info;
    },

    formatTime: (() => {
      const cache = new Map();
      return (timestamp) => {
        if (cache.has(timestamp)) {
          return cache.get(timestamp);
        }
        const formatted = new Date(timestamp).toLocaleTimeString();
        cache.set(timestamp, formatted);
        return formatted;
      };
    })()
  }
};
</script>

<style scoped>
.message-container {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1000;
  max-width: 400px;
}

.message-alert {
  width: 100%;
}

.message-list {
  height: calc(100vh - 64px);
  overflow-y: auto;
  scroll-behavior: smooth;
  will-change: transform;
}

.message-item {
  border-left: 3px solid transparent;
  contain: content;
}

.message-item.unread {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

/* 消息动画 */
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.message-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
