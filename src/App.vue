<template>
  <v-app>
    <router-view v-slot="{ Component, route }">
      <transition name="md3" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
    <global-message />
    <rate-limit-modal />
  </v-app>
</template>

<script setup>
import { onMounted, watch } from "vue";
import { useTheme } from "vuetify";
import { getSetting } from "@/utils/settings";
import { useRouter, useRoute } from "vue-router";
import RateLimitModal from "@/components/RateLimitModal.vue";
import Clarity from "@microsoft/clarity";
import { kvServerProvider } from '@/utils/providers/kvServerProvider';

const theme = useTheme();
const router = useRouter();
const route = useRoute();

onMounted(async () => {
  // 应用保存的主题设置
  const savedTheme = getSetting("theme.mode");
  theme.global.name.value = savedTheme;

  // 检查存储提供者类型
  checkProviderType();
  Clarity.identify(getSetting("device.uuid"), getSetting("server.domain"), getSetting("server.provider"), getSetting("server.classNumber")); // only custom-id is required

  // 如果使用KV服务器，加载命名空间信息
  const provider = getSetting('server.provider');
  if (provider === 'kv-server' || provider === 'classworkscloud') {
    try {
      await kvServerProvider.loadNamespaceInfo();
    } catch (error) {
      console.error('加载命名空间信息失败:', error);
    }
  }
});

// 检查存储提供者类型，如果是已废弃的类型则重定向
function checkProviderType() {
  const currentProvider = getSetting("server.provider");

  // 如果是旧的提供者类型且当前不在迁移页面，则重定向到数据迁移页面
  if (
    (currentProvider === "server" || currentProvider === "indexedDB") &&
    route.path !== "/datamigration"
  ) {
    console.log("检测到旧的数据提供者类型，正在重定向到数据迁移页面...");
    router.push({
      path: "/datamigration",
      query: {
        reason: "legacy_provider",
        provider: currentProvider,
      },
    });
  }
}

// 当路由变化时再次检查，确保用户不会绕过重定向
watch(
  () => route.path,
  (newPath) => {
    if (newPath !== "/datamigration") {
      checkProviderType();
    }
  }
);
</script>
<style>
.md3-enter-active,
.md3-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.md3-enter-from {
  opacity: 0;
  transform: translateX(0.5vw);
}

.md3-leave-to {
  opacity: 0;
  transform: translateX(-0.5vw);
}
</style>
