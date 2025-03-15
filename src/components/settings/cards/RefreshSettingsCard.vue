<template>
  <settings-card
    title="刷新设置"
    icon="mdi-refresh-circle"
  >
    <v-form v-model="isValid" @submit.prevent="save">
      <v-list>
        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-refresh" class="mr-3" />
          </template>
          <v-list-item-title>自动刷新</v-list-item-title>
          <v-list-item-subtitle>在后台自动刷新数据</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="localSettings.auto"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-timer" class="mr-3" />
          </template>
          <v-list-item-title>刷新间隔</v-list-item-title>
          <v-list-item-subtitle>设置自动刷新的时间间隔（分钟）</v-list-item-subtitle>
          <template #append>
            <v-text-field
              v-model="localSettings.interval"
              type="number"
              min="1"
              max="60"
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
  name: 'RefreshSettingsCard',
  components: { SettingsCard },
  data() {
    const settings = {
      auto: getSetting('refresh.auto'),
      interval: getSetting('refresh.interval')
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
        setSetting(`refresh.${key}`, value);
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
