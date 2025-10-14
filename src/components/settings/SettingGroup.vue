<template>
  <v-card
    :border="border"
    class="setting-group"
  >
    <v-card-title
      v-if="title"
      class="d-flex align-center"
    >
      <v-icon
        v-if="icon"
        :icon="icon"
        class="mr-2"
      />
      {{ title }}
    </v-card-title>
    
    <v-card-subtitle v-if="description">
      {{ description }}
    </v-card-subtitle>
    
    <v-card-text>
      <v-list>
        <slot>
          <!-- 默认插槽用于放置 SettingItem 组件 -->
        </slot>
      </v-list>
    </v-card-text>
    
    <v-card-actions v-if="$slots.actions">
      <slot name="actions" />
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'SettingGroup',
  
  props: {
    /**
     * 设置组的标题
     */
    title: {
      type: String,
      default: null
    },
    
    /**
     * 设置组的描述
     */
    description: {
      type: String,
      default: null
    },
    
    /**
     * 设置组的图标
     */
    icon: {
      type: String,
      default: null
    },
    
    /**
     * 是否显示边框
     */
    border: {
      type: Boolean,
      default: false
    }
  },
  
  methods: {
    onSettingUpdate(key, value) {
      this.$emit('update', key, value);
    },
    
    onSettingError(key) {
      this.$emit('error', key);
    }
  }
};
</script>

<style scoped>
.setting-group {
  margin-bottom: 16px;
}
</style> 