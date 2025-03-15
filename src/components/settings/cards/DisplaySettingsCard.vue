<template>
  <settings-card
    title="显示设置"
    icon="mdi-monitor-dashboard"
  >
    <v-form v-model="isValid" @submit.prevent="save">
      <v-list>
        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-eye" class="mr-3" />
          </template>
          <v-list-item-title>空科目显示</v-list-item-title>
          <v-list-item-subtitle>选择空科目的显示方式</v-list-item-subtitle>
          <template #append>
            <v-btn-toggle
              v-model="localSettings.emptySubjectDisplay"
              density="comfortable"
              color="primary"
            >
              <v-btn value="button" :ripple="false">按钮</v-btn>
              <v-btn value="card" :ripple="false">卡片</v-btn>
            </v-btn-toggle>
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-sort" class="mr-3" />
          </template>
          <v-list-item-title>动态排序</v-list-item-title>
          <v-list-item-subtitle>根据科目动态排序</v-list-item-subtitle>
          <template #append>
            <v-switch
              disabled
              v-model="localSettings.dynamicSort"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-dice-multiple" class="mr-3" />
          </template>
          <v-list-item-title>随机点名按钮</v-list-item-title>
          <v-list-item-subtitle>指向IslandCaller的链接</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="localSettings.showRandomButton"
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
  name: 'DisplaySettingsCard',
  components: { SettingsCard },
  data() {
    const settings = {
      emptySubjectDisplay: getSetting('display.emptySubjectDisplay'),
      dynamicSort: getSetting('display.dynamicSort'),
      showRandomButton: getSetting('display.showRandomButton')
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
        setSetting(`display.${key}`, value);
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
