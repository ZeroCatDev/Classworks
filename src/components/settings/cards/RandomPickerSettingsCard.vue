<template>
  <v-card border class="mb-4">
    <v-card-title class="d-flex align-center">
      <v-icon icon="mdi-account-question" class="mr-2" />
      随机点名设置
    </v-card-title>

    <v-card-text>
      <v-switch
        v-model="randomPickerEnabled"
        label="启用随机点名功能"
        color="primary"
        hide-details
        class="mb-4"
      />
      
      <v-switch
        v-model="randomPickerAnimation"
        label="启用随机点名动画效果"
        color="primary"
        hide-details
        class="mb-4"
        :disabled="!randomPickerEnabled"
      />
      
      <v-slider
        v-model="defaultCount"
        label="默认抽取人数"
        min="1"
        max="10"
        step="1"
        thumb-label
        :disabled="!randomPickerEnabled"
        class="mb-4"
      />
      
      <v-divider class="my-4" />
      
      <div class="text-subtitle-1 mb-2">学生过滤设置</div>
      
      <v-switch
        v-model="excludeAbsent"
        label="排除请假学生"
        color="primary"
        hide-details
        class="mb-2"
        :disabled="!randomPickerEnabled"
      />
      
      <v-switch
        v-model="excludeLate"
        label="排除迟到学生"
        color="primary"
        hide-details
        class="mb-2"
        :disabled="!randomPickerEnabled"
      />
      
      <v-switch
        v-model="excludeExcluded"
        label="排除不参与学生"
        color="primary"
        hide-details
        class="mb-2"
        :disabled="!randomPickerEnabled"
      />
      
      <v-alert
        v-if="randomPickerEnabled"
        type="info"
        variant="tonal"
        class="mt-4"
        density="compact"
      >
        随机点名功能将在主页显示一个按钮，点击后可以随机抽取学生。
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script>
import { getSetting, setSetting } from '@/utils/settings';

export default {
  name: 'RandomPickerSettingsCard',
  data() {
    return {
      randomPickerEnabled: getSetting('randomPicker.enabled'),
      randomPickerAnimation: getSetting('randomPicker.animation'),
      defaultCount: getSetting('randomPicker.defaultCount'),
      excludeAbsent: getSetting('randomPicker.excludeAbsent'),
      excludeLate: getSetting('randomPicker.excludeLate'),
      excludeExcluded: getSetting('randomPicker.excludeExcluded')
    };
  },
  watch: {
    randomPickerEnabled(newValue) {
      setSetting('randomPicker.enabled', newValue);
    },
    randomPickerAnimation(newValue) {
      setSetting('randomPicker.animation', newValue);
    },
    defaultCount(newValue) {
      setSetting('randomPicker.defaultCount', newValue);
    },
    excludeAbsent(newValue) {
      setSetting('randomPicker.excludeAbsent', newValue);
    },
    excludeLate(newValue) {
      setSetting('randomPicker.excludeLate', newValue);
    },
    excludeExcluded(newValue) {
      setSetting('randomPicker.excludeExcluded', newValue);
    }
  }
};
</script> 