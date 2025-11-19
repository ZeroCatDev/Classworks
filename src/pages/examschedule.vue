<template>
  <v-container class="fill-height">
    <v-row>
      <v-col cols="12">
        <v-card
          border
          class="elevation-12"
        >
          <v-card-title class="d-flex align-center primary lighten-1 white--text py-3 px-4">
            <v-icon
              class="mr-2"
              color="white"
            >
              mdi-calendar-check
            </v-icon>
            考试看板
          </v-card-title>
          <v-card-subtitle>
            不只是考试看板。
          </v-card-subtitle>
          <v-card-text>
            <!-- 错误提示 -->
            <v-alert
              v-if="error"
              border="start"
              class="mb-4 mt-3 mx-2"
              closable
              type="error"
              variant="tonal"
              @click:close="error = ''"
            >
              <div class="d-flex align-center">
                <v-icon class="mr-2">
                  mdi-alert-circle
                </v-icon>
                {{ error }}
              </div>
            </v-alert>

            <!-- 成功提示 -->
            <v-alert
              v-if="success"
              border="start"
              class="mb-4 mt-3 mx-2"
              closable
              type="success"
              variant="tonal"
              @click:close="success = ''"
            >
              <div class="d-flex align-center">
                <v-icon class="mr-2">
                  mdi-check-circle
                </v-icon>
                {{ success }}
              </div>
            </v-alert>

            <!-- 操作按钮 -->
            <div class="d-flex justify-space-between align-center mb-4">
              <div class="d-flex align-center">
                <v-btn
                  class="mr-2"
                  color="primary"
                  prepend-icon="mdi-plus"
                  @click="createNewConfig"
                >
                  新建配置
                </v-btn>
                <v-btn
                  :loading="loading"
                  color="info"
                  prepend-icon="mdi-refresh"
                  variant="outlined"
                  @click="loadConfigs"
                >
                  刷新
                </v-btn>
              </div>
              <v-chip
                v-if="configs.length > 0"
                color="primary"
                prepend-icon="mdi-format-list-numbered"
              >
                {{ configs.length }} 个配置
              </v-chip>
            </div>

            <!-- 加载状态 -->
            <v-card
              v-if="loading"
              class="my-4"
              outlined
            >
              <v-card-text>
                <v-skeleton-loader
                  class="mx-auto"
                  type="list-item-avatar-two-line@3"
                />
              </v-card-text>
            </v-card>

            <!-- 配置列表 -->
            <v-card
              v-if="!loading && configs.length > 0"
              class="my-4"
              elevation="1"
            >
              <v-card-title class="d-flex align-center pa-4 bg-primary-lighten-5">
                <v-icon class="mr-2">
                  mdi-format-list-bulleted
                </v-icon>
                <span class="font-weight-bold">配置列表</span>
              </v-card-title>
              <v-list>
                <v-list-item
                  v-for="(config) in configs"
                  :key="config.id"
                  class="border-b"
                  style="cursor: pointer;"
                  @click="showEditDialog(config)"
                >
                  <template #prepend>
                    <v-avatar
                      class="mr-2"
                      color="primary"
                    >
                      <v-icon color="white">
                        mdi-calendar-text
                      </v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ config.examName || `配置 ${config.id}` }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption mt-1">
                    <div class="d-flex align-center">
                      <v-icon
                        class="mr-1"
                        size="small"
                      >
                        mdi-information-outline
                      </v-icon>
                      {{ config.message || '无描述' }}
                    </div>
                    <div class="d-flex align-center mt-1">
                      <v-icon
                        class="mr-1"
                        size="small"
                      >
                        mdi-book-multiple
                      </v-icon>
                      {{ config.examInfos ? config.examInfos.length : 0 }} 堂考试
                    </div>
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex align-center">
                      <v-btn
                        class="mr-1"
                        color="primary"
                        icon="mdi-pencil"
                        size="small"
                        variant="text"
                        @click="showEditDialog(config)"
                      >
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>

                      <v-btn
                        class="mr-1"
                        color="info"
                        icon="mdi-eye"
                        size="small"
                        variant="text"
                        @click="showEditDialog(config)"
                      >
                        <v-icon>mdi-eye</v-icon>
                      </v-btn>
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>

            <!-- 空状态 -->
            <v-card
              v-if="!loading && configs.length === 0"
              class="my-4"
              elevation="1"
            >
              <v-card-text class="text-center py-8">
                <v-icon
                  class="mb-4"
                  color="grey-lighten-1"
                  size="64"
                >
                  mdi-calendar-blank
                </v-icon>
                <h3 class="text-h6 mb-2 text-grey-darken-1">
                  暂无配置
                </h3>
                <p class="text-body-2 text-grey-darken-1 mb-4">
                  点击"新建配置"按钮创建您的第一个考试配置
                </p>
                <v-btn
                  color="primary"
                  prepend-icon="mdi-plus"
                  @click="createNewConfig"
                >
                  新建配置
                </v-btn>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 重命名对话框 -->
    <v-dialog
      v-model="renameDialog"
      max-width="500"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            color="primary"
          >
            mdi-rename-box
          </v-icon>
          重命名配置
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newConfigName"
            :rules="[v => !!v || '配置名称不能为空']"
            label="配置名称"
            prepend-inner-icon="mdi-calendar-text"
            variant="outlined"
            @keyup.enter="renameConfig"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="renameDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            :disabled="!newConfigName"
            :loading="renaming"
            color="primary"
            variant="outlined"
            @click="renameConfig"
          >
            确认
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 编辑配置弹框 -->
    <v-dialog
      v-model="editDialog"
      max-width="1200"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center primary lighten-1 white--text py-3 px-4">
          <v-icon
            class="mr-2"
            color="white"
          >
            mdi-pencil
          </v-icon>
          编辑考试配置
          <v-spacer />
          <v-chip
            v-if="editingConfig"
            class="mr-2"
            color="white"
            size="small"
            text-color="primary"
          >
            ID: {{ editingConfig.id }}
          </v-chip>

          <v-btn
            color="white"
            icon="mdi-close"
            variant="text"
            @click="closeEditDialog"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text
          class="pa-4"
          style="max-height: 70vh; overflow-y: auto;"
        >
          <ExamConfigEditor
            v-if="editingConfig"
            ref="configEditor"
            :config-id="editingConfig.id"
            :dialog-mode="true"
            @deleted="onConfigDeleted"
            @error="onConfigError"
            @opened="onConfigOpened"
            @saved="onConfigSaved"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn
            color="grey"
            prepend-icon="mdi-close"
            variant="outlined"
            @click="closeEditDialog"
          >
            关闭
          </v-btn>
          <v-spacer />
          <v-btn
            :loading="saving"
            color="success"
            prepend-icon="mdi-content-save"
            variant="outlined"
            @click="saveConfigInDialog"
          >
            保存配置
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import dataProvider from '@/utils/dataProvider'
import {getSetting} from '@/utils/settings'
import ExamConfigEditor from '@/components/ExamConfigEditor.vue'

