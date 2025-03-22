<template>
  <settings-card title="主题设置" icon="mdi-palette">
    <v-list>
      <v-list-item>
        <template #prepend>
          <v-icon icon="mdi-theme-light-dark" class="mr-3" />
        </template>
        <v-list-item-title>主题模式</v-list-item-title>
        <v-list-item-subtitle>选择明亮或暗黑主题</v-list-item-subtitle>
        <template #append>
          <v-btn-toggle
            v-model="localTheme"
            density="comfortable"
            color="primary"
          >
            <v-btn value="light">
              <v-icon icon="mdi-white-balance-sunny" class="mr-2" />
              明亮
            </v-btn>
            <v-btn value="dark">
              <v-icon icon="mdi-moon-waning-crescent" class="mr-2" />
              暗黑
            </v-btn>
          </v-btn-toggle>
        </template>
      </v-list-item>
    </v-list>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import { getSetting, setSetting } from '@/utils/settings';
import { useTheme } from 'vuetify';

export default {
  name: 'ThemeSettingsCard',
  components: { SettingsCard },

  data() {
    return {
      localTheme: getSetting('theme.mode')
    };
  },

  watch: {
    localTheme(newValue) {
      setSetting('theme.mode', newValue);
      this.updateTheme(newValue);
    }
  },

  setup() {
    const theme = useTheme();
    return { theme };
  },

  methods: {
    updateTheme(mode) {
      this.theme.global.name.value = mode;
    }
  }
};
</script>
