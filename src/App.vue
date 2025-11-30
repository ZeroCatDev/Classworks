<template>
  <v-app>
    <!-- 正常路由 -->
    <router-view v-slot="{ Component, route }">
      <transition mode="out-in" name="md3">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
    <global-message />
    <rate-limit-modal />
  </v-app>
</template>

<script setup>
import { onMounted } from "vue";
import { useTheme } from "vuetify";
import { getSetting } from "@/utils/settings";
import RateLimitModal from "@/components/RateLimitModal.vue";
import Clarity from "@microsoft/clarity";
import { getVisitorId } from "@/utils/fingerprint";

const theme = useTheme();

onMounted(async () => {
  // 应用保存的主题设置
  const savedTheme = getSetting("theme.mode");
  theme.global.name.value = savedTheme;

  const visitorId = await getVisitorId();
  console.log("Visitor ID:", visitorId);
  // Clarity 标识（保留在 App 层）
  Clarity.identify(visitorId);
  Clarity.setTag("fingerprintjs", visitorId);
});
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
