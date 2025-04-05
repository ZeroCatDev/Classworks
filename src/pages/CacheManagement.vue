<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">缓存管理</h1>
        <p class="mb-6">在这里您可以查看和管理应用的缓存文件。清除缓存可能会导致应用需要重新下载资源。</p>
        <CacheManager />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import CacheManager from '@/components/CacheManager.vue';

export default {
  name: 'CacheManagementPage',
  components: {
    CacheManager
  }
}
</script> 