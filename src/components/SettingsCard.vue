<template>
  <v-card elevation="2" class="settings-card rounded-lg">
    <v-card-item>
      <template #prepend>
        <v-icon
          :icon="icon"
          size="large"
          class="mr-2"
        />
      </template>
      <v-card-title class="text-h6">{{ title }}</v-card-title>
    </v-card-item>

    <v-card-text>
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
        class="mb-4"
      />
      <slot />
    </v-card-text>

    <v-card-actions v-if="$slots.actions" class="pa-4">
      <slot name="actions" />
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'SettingsCard',
  props: {
    title: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.settings-card {
  height: 100%;
}
</style>
