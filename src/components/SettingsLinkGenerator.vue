<template>
  <v-card border class="settings-link-generator mb-4">
    <v-card-title class="text-h6">
      <v-icon start icon="mdi-link-variant" class="mr-2" />
      设置分享
    </v-card-title>

    <v-card-text>
      <!-- 快速选择按钮 -->
      <div class="d-flex mb-3 gap-2 flex-wrap">
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-select-all"
          @click="selectAll"
        >
          全选
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-server-network"
          @click="selectDataSourceSettings"
        >
          数据源设置
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-compare"
          @click="selectChangedSettings"
        >
          已变更设置
        </v-btn>

        <v-btn
          size="small"
          variant="tonal"
          color="error"
          prepend-icon="mdi-select-remove"
          @click="resetSelection"
        >
          取消选择
        </v-btn>
      </div>

      <!-- 选择摘要和链接 -->
      <div class="d-flex align-center mt-3 mb-3 flex-wrap gap-2">
        <v-chip color="primary" class="mr-2">
          已选 {{ selectedItems.length }} 项设置
        </v-chip>

        <template v-if="selectedItems.length > 0">
          <v-chip
            v-for="item in selectedItems"
            :key="item"
            size="small"
            class="mr-1"
            variant="text"
          >
            {{ getSettingDescription(item) }}
          </v-chip>
        </template>
      </div>

      <v-text-field
        v-model="generatedLink"
        label="生成的链接"
        readonly
        variant="outlined"
        class="mb-2"
        :append-inner-icon="linkCopied ? 'mdi-check' : 'mdi-content-copy'"
        @click:append-inner="copyLink"
      />

      <!-- 设置列表折叠面板 -->
      <v-expansion-panels variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title> 显示设置列表详情 </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-data-table
              :items-per-page="settingItems.length"
              :headers="headers"
              :items="filteredItems"
              item-value="key"
              v-model="selectedItems"
              show-select
              density="compact"
              class="rounded setting-table"
              @update:selected="handleSelectionChange"
              :sort-by="[{ key: 'isChanged', order: 'desc' }]"
            >
              <template v-slot:top>
                <v-text-field
                  v-model="search"
                  label="搜索设置"
                  prepend-inner-icon="mdi-magnify"
                  single-line
                  hide-details
                  class="mb-4"
                ></v-text-field>
              </template>

              <template #[`item.description`]="{ item }">
                <div class="d-flex align-center">
                  <v-icon size="small" :icon="item.icon" class="mr-2"></v-icon>
                  {{ item.description }}
                </div>
              </template>

              <template #[`item.value`]="{ item }">
                <span v-if="typeof item.value === 'boolean'">
                  {{ item.value ? "是" : "否" }}
                </span>
                <span v-else>{{ item.value }}</span>
              </template>

              <template #[`item.key`]="{ item }">
                <span class="text-caption text-grey">{{ item.key }}</span>
              </template>

              <template #[`item.isChanged`]="{ item }">
                <v-chip
                  size="x-small"
                  :color="item.isChanged ? 'warning' : 'success'"
                  :text="item.isChanged ? '已修改' : '默认'"
                  density="compact"
                />
              </template>
            </v-data-table>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
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
      // 选择的设置项键名列表
      selectedItems: [],

      // 生成的链接
      generatedLink: "",

      // 是否已复制链接
      linkCopied: false,
      search: "",
      headers: [
        { title: "", key: "data-table-select" },
        { title: "设置项", key: "description", sortable: true },
        { title: "当前值", key: "value", sortable: true },
        {
          title: "键名",
          key: "key",
          class: "d-none d-sm-table-cell",
          sortable: true,
        },
        { title: "状态", key: "isChanged", sortable: true },
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
        const queryParams = { config: base64String };

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
     * 选择数据源相关设置
     */
    selectDataSourceSettings() {
      const dataSourceKeys = this.settingItems
        .filter((item) => item.key.startsWith("server."))
        .map((item) => item.key);

      this.selectedItems = dataSourceKeys;
      this.generateLink();
    },

    /**
     * 选择已修改的设置
     */
    selectChangedSettings() {
      const changedKeys = this.settingItems
        .filter((item) => item.isChanged)
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
  },

  watch: {
    // 监听选择变化，自动生成链接
    selectedItems: {
      handler() {
        this.autoGenerateLink();
      },
      deep: true,
    },
  },
};
</script>
