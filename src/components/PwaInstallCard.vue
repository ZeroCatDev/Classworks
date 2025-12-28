<template>
  <v-card
    v-if="showCard"
    class="mb-4"
    color="surface-variant"
    variant="tonal"
  >
    <div class="d-flex flex-no-wrap justify-space-between">
      <div class="pe-4">
        <v-card-title class="text-h6">
          安装应用与授权
        </v-card-title>

        <v-card-subtitle class="pb-1">
          手动点选下方项目请求安装和权限，也可以直接关闭
        </v-card-subtitle>

        <v-card-text class="pt-0 pb-1">
          <v-list density="comfortable" lines="two">
            <v-list-item
              v-for="item in chipList"
              :key="item.key"
              :disabled="isRequesting"
              @click="() => handleSingleRequest(item.key)"
            >
              <template #prepend>
                <v-avatar :color="chipColors[item.status]" size="32" variant="tonal">
                  <v-icon :icon="statusIcons[item.status]"></v-icon>
                </v-avatar>
              </template>

              <v-list-item-title>{{ item.label }}</v-list-item-title>
              <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>

              <template #append>
                <v-chip :color="chipColors[item.status]" size="small" variant="tonal" class="me-2">
                  {{ statusText[item.status] }}
                </v-chip>
                <v-btn
                  variant="text"
                  icon="mdi-information"
                  size="small"
                  :disabled="isRequesting"
                  @click.stop="() => openHelp(item.key)"
                ></v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-btn
            class="ms-2"
            variant="outlined"
            size="small"
            @click="dismiss"
          >
            关闭
          </v-btn>
          <v-btn
            class="ms-2"
            variant="elevated"
            color="primary"
            size="small"
            :prepend-icon="isRequesting ? 'mdi-timer-sand' : 'mdi-shield-check'"
            :disabled="!hasPendingRequests || isRequesting"
            @click="handleRequest"
          >
            {{ isRequesting ? "处理中" : "一次处理全部" }}
          </v-btn>
        </v-card-actions>
      </div>

      <v-avatar
        class="ma-3"
        size="100"
        rounded="0"
      >
        <v-icon icon="mdi-monitor-cellphone" size="80"></v-icon>
      </v-avatar>
    </div>

    <v-dialog v-model="helpDialog" max-width="520">
      <v-card>
        <v-card-title class="text-h6">{{ helpContent.title }}</v-card-title>
        <v-card-text>
          <p class="mb-3">{{ helpContent.message }}</p>
          <v-list density="comfortable">
            <v-list-item
              v-for="(link, index) in helpContent.links"
              :key="index"
              :href="link.href"
              target="_blank"
              rel="noopener"
            >
              <v-list-item-title>{{ link.text }}</v-list-item-title>
              <v-list-item-subtitle>{{ link.desc }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="helpDialog = false">我知道了</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { getSetting, setSetting, requestNotificationPermission, requestPersistentStorage } from "@/utils/settings";

const showCard = ref(false);
const isRequesting = ref(false);
const helpDialog = ref(false);
const helpContent = reactive({
  title: "",
  message: "",
  links: [],
});

const statusText = {
  pending: "待授权",
  granted: "已完成",
  denied: "已拒绝",
  unavailable: "不可用",
};

const statusIcons = {
  pending: "mdi-progress-clock",
  granted: "mdi-check-circle",
  denied: "mdi-close-circle",
  unavailable: "mdi-help-circle",
};

const chipColors = {
  pending: "primary",
  granted: "success",
  denied: "error",
  unavailable: "surface-variant",
};

const permissionStates = reactive({
  pwa: { label: "安装应用", description: "将网站安装为独立应用，便于快速启动", status: "pending" },
  notification: { label: "通知权限", description: "允许接收作业、考试等通知提醒", status: "pending" },
  storage: { label: "离线存储", description: "启用持久化存储以获得更稳健的离线体验", status: "pending" },
});

const chipList = computed(() => [
  { key: "pwa", ...permissionStates.pwa },
  { key: "notification", ...permissionStates.notification },
  { key: "storage", ...permissionStates.storage },
]);

const hasPendingRequests = computed(() => chipList.value.some((item) => item.status === "pending"));

const helpLinks = {
  pwa: [
    {
      text: "MDN - 安装 PWA 指南",
      desc: "检查浏览器是否支持并手动触发安装",
      href: "https://developer.mozilla.org/zh-CN/docs/Web/Progressive_web_apps/Guides/Installing",
    },
    {
      text: "Microsoft Edge - PWA 体验",
      desc: "Edge 浏览器安装与 UX 说明",
      href: "https://learn.microsoft.com/zh-cn/microsoft-edge/progressive-web-apps/ux",
    },
  ],
  notification: [
    {
      text: "MDN - 通知权限与用法",
      desc: "浏览器通知权限的工作方式与调试",
      href: "https://developer.mozilla.org/zh-CN/docs/Web/API/notification",
    },
  ],
  storage: [
    {
      text: "MDN - Storage 持久化说明",
      desc: "了解持久化存储的可用性与申请方式",
      href: "https://developer.mozilla.org/zh-CN/docs/Web/API/StorageManager/persist",
    },
  ],
};

let displayModeMedia;

const refreshStates = async () => {
  const hideCard = getSetting("pwa.hideInstallCard");
  if (hideCard) {
    showCard.value = false;
    return;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    permissionStates.pwa.status = "granted";
  } else if (window.deferredPwaPrompt) {
    permissionStates.pwa.status = "pending";
  } else {
    // 仍标记为待处理，允许点击后给出指导
    permissionStates.pwa.status = "pending";
  }

  if (typeof Notification === "undefined") {
    permissionStates.notification.status = "unavailable";
  } else {
    const current = Notification.permission;
    permissionStates.notification.status = current === "granted"
      ? "granted"
      : current === "denied"
        ? "denied"
        : "pending";
  }

  if (navigator.storage?.persisted) {
    const persisted = await navigator.storage.persisted();
    permissionStates.storage.status = persisted ? "granted" : "pending";
  } else {
    permissionStates.storage.status = "unavailable";
  }

  const stillNeedAction = chipList.value.some((item) => item.status !== "granted");
  showCard.value = stillNeedAction;
};

const requestPwaInstall = async () => {
  const promptEvent = window.deferredPwaPrompt;
  if (!promptEvent) {
    permissionStates.pwa.status = "pending";
    openHelp("pwa", "浏览器没有提供安装提示，可按文档手动安装。");
    return;
  }

  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;

  permissionStates.pwa.status = outcome === "accepted" ? "granted" : "denied";
  if (outcome !== "accepted") {
    openHelp("pwa", "如果未出现安装弹窗，或被拒绝，请按说明手动安装。");
  }
  window.deferredPwaPrompt = null;
};

const requestNotification = async () => {
  if (typeof Notification === "undefined") {
    permissionStates.notification.status = "unavailable";
    openHelp("notification", "当前环境不支持通知 API，可查看说明手动开启或更换浏览器。");
    return;
  }

  const granted = await requestNotificationPermission();
  permissionStates.notification.status = granted ? "granted" : "denied";
  if (!granted) {
    openHelp("notification", "通知请求未被授予，请按说明检查浏览器或系统设置。");
  }
};

const requestStorage = async () => {
  if (!navigator.storage?.persist) {
    permissionStates.storage.status = "unavailable";
    openHelp("storage", "当前浏览器不支持持久化存储，可查看说明或更换浏览器。");
    return;
  }

  const persisted = await requestPersistentStorage();
  permissionStates.storage.status = persisted ? "granted" : "denied";
  if (!persisted) {
    openHelp("storage", "未能启用持久化存储，可按说明检查浏览器或系统设置。");
  }
};

const handleRequest = async () => {
  if (!hasPendingRequests.value || isRequesting.value) return;
  isRequesting.value = true;

  try {
    await requestPwaInstall();
    await requestNotification();
    await requestStorage();
  } finally {
    isRequesting.value = false;
    await refreshStates();
  }
};

const handleSingleRequest = async (key) => {
  if (isRequesting.value) return;
  isRequesting.value = true;
  try {
    if (key === "pwa") {
      await requestPwaInstall();
    } else if (key === "notification") {
      await requestNotification();
    } else if (key === "storage") {
      await requestStorage();
    }
  } finally {
    isRequesting.value = false;
    await refreshStates();
  }
};

const openHelp = (key, message = "") => {
  if (key === "pwa") {
    helpContent.title = "如何安装为应用";
  } else if (key === "notification") {
    helpContent.title = "如何开启通知";
  } else {
    helpContent.title = "如何启用离线存储";
  }

  helpContent.message = message || "查看以下步骤获取更多说明。";
  helpContent.links = helpLinks[key] || [];
  helpDialog.value = true;
};

const dismiss = () => {
  setSetting("pwa.hideInstallCard", true);
  showCard.value = false;
};

const onPromptReady = () => {
  if (permissionStates.pwa.status !== "granted") {
    permissionStates.pwa.status = "pending";
  }
  refreshStates();
};

const onDisplayModeChange = () => {
  refreshStates();
};

onMounted(() => {
  refreshStates();
  window.addEventListener('pwa-prompt-ready', onPromptReady);
  displayModeMedia = window.matchMedia('(display-mode: standalone)');
  displayModeMedia.addEventListener('change', onDisplayModeChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('pwa-prompt-ready', onPromptReady);
  if (displayModeMedia) {
    displayModeMedia.removeEventListener('change', onDisplayModeChange);
  }
});
</script>
