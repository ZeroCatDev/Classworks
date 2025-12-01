<template>
  <v-navigation-drawer v-if="drawer" v-model="drawer" location="right" temporary width="400">
    <v-toolbar color="primary">
      <v-toolbar-title>消息记录</v-toolbar-title>

    </v-toolbar>

    <v-list>
      <v-list-item v-for="msg in messages" :key="msg.id" rounded>
        <template #prepend>
          <v-icon :color="colors[msg.type]" :icon="icons[msg.type]" size="20"/>
        </template>

        <v-list-item-title>{{ msg.title }}</v-list-item-title>
        <v-list-item-subtitle v-if="msg.content">{{
          msg.content
          }}
        </v-list-item-subtitle>
        <span class="text-caption text-grey">
          {{ new Date(msg.timestamp).toLocaleTimeString() }}
        </span>


      </v-list-item>

      <v-list-item v-if="!messages.length">
        <template #prepend>
          <v-icon color="grey" icon="mdi-inbox"/>
        </template>
        <v-list-item-title class="text-grey">暂无消息</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
import {defineComponent, ref} from "vue";
import messageService from "@/utils/message";

export default defineComponent({
  name: "MessageLog",
  setup() {
    const drawer = ref(false);
    const messages = ref([]);

    const icons = {
      success: "mdi-check-circle",
      error: "mdi-alert-circle",
      warning: "mdi-alert",
      info: "mdi-information",
    };

    const colors = {
      success: "success",
      error: "error",
      warning: "warning",
      info: "primary",
    };

    messageService.onLog((msgs) => {
      if (msgs) {
        messages.value = msgs;
      }
    });

    return {
      drawer,
      messages,
      icons,
      colors,
      deleteMessage: (id) => messageService.deleteMessage(id),
      clearMessages: () => messageService.clearMessages(),
    };
  },
});
</script>
