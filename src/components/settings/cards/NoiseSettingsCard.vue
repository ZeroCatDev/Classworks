<template>
  <settings-card
    border
    icon="mdi-microphone"
    title="噪音监测"
  >
    <v-list>
      <setting-item :setting-key="'noiseMonitor.enabled'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'noiseMonitor.autoStart'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'noiseMonitor.permissionDismissed'" />
    </v-list>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '@/components/settings/SettingItem.vue';

export default {
  name: 'NoiseSettingsCard',
  components: { SettingsCard, SettingItem },
};
</script>
