<template>
  <v-list-item :disabled="disabled" class="setting-item">
    <template #prepend>
      <v-icon :icon="settingIcon"/>
    </template>

    <v-list-item-title class="text-wrap">
      {{ displayTitle }}
    </v-list-item-title>

    <v-list-item-subtitle class="d-flex align-center text-wrap">
      <span class="text-caption text-grey-darken-1">{{ settingKey }}</span>
    </v-list-item-subtitle>

    <template #append>
      <div class="d-flex flex-column flex-sm-row align-center">
        <div v-if="type !== 'string' || hasOptions" class="me-2">
          <!-- 根据设置类型渲染不同的控件 -->
          <v-switch
            v-if="type === 'boolean'"
            v-model="localValue"
            :disabled="disabled"
            density="comfortable"
            hide-details
            @update:model-value="updateSetting"
          />

          <v-select
            v-else-if="type === 'string' && hasOptions"
            v-model="localValue"
            :disabled="disabled"
            :items="selectOptions"
            bg-color="surface"
            class="setting-select"
            density="compact"
            hide-details
            item-title="title"
            item-value="value"
            variant="outlined"
            @update:model-value="updateSetting"
          />

          <div v-else-if="type === 'number'" class="d-flex align-center">
            <v-btn
              :disabled="disabled || localValue <= minValue"
              icon="mdi-minus"
              size="small"
              variant="text"
              @click="adjustValue(-stepValue)"
            />

            <v-text-field
              v-model.number="localValue"
              :disabled="disabled"
              :max="maxValue"
              :min="minValue"
              :step="stepValue"
              bg-color="surface"
              class="mx-2 setting-number-field"
              density="compact"
              hide-details
              style="width: 80px"
              type="number"
              variant="outlined"
              @update:model-value="updateSetting"
            />

            <v-btn
              :disabled="disabled || localValue >= maxValue"
              icon="mdi-plus"
              size="small"
              variant="text"
              @click="adjustValue(stepValue)"
            />
          </div>
        </div>

        <v-menu location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              :disabled="disabled"
              class="ml-2"
              icon="mdi-dots-vertical"
              size="small"
              v-bind="props"
              variant="text"
            />
          </template>
          <v-list density="compact">
            <v-list-item @click="copySettingId">
              <template v-slot:prepend>
                <v-icon icon="mdi-key" size="small"/>
              </template>
              <v-list-item-title>复制设置ID</v-list-item-title>
            </v-list-item>

            <v-list-item @click="copySettingValue">
              <template v-slot:prepend>
                <v-icon icon="mdi-content-copy" size="small"/>
              </template>
              <v-list-item-title>复制设置值</v-list-item-title>
            </v-list-item>

            <v-divider></v-divider>

            <v-list-item :disabled="isDefaultValue" @click="resetToDefault">
              <template v-slot:prepend>
                <v-icon icon="mdi-restore" size="small"/>
              </template>
              <v-list-item-title>重置为默认值</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </template>
  </v-list-item>

  <!-- 文本框显示在下方 -->
  <div v-if="type === 'string' && !hasOptions" class="px-4 pb-2 pt-0">
    <v-text-field
      v-model="localValue"
      :disabled="disabled"
      bg-color="surface"
      class="setting-text-field mt-1"
      density="compact"
      hide-details
      variant="outlined"
      @update:model-value="updateSetting"
    />
  </div>

  <!-- 消息提示 -->
  <v-snackbar
    v-model="showSnackbar"
    :timeout="2000"
    color="success"
    location="top"
  >
    {{ snackbarText }}
  </v-snackbar>
</template>

<script>
import {
  getSetting,
  setSetting,
  getSettingDefinition,
  resetSetting,
} from "@/utils/settings";

