<template>
    <settings-card title="编辑设置" icon="mdi-cog">
      <v-list>
        <setting-item setting-key="randomPicker.enabled" />
        <v-divider class="my-2" />

        <setting-item setting-key="randomPicker.mode" />
        <v-divider class="my-2" />
        <setting-item setting-key="randomPicker.minNumber" />
        <v-divider class="my-2" />
        <setting-item setting-key="randomPicker.maxNumber" />
        <v-divider class="my-2" />
        <setting-item setting-key="randomPicker.defaultCount" />


        <v-divider class="my-2" />
        <setting-item setting-key="randomPicker.animation" />




      </v-list>
    </settings-card>
  </template>

  <script>
  import SettingsCard from '@/components/SettingsCard.vue';
  import SettingItem from '../SettingItem.vue';

  </script>
