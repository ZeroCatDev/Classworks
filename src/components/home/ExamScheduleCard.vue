<template>
  <v-card class="fill-height d-flex flex-column rounded-xl" elevation="2">
    <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
      <v-icon class="mr-2">mdi-calendar-clock</v-icon>
      <span class="text-truncate">{{ exam?.examName || '加载中...' }}</span>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-close" variant="text" density="comfortable" @click="$emit('close')"></v-btn>
    </v-card-title>

    <v-card-text class="flex-grow-1 pa-4 overflow-y-auto" :style="contentStyle">
      <div v-if="loading" class="d-flex justify-center align-center fill-height" style="min-height: 200px;">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>

      <template v-else-if="exam">
        <v-alert
          v-if="exam.message"
          color="info"
          variant="tonal"
          class="mb-4 text-body-1"
          border="start"
          density="compact"
        >
          {{ exam.message }}
        </v-alert>

        <v-list density="comfortable" class="pa-0 bg-transparent">
          <v-list-item v-for="(info, index) in exam.examInfos" :key="index" class="px-0 mb-3">
            <template #prepend>
               <v-avatar color="primary" variant="tonal" size="large" class="mr-3 font-weight-bold elevation-1">
                 {{ info.name.charAt(0) }}
               </v-avatar>
            </template>

            <v-list-item-title class="font-weight-bold text-h6 mb-1">
              {{ info.name }}
            </v-list-item-title>

            <v-list-item-subtitle class="text-body-1">
              <div class="d-flex align-center mb-1">
                 <v-icon size="small" color="success" class="mr-2">mdi-clock-start</v-icon>
                 <span class="font-weight-medium">{{ formatTime(info.start) }}</span>
              </div>
              <div class="d-flex align-center">
                 <v-icon size="small" color="error" class="mr-2">mdi-clock-end</v-icon>
                 <span class="font-weight-medium">{{ formatTime(info.end) }}</span>
              </div>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </template>

      <div v-else class="d-flex flex-column align-center justify-center fill-height text-grey mt-4">
        <v-icon size="large" class="mb-2">mdi-alert-circle-outline</v-icon>
        无法加载考试信息
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { useExamStore } from '@/stores/examStore'
import { mapState, mapActions } from 'pinia'

export default {
  name: 'ExamScheduleCard',
  props: {
    examId: {
      type: String,
      required: true
    },
    contentStyle: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    ...mapState(useExamStore, ['exams', 'loadingDetails']),
    exam() {
      return this.exams[this.examId]
    },
    loading() {
      return this.loadingDetails[this.examId]
    }
  },
  mounted() {
    this.fetchExam(this.examId)
  },
  methods: {
    ...mapActions(useExamStore, ['fetchExam']),
    formatTime(timeStr) {
      if (!timeStr) return ''
      try {
        const date = new Date(timeStr)
        // Format: MM-DD HH:mm
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${month}-${day} ${hours}:${minutes}`
      } catch (e) {
        return timeStr
      }
    }
  }
}
</script>

<style scoped>
.v-list-item-title {
  white-space: normal;
}
</style>
