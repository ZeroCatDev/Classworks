<script setup>
import { ref, onMounted, onUnmounted, defineProps, defineEmits } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open'])

const isOpen = ref(props.open)
const menuRef = ref(null)

const toggle = () => {
  isOpen.value = !isOpen.value
  emit('update:open', isOpen.value)
}

const close = () => {
  if (isOpen.value) {
    isOpen.value = false
    emit('update:open', false)
  }
}

const handleClickOutside = (event) => {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="menuRef" class="relative inline-block text-left">
    <slot name="trigger" :toggle="toggle" :open="isOpen"></slot>

    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border z-50"
      :class="$attrs.class"
    >
      <div
        class="py-1 rounded-md bg-popover text-popover-foreground"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="options-menu"
      >
        <slot></slot>
      </div>
    </div>
  </div>
</template>