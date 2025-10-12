<template>
  <v-alert
    v-if="error"
    type="error"
    variant="tonal"
    border="start"
    class="mb-4"
    closable
    @click:close="error = ''"
  >
    {{ error }}
  </v-alert>

  <v-skeleton-loader v-if="loading" type="article" />

  <div v-else-if="!config">
    <v-alert type="warning" variant="tonal" border="start">
      缺少配置，请通过 URL 参数 id 或 url 传入配置。
    </v-alert>
  </div>

  <div v-else>
    <div class="player" ref="playerRef">
      <ExamPlayer
        v-model:room-number="roomNumberLocal"
        :exam-config="config"
        :config="playerConfigObj"
        :show-action-bar="true"
        :time-sync-status="'电脑时间'"
        @exit="exit()"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import dataProvider from "@/utils/dataProvider";
import { ExamPlayer } from "@examaware-cs/player";

export default {
  name: "ExamPlayerPage",
  components: { ExamPlayer },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(true);
    const error = ref("");
    const config = ref(null);

    // 播放器配置：支持从查询参数读取考场号
    const roomNumber = computed(() => {
      return (route.query.roomNumber || route.query.room || "01") + "";
    });
    const roomNumberLocal = ref(roomNumber.value);
    const playerConfigObj = computed(() => ({
      roomNumber: roomNumberLocal.value,
      timeSync: true,
      refreshInterval: 1000,
      fullscreen: false,
    }));

    async function loadConfig() {
      loading.value = true;
      error.value = "";
      config.value = null;
      try {
        const url = route.query.url || route.query.configUrl;
        const id = route.query.id;

        if (url) {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error("拉取配置失败: " + resp.status);
          const json = await resp.json();
          config.value = normalizeConfig(json);
        } else if (id) {
          const data = await dataProvider.loadData(`es_${id}`);
          if (!data) throw new Error("未找到该配置");
          config.value = normalizeConfig(data);
        } else {
          // 没有参数
          config.value = null;
        }
        // ExamPlayer 组件会自行响应传入的 exam-config
      } catch (e) {
        error.value = e?.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    function exit() {
      // 返回上一页
      router.push("/");
    }

    function normalizeConfig(raw) {
      // 保障字段存在与正确类型
      return {
        examName: raw?.examName || "未命名考试",
        message: raw?.message || "",
        // ExamAware 需要 examInfos: { name, start, end, alertTime? }
        examInfos: Array.isArray(raw?.examInfos)
          ? raw.examInfos.map((i) => ({
              name: i?.name || "未命名科目",
              start: i?.start || "",
              end: i?.end || "",
              alertTime: typeof i?.alertTime === "number" ? i.alertTime : 15,
            }))
          : [],
      };
    }

    onMounted(loadConfig);
    watch(
      () => [
        route.query.id,
        route.query.url,
        route.query.configUrl,
        route.query.room,
        route.query.roomNumber,
      ],
      loadConfig
    );
    watch(roomNumber, (v) => {
      roomNumberLocal.value = v;
    });

    return {
      loading,
      error,
      config,
      roomNumberLocal,
      playerConfigObj,
      exit,
    };
  },
};
</script>
<style scoped>
/* 自定义字体定义 */
@font-face {
  font-family: "TCloudNumber";
  src: url("../assets/fonts/TCloudNumberVF.ttf") format("truetype-variations"),
    url("../assets/fonts/TCloudNumberVF.ttf") format("truetype");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: "MiSans", MiSans, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans",
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

/* 设置主题为深色 */
html {
  color-scheme: dark;
}

body {
  background-color: var(--td-bg-color-page, #0a0a0a);
  color: var(--td-text-color-primary, #ffffff);
}

/* 通用样式 */
* {
  box-sizing: border-box;
  font-family: inherit;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0;
  font-weight: 500;
}

p {
  margin: 0;
}

/* 确保 TDesign 组件样式正常工作 */
.t-button {
  font-family: inherit;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--td-bg-color-container, #1a1a1a);
}

::-webkit-scrollbar-thumb {
  background: var(--td-bg-color-component, #333333);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--td-bg-color-component-hover, #444444);
}
</style>
