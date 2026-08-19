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
                  class="mr-2"
                  color="success"
                  prepend-icon="mdi-import"
                  variant="outlined"
                  @click="showImportDialog"
                >
                  导入配置
                </v-btn>
                <v-btn
                  class="mr-2"
                  color="purple"
                  prepend-icon="mdi-brain"
                  variant="outlined"
                  @click="showAIDialog"
                >
                  AI生成
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

    <!-- 导入配置弹框 -->
    <v-dialog
      v-model="importDialog"
      max-width="800"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center primary lighten-1 white--text py-3 px-4">
          <v-icon
            class="mr-2"
            color="white"
          >
            mdi-import
          </v-icon>
          导入考试配置
          <v-spacer />
          <v-btn
            color="white"
            icon="mdi-close"
            variant="text"
            @click="closeImportDialog"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-alert
            v-if="importError"
            border="start"
            class="mb-4"
            closable
            type="error"
            variant="tonal"
            @click:close="importError = ''"
          >
            {{ importError }}
          </v-alert>

          <v-textarea
            v-model="importJson"
            :rules="[v => !!v || 'JSON内容不能为空']"
            label="请输入JSON配置"
            placeholder="{
  &quot;examName&quot;: &quot;期末考试&quot;,
  &quot;message&quot;: &quot;考试信息&quot;,
  &quot;room&quot;: &quot;01&quot;,
  &quot;examInfos&quot;: [
    {
      &quot;name&quot;: &quot;语文&quot;,
      &quot;start&quot;: &quot;2025/12/14 09:00&quot;,
      &quot;end&quot;: &quot;2025/12/14 11:00&quot;
    }
  ]
}"
            prepend-inner-icon="mdi-code-json"
            rows="15"
            variant="outlined"
          />

          <v-alert
            border="start"
            class="mt-2"
            density="compact"
            type="info"
            variant="tonal"
          >
            <div class="text-caption">
              <strong>提示:</strong>
              <ul class="mt-1">
                <li>日期格式支持: YYYY/MM/DD HH:mm 或 YYYY-MM-DD HH:mm:ss</li>
                <li>虚拟日期格式: 0000-00-01 (表示第1天), 0000-00-02 (第2天)...</li>
                <li>如使用虚拟日期,系统会要求您指定起始日期</li>
                <li>缺省字段将自动填充默认值</li>
              </ul>
            </div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn
            color="grey"
            prepend-icon="mdi-close"
            variant="outlined"
            @click="closeImportDialog"
          >
            取消
          </v-btn>
          <v-spacer />
          <v-btn
            :disabled="!importJson"
            :loading="importing"
            color="success"
            prepend-icon="mdi-check"
            variant="outlined"
            @click="processImport"
          >
            导入
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 日期选择弹框 -->
    <v-dialog
      v-model="datePickerDialog"
      max-width="500"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center primary lighten-1 white--text py-3 px-4">
          <v-icon
            class="mr-2"
            color="white"
          >
            mdi-calendar
          </v-icon>
          选择起始日期
        </v-card-title>
        <v-card-text class="pa-4">
          <p class="mb-4 text-body-2">
            检测到配置中使用了虚拟日期格式 (0000-00-XX)，请选择第一天的日期，系统将自动推算其他日期。
          </p>

          <v-text-field
            v-model="baseDate"
            label="起始日期"
            prepend-inner-icon="mdi-calendar"
            type="date"
            variant="outlined"
          />

          <v-alert
            v-if="virtualDateInfo"
            border="start"
            class="mt-2"
            density="compact"
            type="info"
            variant="tonal"
          >
            <div class="text-caption">
              检测到 {{ virtualDateInfo.count }} 个虚拟日期，跨度 {{ virtualDateInfo.span }} 天
            </div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn
            color="grey"
            prepend-icon="mdi-close"
            variant="outlined"
            @click="cancelDatePicker"
          >
            取消
          </v-btn>
          <v-spacer />
          <v-btn
            :disabled="!baseDate"
            color="primary"
            prepend-icon="mdi-check"
            variant="outlined"
            @click="confirmDatePicker"
          >
            确认
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- AI生成提示词弹框 -->
    <v-dialog
      v-model="aiDialog"
      max-width="900"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center purple lighten-1 white--text py-3 px-4">
          <v-icon
            class="mr-2"
            color="white"
          >
            mdi-brain
          </v-icon>
          AI生成考试配置
          <v-spacer />
          <v-btn
            color="white"
            icon="mdi-close"
            variant="text"
            @click="closeAIDialog"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-alert
            border="start"
            class="mb-4"
            type="info"
            variant="tonal"
          >
            <div class="d-flex align-center">
              <div>
                复制下方提示词到任意AI工具（如ChatGPT、Claude、Copilot等），描述您的考试安排，AI将生成符合格式的JSON配置。生成后复制JSON内容，通过“导入配置”按钮导入即可。
              </div>
            </div>
          </v-alert>

          <div class="mb-3">
            <div class="d-flex justify-space-between align-center mb-2">
              <h3 class="text-h6">
                提示词模板
              </h3>
              <v-btn
                :color="copied ? 'success' : 'primary'"
                :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
                size="small"
                variant="tonal"
                @click="copyPrompt"
              >
                {{ copied ? '已复制' : '复制提示词' }}
              </v-btn>
            </div>

            <v-card
              class="pa-4"
              variant="outlined"
            >
              <pre class="ai-prompt-text">{{ aiPrompt }}</pre>
            </v-card>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn
            color="grey"
            prepend-icon="mdi-close"
            variant="outlined"
            @click="closeAIDialog"
          >
            关闭
          </v-btn>
          <v-spacer />
          <v-btn
            color="success"
            prepend-icon="mdi-import"
            variant="outlined"
            @click="goToImport"
          >
            去导入配置
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
      saving: false,
      // 导入相关
      importDialog: false,
      importJson: '',
      importError: '',
      importing: false,
      // 日期选择相关
      datePickerDialog: false,
      baseDate: '',
      virtualDateInfo: null,
      pendingImportConfig: null,
      // AI生成相关
      aiDialog: false,
      copied: false
    }
  },
  computed: {
    /**
     * AI生成提示词
     */
    aiPrompt() {
      const currentDate = new Date()
      const dateStr = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日`

      return `Your task is to generate a JSON configuration file for an exam dashboard. Based on the exam information input by the user, generate the configuration strictly following these rules.

Generation Requirements:
* Output using JSON blocks in Markdown
* Use Chinese for all text

Field Definitions:

examName (string)
* The general name of the exam
* Fill with "考试" when not provided by user

message (string)
* Exam reminder message
* Prioritize user-provided content
* When not provided by user, fill with "请保持卷面整洁，字迹清晰，遵守考场纪律，诚信应考。听到终考铃声时，请立即起立并停止作答。"

room (string)
* Exam room number
* Fill in if provided by user, otherwise use empty string ""

examInfos (array)
* Array of information for each exam session
* Each object must include:
   * name: The subject or name of that exam session
   * start: Start time, format "YYYY-MM-DD HH:mm:ss"
   * end: End time, format "YYYY-MM-DD HH:mm:ss"
   * alertTime: Minutes before exam end for reminder, fill with 15

Date and Time Handling:
* Current date: ${dateStr}
* When user provides specific dates, use actual dates
* When user does not provide dates, use virtual date format "0000-00-XX"
* XX represents day number: 01=first day, 02=second day, 03=third day...
* Time portion filled according to user description
* For multiple exams, calculate dates sequentially in order

Now please generate the exam configuration based on the above rules:`
    }
  },
  async mounted() {
    await this.loadConfigs()
  },
  methods: {
    /**
     * 根据当前日期推算考试类型
     * @returns {Object} { examName: string, message: string }
     */
    inferExamType() {
      const now = new Date()
      const month = now.getMonth() + 1 // 1-12
      const day = now.getDate()

      // 中国学校常见时间节点
      // 春季学期: 2月中旬-7月初 (寒假结束-暑假开始)
      // 秋季学期: 9月初-次年1月底 (暑假结束-寒假开始)

      let examName = '新考试'
      let message = '请保持卷面整洁，字迹清晰，遵守考场纪律，诚信应考。\n听到终考铃声时,请立即起立并停止作答。'

      // 秋季学期 (9-1月)
      if (month >= 9 || month <= 1) {
        if (month === 9 && day <= 15) {
          // 9月初 - 开学考试
          examName = '开学摸底考试'
        } else if (month === 9 && day > 15) {
          // 9月中下旬 - 第一次月考
          examName = '第一次月考'
        } else if (month === 10) {
          // 10月 - 第二次月考
          examName = '第二次月考'
        } else if (month === 11 && day <= 20) {
          // 11月上中旬 - 期中考试
          examName = '期中考试'
        } else if (month === 11 && day > 20) {
          // 11月下旬 - 第三次月考
          examName = '第三次月考'
        } else if (month === 12) {
          // 12月 - 第四次月考
          examName = '第四次月考'
        } else if (month === 1 ) {
          // 1月上旬 - 期末考试
          examName = '期末考试'
        }
      }
      // 春季学期 (2-7月)
      else if (month >= 2 && month <= 7) {
        if (month === 2 || (month === 3 && day <= 10)) {
          // 2月-3月初 - 开学考试
          examName = '开学摸底考试'
        } else if (month === 3 && day > 10) {
          // 3月中下旬 - 第一次月考
          examName = '第一次月考'
        } else if (month === 4 && day <= 25) {
          // 4月 - 期中考试
          examName = '期中考试'
        } else if (month === 4 && day > 25) {
          // 4月底 - 第二次月考
          examName = '第二次月考'
        } else if (month === 5) {
          // 5月 - 第三次月考
          examName = '第三次月考'
        } else if (month === 6 || month === 7) {
          // 6月上中旬 - 期末考试
          examName = '期末考试'
        }
      }

      return { examName, message }
    },

    /**
     * 初始化示例数据(仅在首次访问时)
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

      // 获取明天早上8点的时间
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(8, 0, 0, 0)

      // 获取结束时间（开始时间 + 2小时）
      const endTime = new Date(tomorrow)
      endTime.setHours(endTime.getHours() + 2)

      // 格式化时间为 YYYY/MM/DD HH:mm
      const formatTime = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}/${month}/${day} ${hours}:${minutes}`
      }

      // 自动推算考试类型
      const examTypeInfo = this.inferExamType()

      const defaultConfig = {
        examName: examTypeInfo.examName,
        message: examTypeInfo.message,
        room: getSetting('server.classNumber') || '',
        examInfos: [
          {
            name: '语文',
            start: formatTime(tomorrow),
            end: formatTime(endTime)
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

this.$message.success('新配置创建成功')
        // 直接打开编辑对话框
        const newConfig = this.configs.find(c => c.id === newId)
        if (newConfig) {
          this.editingConfig = newConfig
          this.editDialog = true
        }
      } catch (err) {
        this.$message.error('创建配置失败: ' + err.message)
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


        this.$message.success('配置重命名成功')
        this.renameDialog = false
        this.configToRename = null
        this.newConfigName = ''
      } catch (err) {
        this.$message.error('重命名配置失败: ' + err.message)
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


      this.$message.success('配置保存成功！')
      this.loadConfigs() // 重新加载配置列表


          this.$message.success('配置保存成功！')
    },

    /**
     * 配置保存错误回调
     */
    onConfigError(error) {

      this.$message.error(error || '保存配置时发生错误')

        this.$message.error(error || '保存配置时发生错误')
    },

    /**
     * 配置打开成功回调
     */
    onConfigOpened() {

      this.$message.success('配置已在新窗口中打开')



        this.$message.success('配置已在新窗口中打开')
    },

    /**
     * 处理配置删除事件
     */
    onConfigDeleted(result) {
      if (result.success) {

        this.$message.success(result.message || "配置删除成功")
        // 关闭编辑对话框
        this.editDialog = false
        // 刷新配置列表
        this.loadConfigs()
      } else {

        this.$message.error(result.message || "删除失败")
      }
    },

    /**
     * 显示导入对话框
     */
    showImportDialog() {
      this.importDialog = true
      this.importJson = ''
      this.importError = ''
    },

    /**
     * 关闭导入对话框
     */
    closeImportDialog() {
      this.importDialog = false
      this.importJson = ''
      this.importError = ''
      this.importing = false
    },

    /**
     * 检测JSON中是否包含虚拟日期
     * @param {Object} config - 配置对象
     * @returns {Object|null} { hasVirtual: boolean, count: number, span: number }
     */
    detectVirtualDates(config) {
      const virtualDatePattern = /^0000-00-(\d{2})/
      let hasVirtual = false
      let minDay = Infinity
      let maxDay = -Infinity
      let count = 0

      if (config.examInfos && Array.isArray(config.examInfos)) {
        for (let exam of config.examInfos) {
          if (exam.start) {
            const match = exam.start.match(virtualDatePattern)
            if (match) {
              hasVirtual = true
              count++
              const day = parseInt(match[1])
              minDay = Math.min(minDay, day)
              maxDay = Math.max(maxDay, day)
            }
          }
          if (exam.end) {
            const match = exam.end.match(virtualDatePattern)
            if (match) {
              hasVirtual = true
              const day = parseInt(match[1])
              minDay = Math.min(minDay, day)
              maxDay = Math.max(maxDay, day)
            }
          }
        }
      }

      if (hasVirtual) {
        return {
          hasVirtual: true,
          count,
          span: maxDay - minDay + 1,
          minDay,
          maxDay
        }
      }

      return null
    },

    /**
     * 将虚拟日期转换为真实日期
     * @param {string} virtualDateTime - 虚拟日期时间字符串，如 "0000-00-01 09:00:00"
     * @param {string} baseDate - 基准日期，如 "2025-12-14"
     * @returns {string} 真实日期时间字符串
     */
    convertVirtualDate(virtualDateTime, baseDate) {
      const virtualPattern = /^0000-00-(\d{2})\s+(.+)$/
      const match = virtualDateTime.match(virtualPattern)

      if (!match) {
        return virtualDateTime // 不是虚拟日期，直接返回
      }

      const dayNum = parseInt(match[1])
      const timePart = match[2]

      // 解析基准日期
      const base = new Date(baseDate)
      // 计算目标日期（第1天对应基准日期，第2天是基准日期+1天）
      const target = new Date(base)
      target.setDate(base.getDate() + (dayNum - 1))

      // 格式化为 YYYY/MM/DD HH:mm
      const year = target.getFullYear()
      const month = String(target.getMonth() + 1).padStart(2, '0')
      const day = String(target.getDate()).padStart(2, '0')

      // 解析时间部分，支持 HH:mm 或 HH:mm:ss
      const timeMatch = timePart.match(/(\d{2}):(\d{2})(?::(\d{2}))?/)
      if (timeMatch) {
        const hours = timeMatch[1]
        const minutes = timeMatch[2]
        return `${year}/${month}/${day} ${hours}:${minutes}`
      }

      return `${year}/${month}/${day} ${timePart}`
    },

    /**
     * 规范化日期格式
     * @param {string} dateStr - 日期字符串
     * @returns {string} 规范化后的日期字符串 YYYY/MM/DD HH:mm
     */
    normalizeDateFormat(dateStr) {
      if (!dateStr) return ''

      // 已经是标准格式 YYYY/MM/DD HH:mm
      if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}$/.test(dateStr)) {
        return dateStr
      }

      // 转换 YYYY-MM-DD HH:mm:ss 格式
      const pattern1 = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
      const match1 = dateStr.match(pattern1)
      if (match1) {
        return `${match1[1]}/${match1[2]}/${match1[3]} ${match1[4]}:${match1[5]}`
      }

      // 转换 YYYY-MM-DD 格式（添加默认时间）
      const pattern2 = /^(\d{4})-(\d{2})-(\d{2})$/
      const match2 = dateStr.match(pattern2)
      if (match2) {
        return `${match2[1]}/${match2[2]}/${match2[3]} 08:00`
      }

      return dateStr
    },

    /**
     * 验证并补全配置数据
     * @param {Object} config - 原始配置对象
     * @returns {Object} 补全后的配置对象
     */
    validateAndFillConfig(config) {
      const examTypeInfo = this.inferExamType()

      // 补全基本字段
      const filledConfig = {
        examName: config.examName || examTypeInfo.examName,
        message: config.message || examTypeInfo.message,
        room: config.room || getSetting('server.classNumber') || '',
        examInfos: []
      }

      // 验证和补全 examInfos
      if (!config.examInfos || !Array.isArray(config.examInfos)) {
        throw new Error('配置中缺少 examInfos 数组')
      }

      if (config.examInfos.length === 0) {
        throw new Error('examInfos 数组不能为空')
      }

      for (let i = 0; i < config.examInfos.length; i++) {
        const exam = config.examInfos[i]

        if (!exam.name) {
          throw new Error(`第 ${i + 1} 个考试缺少 name 字段`)
        }

        if (!exam.start) {
          throw new Error(`第 ${i + 1} 个考试缺少 start 字段`)
        }

        if (!exam.end) {
          throw new Error(`第 ${i + 1} 个考试缺少 end 字段`)
        }

        // 补全可选字段
        filledConfig.examInfos.push({
          name: exam.name,
          start: exam.start,
          end: exam.end,
          alertTime: exam.alertTime !== undefined ? exam.alertTime : 15,
          materials: exam.materials || []
        })
      }

      return filledConfig
    },

    /**
     * 处理导入
     */
    async processImport() {
      this.importing = true
      this.importError = ''

      try {
        // 解析 JSON
        let config
        try {
          config = JSON.parse(this.importJson)
        } catch (e) {
          throw new Error('JSON 格式错误: ' + e.message)
        }

        // 验证和补全数据
        const filledConfig = this.validateAndFillConfig(config)

        // 检测虚拟日期
        const virtualInfo = this.detectVirtualDates(filledConfig)

        if (virtualInfo) {
          // 包含虚拟日期，显示日期选择对话框
          this.virtualDateInfo = virtualInfo
          this.pendingImportConfig = filledConfig

          // 设置默认基准日期为明天
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const year = tomorrow.getFullYear()
          const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
          const day = String(tomorrow.getDate()).padStart(2, '0')
          this.baseDate = `${year}-${month}-${day}`

          this.datePickerDialog = true
        } else {
          // 不包含虚拟日期，直接导入
          await this.finalizeImport(filledConfig)
        }
      } catch (err) {
        this.importError = err.message
      } finally {
        this.importing = false
      }
    },

    /**
     * 取消日期选择
     */
    cancelDatePicker() {
      this.datePickerDialog = false
      this.baseDate = ''
      this.virtualDateInfo = null
      this.pendingImportConfig = null
    },

    /**
     * 确认日期选择
     */
    async confirmDatePicker() {
      if (!this.baseDate || !this.pendingImportConfig) return

      try {
        // 转换虚拟日期
        const config = JSON.parse(JSON.stringify(this.pendingImportConfig))

        for (let exam of config.examInfos) {
          if (exam.start && exam.start.startsWith('0000-00-')) {
            exam.start = this.convertVirtualDate(exam.start, this.baseDate)
          }
          if (exam.end && exam.end.startsWith('0000-00-')) {
            exam.end = this.convertVirtualDate(exam.end, this.baseDate)
          }
        }

        // 关闭日期选择对话框
        this.datePickerDialog = false
        this.baseDate = ''
        this.virtualDateInfo = null
        this.pendingImportConfig = null

        // 完成导入
        await this.finalizeImport(config)
      } catch (err) {
        this.importError = '日期转换失败: ' + err.message
        this.datePickerDialog = false
      }
    },

    /**
     * 完成导入（保存配置）
     * @param {Object} config - 处理好的配置对象
     */
    async finalizeImport(config) {
      const newId = Date.now().toString()

      // 规范化所有日期格式
      for (let exam of config.examInfos) {
        exam.start = this.normalizeDateFormat(exam.start)
        exam.end = this.normalizeDateFormat(exam.end)
      }

      try {
        // 保存新配置
        const saveResponse = await dataProvider.saveData(`es_${newId}`, config)
        if (!saveResponse) {
          throw new Error(saveResponse.error?.message || '保存失败')
        }

        // 更新本地配置列表
        this.configs.push({
          id: newId,
          ...config
        })

        // 更新存储的配置列表
        const currentList = this.configs.map(c => ({id: c.id}))
        const listResponse = await dataProvider.saveData('es_list', currentList)
        if (!listResponse) {
          throw new Error(listResponse.error?.message || '更新列表失败')
        }

        this.success = '配置导入成功！'
        this.closeImportDialog()

        // 直接打开编辑对话框
        const newConfig = this.configs.find(c => c.id === newId)
        if (newConfig) {
          this.editingConfig = newConfig
          this.editDialog = true
        }
      } catch (err) {
        throw new Error('保存配置失败: ' + err.message)
      }
    },

    /**
     * 显示AI生成对话框
     */
    showAIDialog() {
      this.aiDialog = true
      this.copied = false
    },

    /**
     * 关闭AI生成对话框
     */
    closeAIDialog() {
      this.aiDialog = false
      this.copied = false
    },

    /**
     * 复制提示词到剪贴板
     */
    async copyPrompt() {
      try {
        await navigator.clipboard.writeText(this.aiPrompt)
        this.copied = true

        // 3秒后恢复按钮状态
        setTimeout(() => {
          this.copied = false
        }, 3000)
      } catch (err) {
        // 如果剪贴板API不可用，使用备用方案
        const textArea = document.createElement('textarea')
        textArea.value = this.aiPrompt
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          this.copied = true
          setTimeout(() => {
            this.copied = false
          }, 3000)
        } catch (err) {
          this.error = '复制失败，请手动复制'
        }
        document.body.removeChild(textArea)
      }
    },

    /**
     * 从AI对话框跳转到导入对话框
     */
    goToImport() {
      this.aiDialog = false
      this.showImportDialog()
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

.ai-prompt-text {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

.ai-example-json {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre;
  overflow-x: auto;
  margin: 0;
  color: #1976d2;
}
</style>
