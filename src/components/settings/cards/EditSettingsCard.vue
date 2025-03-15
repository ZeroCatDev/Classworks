<template>
  <settings-card
    title="编辑设置"
    icon="mdi-pencil-cog"
  >
    <v-form v-model="isValid" @submit.prevent="save">
      <v-list>
        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-content-save" class="mr-3" />
          </template>
          <v-list-item-title>自动保存</v-list-item-title>
          <v-list-item-subtitle>在编辑完成后自动保存到服务器</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="localSettings.autoSave"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider v-if="localSettings.autoSave" class="my-2" />

        <v-list-item v-if="localSettings.autoSave">
          <template #prepend>
            <v-icon icon="mdi-calendar-lock" class="mr-3" />
          </template>
          <v-list-item-title>禁止自动保存非当天数据</v-list-item-title>
          <v-list-item-subtitle>仅允许自动保存当天的数据，避免误修改历史记录</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="localSettings.blockNonTodayAutoSave"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-calendar-alert" class="mr-3" />
          </template>
          <v-list-item-title>确认保存历史数据</v-list-item-title>
          <v-list-item-subtitle>保存非当天数据时显示确认对话框</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="localSettings.confirmNonTodaySave"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-refresh" class="mr-3" />
          </template>
          <v-list-item-title>编辑前刷新</v-list-item-title>
          <v-list-item-subtitle>在打开编辑框前从服务器获取最新数据</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="localSettings.refreshBeforeEdit"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <div class="d-flex gap-2 mt-4">
          <v-btn
            color="primary"
            type="submit"
            :disabled="!hasChanges || !isValid"
            prepend-icon="mdi-content-save"
          >
            保存更改
          </v-btn>
          <v-btn
            variant="outlined"
            @click="reset"
            :disabled="!hasChanges"
          >
            重置
          </v-btn>
        </div>
      </v-list>
    </v-form>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import { getSetting, setSetting } from '@/utils/settings';

export default {
  name: 'EditSettingsCard',
  components: { SettingsCard },
  data() {
    const settings = {
      autoSave: getSetting('edit.autoSave'),
      blockNonTodayAutoSave: getSetting('edit.blockNonTodayAutoSave'),
      confirmNonTodaySave: getSetting('edit.confirmNonTodaySave'),
      refreshBeforeEdit: getSetting('edit.refreshBeforeEdit')
    };

    return {
      localSettings: { ...settings },
      originalSettings: settings,
      isValid: true
    };
  },
  computed: {
    hasChanges() {
      return JSON.stringify(this.localSettings) !== JSON.stringify(this.originalSettings);
    }
  },
  methods: {
    save() {
      Object.entries(this.localSettings).forEach(([key, value]) => {
        setSetting(`edit.${key}`, value);
      });
      this.originalSettings = { ...this.localSettings };
      this.$emit('saved');
    },
    reset() {
      this.localSettings = { ...this.originalSettings };
    }
  }
};
</script>
