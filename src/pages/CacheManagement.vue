<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <v-icon size="x-large" color="primary" class="mr-3">mdi-database-cog-outline</v-icon>
          <div>
            <h1 class="text-h4 ">缓存管理</h1>
            <div class="text-subtitle-1 text-grey">管理应用的本地缓存资源</div>
          </div>
        </div>
        
        <v-card class="mb-6" variant="tonal" color="info" density="compact">
          <v-card-text class="d-flex align-center">
            <v-icon color="info" class="mr-2">mdi-information-outline</v-icon>
            <span>在这里您可以查看和管理应用的缓存文件。清除缓存可能会导致应用需要重新下载资源，但有助于解决某些显示问题。</span>
          </v-card-text>
        </v-card>
        
        <v-row>
          <v-col cols="12" md="8">
            <v-card class="mb-4" variant="tonal">
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <v-icon color="primary" class="mr-2">mdi-information</v-icon>
                  <span class="text-h6">什么是缓存？</span>
                </div>
                <p>缓存是浏览器在本地存储的网站资源副本，如图片、脚本和样式表等。这些缓存可以加快页面加载速度，减少数据使用，并在离线时提供基本功能。</p>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-card class="mb-4" variant="tonal">
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <v-icon color="warning" class="mr-2">mdi-lightbulb-outline</v-icon>
                  <span class="text-h6">何时清除缓存？</span>
                </div>
                <ul class="pl-4">
                  <li>应用显示过时的内容</li>
                  <li>界面出现异常</li>
                  <li>应用功能不正常</li>
                </ul>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        
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
  },
  metaInfo: {
    title: '缓存管理'
  }
}
</script> 