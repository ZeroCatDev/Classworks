<template>
  <v-card
    class="hitokoto-card"
    elevation="2"
    border
    rounded="xl"
    :loading="loading"
    height="100%"
    @click="fetchSentence"
  >
    <v-card-text
      class="pa-6 d-flex flex-column justify-center"
      style="height: 100%"
    >
      <div
        class="font-weight-medium mb-4 serif-font"
        :style="contentStyle"
      >
        {{ sentence }}
      </div>
      <div
        class="text-medium-emphasis serif-font"
        :style="authorStyle"
      >
        <span
          v-if="author"
          class="mr-2"
        >{{ author }}</span>
        <span v-if="origin">《{{ origin }}》</span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { SettingsManager, watchSettings } from '@/utils/settings'
import dataProvider from '@/utils/dataProvider'
import axios from 'axios'
import { Base64 } from 'js-base64'

// 全局敏感词列表，强制生效。
const GLOBAL_SENSITIVE_WORDS_ENCODED = [
  '6IO4',
  '5Lmz',
  '6JCd6I6J',
  '5rer',
  '5aW4',
]

// 解码敏感词列表
const GLOBAL_SENSITIVE_WORDS = GLOBAL_SENSITIVE_WORDS_ENCODED.map(word => Base64.decode(word))

export default {
  name: 'HitokotoCard',
  data() {
    return {
      enabled: false,
      refreshInterval: 60,
      kvConfig: {
        sources: ['zhaoyu'],
        sensitiveWords: []
      },
      sentence: '',
      author: '',
      origin: '',
      loading: false,
      timer: null,
      unwatch: null,
      fontSize: 28 // Will be updated in mounted()
    }
  },
  computed: {
    contentStyle() {
      const HITOKOTO_FONT_RATIO = 0.85 // Hitokoto font size is 85% of the general font size
      return {
        'font-size': `${this.fontSize * HITOKOTO_FONT_RATIO}px`,
        'white-space': 'pre-wrap',
        'line-height': '1.6',
        'text-align': 'left'
      }
    },
    authorStyle() {
      const HITOKOTO_FONT_RATIO = 0.85 // Hitokoto font size is 85% of the general font size
      const AUTHOR_FONT_RATIO = 0.6 // Author font size is 60% of the main font size
      return {
        'font-size': `${this.fontSize * HITOKOTO_FONT_RATIO * AUTHOR_FONT_RATIO}px`,
        'text-align': 'left'
      }
    }
  },
  async mounted() {
    this.loadLocalSettings()
    await this.loadKvSettings()

    this.fetchSentence()
    this.startTimer()

    this.unwatch = watchSettings(() => {
      this.loadLocalSettings()
      this.startTimer()
    })
  },
  beforeUnmount() {
    this.stopTimer()
    if (this.unwatch) {
      this.unwatch()
    }
  },
  methods: {
    loadLocalSettings() {
      this.enabled = SettingsManager.getSetting('hitokoto.enabled')
      this.refreshInterval = SettingsManager.getSetting('hitokoto.refreshInterval')
      this.fontSize = SettingsManager.getSetting('font.size')
    },
    async loadKvSettings() {
      try {
        const res = await dataProvider.loadData('sentence-info')
        let data = res
        if (res && res.data) {
          data = res.data
        }

        if (data) {
          this.kvConfig = {
            sources: Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : ['zhaoyu'],
            sensitiveWords: data.sensitiveWords ? data.sensitiveWords.split(/[,，]/).map(w => w.trim()).filter(w => w) : [],
            jinrishiciToken: data.jinrishiciToken
          }
        }
      } catch (e) {
        console.error('Failed to load sentence-info', e)
      }
    },
    startTimer() {
      if (this.timer) clearInterval(this.timer)
      if (this.refreshInterval > 0) {
        this.timer = setInterval(this.fetchSentence, this.refreshInterval * 1000)
      }
    },
    stopTimer() {
      if (this.timer) clearInterval(this.timer)
    },
    async fetchSentence() {
      if (this.loading) return
      this.loading = true
      try {
        // Pick random source
        const sources = this.kvConfig.sources
        const source = sources[Math.floor(Math.random() * sources.length)]

        let data = null
        let content = ''
        let author = ''
        let origin = ''

        if (source === 'hitokoto') {
          const res = await axios.get('https://v1.hitokoto.cn/')
          data = res.data
          content = data.hitokoto
          author = data.from_who
          origin = data.from
        } else if (source === 'zhaoyu') {
          const res = await axios.get('https://hub.saintic.com/openservice/sentence/all.json')
          if (res.data.success) {
            data = res.data.data
            content = data.sentence || data.content || data.name
            author = data.author
            origin = data.name || data.origin
          }
        } else if (source === 'jinrishici') {
          if (this.kvConfig.jinrishiciToken) {
            const res = await axios.get('https://v2.jinrishici.com/one.json?client=npm-sdk/1.0&X-User-Token='+encodeURIComponent(this.kvConfig.jinrishiciToken), {
            })
            if (res.data.status === 'success') {
              data = res.data.data
              content = data.content
              author = data.origin.author
              origin = data.origin.title
            }
          } else {
            // Token missing, maybe retry with another source or just fail silently
            // For now, let's just log it. The settings page should handle token generation.
            console.warn('Jinrishici token missing. Please enable it in settings to generate a token.')
            // Retry to pick another source to avoid empty card
            this.loading = false
            return this.fetchSentence()
          }
        }

        if (content) {
          // Sensitive word check (global + KV)
          const combinedWords = [...GLOBAL_SENSITIVE_WORDS, ...this.kvConfig.sensitiveWords]
          const hasSensitiveWord = combinedWords.some(word => word && content.includes(word))
          if (hasSensitiveWord) {
            // Retry
            this.loading = false
            return this.fetchSentence()
          }

          this.sentence = content
          this.author = author || ''
          this.origin = origin || '未知'
        }
      } catch (e) {
        console.error('Failed to fetch sentence', e)
        this.sentence = '获取失败'
        this.author = ''
        this.origin = ''
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.hitokoto-card {
  cursor: pointer;
  transition: all 0.3s ease;
}
.hitokoto-card:hover {
  transform: translateY(-2px);
}
.serif-font {
  font-family: "Noto Serif SC", "Source Han Serif SC", "Source Han Serif", source-han-serif-sc, "Songti SC", "SimSun", "Hiragino Sans GB", system-ui, serif;
}
</style>
