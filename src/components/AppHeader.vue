<template>
<v-app-bar :elevation="2">
  <template v-slot:prepend>
    <v-app-bar-nav-icon></v-app-bar-nav-icon>
  </template>

  <v-app-bar-title>作业</v-app-bar-title>
</v-app-bar>
</template>

<script>
export default {
  name: 'AppHeader'
}
</script>
