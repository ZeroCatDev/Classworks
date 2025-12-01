<template>
  <div>
    <v-card class="mb-6">
      <v-card-title>迁移设置</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="classNumber"
              hint="请输入需要迁移的班级编号"
              label="班级编号"
              persistent-hint
              prepend-icon="mdi-account-group"
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              v-model="machineId"
              hint="系统已自动填充设备标识，通常无需修改"
              label="设备标识 (UUID)"
              persistent-hint
              prepend-icon="mdi-identifier"
              readonly
            ></v-text-field>
          </v-col>
        </v-row>

        <v-radio-group v-model="migrationType" class="mt-2">
          <v-radio label="本地数据迁移" value="local"></v-radio>
          <v-radio label="服务器数据迁移" value="server"></v-radio>
        </v-radio-group>

        <div v-if="migrationType === 'server'" class="mt-4">
          <v-text-field
            v-model="serverUrl"
            hint="输入服务器域名，例如：https://example.com"
            label="服务器地址"
            persistent-hint
            prepend-icon="mdi-server"
          ></v-text-field>

          <v-alert
            class="mt-2"
            density="compact"
            type="info"
            variant="outlined"
          >
            服务器接口格式：<br/>
            - 配置接口：域名/班号/config<br/>
            - 作业数据接口：域名/班号/homework?date=YYYY-MM-DD
          </v-alert>

          <div class="d-flex align-center mt-4">
            <v-icon class="mr-2" color="warning">mdi-calendar-range</v-icon>
            <span class="text-subtitle-1">选择迁移时间范围：</span>
          </div>

          <v-row class="mt-1">
            <v-col cols="12" md="6">
              <v-text-field
                v-model="startDate"
                label="开始日期"
                prepend-icon="mdi-calendar-start"
                type="date"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="endDate"
                label="结束日期"
                prepend-icon="mdi-calendar-end"
                type="date"
              ></v-text-field>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </v-card>

    <!-- 统一的数据显示卡片 -->
    <v-card class="mb-6">
      <v-card-title class="d-flex align-center">
        <span>{{
          migrationType === "local" ? "本地数据库内容" : "服务器数据内容"
        }}</span>
        <v-spacer></v-spacer>
        <v-btn
          :loading="loading || scanning"
          color="primary"
          @click="
            migrationType === 'local'
              ? scanLocalDatabase()
              : previewServerData()
          "
        >
          {{ migrationType === "local" ? "扫描数据" : "加载数据" }}
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert
          v-if="displayItems.length === 0 && !loading && !scanning"
          type="info"
        >
          {{
          migrationType === "local"
          ? '尚未扫描本地数据或未找到可迁移的数据。点击"扫描数据"按钮开始扫描。'
          : '尚未预览服务器数据或未找到可迁移的数据。点击"加载数据"按钮开始查询。'
          }}
        </v-alert>

        <v-data-table
          v-if="displayItems.length > 0"
          :headers="headers"
          :items="displayItems"
          :items-per-page="10"
          class="elevation-1"
          item-value="key"
        >
          <template #[`item.type`]="{ item }">
            <v-chip
              :color="getItemType(item) === 'config' ? 'primary' : 'secondary'"
              size="small"
            >
              {{ getItemType(item) === "config" ? "配置" : "作业数据" }}
            </v-chip>
          </template>

          <template #[`item.date`]="{ item }">
            {{ formatDate(getItemDate(item)) }}
          </template>
        </v-data-table>

        <v-alert
          v-if="displayItems.length > 0"
          class="mt-2"
          density="compact"
          type="info"
        >
          系统将迁移表格中显示的所有数据项，迁移前请确认数据完整性。
        </v-alert>

        <v-skeleton-loader
          v-if="loading || scanning"
          type="table"
        ></v-skeleton-loader>
      </v-card-text>
    </v-card>

    <v-card class="mb-6">
      <v-card-title>迁移目标</v-card-title>
      <v-card-text>
        <v-radio-group v-model="targetStorage">
          <v-radio label="本地 KV 存储" value="kv-local"></v-radio>
          <v-radio label="服务器 KV 存储" value="kv-server"></v-radio>
        </v-radio-group>

        <div v-if="targetStorage === 'kv-server'" class="mt-4">
          <v-text-field
            v-model="targetServerUrl"
            hint="输入KV服务器地址，例如：https://example.com/kv-api"
            label="目标服务器地址"
            persistent-hint
            prepend-icon="mdi-server-network"
          ></v-text-field>
        </div>
      </v-card-text>
    </v-card>

    <div class="d-flex justify-end mb-6">
      <v-btn
        :disabled="!canMigrate"
        :loading="migrating"
        color="success"
        @click="startMigration"
      >
        开始迁移
      </v-btn>
    </div>

    <v-dialog v-model="showResult" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon :color="migrationSuccess ? 'success' : 'error'" class="mr-2">
            {{ migrationSuccess ? "mdi-check-circle" : "mdi-alert-circle" }}
          </v-icon>
          <span>{{ migrationSuccess ? "迁移成功" : "迁移失败" }}</span>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="migrationError" class="mb-4" type="error">
            {{ migrationError }}
          </v-alert>

          <div v-if="migrationSuccess">
            <p>
              成功迁移 {{ migrationStats.success }} 项数据到
              {{ targetStorage === "kv-local" ? "本地" : "服务器" }} KV 存储。
            </p>
            <v-divider class="my-4"></v-divider>
            <v-list>
              <v-list-subheader>迁移详情</v-list-subheader>
              <v-list-item
                v-for="(item, index) in migrationResults"
                :key="index"
              >
                <v-list-item-title>
                  {{ item.key }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ item.success ? "成功" : "失败" }} {{ item.message }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="showResult = false"> 关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import {openDB} from "idb";
import axios from "@/axios/axios";
import {getSetting, setSetting} from "@/utils/settings";

export default {
  name: "MigrationTool",
  data() {
    return {
      classNumber: "",
      machineId: "",
      migrationType: "server",
      serverUrl: "",
      targetStorage: "kv-server",
      targetServerUrl: "https://kv-service.wuyuan.dev",
      startDate: this.getDateString(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ), // 30 days ago
      endDate: this.getDateString(new Date()),
      loading: false,
      scanning: false,
      migrating: false,
      showServerPreview: false,
      showResult: false,
      migrationSuccess: false,
      migrationError: null,
      migrationStats: {
        total: 0,
        success: 0,
        failed: 0,
      },
      migrationResults: [],
      localDbItems: [],
      serverItems: [],
      selectedItems: [],
      headers: [
        {title: "类型", key: "type", sortable: true},
        {title: "键名", key: "key", sortable: true},
        {title: "日期", key: "date", sortable: true},
        {title: "大小", key: "size", sortable: true},
      ],
    };
  },
  computed: {

    displayItems() {
      return this.migrationType === "local"
        ? this.localDbItems
        : this.serverItems;
    },
    canMigrate() {
      return (
        this.classNumber &&
        this.machineId &&
        this.displayItems.length > 0 &&
        (this.targetStorage !== "kv-server" || this.targetServerUrl)
      );
    },
  },
  async mounted() {
    try {
      await this.initMachineId();
      this.classNumber = getSetting("server.classNumber");
      this.serverUrl = getSetting("server.domain");
      this.migrationType = getSetting("server.provider");
    } catch (error) {
      console.error("初始化设备ID失败:", error);
    }
  },
  methods: {
    // 安全地获取项目类型，处理可能的undefined情况
    getItemType(item) {
      if (!item) return "";
      // 处理直接对象和v-data-table的item对象格式
      return item.raw ? item.raw.type : item.type;
    },

    // 安全地获取项目日期，处理可能的undefined情况
    getItemDate(item) {
      if (!item) return null;
      return item.raw ? item.raw.date : item.date;
    },

    getDateString(date) {
      return date.toISOString().split("T")[0];
    },

    // 初始化设备ID
    async initMachineId() {
      this.machineId = getSetting("device.uuid");
    },

    // 获取请求头，包含网站令牌
    getRequestHeaders() {
      const headers = {Accept: "application/json"};
      const siteKey = getSetting("server.siteKey");

      if (siteKey) {
        headers["x-site-key"] = siteKey;
      }

      return headers;
    },

    // 扫描本地数据库
    async scanLocalDatabase() {
      if (!this.classNumber) {
        this.$emit("message", {text: "请先输入班级编号", type: "error"});
        return;
      }

      this.scanning = true;
      this.localDbItems = [];

      try {
        // 打开数据库
        const db = await openDB("ClassworksDB", 2);

        // 检查旧的数据存储
        if (
          db.objectStoreNames.contains("homework") &&
          db.objectStoreNames.contains("config")
        ) {
          // 从旧的作业存储中读取数据
          const homework = db.transaction("homework", "readonly");
          const hwStore = homework.objectStore("homework");
          const hwKeys = await hwStore.getAllKeys();

          // 过滤当前班级的键
          const classKeys = hwKeys.filter((key) =>
            key.startsWith(`homework_${this.classNumber}_`)
          );

          for (const key of classKeys) {
            const value = await hwStore.get(key);

            // 从键中提取日期: homework_classNumber_YYYY-MM-DD
            const datePart = key.split("_")[2];
            let dateObj = null;

            if (datePart) {
              const [year, month, day] = datePart.split("-");
              dateObj = new Date(year, month - 1, day);
            }

            this.localDbItems.push({
              type: "homework",
              key,
              originalKey: key,
              date: dateObj,
              size: this.getDataSize(value) + " KB",
              value,
            });
          }

          // 检查配置
          const configKey = `config_${this.classNumber}`;
          const configValue = await db.get("config", configKey);

          if (configValue) {
            this.localDbItems.push({
              type: "config",
              key: configKey,
              originalKey: configKey,
              date: null,
              size: this.getDataSize(configValue) + " KB",
              value: configValue,
            });
          }
        }

        // 检查新的KV存储中是否已有数据
        if (db.objectStoreNames.contains("kv")) {
          const kvTx = db.transaction("kv", "readonly");
          const kvStore = kvTx.objectStore("kv");
          const kvKeys = await kvStore.getAllKeys();

          // 过滤当前班级的键
          const classKvKeys = kvKeys.filter((key) =>
            key.startsWith(`${this.classNumber}/`)
          );

          for (const key of classKvKeys) {
            const value = await kvStore.get(key);

            // 判断是配置还是作业数据
            const isConfig = key.includes(
              `/${this.classNumber}/classworks-config`
            );
            let dateObj = null;

            if (!isConfig) {
              // 从键中提取日期: classNumber/classworks-data-YYYYMMDD
              const match = key.match(/classworks-data-(\d{4})(\d{2})(\d{2})/);
              if (match) {
                const [, year, month, day] = match;
                dateObj = new Date(year, parseInt(month) - 1, day);
              }
            }

            this.localDbItems.push({
              type: isConfig ? "config" : "homework",
              key,
              originalKey: key,
              date: dateObj,
              size: this.getDataSize(value) + " KB",
              value,
              isKv: true,
            });
          }
        }
      } catch (error) {
        console.error("扫描本地数据库失败:", error);
        this.$emit("message", {
          text: "扫描数据库失败: " + error.message,
          type: "error",
        });
      } finally {
        this.scanning = false;
      }
    },

    // 计算数据大小（KB）
    getDataSize(data) {
      if (!data) return 0;
      const str = typeof data === "string" ? data : JSON.stringify(data);
      return Math.round(((str.length * 2) / 1024) * 100) / 100; // 近似值
    },

    // 格式化日期显示
    formatDate(date) {
      if (!date) return "配置 (无日期)";
      return date.toLocaleDateString();
    },

    // 预览服务器数据
    async previewServerData() {
      if (
        !this.serverUrl ||
        !this.classNumber ||
        !this.startDate ||
        !this.endDate
      ) {
        this.$emit("message", {
          text: "请填写完整的服务器信息和时间范围",
          type: "error",
        });
        return;
      }

      this.loading = true;
      this.serverItems = [];

      try {
        // 先获取配置信息
        try {
          // 构建配置请求URL: 域名/班号/config
          const configUrl = `${this.serverUrl}/${this.classNumber}/config`;

          const configRes = await axios.get(configUrl, {
            headers: this.getRequestHeaders(),
          });
          if (configRes.data) {
            this.serverItems.push({
              type: "config",
              key: `config_${this.classNumber}`,
              originalKey: configUrl,
              date: null,
              size: this.getDataSize(configRes.data) + " KB",
              value: configRes.data,
            });
          }
        } catch (configError) {
          console.warn("无法获取配置:", configError);
        }

        // 获取日期范围内的所有数据
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        const dateArray = this.getDateArray(start, end);

        for (const date of dateArray) {
          const dateStr = this.formatDateForServer(date);
          try {
            // 构建数据请求URL: 域名/班号/homework?date=YYYY-MM-DD
            const homeworkUrl = `${this.serverUrl}/${this.classNumber}/homework?date=${dateStr}`;

            const res = await axios.get(homeworkUrl, {
              headers: this.getRequestHeaders(),
            });
            if (res.data && res.data.status != false) {
              console.log(res.data);
              this.serverItems.push({
                type: "homework",
                key: `homework_${this.classNumber}_${dateStr}`,
                originalKey: homeworkUrl,
                date,
                size: this.getDataSize(res.data) + " KB",
                value: res.data,
              });
            }
          } catch (error) {
            if (error.response?.status !== 404) {
              console.warn(`无法获取 ${dateStr} 的数据:`, error);
            }
          }
        }

        this.showServerPreview = true;
      } catch (error) {
        console.error("预览服务器数据失败:", error);
        this.$emit("message", {
          text: "预览数据失败: " + error.message,
          type: "error",
        });
      } finally {
        this.loading = false;
      }
    },

    // 获取日期范围内的所有日期
    getDateArray(start, end) {
      const dateArray = [];
      const currentDate = new Date(start);

      while (currentDate <= end) {
        dateArray.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dateArray;
    },

    // 格式化日期为服务器格式 (YYYY-MM-DD)
    formatDateForServer(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },

    // 格式化日期为KV存储格式 (YYYYMMDD)
    formatDateForKv(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}${month}${day}`;
    },

    // 迁移到本地KV存储
    async migrateToLocalKv(item) {
      try {
        const db = await openDB("ClassworksDB", 2, {
          upgrade(db) {
            if (!db.objectStoreNames.contains("kv")) {
              db.createObjectStore("kv");
            }
          },
        });

        const value =
          typeof item.value === "string" ? JSON.parse(item.value) : item.value;
        const itemType = this.getItemType(item);

        if (itemType === "config") {
          // Handle student list migration
          if (value.studentList && Array.isArray(value.studentList)) {
            // Extract studentList from config and save it separately
            const formattedStudentList = value.studentList.map(
              (name, index) => ({
                id: index + 1,
                name,
              })
            );

            // Store the student list under the new key
            await db.put(
              "kv",
              JSON.stringify(formattedStudentList),
              "classworks-list-main"
            );

            // Remove studentList from config
            const configWithoutStudentList = {...value};
            delete configWithoutStudentList.studentList;

            // Save the modified config
            await db.put(
              "kv",
              JSON.stringify(configWithoutStudentList),
              `classworks-config`
            );
          } else {
            // Just store the config as is
            await db.put("kv", JSON.stringify(value), `classworks-config`);
          }
          return {success: true, message: "配置已迁移"};
        } else {
          // 数据键名: classNumber/classworks-data-YYYYMMDD
          const itemDate = this.getItemDate(item);
          let dateStr;

          if (itemDate) {
            dateStr = this.formatDateForKv(itemDate);
          } else {
            // 尝试从键名提取日期
            const match = item.key.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
              const [, year, month, day] = match;
              dateStr = `${year}${month}${day}`;
            } else {
              return {success: false, message: "无法确定日期格式"};
            }
          }

          await db.put(
            "kv",
            JSON.stringify(value),
            `classworks-data-${dateStr}`
          );
          return {success: true, message: `${dateStr} 数据已迁移`};
        }
      } catch (error) {
        console.error("本地KV迁移失败:", error);
        return {success: false, message: error.message};
      }
    },

    // 迁移到服务器KV存储
    async migrateToServerKv(item) {
      try {
        const value =
          typeof item.value === "string" ? JSON.parse(item.value) : item.value;
        const itemType = this.getItemType(item);

        if (itemType === "config") {
          // Handle student list migration
          if (value.studentList && Array.isArray(value.studentList)) {
            // Extract studentList from config
            const formattedStudentList = value.studentList.map(
              (name, index) => ({
                id: index + 1,
                name,
              })
            );

            // 移除学生列表
            const configWithoutStudentList = {...value};
            delete configWithoutStudentList.studentList;

            // 准备批量导入数据
            const batchData = {
              "classworks-list-main": formattedStudentList,
              "classworks-config": configWithoutStudentList,
            };

            // 批量导入配置数据
            const configResponse = await axios.post(
              `${this.targetServerUrl}/${this.machineId}/_batchimport`,
              batchData,
              {
                headers: this.getRequestHeaders(),
              }
            );

            // 处理配置响应结果
            if (configResponse.data && configResponse.data.successful > 0) {
              this.migrationResults.push({
                key: "classworks-config",
                success: true,
                message: "配置已批量迁移到服务器",
              });
              this.migrationStats.success++;

              if (
                configResponse.data.failed > 0 &&
                configResponse.data.errors
              ) {
                for (const error of configResponse.data.errors) {
                  this.migrationResults.push({
                    key: error.key,
                    success: false,
                    message: error.error || "配置迁移失败",
                  });
                  this.migrationStats.failed++;
                }
              }
            }
          } else {
            // Just store the config as is
            await axios.post(
              `${this.targetServerUrl}/${this.machineId}/classworks-config`,
              value,
              {
                headers: this.getRequestHeaders(),
              }
            );
          }
          return {success: true, message: "配置已迁移到服务器"};
        } else {
          // 数据
          const itemDate = this.getItemDate(item);
          let dateStr;

          if (itemDate) {
            dateStr = this.formatDateForKv(itemDate);
          } else {
            // 尝试从键名提取日期
            const match = item.key.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
              const [, year, month, day] = match;
              dateStr = `${year}${month}${day}`;
            } else {
              return {success: false, message: "无法确定日期格式"};
            }
          }

          await axios.post(
            `${this.targetServerUrl}/${this.machineId}/classworks-data-${dateStr}`,
            value,
            {
              headers: this.getRequestHeaders(),
            }
          );
          return {success: true, message: `${dateStr} 数据已迁移到服务器`};
        }
      } catch (error) {
        console.error("服务器KV迁移失败:", error);
        return {
          success: false,
          message: error.response?.data?.message || error.message,
        };
      }
    },

    // 批量迁移到服务器KV存储
    async batchMigrateToServerKv(items) {
      try {
        // 将数据按类型分组
        const configItems = items.filter(
          (item) => this.getItemType(item) === "config"
        );
        const homeworkItems = items.filter(
          (item) => this.getItemType(item) === "homework"
        );

        // 处理配置项
        if (configItems.length > 0) {
          const configItem = configItems[0]; // 通常只有一个配置项
          const value =
            typeof configItem.value === "string"
              ? JSON.parse(configItem.value)
              : configItem.value;

          if (value.studentList && Array.isArray(value.studentList)) {
            // 提取学生列表
            const formattedStudentList = value.studentList.map(
              (name, index) => ({
                id: index + 1,
                name,
              })
            );

            // 移除学生列表
            const configWithoutStudentList = {...value};
            delete configWithoutStudentList.studentList;

            // 准备批量导入数据
            const batchData = {
              "classworks-list-main": formattedStudentList,
              "classworks-config": configWithoutStudentList,
            };

            // 批量导入配置数据
            const configResponse = await axios.post(
              `${this.targetServerUrl}/${this.machineId}/_batchimport`,
              batchData,
              {
                headers: this.getRequestHeaders(),
              }
            );

            // 处理配置响应结果
            if (configResponse.data && configResponse.data.successful > 0) {
              this.migrationResults.push({
                key: "classworks-config",
                success: true,
                message: "配置已批量迁移到服务器",
              });
              this.migrationStats.success++;

              if (
                configResponse.data.failed > 0 &&
                configResponse.data.errors
              ) {
                for (const error of configResponse.data.errors) {
                  this.migrationResults.push({
                    key: error.key,
                    success: false,
                    message: error.error || "配置迁移失败",
                  });
                  this.migrationStats.failed++;
                }
              }
            }
          } else {
            // 只有配置数据
            await axios.post(
              `${this.targetServerUrl}/${this.machineId}/classworks-config`,
              value,
              {
                headers: this.getRequestHeaders(),
              }
            );
          }

          // 更新迁移结果
          this.migrationResults.push({
            key: configItem.key,
            success: true,
            message: "配置已迁移到服务器",
          });
          this.migrationStats.success++;
        }

        // 处理作业数据，每100个一批
        const batchSize = 100;
        for (let i = 0; i < homeworkItems.length; i += batchSize) {
          const batch = homeworkItems.slice(i, i + batchSize);
          const batchPayload = {};

          // 准备批量数据
          for (const item of batch) {
            const value =
              typeof item.value === "string"
                ? JSON.parse(item.value)
                : item.value;
            const itemDate = this.getItemDate(item);
            let dateStr;

            if (itemDate) {
              dateStr = this.formatDateForKv(itemDate);
            } else {
              // 尝试从键名提取日期
              const match = item.key.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (match) {
                const [, year, month, day] = match;
                dateStr = `${year}${month}${day}`;
              } else {
                // 跳过无法确定日期的项
                this.migrationResults.push({
                  key: item.key,
                  success: false,
                  message: "无法确定日期格式",
                });
                this.migrationStats.failed++;
                continue;
              }
            }

            // 添加到批量数据
            batchPayload[`classworks-data-${dateStr}`] = value;
          }

          // 发送批量请求
          if (Object.keys(batchPayload).length > 0) {
            const response = await axios.post(
              `${this.targetServerUrl}/${this.machineId}/_batchimport`,
              batchPayload,
              {
                headers: this.getRequestHeaders(),
              }
            );

            // 处理响应结果
            if (response.data) {
              if (response.data.successful > 0) {
                this.migrationResults.push({
                  key: `批量数据 (${Object.keys(batchPayload).length}项)`,
                  success: true,
                  message: `成功迁移 ${response.data.successful} 项数据到服务器`,
                });
                this.migrationStats.success += response.data.successful;
              }

              // 处理错误
              if (response.data.failed > 0 && response.data.errors) {
                for (const error of response.data.errors) {
                  this.migrationResults.push({
                    key: error.key,
                    success: false,
                    message: error.error || "迁移失败",
                  });
                  this.migrationStats.failed += response.data.failed;
                }
              }
            }
          }
        }

        return {success: true};
      } catch (error) {
        console.error("批量迁移到服务器失败:", error);
        return {
          success: false,
          message: error.response?.data?.message || error.message,
        };
      }
    },

    // 开始迁移
    async startMigration() {
      if (!this.canMigrate) {
        this.$emit("message", {
          text: "无法开始迁移，请检查配置",
          type: "error",
        });
        return;
      }

      this.migrating = true;
      this.migrationResults = [];
      this.migrationStats = {
        total: this.displayItems.length,
        success: 0,
        failed: 0,
      };

      try {
        if (this.targetStorage === "kv-local") {
          // 处理所有数据项，但先处理配置，再处理作业数据
          const configItems = this.displayItems.filter(
            (item) => this.getItemType(item) === "config"
          );
          const dataItems = this.displayItems.filter(
            (item) => this.getItemType(item) === "homework"
          );

          // 先处理配置项
          for (const item of configItems) {
            await this.migrateItem(item);
          }

          // 再处理数据项
          for (const item of dataItems) {
            await this.migrateItem(item);
          }
        } else {
          // 使用批量迁移到服务器
          await this.batchMigrateToServerKv(this.displayItems);
        }

        this.migrationSuccess = this.migrationStats.failed === 0;
        this.showResult = true;
        setSetting("server.provider", this.targetStorage);
        if (this.targetStorage === "kv-server") {
          setSetting("server.domain", this.targetServerUrl);
        }


      } catch (error) {
        console.error("迁移过程出错:", error);
        this.migrationSuccess = false;
        this.migrationError = error.message;
        this.showResult = true;
      } finally {
        this.migrating = false;
      }
    },

    // 迁移单个数据项
    async migrateItem(item) {
      try {
        let result;

        if (this.targetStorage === "kv-local") {
          result = await this.migrateToLocalKv(item);
        } else {
          result = await this.migrateToServerKv(item);
        }

        this.migrationResults.push({
          key: item.key,
          success: result.success,
          message: result.message,
        });

        if (result.success) {
          this.migrationStats.success++;
        } else {
          this.migrationStats.failed++;
        }
      } catch (error) {
        console.error(`迁移 ${item.key} 失败:`, error);
        this.migrationResults.push({
          key: item.key,
          success: false,
          message: error.message,
        });
        this.migrationStats.failed++;
      }
    },
  },
};
</script>