export default {
  name: "SettingItem",

  props: {
    /**
     * 设置项的键名，例如 'display.cardHoverEffect'
     */
    settingKey: {
      type: String,
      required: true,
    },

    /**
     * 可选的自定义图标，如果不提供则使用默认图标
     */
    icon: {
      type: String,
      default: null,
    },

    /**
     * 是否禁用此设置项
     */
    disabled: {
      type: Boolean,
      default: false,
    },

    /**
     * 可选的自定义标题，如果不提供则使用定义中的描述或键名
     */
    title: {
      type: String,
      default: null,
    },

    /**
     * 可选的自定义描述，如果不提供则不显示描述
     */
    description: {
      type: String,
      default: null,
    },
  },

  data() {
    return {
      localValue: null,
      definition: null,
      type: null,
      selectOptions: [],
      hasOptions: false,
      minValue: 0,
      maxValue: 100,
      stepValue: 1,
      showSnackbar: false,
      snackbarText: "",
      fontFamilies: [
        {title: "Arial", value: "Arial, sans-serif"},
        {title: "Calibri", value: "Calibri, sans-serif"},
        {title: "Cambria", value: "Cambria, serif"},
        {title: "Consolas", value: "Consolas, monospace"},
        {title: "Courier New", value: "Courier New, monospace"},
        {title: "Georgia", value: "Georgia, serif"},
        {title: "Helvetica", value: "Helvetica, sans-serif"},
        {title: "Segoe UI", value: "Segoe UI, sans-serif"},
        {title: "Times New Roman", value: "Times New Roman, serif"},
        {title: "Trebuchet MS", value: "Trebuchet MS, sans-serif"},
        {title: "Verdana", value: "Verdana, sans-serif"},
        {title: "Monospace", value: "monospace"},
        {title: "Sans-serif", value: "sans-serif"},
        {title: "Serif", value: "serif"},
      ],
      // 设置项的显示名称映射
      displayValueMappings: {
        "display.emptySubjectDisplay": {
          card: "卡片",
          button: "按钮",
        },
        "theme.mode": {
          light: "浅色",
          dark: "深色",
        },
        "server.provider": {
          classworkscloud: "Classworks云端存储",
          "kv-local": "KV本地存储",
          "kv-server": "KV远程服务器",
        },
      },
      // 默认图标映射，按设置类型
      defaultIcons: {
        boolean: "mdi-toggle-switch-outline",
        number: "mdi-numeric",
        string: "mdi-form-textbox",
      },
    };
  },

  computed: {
    displayTitle() {
      // 优先使用自定义标题
      if (this.title) {
        return this.title;
      }

      // 其次使用定义中的描述
      if (this.definition && this.definition.description) {
        return this.definition.description;
      }

      // 最后使用键名的最后一部分
      const parts = this.settingKey.split(".");
      return parts[parts.length - 1];
    },

    displayDescription() {
      // 优先使用自定义描述
      if (this.description) {
        return this.description;
      }

      // 否则使用设置键名
      return this.settingKey;
    },

    // 判断是否为字体系列设置
    isFontFamily() {
      return (
        this.settingKey.toLowerCase().includes("fontfamily") ||
        this.settingKey.toLowerCase().includes("font.family")
      );
    },

    // 判断当前值是否为默认值
    isDefaultValue() {
      if (!this.definition) return true;

      // 对于对象或数组，需要进行深度比较
      if (typeof this.localValue === "object" && this.localValue !== null) {
        return (
          JSON.stringify(this.localValue) ===
          JSON.stringify(this.definition.default)
        );
      }

      return this.localValue === this.definition.default;
    },

    // 获取设置项的图标
    settingIcon() {
      // 优先使用props中传入的图标
      if (this.icon) {
        return this.icon;
      }

      // 其次使用定义中的图标
      if (this.definition && this.definition.icon) {
        return this.definition.icon;
      }

      // 最后使用基于类型的默认图标
      return this.defaultIcons[this.type] || "mdi-cog-outline";
    },
  },

  created() {
    this.loadSetting();
  },

  methods: {
    loadSetting() {
      // 获取设置定义
      this.definition = getSettingDefinition(this.settingKey);

      if (!this.definition) {
        console.error(`未找到设置项定义: ${this.settingKey}`);
        return;
      }

      // 设置类型
      this.type = this.definition.type;

      // 加载设置值
      this.localValue = getSetting(this.settingKey);

      // 处理选项（对于字符串类型的设置）
      if (this.type === "string") {
        // 检查是否有字体设置
        if (this.isFontFamily) {
          this.selectOptions = this.fontFamilies;
          this.hasOptions = true;
        }
        // 检查是否有显示值映射
        else if (this.settingKey in this.displayValueMappings) {
          const mapping = this.displayValueMappings[this.settingKey];
          this.selectOptions = Object.entries(mapping).map(
            ([value, title]) => ({
              title,
              value,
            })
          );
          this.hasOptions = true;
        }
        // 检查是否有验证函数中的选项
        else if (this.definition.validate) {
          const validateStr = this.definition.validate.toString();
          const match = validateStr.match(/\[(.*?)\]/);

          if (match) {
            const optionsStr = match[1];
            const options = optionsStr.split(",").map((opt) => {
              const cleaned = opt.trim().replace(/['"]/g, "");
              // 检查是否有显示值映射
              const displayValue = this.getDisplayValue(cleaned);
              return {
                title: displayValue || cleaned,
                value: cleaned,
              };
            });

            if (options.length > 0) {
              this.selectOptions = options;
              this.hasOptions = true;
            }
          }
        }
      }

      // 处理数字类型的设置
      if (this.type === "number" && this.definition.validate) {
        const validateStr = this.definition.validate.toString();

        // 尝试提取最小值
        const minMatch = validateStr.match(/value\s*>=\s*(\d+)/);
        if (minMatch) {
          this.minValue = Number(minMatch[1]);
        }

        // 尝试提取最大值
        const maxMatch = validateStr.match(/value\s*<=\s*(\d+)/);
        if (maxMatch) {
          this.maxValue = Number(maxMatch[1]);
        }

        // 设置合理的步长
        const range = this.maxValue - this.minValue;
        if (range > 100) {
          this.stepValue = 10;
        } else if (range > 20) {
          this.stepValue = 5;
        } else if (range > 10) {
          this.stepValue = 2;
        } else {
          this.stepValue = 1;
        }
      }
    },

    // 获取设置值的显示名称
    getDisplayValue(value) {
      if (this.settingKey in this.displayValueMappings) {
        const mapping = this.displayValueMappings[this.settingKey];
        return mapping[value] || value;
      }
      return value;
    },

    updateSetting(value) {
      // 确保值的类型正确
      let typedValue = value;

      if (this.type === "boolean") {
        typedValue = Boolean(value);
      } else if (this.type === "number") {
        typedValue = Number(value);

        // 确保值在范围内
        if (typedValue < this.minValue) typedValue = this.minValue;
        if (typedValue > this.maxValue) typedValue = this.maxValue;
      }

      // 保存设置
      const success = setSetting(this.settingKey, typedValue);

      if (success) {
        this.$emit("update", this.settingKey, typedValue);
      } else {
        // 如果保存失败，恢复原值
        this.localValue = getSetting(this.settingKey);
        this.$emit("error", this.settingKey);
      }
    },

    adjustValue(amount) {
      if (this.type !== "number") return;

      const newValue = this.localValue + amount;

      if (newValue >= this.minValue && newValue <= this.maxValue) {
        this.localValue = newValue;
        this.updateSetting(newValue);
      }
    },

    // 复制设置ID到剪贴板
    copySettingId() {
      navigator.clipboard
        .writeText(this.settingKey)
        .then(() => {
          this.showSnackbarMessage("设置ID已复制到剪贴板");
        })
        .catch((err) => {
          console.error("复制失败:", err);
        });
    },

    // 复制设置值到剪贴板
    copySettingValue() {
      let valueText = "";

      if (typeof this.localValue === "object" && this.localValue !== null) {
        valueText = JSON.stringify(this.localValue);
      } else {
        valueText = String(this.localValue);
      }

      navigator.clipboard
        .writeText(valueText)
        .then(() => {
          this.showSnackbarMessage("设置值已复制到剪贴板");
        })
        .catch((err) => {
          console.error("复制失败:", err);
        });
    },

    // 重置为默认值
    resetToDefault() {
      if (!this.definition) return;

      resetSetting(this.settingKey);
      this.localValue = getSetting(this.settingKey);
      this.showSnackbarMessage("已重置为默认值");
      this.$emit("update", this.settingKey, this.localValue);
    },

    // 显示消息提示
    showSnackbarMessage(message) {
      this.snackbarText = message;
      this.showSnackbar = true;
    },
  },
};
</script>

<style scoped>
.setting-item {
  border-radius: 8px;
  transition: background-color 0.2s;
}

.setting-text-field,
.setting-select,
.setting-number-field {
  min-width: 180px;
  border-radius: 6px;
}

.text-wrap {
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}

@media (max-width: 600px) {
  .setting-item {
    flex-wrap: wrap;
  }
}
</style>
