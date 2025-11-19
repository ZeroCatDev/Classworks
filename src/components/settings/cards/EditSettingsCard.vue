<template>
  <settings-card
    icon="mdi-cog"
    title="编辑设置"
  >
    <v-list>
      <setting-item :setting-key="'edit.autoSave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.blockNonTodayAutoSave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.confirmNonTodaySave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.refreshBeforeEdit'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.autoSavePromptText'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.manualSavePromptText'" />
    </v-list>
  </settings-card>
</template>

<script>
</script>
