<template>
  <v-container>
    <v-card class="mb-4">
      <v-card-title>调试信息</v-card-title>
      <v-card-subtitle>
        请将这个ID复制并私聊给开发者，以便进行问题排查。
      </v-card-subtitle>
      <v-card-text>
        <div class="text-h6 mb-2">
          访客 ID
        </div>
        <v-code class="d-block pa-2 bg-grey-lighten-4 rounded mb-4">
          {{ visitorId || '加载中...' }}
        </v-code>
      </v-card-text>
      <v-card-actions>
        <v-btn
          color="primary"
          :loading="loading"
          @click="loadData"
        >
          Refresh
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getVisitorId, getFingerprintData } from '@/utils/visitorId'

const visitorId = ref('')
const fingerprintData = ref({})
const loading = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    visitorId.value = await getVisitorId()
    fingerprintData.value = await getFingerprintData()
  } catch (e) {
    console.error(e)
    visitorId.value = 'Error loading visitor ID'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
