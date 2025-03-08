<template>
  <v-app>
    <v-main>
      <router-view v-slot="{ Component, route }">
        <transition name="md3" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </v-main>
  </v-app>
</template>

<script setup>
  //
</script>
<style>

.md3-enter-active,
.md3-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.md3-enter-from {
  opacity: 0;
  transform: translateX(0.5vw);
}

.md3-leave-to {
  opacity: 0;
  transform: translateX(-0.5vw);
}</style>
