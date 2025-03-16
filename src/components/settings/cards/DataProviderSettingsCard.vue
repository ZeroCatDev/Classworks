<template>
  <settings-card title="数据源设置" icon="mdi-database-cog">
    <v-list>
      <!-- 服务器模式设置 -->
      <template v-if="currentProvider === 'server'">
        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-lan-connect" class="mr-3" />
          </template>
          <v-list-item-title>检查服务器连接</v-list-item-title>
          <template #append>
            <v-btn
              :loading="loading"
              variant="tonal"
              size="small"
              @click="checkServerConnection"
            >
              测试连接
            </v-btn>
          </template>
        </v-list-item>
      </template>

      <!-- IndexedDB设置 -->
      <template v-if="currentProvider === 'indexedDB'">
        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-database" class="mr-3" />
          </template>
          <v-list-item-title>清除数据库缓存</v-list-item-title>
          <v-list-item-subtitle
            >这将清除所有IndexedDB中的数据</v-list-item-subtitle
          >
          <template #append>
            <v-btn
              color="error"
              variant="tonal"
              size="small"
              @click="confirmClearIndexedDB"
            >
              清除
            </v-btn>
          </template>
        </v-list-item>
        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-database-export" class="mr-3" />
          </template>
          <v-list-item-title>导出数据库</v-list-item-title>
          <template #append>
            <v-btn variant="tonal" size="small" @click="exportData">
              导出
            </v-btn>
          </template>
        </v-list-item>
      </template>
    </v-list>

    <!-- 确认对话框 -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card>
        <v-card-title>{{ confirmTitle }}</v-card-title>
        <v-card-text>{{ confirmMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="confirmDialog = false"
            >取消</v-btn
          >
          <v-btn color="error" variant="tonal" @click="handleConfirm"
            >确认</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </settings-card>
</template>

<script>
import SettingsCard from "@/components/SettingsCard.vue";
import { getSetting } from "@/utils/settings";
import axios from "axios";
export default {
  name: "DataProviderSettingsCard",
  components: { SettingsCard },

  data() {
    return {
      loading: false,
      serverchecktime: {},
      confirmDialog: false,
      confirmTitle: "",
      confirmMessage: "",
      confirmAction: null,
    };
  },

  computed: {
    currentProvider() {
      return getSetting("server.provider");
    },
  },

  methods: {
    async checkServerConnection() {
      this.loading = true;
      this.serverchecktime = new Date();
      try {
        const domain = getSetting("server.domain");
        const response = await axios.get(`${domain}/api/test`, {
          method: "GET",
          headers: { Accept: "application/json" },
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
        const DBName = "HomeworkDB";
        // 删除整个数据库
        await window.indexedDB.deleteDatabase(DBName);
        this.$message.success("清除成功", "数据库缓存已清除");
        this.confirmDialog = false;
      } catch (error) {
        this.$message.error("清除失败", error.message);
      }
    },

    async exportData() {
      try {
        const DBName = "HomeworkDB";
        const data = { indexedDB: {} };

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

    handleConfirm() {
      if (this.confirmAction) {
        this.confirmAction();
      }
    },
  },
};
</script>
