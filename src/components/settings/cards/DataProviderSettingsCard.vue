<template>
  <settings-card
    icon="mdi-database-cog"
    title="数据源设置"
  >
    <v-list>
      <!-- 服务器模式设置 -->
      <template
        v-if="
          currentProvider === 'kv-server' ||
            currentProvider === 'classworkscloud'
        "
      >
        <v-list-item>
          <template #prepend>
            <v-icon
              class="mr-3"
              icon="mdi-lan-connect"
            />
          </template>
          <v-list-item-title>检查服务器连接</v-list-item-title>
          <template #append>
            <v-btn
              :loading="loading"
              variant="tonal"
              @click="checkServerConnection"
            >
              测试连接
            </v-btn>
          </template>
        </v-list-item><!-- 数据迁移，仅对KV本地存储有效 -->
      </template>

      <!-- 本地存储设置 -->
      <template v-if="currentProvider === 'kv-local'">
        <v-list-item>
          <template #prepend>
            <v-icon
              class="mr-3"
              icon="mdi-database"
            />
          </template>
          <v-list-item-title>清除数据库缓存</v-list-item-title>
          <v-list-item-subtitle>
            这将清除所有本地数据库中的数据
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              color="error"
              variant="tonal"
              @click="confirmClearIndexedDB"
            >
              清除
            </v-btn>
          </template>
        </v-list-item>
        <v-list-item>
          <template #prepend>
            <v-icon
              class="mr-3"
              icon="mdi-database-export"
            />
          </template>
          <v-list-item-title>导出数据库</v-list-item-title>
          <template #append>
            <v-btn
              variant="tonal"
              @click="exportData"
            >
              导出
            </v-btn>
          </template>
        </v-list-item>
      </template>
      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            icon="mdi-database-import"
          />
        </template>
        <v-list-item-title>迁移旧数据</v-list-item-title>
        <v-list-item-subtitle>
          将旧的存储格式数据转移到新的KV存储
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            :loading="migrateLoading"
            variant="tonal"
            @click="migrateData"
          >
            迁移
          </v-btn>
        </template>
      </v-list-item><!-- 显示机器ID -->
      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            icon="mdi-identifier"
          />
        </template>
        <v-list-item-title>本机唯一标识符</v-list-item-title>
        <v-list-item-subtitle v-if="machineId">
          {{
            machineId
          }}
        </v-list-item-subtitle>
        <v-list-item-subtitle v-else>
          正在加载...
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            icon="mdi-lan-connect"
          />
        </template>
        <v-list-item-title>查看本地缓存</v-list-item-title>
        <template #append>
          <v-btn
            to="/cachemanagement"
            variant="tonal"
          >
            查看
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <!-- 确认对话框 -->
    <v-dialog
      v-model="confirmDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>{{ confirmTitle }}</v-card-title>
        <v-card-text>{{ confirmMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="confirmDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            @click="handleConfirm"
          >
            确认
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </settings-card>
</template>

<script>
import SettingsCard from "@/components/SettingsCard.vue";
import {getSetting} from "@/utils/settings";
import axios from "axios";

export default {
  name: "DataProviderSettingsCard",
  components: {SettingsCard},

  data() {
    return {
      loading: false,
      serverchecktime: {},
      confirmDialog: false,
      confirmTitle: "",
      confirmMessage: "",
      confirmAction: null,
      machineId: null,
      migrateLoading: false,
    };
  },

  computed: {
    currentProvider() {
      return getSetting("server.provider");
    },

    isKvProvider() {
      return (
        this.currentProvider === "kv-local" ||
        this.currentProvider === "kv-server" ||
        this.currentProvider === "classworkscloud"
      );
    },
  },

  async created() {
    // 如果是KV本地存储，获取机器ID

    this.machineId = getSetting("device.uuid");
  },

  methods: {
    async checkServerConnection() {
      this.loading = true;
      this.serverchecktime = new Date();
      try {
        const domain = getSetting("server.domain");
        const siteKey = getSetting("server.siteKey");

        // Prepare headers including site key if available
        const headers = {Accept: "application/json"};
        if (siteKey) {
          headers["x-site-key"] = siteKey;
        }

        const response = await axios.get(`${domain}/check`, {
          method: "GET",
          headers,
        });

        if (response.data.status === "success") {
          this.$message.success(
            "连接成功",
            "服务器连接正常 延迟" + (new Date() - this.serverchecktime) + "ms"
          );
        } else {
          throw new Error("服务器响应异常");
        }
      } catch (error) {
        this.$message.error("连接失败", error.message || "无法连接到服务器");
      } finally {
        this.loading = false;
      }
    },

    confirmClearLocalStorage() {
      this.confirmTitle = "确认清除";
      this.confirmMessage = "此操作将清除所有本地存储的数据，确定要继续吗？";
      this.confirmAction = this.clearLocalStorage;
      this.confirmDialog = true;
    },

    clearLocalStorage() {
      try {
        localStorage.clear();
        this.$message.success("清除成功", "本地存储数据已清除");
        this.confirmDialog = false;
      } catch (error) {
        this.$message.error("清除失败", error.message);
      }
    },

    confirmClearIndexedDB() {
      this.confirmTitle = "确认清除";
      this.confirmMessage = "此操作将清除所有IndexedDB中的数据，确定要继续吗？";
      this.confirmAction = this.clearIndexedDB;
      this.confirmDialog = true;
    },

    async clearIndexedDB() {
      try {
        const DBName = "ClassworksDB";
        // 删除整个数据库
        await window.indexedDB.deleteDatabase(DBName);
        this.$message.success("清除成功", "数据库缓存已清除");
        this.confirmDialog = false;

        // 如果是KV提供者，需要刷新页面以生成新的UUID
        if (this.isKvProvider) {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error) {
        this.$message.error("清除失败", error.message);
      }
    },

    async exportData() {
      try {
        const DBName = "ClassworksDB";
        const data = {indexedDB: {}};

        // 打开数据库
        const db = await new Promise((resolve, reject) => {
          const request = window.indexedDB.open(DBName);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });

        // 获取所有存储对象
        const stores = Array.from(db.objectStoreNames);

        // 导出每个存储对象的数据
        for (const storeName of stores) {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);

          // 获取存储对象中的所有数据
          const storeData = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
          });

          data.indexedDB[storeName] = storeData;
        }

        // 创建并下载文件
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const timestamp = new Date().toISOString().split("T")[0];
        a.href = url;
        a.download = `homework-indexeddb-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.$message.success("导出成功", "IndexedDB数据已导出");
      } catch (error) {
        console.error("导出失败:", error);
        this.$message.error("导出失败", error.message || "无法导出数据库数据");
      }
    },

    async migrateData() {
      this.migrateLoading = true;
      this.$router.push("/datamigration");
      this.migrateLoading = false;
    },

    handleConfirm() {
      if (this.confirmAction) {
        this.confirmAction();
      }
    },
  },
};
</script>
