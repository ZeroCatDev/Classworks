import { defineStore } from 'pinia'
import dataProvider from '@/utils/dataProvider'

export const useExamStore = defineStore('exam', {
  state: () => ({
    examList: [], // List of exam IDs
    exams: {}, // Map of ID -> Exam Details
    loadingList: false,
    loadingDetails: {}, // Map of ID -> boolean
  }),

  actions: {
    async fetchExamList() {
      if (this.loadingList) return
      this.loadingList = true
      try {
        const response = await dataProvider.loadData('es_list')
        if (Array.isArray(response)) {
          this.examList = response
        } else {
          this.examList = []
        }
      } catch (error) {
        console.error('Failed to load exam list:', error)
      } finally {
        this.loadingList = false
      }
    },

    async fetchExam(id) {
      if (this.exams[id]) return this.exams[id] // Return cached if available
      if (this.loadingDetails[id]) return // Prevent duplicate requests

      this.loadingDetails[id] = true
      try {
        const response = await dataProvider.loadData(`es_${id}`)
        if (response) {
          this.exams[id] = response
        }
        return response
      } catch (error) {
        console.error(`Failed to load exam details for ${id}:`, error)
      } finally {
        this.loadingDetails[id] = false
      }
    },

    async getUpcomingExams(limit = 25) {
      await this.fetchExamList()

      const upcoming = []
      const now = new Date()
      const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

      // Process up to 'limit' exams from the list
      const examsToCheck = this.examList.slice(0, limit)

      for (const item of examsToCheck) {
        let exam = this.exams[item.id]
        if (!exam) {
          exam = await this.fetchExam(item.id)
        }

        if (exam && exam.examInfos && Array.isArray(exam.examInfos)) {
          // Check if any subject in this exam starts within the next 2 days
          const hasUpcoming = exam.examInfos.some(info => {
            const start = new Date(info.start)
            return start >= now && start <= twoDaysLater
          })

          if (hasUpcoming) {
            upcoming.push({ id: item.id, ...exam })
          }
        }
      }

      return upcoming
    }
  }
})
