<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <v-icon size="x-large" color="primary" class="mr-3">mdi-database-sync</v-icon>
          <div>
            <h1 class="text-h4">数据迁移工具</h1>
            <div class="text-subtitle-1 text-grey">将现有数据迁移至 KV 存储系统</div>
          </div>
        </div>

        <v-card class="mb-6" variant="tonal" color="info" density="compact">
          <v-card-text class="d-flex align-center">
            <v-icon color="info" class="mr-2">mdi-information-outline</v-icon>
            <span>使用此工具可以将数据从旧存储系统迁移到新的 KV 存储系统，选择本地或云端迁移，以确保数据不会丢失。</span>
          </v-card-text>
        </v-card>

        <MigrationTool />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import MigrationTool from '@/components/MigrationTool.vue';

export default {
  name: 'DataMigrationPage',
  components: {
    MigrationTool
  },
  metaInfo: {
    title: '数据迁移工具'
  }
}
</script>