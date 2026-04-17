<template>
  <v-app :style="vAppStyle">
    <!-- 自定义背景层 -->
    <template v-if="bgEnabled">
      <div
        class="app-background-image"
        :style="bgImageStyle"
      />
      <div
        class="app-background-overlay"
        :style="bgOverlayStyle"
      />
    </template>

    <!-- 正常路由 -->
    <router-view v-slot="{ Component, route }">
      <transition
        mode="out-in"
        name="md3"
      >
        <component
          :is="Component"
          :key="route.path"
        />
      </transition>
    </router-view>
    <global-message />
    <rate-limit-modal />
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useTheme } from "vuetify";
import { getSetting, watchSettings } from "@/utils/settings";
import RateLimitModal from "@/components/RateLimitModal.vue";

const theme = useTheme();

// Background reactive refs
const bgEnabled = ref(false);
const bgSrc = ref("");
const bgBlur = ref(10);
const bgOpacity = ref(30);

function loadBgSettings() {
  bgEnabled.value = getSetting("background.enabled") || false;
  const imageData = getSetting("background.imageData") || "";
  const url = getSetting("background.url") || "";
  bgSrc.value = imageData || url;
  bgBlur.value = getSetting("background.blur") ?? 10;
  bgOpacity.value = getSetting("background.opacity") ?? 30;
}

const vAppStyle = computed(() => {
  if (!bgEnabled.value || !bgSrc.value) return {};
  return { background: "transparent" };
});

const bgImageStyle = computed(() => ({
  backgroundImage: `url(${bgSrc.value})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  filter: `blur(${bgBlur.value}px)`,
  // Scale slightly to hide blur edge artifacts
  transform: "scale(1.05)",
}));

const bgOverlayStyle = computed(() => ({
  background: `rgba(0, 0, 0, ${bgOpacity.value / 100})`,
}));

let unwatchSettings = null;

onMounted(() => {
  // 应用保存的主题设置
  const savedTheme = getSetting("theme.mode");
  theme.global.name.value = savedTheme;

  loadBgSettings();

  unwatchSettings = watchSettings((_, event) => {
    // If event detail is available (same-tab change), only reload on background keys
    const changedKey = event?.detail?.key;
    if (!changedKey || changedKey.startsWith("background.") || changedKey === "theme.mode") {
      loadBgSettings();
      theme.global.name.value = getSetting("theme.mode");
    }
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPwaPrompt = e;
    window.dispatchEvent(new Event('pwa-prompt-ready'));
  });
});

onUnmounted(() => {
  if (unwatchSettings) unwatchSettings();
});
</script>
<style>
/* 全局样式（从 index.vue 迁移，确保全局可用且仅加载一次） */
@import "@/styles/index.scss";
@import "@/styles/transitions.scss";
@import "@/styles/global.scss";

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

/* 自定义背景层 */
.app-background-image,
.app-background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
}

.app-background-image {
  transform-origin: center center;
  will-change: transform, filter;
}
</style>
