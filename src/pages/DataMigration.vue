<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <v-icon
            size="x-large"
            color="primary"
            class="mr-3"
          >
            mdi-database-sync
          </v-icon>
          <div>
            <h1 class="text-h4">
              数据迁移工具
            </h1>
            <div class="text-subtitle-1 text-grey">
              将现有数据迁移至 KV 存储系统
            </div>
          </div>
        </div>

        <v-card
          class="mb-6"
          variant="tonal"
          color="info"
        >
          <v-card-text class="d-flex align-center">
            <v-icon
              color="info"
              class="mr-2"
            >
              mdi-information-outline
            </v-icon>
            <span>
              使用此工具可以将数据从旧存储系统迁移到新的 KV 存储系统，选择本地或云端迁移，以确保数据不会丢失。
            </span>
          </v-card-text>
        </v-card>

        <MigrationTool ref="migrationTool" />
      </v-col>
    </v-row>

    <!-- 一键迁移对话框 -->
    <v-dialog
      v-model="showMigrationDialog"
      max-width="500"
      persistent
    >
      <v-card>
        <v-card-title class="text-h5 d-flex align-center">
          <v-icon
            color="primary"
            size="large"
            class="mr-3"
          >
            mdi-database-sync
          </v-icon>
          一键数据迁移
        </v-card-title>
        <v-card-text class="mt-4">
          <p>
            系统将自动读取您的配置，并将过去半年的数据迁移至Classworks
            KV数据库中
          </p>

          <v-alert
            color="info"
            variant="tonal"
            class="mt-4"
            icon="mdi-information-outline"
          >
            <ul class="ml-3 mt-1">
              <li>数据源: {{ dataSourceText }}</li>
              <li>班级: {{ classNumber }}</li>
              <li>服务器: {{ serverDomain || "本地存储" }}</li>
              <li>
                迁移范围: {{ formatDate(sixMonthsAgo) }} 至
                {{ formatDate(today) }}
              </li>
            </ul>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="showMigrationDialog = false"
          >
            稍后再说
          </v-btn>
          <v-btn
            color="primary"
            size="large"
            variant="elevated"
            :loading="isAutoMigrating"
            :disabled="isAutoMigrating"
            @click="startAutoMigration"
          >
            <v-icon
              left
              class="mr-2"
            >
              mdi-database-export
            </v-icon>
            开始一键迁移
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import MigrationTool from "@/components/MigrationTool.vue";
import { getSetting, setSetting } from "@/utils/settings";

export default {
  name: "DataMigrationPage",
  components: {
    MigrationTool,
  },
  data() {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 3);

    return {
      showMigrationDialog: false,
      isAutoMigrating: false,
      today,
      sixMonthsAgo,
      classNumber: "",
      serverDomain: "",
      dataProvider: "",
    };
  },
  computed: {
    dataSourceText() {
      switch (this.dataProvider) {
        case "server":
          return "服务器";
        case "indexeddb":
          return "本地数据库";
        case "kv-local":
          return "本地 KV 存储";
        case "kv-server":
          return "远程 KV 存储";
        case "classworkscloud":
          return "Classworks 云";
        default:
          return "未知来源";
      }
    },
  },
  async mounted() {
    this.loadSettings();
    if (this.serverDomain == "https://class.wuyuan.dev") {
      await this.startAutoMigration();
      this.$router.push("/");
    }
  },
  methods: {
    loadSettings() {
      this.classNumber = getSetting("server.classNumber");
      this.serverDomain = getSetting("server.domain");
      this.dataProvider = getSetting("server.provider");

      this.showMigrationDialog =
        this.dataProvider === "server" || this.dataProvider === "indexeddb";
    },
    formatDate(date) {
      return date.toLocaleDateString();
    },
    async startAutoMigration() {
      if (!this.$refs.migrationTool) {
        console.error("MigrationTool组件引用不可用");
        return;
      }

      this.isAutoMigrating = true;

      try {
        // 设置迁移工具的参数
        const migrationTool = this.$refs.migrationTool;
        migrationTool.classNumber = this.classNumber;
        migrationTool.migrationType =
          this.dataProvider === "server" ? "server" : "local";
        migrationTool.serverUrl = this.serverDomain;
        migrationTool.targetStorage = "kv-server";
        //migrationTool.targetServerUrl = this.serverDomain;

        // 设置半年的日期范围
        migrationTool.startDate = this.formatDateString(this.sixMonthsAgo);
        migrationTool.endDate = this.formatDateString(this.today);

        // 根据数据源类型进行相应操作
        if (this.dataProvider === "server") {
          // 预览服务器数据
          await migrationTool.previewServerData();
        } else {
          // 扫描本地数据库
          await migrationTool.scanLocalDatabase();
        }

        // 开始迁移
        if (migrationTool.displayItems.length > 0) {
          await migrationTool.startMigration();
        } else {
          console.warn("没有找到可迁移的数据");
        }
        setSetting("server.provider", "classworkscloud");
      } catch (error) {
        console.error("自动迁移失败:", error);
      } finally {
        this.isAutoMigrating = false;
        this.showMigrationDialog = false;
      }
    },
    formatDateString(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
  },
  metaInfo: {
    title: "数据迁移工具",
  },
};
</script>
