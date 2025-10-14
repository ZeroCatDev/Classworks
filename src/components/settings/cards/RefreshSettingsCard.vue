<template>
  <settings-card
    title="刷新设置"
    icon="mdi-refresh-circle"
  >
    <v-form>
      <v-list>
        <setting-item
          setting-key="refresh.auto"
          title="自动刷新"
        /> <v-divider class="my-2" />

        <setting-item
          setting-key="refresh.interval"
          title="刷新间隔"
        />
      </v-list>
    </v-form>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '@/components/settings/SettingItem.vue';
export default {
  name: 'RefreshSettingsCard',
  components: { SettingsCard },
  data() {


    return {

    };
  },
};
</script>
