<script lang="ts" setup>
import {RouterView} from 'vue-router'
import {Toaster} from '@/components/ui/sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Transition mode="out-in" name="page">
      <component :is="Component" :key="route.fullPath"/>
    </Transition>
  </RouterView>
  <Toaster class="pointer-events-auto"/>
</template>
