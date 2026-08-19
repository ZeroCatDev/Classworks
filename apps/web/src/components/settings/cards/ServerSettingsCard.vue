<template>
  <settings-card
    :loading="loading"
    icon="mdi-database"
    title="数据源设置"
  >
    <v-form>
      <!-- 使用双向绑定来替代 setting-key -->
      <v-select
        v-model="serverSettings.provider"
        :items="[
          { title: 'Classworks云端存储', value: 'classworkscloud' },
          { title: 'KV本地存储', value: 'kv-local' },
          { title: 'KV远程服务器', value: 'kv-server' }
        ]"
        class="mb-3"
        density="comfortable"
        item-title="title"
        item-value="value"
        label="数据提供者"
        prepend-icon="mdi-database"
        variant="outlined"
      />

      <v-alert
        v-if="isKvProvider"
        class="my-2"
        type="info"
        variant="tonal"
      >
        <v-alert-title>KV 存储系统</v-alert-title>
        <p>KV存储系统使用本机唯一标识符(UUID)来区分不同设备的数据。</p>
        <p v-if="currentProvider === 'kv-server'">
          服务器端点格式: <code>http(s)://服务器域名/</code><br>
          在服务器域名处仅填写基础URL，不需要任何路径。
        </p>
      </v-alert>

      <v-alert
        v-if="isClassworksCloud"
        class="my-2"
        color="success"
        type="info"
        variant="tonal"
      >
        <v-alert-title>Classworks云端存储</v-alert-title>
        <p>Classworks云端存储是官方提供的存储解决方案，自动配置了最优的访问设置。</p>
        <p>使用此选项时，服务器域名和网站令牌将自动配置，无需手动设置。</p>
      </v-alert>

      <v-divider
        class="my-2"
      />

      <!-- For classworkscloud show kv token and namespace info card -->
      <div v-if="isClassworksCloud">
        <v-text-field
          v-model="serverSettings.kvToken"
          class="mb-2"
          density="comfortable"
          hint="令牌用于云端存储授权"
          label="KV 授权令牌"
          persistent-hint
          prepend-icon="mdi-shield-key"
          variant="outlined"
        />


        <cloud-namespace-info-card
          :visible="isClassworksCloud"
          class="mt-4"
        />
      </div>

      <!-- For kv-server show domain + kv token -->
      <div v-else-if="currentProvider === 'kv-server'">
        <v-text-field
          v-model="serverSettings.domain"
          class="mb-2"
          density="comfortable"
          hint="例如: https://example.com (不需要路径)"
          label="服务器域名"
          persistent-hint
          prepend-icon="mdi-web"
          variant="outlined"
        />

        <v-text-field
          v-model="serverSettings.kvToken"
          class="mb-2"
          density="comfortable"
          hint="令牌用于服务器验证"
          label="KV 授权令牌"
          persistent-hint
          prepend-icon="mdi-shield-key"
          variant="outlined"
        />
      </div>

      <!-- For kv-local show only class number -->
      <div v-else-if="currentProvider === 'kv-local'">
        <v-text-field
          v-model="serverSettings.classNumber"
          class="mb-2"
          density="comfortable"
          hint="例如: 高三八班"
          label="班级编号"
          persistent-hint
          prepend-icon="mdi-account-group"
          variant="outlined"
        />
      </div>
    </v-form>
  </settings-card>
</template>

<script>
import SettingsCard from "@/components/SettingsCard.vue";
import CloudNamespaceInfoCard from "./CloudNamespaceInfoCard.vue";
import {getSetting, setSetting, watchSettings} from "@/utils/settings";

export default {
  name: "ServerSettingsCard",
  components: {SettingsCard, CloudNamespaceInfoCard},
  props: {
    loading: Boolean,
  },
  data() {
    return {
      unwatch: null,
      // 保存所有相关设置
      serverSettings: {
        provider: getSetting("server.provider"),
        domain: getSetting("server.domain"),
        classNumber: getSetting("server.classNumber"),
        kvToken: getSetting("server.kvToken"),
      },
      // 用于监听设置变化时刷新 UI
      settingsChangeTimeout: null
    };
  },
  computed: {
    currentProvider() {
      return this.serverSettings.provider;
    },
    isKvProvider() {
      return this.currentProvider === 'kv-local' || this.currentProvider === 'kv-server';
    },
    isClassworksCloud() {
      return this.currentProvider === 'classworkscloud';
    },
    useServer() {
      return this.currentProvider === 'server' || this.currentProvider === 'kv-server' || this.currentProvider === 'classworkscloud';
    }
  },
  watch: {
    // 监视 serverSettings 的深层变化
    serverSettings: {
      handler() {
        // 使用防抖处理，避免频繁刷新
        if (this.settingsChangeTimeout) {
          clearTimeout(this.settingsChangeTimeout);
        }
        // 延迟保存，提供更好的用户体验
        this.settingsChangeTimeout = setTimeout(() => {
          this.saveAllSettings();
        }, 100);
      },
      deep: true
    }
  },
  mounted() {
    // 加载所有设置
    this.loadAllSettings();

    // 订阅全局设置变更事件
    this.unwatch = watchSettings(() => {
      // 当设置从其他地方（如其他标签页、其他组件）改变时，刷新本地状态
      this.loadAllSettings();
      // 可选：强制重新渲染组件
      this.$forceUpdate && this.$forceUpdate();
    });
  },
  beforeUnmount() {
    if (this.unwatch) this.unwatch();
  },
  methods: {
    // 从全局设置加载所有设置到本地
    loadAllSettings() {
      this.serverSettings = {
        provider: getSetting("server.provider"),
        domain: getSetting("server.domain"),
        classNumber: getSetting("server.classNumber"),
        kvToken: getSetting("server.kvToken"),
      };
    },

    // 保存所有本地设置到全局
    saveAllSettings() {
      Object.entries(this.serverSettings).forEach(([key, value]) => {
        const settingKey = `server.${key}`;
        const currentValue = getSetting(settingKey);

        // 只有当值发生变化时才进行设置
        if (value !== currentValue) {
          const success = setSetting(settingKey, value);
          if (success) {
            console.log(`设置已更新: ${settingKey} = ${value}`);
          } else {
            console.error(`设置失败: ${settingKey}`);
            // 如果设置失败，恢复值
            this.serverSettings[key] = currentValue;
          }
        }
      });
    },


  }
};
</script>
