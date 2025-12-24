<template>
  <div>
    <!-- 统一链接生成器卡片 -->
    <v-card border class="unified-link-generator">
      <v-card-title class="text-h6">
        <v-icon class="mr-2" icon="mdi-link-variant" start/>
        统一链接生成器
      </v-card-title>

      <v-card-text>
        <div class="text-body-2 text-medium-emphasis mb-4">
          生成包含预配置认证信息和设置的统一链接。可以同时预配置设备认证和应用设置。
        </div>

        <!-- 预配置认证信息部分 -->
        <v-card class="mb-4" variant="tonal">
          <v-card-title class="text-subtitle-1">
            <v-icon start>mdi-account-key</v-icon>
            预配置认证信息
          </v-card-title>

          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="preconfigForm.namespace"
                  hint="设备的命名空间标识符"
                  label="命名空间"
                  persistent-hint
                  placeholder="例如: classroom-001"
                  prepend-inner-icon="mdi-identifier"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="preconfigForm.authCode"
                  hint="留空则需要用户手动输入"
                  label="认证码"
                  persistent-hint
                  placeholder="设备认证码（可选）"
                  prepend-inner-icon="mdi-lock-outline"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row class="mt-2">
              <v-col cols="12">
                <v-checkbox
                  v-model="preconfigForm.autoExecute"
                  density="compact"
                  hint="启用后会自动尝试认证，即使没有认证码也会尝试"
                  label="自动执行认证"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <!-- 预配置信息预览 -->
            <v-alert
              v-if="preconfigForm.namespace"
              class="mt-3"
              type="info"
              variant="tonal"
            >
              <div class="text-subtitle-2 mb-2">预配置信息：</div>
              <v-chip class="mr-2 mb-1" size="small">
                <v-icon size="small" start>mdi-identifier</v-icon>
                命名空间: {{ preconfigForm.namespace }}
              </v-chip>
              <v-chip
                v-if="preconfigForm.authCode"
                class="mr-2 mb-1"
                color="warning"
                size="small"
              >
                <v-icon size="small" start>mdi-lock</v-icon>
                认证码: {{ preconfigForm.authCode.length > 8 ? preconfigForm.authCode.substring(0, 8) + "..." :
                preconfigForm.authCode }}
              </v-chip>
              <v-chip v-else class="mr-2 mb-1" color="grey" size="small">
                <v-icon size="small" start>mdi-lock-open</v-icon>
                无认证码
              </v-chip>
              <v-chip
                :color="preconfigForm.autoExecute ? 'success' : 'orange'"
                class="mr-2 mb-1"
                size="small"
              >
                <v-icon size="small" start>{{
                  preconfigForm.autoExecute ? "mdi-play-circle" : "mdi-hand-back-left"
                  }}
                </v-icon>
                {{ preconfigForm.autoExecute ? "自动认证" : "手动认证" }}
              </v-chip>
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- 设置分享部分 -->
        <v-card class="mb-4" variant="tonal">
          <v-card-title class="text-subtitle-1">
            <v-icon start>mdi-cog-transfer</v-icon>
            设置分享（可选）
          </v-card-title>

          <v-card-text>
            <div class="text-body-2 text-medium-emphasis mb-3">
              选择需要包含在链接中的设置项。如果不选择任何设置，将只生成预配置认证链接。
            </div>

            <!-- 设置快速选择按钮 -->
            <div class="d-flex mb-3 gap-2 flex-wrap">
              <v-btn
                color="primary"
                prepend-icon="mdi-server-network"
                size="small"
                variant="tonal"
                @click="selectDataSourceSettings"
              >
                数据源设置
              </v-btn>
              <v-btn
                color="primary"
                prepend-icon="mdi-compare"
                size="small"
                variant="tonal"
                @click="selectChangedSettings"
              >
                已变更设置
              </v-btn>
              <v-btn
                color="success"
                prepend-icon="mdi-select-all"
                size="small"
                variant="tonal"
                @click="selectAll"
              >
                全选
              </v-btn>
              <v-btn
                color="error"
                prepend-icon="mdi-select-remove"
                size="small"
                variant="tonal"
                @click="resetSelection"
              >
                清除选择
              </v-btn>
            </div>

            <!-- 选择摘要 -->
            <div class="d-flex align-center mb-3 flex-wrap gap-2">
              <v-chip class="mr-2" color="primary">
                已选 {{ selectedItems.length }} 项设置
              </v-chip>

              <template v-if="selectedItems.length > 0">
                <v-chip
                  v-for="item in selectedItems.slice(0, 3)"
                  :key="item"
                  class="mr-1"
                  size="small"
                  variant="text"
                >
                  {{ getSettingDescription(item) }}
                </v-chip>
                <v-chip
                  v-if="selectedItems.length > 3"
                  color="grey"
                  size="small"
                  variant="text"
                >
                  +{{ selectedItems.length - 3 }} 更多
                </v-chip>
              </template>
            </div>

            <!-- 设置列表折叠面板 -->
            <v-expansion-panels variant="accordion">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <template #default="{ expanded }">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2">{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      显示设置列表详情
                    </div>
                  </template>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                  <v-text-field
                    v-model="search"
                    class="mb-4"
                    clearable
                    hide-details
                    label="搜索设置"
                    prepend-inner-icon="mdi-magnify"
                    single-line
                  />

                  <v-data-table
                    v-model="selectedItems"
                    :headers="headers"
                    :items="filteredItems"
                    :items-per-page="settingItems.length"
                    :sort-by="[{ key: 'isChanged', order: 'desc' }]"
                    class="rounded setting-table"
                    density="compact"
                    item-value="key"
                    show-select
                    @update:selected="handleSelectionChange"
                  >
                    <template #[`item.description`]="{ item }">
                      <div class="d-flex align-center">
                        <v-icon
                          :icon="item.icon"
                          class="mr-2"
                          size="small"
                        />
                        {{ item.description }}
                        <v-chip
                          v-if="item.key === 'server.kvToken'"
                          class="ml-2"
                          color="error"
                          size="x-small"
                        >
                          敏感
                        </v-chip>
                      </div>
                    </template>

                    <template #[`item.value`]="{ item }">
                      <span v-if="typeof item.value === 'boolean'">
                        {{ item.value ? "是" : "否" }}
                      </span>
                      <span v-else-if="item.key === 'server.kvToken' && item.value">
                        {{ item.value.substring(0, 8) }}...
                      </span>
                      <span v-else>{{ item.value }}</span>
                    </template>

                    <template #[`item.key`]="{ item }">
                      <span class="text-caption text-grey">{{ item.key }}</span>
                    </template>

                    <template #[`item.isChanged`]="{ item }">
                      <v-chip
                        :color="item.isChanged ? 'warning' : 'success'"
                        :text="item.isChanged ? '已修改' : '默认'"
                        density="compact"
                        size="x-small"
                      />
                    </template>
                  </v-data-table>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>

        <!-- 链接生成和操作部分 -->
        <v-card class="mb-4" variant="outlined">
          <v-card-title class="text-subtitle-1">
            <v-icon start>mdi-link</v-icon>
            生成的统一链接
          </v-card-title>

          <v-card-text>
            <!-- 操作按钮 -->
            <div class="d-flex mb-3 gap-2 flex-wrap">
              <v-btn
                :disabled="!preconfigForm.namespace.trim()"
                color="primary"
                prepend-icon="mdi-auto-fix"
                variant="flat"
                @click="generateUnifiedLink"
              >
                生成统一链接
              </v-btn>
              <v-btn
                :disabled="!unifiedLink"
                color="success"
                prepend-icon="mdi-test-tube"
                variant="tonal"
                @click="openTestLink"
              >
                测试链接
              </v-btn>
              <v-btn
                color="error"
                prepend-icon="mdi-delete"
                variant="tonal"
                @click="clearAll"
              >
                清空所有
              </v-btn>
            </div>

            <!-- 生成的链接 -->
            <v-text-field
              v-model="unifiedLink"
              :append-inner-icon="linkCopied ? 'mdi-check' : 'mdi-content-copy'"
              :placeholder="preconfigForm.namespace ? '点击「生成统一链接」按钮' : '请先输入命名空间'"
              class="mb-3"
              label="统一链接"
              readonly
              variant="outlined"
              @click:append-inner="copyUnifiedLink"
            />

            <!-- 链接内容预览 -->
            <v-alert
              v-if="unifiedLink"
              class="mb-3"
              type="success"
              variant="tonal"
            >
              <div class="text-subtitle-2 mb-2">链接包含内容：</div>
              <div class="d-flex flex-wrap gap-1">
                <v-chip color="primary" size="small">
                  <v-icon size="small" start>mdi-account-key</v-icon>
                  预配置认证
                </v-chip>
                <v-chip
                  v-if="selectedItems.length > 0"
                  color="secondary"
                  size="small"
                >
                  <v-icon size="small" start>mdi-cog</v-icon>
                  {{ selectedItems.length }} 项设置
                </v-chip>
                <v-chip v-else color="grey" size="small">
                  <v-icon size="small" start>mdi-cog-off</v-icon>
                  无额外设置
                </v-chip>
              </div>
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- 安全提醒 -->
        <v-alert type="warning" variant="tonal">
          <div class="text-subtitle-2 mb-2">⚠️ 安全提醒</div>
          <ul class="text-body-2 pl-4">
            <li>认证码和设置信息会在URL中传输，请谨慎分发</li>
            <li>建议仅在受信任的网络环境中使用</li>
            <li>生产环境建议使用HTTPS协议</li>
            <li>数据源设置和已变更设置默认不包含敏感Token信息</li>
          </ul>
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import {
  exportSettingsAsKeyValue,
  settingsDefinitions,
} from "@/utils/settings";

