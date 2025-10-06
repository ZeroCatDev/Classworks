<template>
  <div>
    <v-dialog
      v-model="visible"
      persistent
      transition="dialog-bottom-transition"
    >
      <v-card
        class="kvinit-card"
        elevation="8"
        title="初始化云端存储授权"
        subtitle="请完成授权以启用云端存储功能"
        prepend-icon="mdi-cloud-lock"
      >
        <v-card-actions class="justify-end">
          <v-btn
            text
            class="me-3"
            @click="useLocalMode"
          >
            使用本地模式
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="loading"
            @click="goToAuthorize"
          >
            前往授权
          </v-btn>
        </v-card-actions>
        <div class="d-flex align-center justify-space-between">
          <div>
            <div
              v-if="loading"
              class="d-flex align-center"
            >
              <v-progress-circular
                indeterminate
                size="20"
                width="2"
                class="me-2"
              />
              <span class="body-2"> 正在检查授权状态… </span>
            </div>
            <div
              v-else-if="error"
              class="body-2 text-error"
            >
              检查出错：{{ error }}
            </div>
          </div>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { getSetting,setSetting } from "@/utils/settings";
import { kvServerProvider } from "@/utils/providers/kvServerProvider";

const visible = ref(false);
const loading = ref(false);
const error = ref("");
const route = useRoute();

// allow external components to reopen the dialog via an event
const onExternalOpen = () => {
  visible.value = true;
};

// Guard key to avoid infinite redirect loops across reloads
const REDIRECT_GUARD_KEY = "kvinit.redirecting";

const isKvProvider = (provider) =>
  provider === "kv-server" || provider === "classworkscloud";

const shouldInitialize = () => {
  const provider = getSetting("server.provider");
  if (!isKvProvider(provider)) return false;
  if (route.path === "/authorize") return false; // don't run during callback
  const kvToken = getSetting("server.kvToken");
  return kvToken === "" || kvToken == null;
};

const goToAuthorize = () => {
  const authDomain = getSetting("server.authDomain");
  const appId = "d158067f53627d2b98babe8bffd2fd7d";
  const currentDomain = window.location.origin;
  const callbackUrl = encodeURIComponent(`${currentDomain}/authorize`);

  const uuid =
    getSetting("device.uuid") || "00000000-0000-4000-8000-000000000000";
  let authorizeUrl = `${authDomain}/authorize?app_id=${appId}&mode=callback&callback_url=${callbackUrl}`;

  // 如果UUID不是默认值，附加编码后的 uuid 参数用于迁移
  if (uuid !== "00000000-0000-4000-8000-000000000000") {
    authorizeUrl += `&uuid=${encodeURIComponent(uuid)}`;
  }

  // set a short-lived guard to prevent immediate re-redirect
  try {
    const guardObj = { ts: Date.now() };
    sessionStorage.setItem(REDIRECT_GUARD_KEY, JSON.stringify(guardObj));
  } catch (err) {
    // sessionStorage may be unavailable in some environments
    console.debug("sessionStorage set failed", err);
  }

  window.location.href = authorizeUrl;
};

const tryLoadNamespace = async () => {
  try {
    await kvServerProvider.loadNamespaceInfo();
  } catch (err) {
    console.error("加载命名空间信息失败:", err);
    // not fatal, show non-blocking error
    error.value = err && err.message ? err.message : String(err);
  }
};
const useLocalMode = () => {
  // Switch to local provider and hide dialog
  setSetting("server.provider", "kv-local");
  visible.value = false;
  // Reload to let app re-evaluate
  location.reload();
};
onMounted(async () => {
  const provider = getSetting("server.provider");

  // If not using kv provider, hide component immediately
  if (!isKvProvider(provider)) {
    visible.value = false;
    return;
  }

  // First try loading namespace info (safe operation) so the app can continue if already authorized
  loading.value = true;
  await tryLoadNamespace();
  loading.value = false;

  // Decide whether we must show initialization UI / redirect
  if (shouldInitialize()) {
    // If there's a guard in sessionStorage and it's recent, don't auto-redirect to avoid loops
    let guarded = false;
    try {
      const raw = sessionStorage.getItem(REDIRECT_GUARD_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        // guard valid for 30 seconds
        if (obj && obj.ts && Date.now() - obj.ts < 30000) guarded = true;
      }
    } catch (err) {
      // ignore parse errors but log for debugging
      console.debug("sessionStorage parse guard failed", err);
    }

    visible.value = true;
    // Only auto-redirect if UUID is non-default (we have a device to migrate)
    const uuid =
      getSetting("device.uuid") || "00000000-0000-4000-8000-000000000000";
    const isDefaultUuid = uuid === "00000000-0000-4000-8000-000000000000";

    if (!guarded && !isDefaultUuid) {
      // auto-redirect to authorize for better UX
      goToAuthorize();
    } else {
      // if guarded or uuid is default, stay on the init UI and let user click button
      // clear guard so subsequent attempts can redirect
      try {
        sessionStorage.removeItem(REDIRECT_GUARD_KEY);
      } catch (err) {
        console.debug("sessionStorage remove failed", err);
      }
    }
  } else {
    // not initializing: hide component
    visible.value = false;
  }
});
// add/remove listener in lifecycle hooks
if (typeof window !== "undefined") {
  window.addEventListener('kvinit:open', onExternalOpen);
}

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener('kvinit:open', onExternalOpen);
  }
});
</script>
