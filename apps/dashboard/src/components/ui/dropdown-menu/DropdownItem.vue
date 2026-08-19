<script setup>
import { defineProps } from 'vue'

defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div
    role="menuitem"
    class="px-4 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-muted hover:text-foreground transition-colors"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    :tabindex="disabled ? -1 : 0"
    v-bind="$attrs"
  >
    <slot></slot>
  </div>
</template>