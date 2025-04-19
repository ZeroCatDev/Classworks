<template>
  <v-card border height="100%" class="glow-track" @click="!disabled && $emit('click')"
    @mousemove="handleMouseMove" @touchmove="handleTouchMove">
    <v-card-title>{{ subject.name }}</v-card-title>
    <v-card-text :style="contentStyle">
      <v-list>
        <v-list-item v-for="text in splitPoints(subject.content)" :key="text">
          {{ text }}
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'SubjectCard',
  props: {
    subject: {
      type: Object,
      required: true
    },
    contentStyle: {
      type: Object,
      default: () => ({})
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    splitPoints(content) {
      return content?.split("\n").filter(text => text.trim()) || [];
    },

    handleMouseMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--x', `${x}%`);
      card.style.setProperty('--y', `${y}%`);
    },

    handleTouchMove(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--x', `${x}%`);
        card.style.setProperty('--y', `${y}%`);
      }
    }
  }
}
</script>