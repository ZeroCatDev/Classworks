<template>
  <settings-card title="数据源设置" icon="mdi-database" :loading="loading">
    <v-form v-model="isValid" @submit.prevent="save">
      <v-select
        v-model="localSettings.provider"
        :items="dataProviders"
        label="数据提供者"
        class="mb-4"
      />
      <v-expand-transition>
        <div v-if="localSettings.provider === 'server'">
          <v-text-field
            v-model="localSettings.domain"
            label="服务器域名"
            placeholder="例如: http://example.com"
            prepend-inner-icon="mdi-web"
          />
        </div>
      </v-expand-transition>

      <v-text-field
        v-model="localSettings.classNumber"
        label="班号"
        placeholder="例如: 1 或 A"
        prepend-inner-icon="mdi-account-group"
        persistent-hint
      />

      <div class="d-flex gap-2 mt-4">
        <v-btn
          color="primary"
          type="submit"
          :disabled="!hasChanges || !isValid"
          prepend-icon="mdi-content-save"
        >
          保存更改
        </v-btn>
        <v-btn variant="outlined" @click="reset" :disabled="!hasChanges">
          重置
        </v-btn>
      </div>
    </v-form>
  </settings-card>
</template>

<script>
import SettingsCard from "@/components/SettingsCard.vue";
import { getSetting, setSetting } from "@/utils/settings";

export default {
  name: "ServerSettingsCard",
  components: { SettingsCard },
  props: {
    loading: Boolean,
  },
  data() {
    const settings = {
      provider: getSetting("server.provider"),
      domain: getSetting("server.domain"),
      classNumber: getSetting("server.classNumber"),
    };

    return {
      localSettings: { ...settings },
      originalSettings: settings,
      isValid: true,
      dataProviders: [
        { title: "服务器", value: "server" },
        { title: "本地数据库", value: "indexedDB" },
      ],
    };
  },
  computed: {
    hasChanges() {
      return (
        JSON.stringify(this.localSettings) !==
        JSON.stringify(this.originalSettings)
      );
    },
  },
  methods: {
    async save() {
      try {
        // 先保存设置
        Object.entries(this.localSettings).forEach(([key, value]) => {
          const success = setSetting(`server.${key}`, value);
          if (!success) {
            throw new Error(`保存设置 ${key} 失败`);
          }
        });

        // 如果切换到服务器模式，验证服务器连接
        if (this.localSettings.provider === 'server' && this.localSettings.domain) {
          const testUrl = `${this.localSettings.domain.replace(/\/$/, '')}/api/test`;
          try {
            const response = await fetch(testUrl);
            if (!response.ok) {
              throw new Error('服务器连接测试失败');
            }
          } catch (error) {
            throw new Error('无法连接到服务器，请检查域名设置');
          }
        }

        this.originalSettings = { ...this.localSettings };
        this.$emit('saved');

        // 延迟刷新页面，让用户看到保存成功的提示
        setTimeout(() => {
          //window.location.reload();
        }, 1000);
      } catch (error) {
        this.$message?.error('保存失败', error.message);
      }
    },
    reset() {
      this.localSettings = { ...this.originalSettings };
    },
  },
};
</script>
