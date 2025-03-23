<template>
  <settings-card
    title="显示设置"
    icon="mdi-monitor"
    border
  >
    <v-form v-model="isValid" @submit.prevent="save">
      <v-list>
        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-card-outline" class="mr-3" />
          </template>
          <v-list-item-title>空科目显示方式</v-list-item-title>
          <v-list-item-subtitle>选择空科目的显示方式</v-list-item-subtitle>
          <template #append>
            <v-select
              v-model="emptySubjectDisplay"
              :items="displayOptions"
              density="compact"
              hide-details
              variant="outlined"
              style="max-width: 150px"
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-sort-variant" class="mr-3" />
          </template>
          <v-list-item-title>动态排序</v-list-item-title>
          <v-list-item-subtitle>优化卡片布局以提高显示效果</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="dynamicSort"
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
          <v-list-item-title>显示随机按钮</v-list-item-title>
          <v-list-item-subtitle>在主页显示随机点名按钮</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="showRandomButton"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-fullscreen" class="mr-3" />
          </template>
          <v-list-item-title>显示全屏按钮</v-list-item-title>
          <v-list-item-subtitle>在主页显示全屏切换按钮</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="showFullscreenButton"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-cards-outline" class="mr-3" />
          </template>
          <v-list-item-title>卡片悬浮效果</v-list-item-title>
          <v-list-item-subtitle>启用卡片悬停时的动画效果</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="cardHoverEffect"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-gesture-tap" class="mr-3" />
          </template>
          <v-list-item-title>增强触摸模式</v-list-item-title>
          <v-list-item-subtitle>优化触摸屏操作体验</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="enhancedTouchMode"
              density="comfortable"
              hide-details
            />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item>
          <template #prepend>
            <v-icon icon="mdi-shield-check" class="mr-3" />
          </template>
          <v-list-item-title>显示防烧屏提示</v-list-item-title>
          <v-list-item-subtitle>显示防烧屏技术提示卡片</v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="showAntiScreenBurnCard"
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
      showRandomButton: getSetting('display.showRandomButton'),
      showFullscreenButton: getSetting('display.showFullscreenButton'),
      cardHoverEffect: getSetting('display.cardHoverEffect'),
      enhancedTouchMode: getSetting('display.enhancedTouchMode'),
      showAntiScreenBurnCard: getSetting('display.showAntiScreenBurnCard')
    };

    return {
      localSettings: { ...settings },
      originalSettings: settings,
      isValid: true,
      displayOptions: [
        { title: '卡片', value: 'card' },
        { title: '按钮', value: 'button' }
      ]
    };
  },
  computed: {
    hasChanges() {
      return JSON.stringify(this.localSettings) !== JSON.stringify(this.originalSettings);
    },
    emptySubjectDisplay: {
      get() {
        return this.localSettings.emptySubjectDisplay;
      },
      set(value) {
        this.localSettings.emptySubjectDisplay = value;
        this.$emit('saved');
      }
    },
    dynamicSort: {
      get() {
        return this.localSettings.dynamicSort;
      },
      set(value) {
        this.localSettings.dynamicSort = value;
        this.$emit('saved');
      }
    },
    showRandomButton: {
      get() {
        return this.localSettings.showRandomButton;
      },
      set(value) {
        this.localSettings.showRandomButton = value;
        this.$emit('saved');
      }
    },
    showFullscreenButton: {
      get() {
        return this.localSettings.showFullscreenButton;
      },
      set(value) {
        this.localSettings.showFullscreenButton = value;
        this.$emit('saved');
      }
    },
    cardHoverEffect: {
      get() {
        return this.localSettings.cardHoverEffect;
      },
      set(value) {
        this.localSettings.cardHoverEffect = value;
        this.$emit('saved');
      }
    },
    enhancedTouchMode: {
      get() {
        return this.localSettings.enhancedTouchMode;
      },
      set(value) {
        this.localSettings.enhancedTouchMode = value;
        this.$emit('saved');
      }
    },
    showAntiScreenBurnCard: {
      get() {
        return this.localSettings.showAntiScreenBurnCard;
      },
      set(value) {
        this.localSettings.showAntiScreenBurnCard = value;
        this.$emit('saved');
      }
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
