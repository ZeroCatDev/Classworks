<template>
  <settings-card title="数据源设置" icon="mdi-database" :loading="loading">
    <v-form>
      <setting-item setting-key="server.provider" title="数据提供者" />

      <v-alert v-if="isKvProvider" type="info" variant="tonal" class="my-2">
        <v-alert-title>KV 存储系统</v-alert-title>
        <p>KV存储系统使用本机唯一标识符(UUID)来区分不同设备的数据。</p>
        <p v-if="currentProvider === 'kv-server'">
          服务器端点格式: <code>http(s)://服务器域名/</code><br>
          在服务器域名处仅填写基础URL，不需要任何路径。
        </p>
      </v-alert>

      <v-alert v-if="isClassworksCloud" type="info" color="success" variant="tonal" class="my-2">
        <v-alert-title>Classworks云端存储</v-alert-title>
        <p>Classworks云端存储是官方提供的存储解决方案，自动配置了最优的访问设置。</p>
        <p>使用此选项时，服务器域名和网站令牌将自动配置，无需手动设置。</p>
      </v-alert>

      <v-divider class="my-2" />
      <setting-item setting-key="server.domain" title="服务器域名" :disabled="isClassworksCloud" />
      <v-divider class="my-2" />
      <setting-item setting-key="server.classNumber" title="班号" />
      <v-divider class="my-2" />
      <setting-item setting-key="server.siteKey" title="网站令牌" :disabled="isClassworksCloud">
        <template #description>
          用于后端验证请求的安全令牌。如需要，请从系统管理员获取。
        </template>
      </setting-item>
      <v-alert v-if="useServer" type="info" variant="tonal" class="my-2">
        <v-icon icon="mdi-information-outline" class="mr-2"></v-icon>
        <span>网站令牌将作为 <code>x-site-key</code> 请求头发送给服务器，用于验证请求的合法性。如果您的服务器需要此验证，请在上方输入有效的令牌。</span>
      </v-alert>
      <v-divider class="my-2" />
      <setting-item setting-key="device.uuid" title="设备UUID" />
    </v-form>
  </settings-card>
</template>

<script>
import SettingsCard from "@/components/SettingsCard.vue";
import SettingItem from "@/components/settings/SettingItem.vue";
import { getSetting } from "@/utils/settings";

export default {
  name: "ServerSettingsCard",
  components: { SettingsCard, SettingItem },
  props: {
    loading: Boolean,
  },
  data() {
    return {};
  },
  computed: {
    currentProvider() {
      return getSetting("server.provider");
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
  }
};
</script>