export default {
  name: 'ExamScheduleManager',
  components: {
    ExamConfigEditor
  },
  data() {
    return {
      configs: [],
      loading: false,
      error: '',
      success: '',
      renameDialog: false,
      editDialog: false,
      configToRename: null,
      editingConfig: null,
      newConfigName: '',
      renaming: false,
      saving: false
    }
  },
  async mounted() {
    await this.loadConfigs()
  },
  methods: {
    /**
     * 初始化示例数据（仅在首次访问时）
     */
    async initializeExampleData() {
      const exampleConfigs = [
        {
          id: 'exam_example_001',
          examName: '期末考试安排',
          message: '请按时参加考试，携带学生证和身份证',
          examInfos: [
            {
              name: '数学',
              start: '2025/01/15 09:00',
              end: '2025/01/15 11:00'
            },
            {
              name: '英语',
              start: '2025/01/16 14:00',
              end: '2025/01/16 16:00'
            }
          ]
        },
        {
          id: 'exam_example_002',
          examName: '期中考试安排',
          message: '考试期间请保持安静',
          examInfos: [
            {
              name: '物理',
              start: '2025/01/20 10:00',
              end: '2025/01/20 12:00'
            },
            {
              name: '化学',
              start: '2025/01/21 14:00',
              end: '2025/01/21 16:00'
            }
          ]
        },
        {
          id: 'exam_example_003',
          examName: '模拟考试安排',
          message: '模拟考试，请认真对待',
          examInfos: [
            {
              name: '语文',
              start: '2025/01/25 09:00',
              end: '2025/01/25 11:30'
            }
          ]
        }
      ]

      // 保存配置列表
      const configList = exampleConfigs.map(c => ({id: c.id}))
      await dataProvider.saveData('es_list', configList)

      // 保存每个配置的详细信息
      for (let config of exampleConfigs) {
        const configData = {...config}
        delete configData.id
        await dataProvider.saveData(`es_${config.id}`, configData)
      }

      return exampleConfigs
    },

    /**
     * 加载配置列表
     */
    async loadConfigs() {
      this.loading = true
      this.error = ''

      try {
        // 读取配置列表
        const response = await dataProvider.loadData('es_list')

        if (response && response && response.length > 0) {
          // 配置列表存在，加载详细信息
          this.configs = []

          for (let configItem of response) {
            try {
              const detailResponse = await dataProvider.loadData(`es_${configItem.id}`)
              if (detailResponse) {
                this.configs.push({
                  id: configItem.id,
                  ...detailResponse
                })
              }
            } catch (err) {
              console.warn(`加载配置 es_${configItem.id} 失败:`, err)
            }
          }
        } else {
          // 配置列表不存在或为空，初始化示例数据
          this.configs = await this.initializeExampleData()
        }
      } catch (err) {
        this.error = '加载配置列表失败: ' + err.message
        this.configs = []
      } finally {
        this.loading = false
      }
    },

    /**
     * 创建新配置
     */
    async createNewConfig() {
      const newId = Date.now().toString()

      const defaultConfig = {
        examName: '新考试配置',
        message: '请编辑此配置',
        room: getSetting('server.classNumber') || '待定',
        examInfos: [
          {
            name: '科目1',
            start: '2025/08/29 16:27',
            end: '2025/08/29 17:27'
          }
        ]
      }

      try {
        // 保存新配置
        const saveResponse = await dataProvider.saveData(`es_${newId}`, defaultConfig)
        if (!saveResponse) {
          throw new Error(saveResponse.error?.message || '保存失败')
        }

        // 更新本地配置列表
        this.configs.push({
          id: newId,
          ...defaultConfig
        })

        // 更新存储的配置列表
        const currentList = this.configs.map(c => ({id: c.id}))
        const listResponse = await dataProvider.saveData('es_list', currentList)
        if (!listResponse) {
          throw new Error(listResponse.error?.message || '更新列表失败')
        }

        this.success = '新配置创建成功'

        // 直接打开编辑对话框
        const newConfig = this.configs.find(c => c.id === newId)
        if (newConfig) {
          this.editingConfig = newConfig
          this.editDialog = true
        }
      } catch (err) {
        this.error = '创建配置失败: ' + err.message
      }
    },


    /**
     * 显示重命名对话框
     */
    showRenameDialog(config) {
      this.configToRename = config
      this.newConfigName = config.examName || `配置 ${config.id}`
      this.renameDialog = true
    },

    /**
     * 重命名配置
     */
    async renameConfig() {
      if (!this.configToRename || !this.newConfigName) return

      this.renaming = true

      try {
        // 准备更新的配置数据（不包含id）
        const configData = {
          examName: this.newConfigName,
          message: this.configToRename.message,
          examInfos: this.configToRename.examInfos
        }

        const saveResponse = await dataProvider.saveData(`es_${this.configToRename.id}`, configData)
        if (!saveResponse) {
          throw new Error(saveResponse.error?.message || '保存失败')
        }

        // 更新本地配置列表中的对应项
        const configIndex = this.configs.findIndex(c => c.id === this.configToRename.id)
        if (configIndex !== -1) {
          this.configs[configIndex].examName = this.newConfigName
        }

        this.success = '配置重命名成功'
        this.renameDialog = false
        this.configToRename = null
        this.newConfigName = ''
      } catch (err) {
        this.error = '重命名配置失败: ' + err.message
      } finally {
        this.renaming = false
      }
    },

    /**
     * 显示编辑弹框
     */
    showEditDialog(config) {
      this.editingConfig = config
      this.editDialog = true
    },

    /**
     * 关闭编辑弹框
     */
    closeEditDialog() {
      this.editDialog = false
      this.editingConfig = null
      this.saving = false
    },


    /**
     * 在弹框中保存配置
     */
    async saveConfigInDialog() {
      if (this.$refs.configEditor) {
        this.saving = true
        try {
          await this.$refs.configEditor.saveConfig()
        } catch (error) {
          console.error('保存配置失败:', error)
        } finally {
          this.saving = false
        }
      }
    },

    /**
     * 配置保存成功回调
     */
    onConfigSaved() {
      this.success = '配置保存成功！'
      this.loadConfigs() // 重新加载配置列表
      setTimeout(() => {
        this.success = ''
      }, 3000)
    },

    /**
     * 配置保存错误回调
     */
    onConfigError(error) {
      this.error = error || '保存配置时发生错误'
      setTimeout(() => {
        this.error = ''
      }, 5000)
    },

    /**
     * 配置打开成功回调
     */
    onConfigOpened() {
      this.success = '配置已在新窗口中打开'
      setTimeout(() => {
        this.success = ''
      }, 3000)
    },

    /**
     * 处理配置删除事件
     */
    onConfigDeleted(result) {
      if (result.success) {
        this.success = result.message || "配置删除成功"
        // 关闭编辑对话框
        this.editDialog = false
        // 刷新配置列表
        this.loadConfigs()
      } else {
        this.error = result.message || "删除失败"
      }
    }
  }
}
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.border-b:last-child {
  border-bottom: none;
}
</style>
