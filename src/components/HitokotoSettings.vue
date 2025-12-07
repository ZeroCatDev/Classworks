<template>
  <div>
    <setting-group title="一言设置" icon="mdi-comment-quote">
      <setting-item setting-key="hitokoto.enabled" />
      <setting-item setting-key="hitokoto.refreshInterval" />
    </setting-group>

    <setting-group title="数据源配置" icon="mdi-cloud-sync" class="mt-4">
      <div class="text-caption text-grey px-4 pt-2 pb-2">以下配置将同步到云端，对所有连接此班级的设备生效。</div>

      <v-list-item>
        <v-list-item-title class="mb-2">启用数据源</v-list-item-title>
        <div class="d-flex flex-wrap gap-2">
          <v-checkbox
            v-model="kvConfig.sources"
            label="一言 (Hitokoto)"
            value="hitokoto"
            hide-details
            density="compact"
            class="mr-4"
            :disabled="loading"
            @update:model-value="saveKvSettings"
          />
          <v-checkbox
            v-model="kvConfig.sources"
            label="诏预 (Zhaoyu)"
            value="zhaoyu"
            hide-details
            density="compact"
            class="mr-4"
            :disabled="loading"
            @update:model-value="saveKvSettings"
          />
          <v-checkbox
            v-model="kvConfig.sources"
            label="今日诗词 (Jinrishici)"
            value="jinrishici"
            hide-details
            density="compact"
            :disabled="loading"
            @update:model-value="saveKvSettings"
          />
        </div>
        <div class="text-caption text-orange mt-2">
          <v-icon size="x-small" color="orange" class="mr-1">mdi-alert</v-icon>
          一言（Hitokoto）数据源已收到关于存在负面内容的大量反馈，请用户谨慎启用。
        </div>
      </v-list-item>

      <v-list-item v-if="kvConfig.sources.includes('jinrishici')">
        <v-text-field
          v-model="kvConfig.jinrishiciToken"
          label="今日诗词 Token"
          variant="outlined"
          density="comfortable"
          :disabled="loading"
          hint="留空则自动获取，也可以手动输入已有 Token"
          persistent-hint
          class="mt-2"
          @change="saveKvSettings"
        />
      </v-list-item>

      <v-list-item>
        <v-textarea
          v-model="kvConfig.sensitiveWords"
          :disabled="loading"
          label="敏感词过滤 (用逗号分隔)"
          variant="outlined"
          rows="3"
          auto-grow
          hide-details
          class="mt-2 mb-2"
          @change="saveKvSettings"
        />
      </v-list-item>

      <div v-if="loading" class="text-center pb-4">
        <v-progress-circular indeterminate size="24" color="primary" />
        <span class="ml-2 text-caption">正在同步配置...</span>
      </div>
    </setting-group>
  </div>
</template>

<script>
import SettingGroup from './settings/SettingGroup.vue'
import SettingItem from './settings/SettingItem.vue'
import dataProvider from '@/utils/dataProvider'
import axios from 'axios'

export default {
  name: 'HitokotoSettings',
  components: {
    SettingGroup,
    SettingItem
  },
  data() {
    return {
      kvConfig: {
        sources: ['zhaoyu'],
        sensitiveWords: '',
        jinrishiciToken: null
      },
      loading: false
    }
  },
  mounted() {
    this.loadKvSettings()
  },
  methods: {
    async loadKvSettings() {
      this.loading = true
      try {
        const res = await dataProvider.loadData('sentence-info')
        let data = res
        if (res && res.data) {
          data = res.data
        }

        if (data) {
          this.kvConfig = {
            sources: Array.isArray(data.sources) ? data.sources : ['zhaoyu'],
            sensitiveWords: data.sensitiveWords || '',
            jinrishiciToken: data.jinrishiciToken
          }
        }
      } catch (e) {
        console.error('Failed to load sentence-info', e)
      } finally {
        this.loading = false
      }
    },
    async saveKvSettings() {
      this.loading = true
      try {
        // Check if jinrishici is enabled and token is missing
        if (this.kvConfig.sources.includes('jinrishici') && !this.kvConfig.jinrishiciToken) {
          try {
            const tokenRes = await axios.get('https://v2.jinrishici.com/token')
            if (tokenRes.data.status === 'success') {
              this.kvConfig.jinrishiciToken = tokenRes.data.data
            }
          } catch (e) {
            console.error('Failed to get jinrishici token', e)
          }
        }

        await dataProvider.saveData('sentence-info', this.kvConfig)
      } catch (e) {
        console.error('Failed to save sentence-info', e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
