<template>
  <settings-card title="编辑设置" icon="mdi-cog">
    <v-list>
      <setting-item :setting-key="'edit.autoSave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.blockNonTodayAutoSave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.confirmNonTodaySave'" />



      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.refreshBeforeEdit'" />

    </v-list>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '../SettingItem.vue';

</script>