/**
 * 设置链接生成器组件
 *
 * 提供一个界面，让用户选择需要包含在链接中的设置项，
 * 然后生成一个包含这些设置的URL，可以分享给其他用户。
 *
 * 当其他用户打开生成的链接时，这些设置将自动应用。
 */
export default {
  name: "SettingsLinkGenerator",

  data() {
    return {
      // 设置分享相关
      selectedItems: [],
      generatedLink: "",
      linkCopied: false,
      search: "",

      // 预配置链接生成器相关
      preconfigForm: {
        namespace: "",
        authCode: "",
        autoExecute: false,
      },

      // 统一链接相关
      unifiedLink: "",

      headers: [
        {title: "", key: "data-table-select"},
        {title: "设置项", key: "description", sortable: true},
        {title: "当前值", key: "value", sortable: true},
        {
          title: "键名",
          key: "key",
          class: "d-none d-sm-table-cell",
          sortable: true,
        },
        {title: "状态", key: "isChanged", sortable: true},
      ],
    };
  },

  computed: {
    /**
     * 获取处理后的设置项列表
     */
    settingItems() {
      const currentSettings = exportSettingsAsKeyValue();
      const items = [];

      for (const [key, definition] of Object.entries(settingsDefinitions)) {
        // 如果是需要开发者模式的设置且未启用开发者模式，则跳过
        if (
          definition.requireDeveloper &&
          !currentSettings["developer.enabled"]
        ) {
          continue;
        }

        // 检查是否已修改（与默认值不同）
        const isChanged = currentSettings[key] !== definition.default;

        items.push({
          key: key,
          description: definition.description || key,
          value: currentSettings[key],
          icon: definition.icon || "mdi-cog",
          isChanged: isChanged,
          defaultValue: definition.default,
        });
      }

      // 按键名排序
      return items.sort((a, b) => a.key.localeCompare(b.key));
    },

    /**
     * 根据搜索条件筛选设置项
     */
    filteredItems() {
      if (!this.search) return this.settingItems;

      const searchText = this.search.toLowerCase();

      // 特殊关键词处理
      if (searchText === "已修改") {
        return this.settingItems.filter((item) => item.isChanged);
      }
      if (searchText === "是" || searchText === "否") {
        return this.settingItems.filter(
          (item) =>
            typeof item.value === "boolean" &&
            (searchText === "是" ? item.value : !item.value)
        );
      }

      // 常规文本搜索
      return this.settingItems.filter((item) => {
        const description = item.description.toLowerCase();
        const key = item.key.toLowerCase();
        const value = String(item.value).toLowerCase();
        const status = item.isChanged ? "已修改" : "默认";

        return (
          description.includes(searchText) ||
          key.includes(searchText) ||
          value.includes(searchText) ||
          status.includes(searchText)
        );
      });
    },

    /**
     * 是否有显示相关设置
     */
    hasDisplaySettings() {
      return this.selectedItems.some((key) => key.startsWith("display."));
    },

    /**
     * 是否有编辑相关设置
     */
    hasEditSettings() {
      return this.selectedItems.some((key) => key.startsWith("edit."));
    },

    /**
     * 是否有服务器相关设置
     */
    hasServerSettings() {
      return this.selectedItems.some((key) => key.startsWith("server."));
    },

    /**
     * 判断是否已选择已修改的设置
     */
    hasChangedSettings() {
      const currentSettings = exportSettingsAsKeyValue();

      return this.selectedItems.some((key) => {
        const definition = settingsDefinitions[key];
        return definition && currentSettings[key] !== definition.default;
      });
    },
  },

  methods: {
    /**
     * 处理表格选择变化
     */
    handleSelectionChange(items) {
      this.selectedItems = items.map((item) => item.key);
      this.generateLink();
    },

    /**
     * 生成包含所选设置的链接
     */
    generateLink() {
      // 获取当前网址的基础部分
      const baseUrl = `${window.location.protocol}//${window.location.host}/`;

      // 获取当前的所有设置
      const allSettings = exportSettingsAsKeyValue();

      // 创建只包含选中设置的对象
      const configObj = {};
      for (const key of this.selectedItems) {
        configObj[key] = allSettings[key];
      }

      // 如果没有选择任何设置，则生成不带参数的链接
      if (Object.keys(configObj).length === 0) {
        this.generatedLink = baseUrl;
        return;
      }

      try {
        // 转换为JSON并进行base64编码
        const jsonString = JSON.stringify(configObj);
        const utf8Encoder = new TextEncoder();
        const utf8Bytes = utf8Encoder.encode(jsonString);
        const base64String = btoa(
          Array.from(utf8Bytes)
            .map((byte) => String.fromCharCode(byte))
            .join("")
        );

        // 构建查询参数
        const queryParams = {config: base64String};

        // 添加当前日期到查询参数，如果URL中存在
        const urlParams = new URLSearchParams(window.location.search);
        const currentDate = urlParams.get("date");
        if (currentDate) {
          queryParams.date = currentDate;
        }

        // 构建查询字符串
        const queryString = new URLSearchParams(queryParams).toString();

        // 生成完整URL
        this.generatedLink = `${baseUrl}?${queryString}`;
      } catch (err) {
        console.error("生成链接失败:", err);
        this.generatedLink = "链接生成失败，请重试";
      }

      // 重置复制状态
      this.linkCopied = false;
    },

    /**
     * 复制生成的链接到剪贴板
     */
    async copyLink() {
      if (!this.generatedLink) {
        this.generateLink();
      }

      try {
        await navigator.clipboard.writeText(this.generatedLink);
        this.linkCopied = true;

        // 3秒后重置复制状态
        setTimeout(() => {
          this.linkCopied = false;
        }, 3000);
      } catch (err) {
        console.error("复制链接失败:", err);
      }
    },

    /**
     * 重置所有选择
     */
    resetSelection() {
      this.selectedItems = [];
      this.generatedLink = "";
      this.linkCopied = false;
    },

    /**
     * 选择所有设置
     */
    selectAll() {
      this.selectedItems = this.settingItems.map((item) => item.key);
      this.generateLink();
    },

    /**
     * 选择数据源相关设置（默认排除 server.kvToken）
     */
    selectDataSourceSettings() {
      const dataSourceKeys = this.settingItems
        .filter((item) =>
          item.key.startsWith("server.") &&
          item.key !== "server.kvToken" // 默认排除敏感的Token
        )
        .map((item) => item.key);

      this.selectedItems = dataSourceKeys;
      this.generateLink();
    },

    /**
     * 选择已修改的设置（默认排除 server.kvToken）
     */
    selectChangedSettings() {
      const changedKeys = this.settingItems
        .filter((item) =>
          item.isChanged &&
          item.key !== "server.kvToken" // 默认排除敏感的Token
        )
        .map((item) => item.key);

      this.selectedItems = changedKeys;
      this.generateLink();
    },

    /**
     * 根据前缀选择设置
     */
    selectByPrefix(prefix) {
      const keys = this.settingItems
        .filter((item) => item.key.startsWith(`${prefix}.`))
        .map((item) => item.key);

      this.selectedItems = keys;
    },

    /**
     * 自动生成链接（当选择变化时）
     */
    autoGenerateLink() {
      if (this.selectedItems.length > 0) {
        this.generateLink();
      } else {
        this.generatedLink = "";
      }
    },

    /**
     * 获取设置描述
     */
    getSettingDescription(key) {
      const setting = this.settingItems.find((item) => item.key === key);
      return setting ? setting.description : key;
    },

    // ===== 统一链接生成器方法 =====

    /**
     * 生成包含预配置信息和设置的统一链接
     */
    generateUnifiedLink() {
      if (!this.preconfigForm.namespace.trim()) {
        return;
      }

      try {
        const baseUrl = `${window.location.protocol}//${window.location.host}/`;
        const params = new URLSearchParams();

        // 添加预配置参数
        params.append("namespace", this.preconfigForm.namespace.trim());

        if (this.preconfigForm.authCode.trim()) {
          params.append("authCode", this.preconfigForm.authCode.trim());
        }

        if (this.preconfigForm.autoExecute) {
          params.append("autoExecute", "true");
        }

        // 添加设置配置（如果有选择的设置）
        if (this.selectedItems.length > 0) {
          const allSettings = exportSettingsAsKeyValue();
          const configObj = {};

          for (const key of this.selectedItems) {
            configObj[key] = allSettings[key];
          }

          // 转换为JSON并进行base64编码
          const jsonString = JSON.stringify(configObj);
          const utf8Encoder = new TextEncoder();
          const utf8Bytes = utf8Encoder.encode(jsonString);
          const base64String = btoa(
            Array.from(utf8Bytes)
              .map((byte) => String.fromCharCode(byte))
              .join("")
          );

          params.append("config", base64String);
        }

        // 生成完整URL
        this.unifiedLink = `${baseUrl}?${params.toString()}`;
        this.linkCopied = false;

        console.log("生成统一链接:", this.unifiedLink);
        console.log("包含预配置:", !!this.preconfigForm.namespace);
        console.log("包含设置数量:", this.selectedItems.length);
      } catch (error) {
        console.error("生成统一链接失败:", error);
        this.unifiedLink = "链接生成失败，请重试";
      }
    },

    /**
     * 复制统一链接到剪贴板
     */
    async copyUnifiedLink() {
      if (!this.unifiedLink) {
        this.generateUnifiedLink();
      }

      if (!this.unifiedLink || this.unifiedLink.includes("失败")) {
        return;
      }

      try {
        await navigator.clipboard.writeText(this.unifiedLink);
        this.linkCopied = true;

        // 3秒后重置复制状态
        setTimeout(() => {
          this.linkCopied = false;
        }, 3000);
      } catch (error) {
        console.error("复制统一链接失败:", error);
      }
    },

    /**
     * 在新窗口中测试统一链接
     */
    openTestLink() {
      if (this.unifiedLink && !this.unifiedLink.includes("失败")) {
        window.open(this.unifiedLink, "_blank");
      }
    },

    /**
     * 清空所有数据
     */
    clearAll() {
      this.preconfigForm = {
        namespace: "",
        authCode: "",
        autoExecute: false,
      };
      this.selectedItems = [];
      this.unifiedLink = "";
      this.generatedLink = "";
      this.linkCopied = false;
    },
  },

  watch: {
    // 监听选择变化，自动生成统一链接
    selectedItems: {
      handler() {
        if (this.preconfigForm.namespace.trim()) {
          this.generateUnifiedLink();
        }
      },
      deep: true,
    },

    // 监听预配置表单变化，自动生成统一链接
    "preconfigForm.namespace": {
      handler() {
        if (this.preconfigForm.namespace.trim()) {
          this.generateUnifiedLink();
        } else {
          this.unifiedLink = "";
        }
      },
    },

    "preconfigForm.authCode": {
      handler() {
        if (this.preconfigForm.namespace.trim()) {
          this.generateUnifiedLink();
        }
      },
    },

    "preconfigForm.autoExecute": {
      handler() {
        if (this.preconfigForm.namespace.trim()) {
          this.generateUnifiedLink();
        }
      },
    },
  },
};
</script>
