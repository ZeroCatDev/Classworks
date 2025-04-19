<template>
  <v-card border class="empty-subject-card" :disabled="disabled" @click="$emit('click')">
    <v-card-title class="text-subtitle-1">
      {{ subject.name }}
    </v-card-title>
    <v-card-text class="text-center">
      <v-icon size="small" color="grey"> mdi-plus </v-icon>
      <div class="text-caption text-grey">点击添加作业</div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'EmptySubjectCard',
  props: {
    subject: {
      type: Object,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  }
}
</script>