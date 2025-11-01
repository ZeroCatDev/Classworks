<template>
  <v-card class="guide-card">
    <!-- 进度指示器 -->
    <v-progress-linear
      :model-value="(currentStep / totalSteps) * 100"
      color="primary"
      height="6"
    />

    <v-card-text class="pa-8">
      <!-- 步骤 1: 欢迎 -->
      <div
        v-show="currentStep === 1"
        class="step-content"
      >
        <div class="text-center mb-6">
          <v-icon
            size="80"
            color="primary"
            class="mb-4"
          >
            mdi-hand-wave
          </v-icon>
          <h2 class="text-h4 mb-3">
            欢迎使用 Classworks
          </h2>
          <p class="text-body-1 text-medium-emphasis">
            适用于班级大屏的作业板小工具
          </p>
        </div>
      </div>

      <!-- 步骤 2: Classworks 和 KV 的关系图 -->
      <div
        v-show="currentStep === 2"
        class="step-content"
      >
        <h3 class="text-h5 mb-6 text-center">
          Classworks 和 Classworks KV 的关系
        </h3>

        <v-card
          variant="tonal"
          color="primary"
          class="pa-6 mb-6"
        >
          <div class="relationship-diagram">
            <!-- Classworks 应用 -->
            <div class="diagram-item">
              <v-card
                elevation="8"
                color="blue-darken-1"
                class="pa-4"
              >
                <div class="text-center">
                  <v-icon
                    size="60"
                    color="white"
                  >
                    mdi-laptop
                  </v-icon>
                  <h4 class="text-h6 text-white mt-2">
                    Classworks
                  </h4>
                  <p class="text-caption text-white mt-1">
                    作业板应用
                  </p>
                </div>
              </v-card>

              <div class="diagram-description mt-3">
                <v-chip
                  color="blue"
                  variant="flat"
                  size="small"
                  class="mb-2"
                >
                  前端应用
                </v-chip>
                <div class="text-body-2">
                  • 显示作业内容<br>
                  • 管理班级信息<br>
                  • 提供用户界面
                </div>
              </div>
            </div>

            <!-- 连接线 -->
            <div class="diagram-connector">
              <v-icon
                size="40"
                color="primary"
              >
                mdi-swap-horizontal
              </v-icon>
              <div class="text-caption font-weight-bold mt-2">
                数据同步
              </div>
            </div>

            <!-- Classworks KV -->
            <div class="diagram-item">
              <v-card
                elevation="8"
                color="green-darken-1"
                class="pa-4"
              >
                <div class="text-center">
                  <v-icon
                    size="60"
                    color="white"
                  >
                    mdi-cloud-sync
                  </v-icon>
                  <h4 class="text-h6 text-white mt-2">
                    Classworks KV
                  </h4>
                  <p class="text-caption text-white mt-1">
                    云端数据库
                  </p>
                </div>
              </v-card>

              <div class="diagram-description mt-3">
                <v-chip
                  color="green"
                  variant="flat"
                  size="small"
                  class="mb-2"
                >
                  后端服务
                </v-chip>
                <div class="text-body-2">
                  • 存储作业数据<br>
                  • 多设备同步<br>
                  • 权限管理
                </div>
              </div>
            </div>
          </div>
        </v-card>

        <!-- 工作流程说明 -->
        <v-card
          variant="outlined"
          class="pa-5 mb-4"
        >
          <h4 class="text-h6 mb-4">
            <v-icon
              color="primary"
              class="mr-2"
            >
              mdi-information
            </v-icon>
            工作流程
          </h4>

          <v-timeline
            side="end"
            density="compact"
            line-thickness="2"
          >
            <v-timeline-item
              dot-color="primary"
              size="small"
            >
              <div class="text-body-2">
                <strong>步骤 1:</strong> 在 Classworks 应用中编辑作业
              </div>
            </v-timeline-item>

            <v-timeline-item
              dot-color="success"
              size="small"
            >
              <div class="text-body-2">
                <strong>步骤 2:</strong> 数据自动上传到 Classworks KV
              </div>
            </v-timeline-item>

            <v-timeline-item
              dot-color="info"
              size="small"
            >
              <div class="text-body-2">
                <strong>步骤 3:</strong> 其他设备从 Classworks KV 同步数据
              </div>
            </v-timeline-item>

            <v-timeline-item
              dot-color="warning"
              size="small"
            >
              <div class="text-body-2">
                <strong>步骤 4:</strong> 所有设备显示相同的作业内容
              </div>
            </v-timeline-item>
          </v-timeline>
        </v-card>

        <!-- 优势说明 -->
        <v-row>
          <v-col
            cols="12"
            md="4"
          >
            <v-card
              variant="tonal"
              color="blue"
              class="pa-4 h-100"
            >
              <v-icon
                size="40"
                color="blue-darken-2"
                class="mb-2"
              >
                mdi-devices
              </v-icon>
              <h5 class="text-subtitle-1 font-weight-bold mb-2">
                多设备访问
              </h5>
              <p class="text-body-2">
                在教室、办公室、家中的任何设备上访问相同的数据
              </p>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            md="4"
          >
            <v-card
              variant="tonal"
              color="green"
              class="pa-4 h-100"
            >
              <v-icon
                size="40"
                color="green-darken-2"
                class="mb-2"
              >
                mdi-sync
              </v-icon>
              <h5 class="text-subtitle-1 font-weight-bold mb-2">
                实时同步
              </h5>
              <p class="text-body-2">
                修改后立即同步，所有设备保持数据一致
              </p>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            md="4"
          >
            <v-card
              variant="tonal"
              color="orange"
              class="pa-4 h-100"
            >
              <v-icon
                size="40"
                color="orange-darken-2"
                class="mb-2"
              >
                mdi-shield-lock
              </v-icon>
              <h5 class="text-subtitle-1 font-weight-bold mb-2">
                安全可靠
              </h5>
              <p class="text-body-2">
                通过密码和命名空间隔离，保护班级数据安全
              </p>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- 步骤 3: 询问使用场景 -->
      <div
        v-show="currentStep === 3"
        class="step-content"
      >
        <h3 class="text-h5 mb-6 text-center">
          你需要在多个设备上查看作业吗？
        </h3>

        <v-card
          variant="tonal"
          color="info"
          class="mb-6 pa-4"
        >
          <div class="text-body-2">
            比如：在家里电脑、手机上查看，或者多个教室设备共享数据
          </div>
        </v-card>

        <div class="button-group">
          <v-btn
            size="x-large"
            block
            variant="elevated"
            color="primary"
            class="mb-4 py-6"
            @click="selectStorageType('cloud')"
          >
            <div class="d-flex flex-column align-center py-2">
              <v-icon
                size="40"
                class="mb-2"
              >
                mdi-cloud-check
              </v-icon>
              <span class="text-h6">需要，使用云同步</span>
              <span class="text-caption mt-1">多设备访问</span>
            </div>
          </v-btn>

          <v-btn
            size="x-large"
            block
            variant="outlined"
            class="py-6"
            @click="selectStorageType('local')"
          >
            <div class="d-flex flex-column align-center py-2">
              <v-icon
                size="40"
                class="mb-2"
              >
                mdi-laptop
              </v-icon>
              <span class="text-h6">不需要，只用这台设备</span>
              <span class="text-caption mt-1">本地存储</span>
            </div>
          </v-btn>
        </div>
      </div>

      <!-- 步骤 4a: 本地存储确认 -->
      <div
        v-show="currentStep === 4 && storageType === 'local'"
        class="step-content"
      >
        <div class="text-center mb-6">
          <v-icon
            size="80"
            color="success"
            class="mb-4"
          >
            mdi-check-circle
          </v-icon>
          <h3 class="text-h5 mb-4">
            您可以使用本地模式
          </h3>
          <v-card
            variant="tonal"
            class="pa-4 text-left"
          >
            <div class="text-body-1 mb-2">
              此数据将存储在您的浏览器中，如果您的浏览器不支持IndexedDB，可能会出现问题。如果您经常清除浏览器数据，请谨慎使用本地模式。
            </div>
            <div class="text-body-1 mb-2">
              在刚才地方点击使用本地模式的按钮使用。
            </div>
          </v-card>
        </div>
      </div>

      <!-- 步骤 4b: 云存储说明 -->
      <div
        v-show="currentStep === 4 && storageType === 'cloud'"
        class="step-content"
      >
        <div class="text-center mb-6">
          <v-icon
            size="80"
            color="primary"
            class="mb-4"
          >
            mdi-cloud-cog
          </v-icon>
          <h3 class="text-h5 mb-4">
            需要先设置云端账号
          </h3>
        </div>

        <v-card
          :variant="kvserverurl=='https://kv.houlang.cloud'? 'elevated' : 'outlined'"
          :color=" kvserverurl=='https://kv.houlang.cloud'? 'primary' : 'error' "
          class="pa-6  mb-6"
          @click="openKVSite"
        >
          <v-icon
            size="48"
            class="mb-3"
          >
            mdi-open-in-new
          </v-icon>
          <h4 class="text-h6  font-weight-bold">
            请访问 {{ kvserverurl=='https://kv.houlang.cloud'? 'Classworks KV' : '自定义的 Classworks KV 实例 ' }} 控制台
          </h4>
          <div class="text-h5 mb-6">
            {{ kvserverurl }}
          </div>
          <h6 class="text-subtitle-2">
            {{ kvserverurl=='https://kv.houlang.cloud'? '此实例由 Classworks KV 官方提供' : '此链接由您的实例、预配代码或管理员管理，当前可能不是 Classworks KV 官方的实例地址。' }}
          </h6>
        </v-card>

        <v-card
          variant="tonal"
          color="info"
          class="pa-5"
        >
          <div class="text-body-1 mb-3">
            <v-icon
              size="20"
              class="mr-2"
            >
              mdi-information
            </v-icon>
            在控制台完成以下操作：
          </div>
          <div class="text-body-2 mb-2">
            1. 注册或登录账号
          </div>
          <div class="text-body-2 mb-2">
            2. 创建班级空间
          </div>
          <div class="text-body-2 mb-2">
            3. 获取命名空间和密码
          </div>
          <div class="text-body-2">
            4. 返回这里输入认证信息
          </div>
        </v-card>

        <!-- 常见问题 -->
        <v-expansion-panels
          class="mt-6"
          variant="accordion"
        >
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon
                  class="mr-3"
                  color="warning"
                >
                  mdi-help-circle
                </v-icon>
                <span class="text-subtitle-1 font-weight-medium">我以前已经使用过 Classworks KV？</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-card
                variant="tonal"
                color="success"
                class="pa-4"
              >
                <div class="text-body-2 mb-2">
                  如果您之前已经使用过 Classworks KV，可以直接使用您的 <strong>UUID（命名空间）</strong> 和 <strong>设置的密码</strong> 进行认证。
                </div>
                <div class="text-body-2">
                  返回上一页，点击"已注册"按钮，输入您的认证信息即可登录。
                </div>
              </v-card>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon
                  class="mr-3"
                  color="info"
                >
                  mdi-help-circle
                </v-icon>
                <span class="text-subtitle-1 font-weight-medium">我如何配置不同类型的设备？</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-card
                variant="tonal"
                color="info"
                class="pa-4"
              >
                <div class="text-body-2 mb-2">
                  不同的密码对应不同的设备类型，这将由 <strong>管理员管理</strong>。
                </div>
                <div class="text-body-2 mb-2">
                  例如：
                </div>
                <ul class="text-body-2 ml-4">
                  <li class="mb-1">
                    班级大屏使用一个密码
                  </li>
                  <li class="mb-1">
                    教师设备使用另一个密码
                  </li>
                  <li>学生设备使用不同的密码</li>
                </ul>
                <div class="text-body-2 mt-3">
                  请联系您的管理员获取对应设备类型的密码。
                </div>
              </v-card>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </v-card-text>

    <!-- 底部操作按钮 -->
    <v-card-actions class="pa-6 pt-0">
      <v-btn
        v-if="currentStep > 1"
        size="large"
        variant="text"
        @click="prevStep"
      >
        <v-icon start>
          mdi-chevron-left
        </v-icon>
        上一步
      </v-btn>
      <v-spacer />
      <v-btn
        v-if="currentStep < 4"
        :disabled="currentStep === 3 && !storageType"
        size="large"
        color="primary"
        variant="elevated"
        @click="nextStep"
      >
        下一步
        <v-icon end>
          mdi-chevron-right
        </v-icon>
      </v-btn>
      <v-btn
        v-else
        size="large"
        color="primary"
        variant="elevated"
        @click="finish"
      >
        关闭
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { getSetting } from '@/utils/settings'
const emit = defineEmits(['close'])
const kvserverurl = getSetting('server.authDomain')
const currentStep = ref(1)
const totalSteps = 4
const storageType = ref('')

const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const selectStorageType = (type) => {
  storageType.value = type
  nextStep()
}

const finish = () => {
  emit('close')
}

const openKVSite = () => {
  window.open(kvserverurl, '_blank')
}
</script>

<style scoped>
.guide-card {
  max-width: 100%;
  min-height: 500px;
}

.step-content {
  min-height: 400px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.button-group {
  max-width: 600px;
  margin: 0 auto;
}

.step-item {
  cursor: default;
}

/* 触屏优化 */
.v-btn {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* 大按钮区域便于点击 */
.v-btn.v-btn--size-x-large {
  min-height: 120px;
}

/* 关系图样式 */
.relationship-diagram {
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.diagram-item {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.diagram-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 100px;
}

.diagram-description {
  text-align: center;
}

@media (max-width: 768px) {
  .relationship-diagram {
    flex-direction: column;
    align-items: center;
  }

  .diagram-connector {
    transform: rotate(90deg);
    margin: 20px 0;
  }
}
</style>
