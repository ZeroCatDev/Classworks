<template>
  <div>
    <setting-group
      title="一言设置"
      icon="mdi-comment-quote"
    >
      <setting-item setting-key="hitokoto.enabled" />
      <setting-item setting-key="hitokoto.refreshInterval" />
    </setting-group>

    <setting-group
      title="数据源配置"
      icon="mdi-cloud-sync"
      class="mt-4"
    >
      <div class="text-caption text-grey px-4 pt-2 pb-2">
        以下配置将同步到云端，对所有连接此班级的设备生效。
      </div>

      <v-list-item>
        <v-list-item-title class="mb-2">
          启用数据源
        </v-list-item-title>
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
          <v-icon
            size="x-small"
            color="orange"
            class="mr-1"
          >
            mdi-alert
          </v-icon>
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

      <v-list-item v-if="kvConfig.sources.includes('jinrishici')">
        <div class="d-flex flex-column flex-sm-row align-center w-100">
          <v-btn
            :loading="testLoading"
            color="primary"
            variant="outlined"
            class="mr-sm-4 mb-2 mb-sm-0"
            @click="testJinrishici"
          >
            测试今日诗词接口
          </v-btn>
          <v-alert
            v-if="testMessage"
            :type="testColor"
            density="comfortable"
            border="start"
            class="flex-grow-1"
          >
            {{ testMessage }}
          </v-alert>
        </div>
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
      <v-list-item>
        <v-checkbox
          v-model="enableCloudSensitiveWords"
          label="启用云端敏感词列表"
          hide-details
          density="compact"
          disabled
          class="mb-2"
        />
        <div class="text-caption text-grey">
          已启用的数据源将在获取一言时随机尝试，直到成功获取内容为止。<br>
          敏感词过滤会将包含任意敏感词的句子过滤掉，避免显示不当内容。<br>
        </div>
      </v-list-item>

      <div
        v-if="loading"
        class="text-center pb-4"
      >
        <v-progress-circular
          indeterminate
          size="24"
          color="primary"
        />
        <span class="ml-2 text-caption">正在同步配置...</span>
      </div>
    </setting-group>

    <v-dialog
      v-model="testResultDialog"
      max-width="600"
    >
      <v-card
        v-if="testResultData"
        class="rounded-lg"
      >
        <v-card-text class="pa-0">
          <v-list
            lines="two"
            class="py-0"
          >
            <v-list-item class="px-4 py-3">
              <template #prepend>
                <v-avatar
                  color="primary"
                  variant="tonal"
                  class="mr-2"
                >
                  <v-icon icon="mdi-key-variant" />
                </v-avatar>
              </template>
              <v-list-item-title class="text-subtitle-2 font-weight-bold mb-1">
                Token
              </v-list-item-title>
              <v-list-item-subtitle
                class="text-body-2 text-high-emphasis"
                style="word-break: break-all;"
              >
                {{ testResultData.data.token }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider />

            <v-row no-gutters>
              <v-col cols="6">
                <v-list-item class="px-4 py-2">
                  <template #prepend>
                    <v-icon
                      icon="mdi-ip-network"
                      color="grey-darken-1"
                      class="mr-2"
                    />
                  </template>
                  <v-list-item-title class="text-caption text-grey-darken-1">
                    IP 地址
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-body-2">
                    {{ testResultData.data.ip }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-col>
              <v-col cols="6">
                <v-list-item class="px-4 py-2">
                  <template #prepend>
                    <v-icon
                      icon="mdi-map-marker-radius"
                      color="grey-darken-1"
                      class="mr-2"
                    />
                  </template>
                  <v-list-item-title class="text-caption text-grey-darken-1">
                    地区
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-body-2">
                    {{ testResultData.data.region }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-col>
            </v-row>

            <v-divider />



            <v-container class="px-4 py-3">
              <v-row dense>
                <v-col
                  cols="6"
                  sm="4"
                >
                  <div class="d-flex align-center mb-2">
                    <v-icon
                      icon="mdi-thermometer"
                      color="orange"
                      class="mr-2"
                    />
                    <div>
                      <div class="text-caption text-grey">
                        温度
                      </div>
                      <div class="text-body-1 font-weight-medium">
                        {{ testResultData.data.weatherData.temperature }}°C
                      </div>
                    </div>
                  </div>
                </v-col>
                <v-col
                  cols="6"
                  sm="4"
                >
                  <div class="d-flex align-center mb-2">
                    <v-icon
                      icon="mdi-weather-cloudy"
                      color="blue-grey"
                      class="mr-2"
                    />
                    <div>
                      <div class="text-caption text-grey">
                        天气
                      </div>
                      <div class="text-body-1 font-weight-medium">
                        {{ testResultData.data.weatherData.weather }}
                      </div>
                    </div>
                  </div>
                </v-col>
                <v-col
                  cols="6"
                  sm="4"
                >
                  <div class="d-flex align-center mb-2">
                    <v-icon
                      icon="mdi-water-percent"
                      color="blue"
                      class="mr-2"
                    />
                    <div>
                      <div class="text-caption text-grey">
                        湿度
                      </div>
                      <div class="text-body-1 font-weight-medium">
                        {{ testResultData.data.weatherData.humidity }}%
                      </div>
                    </div>
                  </div>
                </v-col>
                <v-col
                  cols="6"
                  sm="4"
                >
                  <div class="d-flex align-center mb-2">
                    <v-icon
                      icon="mdi-weather-windy"
                      color="teal"
                      class="mr-2"
                    />
                    <div>
                      <div class="text-caption text-grey">
                        风向/风力
                      </div>
                      <div class="text-body-2 font-weight-medium">
                        {{ testResultData.data.weatherData.windDirection }} {{ testResultData.data.weatherData.windPower }}级
                      </div>
                    </div>
                  </div>
                </v-col>
                <v-col
                  cols="6"
                  sm="4"
                >
                  <div class="d-flex align-center mb-2">
                    <v-icon
                      icon="mdi-blur"
                      color="grey"
                      class="mr-2"
                    />
                    <div>
                      <div class="text-caption text-grey">
                        PM2.5
                      </div>
                      <div class="text-body-1 font-weight-medium">
                        {{ testResultData.data.weatherData.pm25 }}
                      </div>
                    </div>
                  </div>
                </v-col>
                <v-col
                  cols="6"
                  sm="4"
                >
                  <div class="d-flex align-center mb-2">
                    <v-icon
                      icon="mdi-eye"
                      color="indigo"
                      class="mr-2"
                    />
                    <div>
                      <div class="text-caption text-grey">
                        能见度
                      </div>
                      <div class="text-body-1 font-weight-medium">
                        {{ testResultData.data.weatherData.visibility }}
                      </div>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-container>

            <v-divider />

            <div class="px-4 py-3">
              <div class="text-caption text-grey mb-2">
                环境标签
              </div>
              <div class="d-flex flex-wrap gap-2">
                <v-chip
                  v-for="tag in testResultData.data.tags"
                  :key="tag"
                  size="small"
                  color="primary"
                  variant="tonal"
                  class="mr-1 mb-1"
                >
                  {{ tag }}
                </v-chip>
              </div>
            </div>

            <v-divider />

            <v-list-item class="px-4 py-2">
              <template #prepend>
                <v-icon
                  icon="mdi-clock-outline"
                  size="small"
                  class="mr-2"
                />
              </template>
              <v-list-item-title class="text-caption text-grey-darken-1">
                北京时间: {{ new Date(testResultData.data.beijingTime).toLocaleString() }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
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
      loading: false,
      testLoading: false,
      testMessage: '',
      testColor: 'info',
      testResultDialog: false,
      testResultData: null,
      enableCloudSensitiveWords: true
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
    },
    async testJinrishici() {
      this.testLoading = true
      this.testMessage = ''
      this.testColor = 'info'
      try {
        const headers = {}
        if (this.kvConfig.jinrishiciToken) {
          headers['X-User-Token'] = this.kvConfig.jinrishiciToken
        }
        const res = await axios.get('https://v2.jinrishici.com/info?X-User-Token='+encodeURIComponent(this.kvConfig.jinrishiciToken))
        if (res.data && res.data.status === 'success') {
          this.testResultData = res.data
          this.testResultDialog = true

          const token = res.data.data?.token
          const region = res.data.data?.region
          const consistent = this.kvConfig.jinrishiciToken ? token === this.kvConfig.jinrishiciToken : true
          this.testColor = consistent ? 'success' : 'warning'
          this.testMessage = consistent
            ? `接口正常，Token 一致：${token}${region ? `，地区：${region}` : ''}`
            : `接口返回 Token 与当前设置不一致：${token}${region ? `，地区：${region}` : ''}`
        } else {
          this.testColor = 'error'
          this.testMessage = '接口返回非 success，请检查网络或 Token 配置。'
        }
      } catch (e) {
        console.error('Failed to test jinrishici info', e)
        this.testColor = 'error'
        this.testMessage = '接口测试失败，请检查网络或 Token。'
      } finally {
        this.testLoading = false
      }
    }
  }
}
</script>
