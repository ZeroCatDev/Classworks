<template>
  <div
    v-if="visible"
    class="init-overlay"
  >
    <div class="init-container">
      <div class="init-header">
        <div class="title">
          选择要使用的服务
        </div>
        <div class="subtitle">
          左侧为 Classworks 管理端，右侧为 Classworks KV 控制台
        </div>
      </div>

      <div class="card-row">
        <!-- 左：Classworks 卡片（展开操作） -->
        <v-card
          class="service-card gradient-left"
          elevation="8"
        >
          <v-card-item>
            <div class="card-title">
              <div>
                <div class="text-h6">
                  Classworks
                </div>
                <div class="text-caption text-medium-emphasis">
                  适用于班级大屏的作业板工具
                </div>
              </div>
            </div>
          </v-card-item>
          <v-card-text>
            <div class="action-grid">
              <v-btn
                color="primary"
                prepend-icon="mdi-flash"
                @click="handleAutoAuthorize"
              >
                开始使用
              </v-btn>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-key"
                @click="showManual = !showManual"
              >
                输入 Token
              </v-btn>
              <v-btn
                variant="text"
                prepend-icon="mdi-laptop"
                @click="useLocalMode"
              >
                使用本地模式
              </v-btn>
            </div>

            <v-expand-transition>
              <div
                v-show="showManual"
                class="mt-4"
              >
                <v-text-field
                  v-model="manualToken"
                  label="KV 授权 Token"
                  placeholder="粘贴从授权页面获取的 Token"
                  hide-details
                  clearable
                />
                <v-alert
                  v-if="verifyError"
                  type="error"
                  variant="tonal"
                  class="mt-2"
                >
                  {{ verifyError }}
                </v-alert>
                <div class="d-flex mt-2">
                  <v-spacer />
                  <v-btn
                    :disabled="!manualToken || verifying"
                    :loading="verifying"
                    color="primary"
                    @click="saveManualToken"
                  >
                    保存 Token
                  </v-btn>
                </div>
              </div>
            </v-expand-transition>
          </v-card-text>
        </v-card>

        <!-- 右：Classworks KV 卡片（跳转 /kv） -->
        <v-card
          class="service-card gradient-right clickable"
          elevation="8"
          @click="goKv"
        >
          <v-card-item>
            <div class="card-title">
              <div>
                <div class="text-h6">
                  Classworks KV
                </div>
                <div class="text-caption text-medium-emphasis">
                  云原生键值数据库
                </div>
              </div>
            </div>
          </v-card-item>
          <v-card-text>
            <div class="mt-4">
              <v-btn
                variant="text"
                class="text-none"
                append-icon="mdi-arrow-right"
                rounded="xl"
                @click.stop="goKv"
              >
                打开 Classworks KV
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <div class="footer-hint">
        完成授权后可使用作业同步、考试看板等在线功能。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSetting, setSetting } from '@/utils/settings'
import axios from '@/axios/axios'

const router = useRouter()
const emit = defineEmits(['done'])

// 控制显示：仅首页且无 kvToken（且 provider 不是 kv-local）显示
const visible = ref(false)
const showManual = ref(false)
const manualToken = ref('')
const verifying = ref(false)
const verifyError = ref('')

const provider = computed(() => getSetting('server.provider'))
const isKvProvider = computed(() => provider.value === 'kv-server' || provider.value === 'classworkscloud')
const kvToken = computed(() => getSetting('server.kvToken'))

const evaluateVisibility = () => {
  const path = window.location.pathname
  const onHome = path === '/' || path === '/index' || path === '/index.html'
  const need = isKvProvider.value && (!kvToken.value || kvToken.value === '')
  visible.value = onHome && need
}

onMounted(() => {
  evaluateVisibility()
})

const handleAutoAuthorize = () => {
  const authDomain = getSetting('server.authDomain')
  const appId = 'd158067f53627d2b98babe8bffd2fd7d'
  const currentDomain = window.location.origin
  const callbackUrl = encodeURIComponent(`${currentDomain}/authorizecallback`)
  const uuid = getSetting('device.uuid') || '00000000-0000-4000-8000-000000000000'

  let url = `${authDomain}/authorize?app_id=${appId}&mode=callback&callback_url=${callbackUrl}&remark=Classworks 自动授权 来自${window.location.hostname} ${new Date().toLocaleString()}`
  if (uuid !== '00000000-0000-4000-8000-000000000000') {
    url += `&uuid=${encodeURIComponent(uuid)}`
  }
  window.location.href = url
}

const saveManualToken = async () => {
  if (!manualToken.value || verifying.value) return
  verifyError.value = ''
  verifying.value = true
  try {
    const serverUrl = getSetting('server.domain')
    if (!serverUrl) throw new Error('未配置服务器域名')

    await axios.get(`${serverUrl}/kv/_info`, {
      headers: {
        Accept: 'application/json',
        'x-app-token': manualToken.value,
      },
    })

    // 验证通过再保存
    setSetting('server.kvToken', manualToken.value)
    evaluateVisibility()
    emit('done')
  } catch (err) {
    const status = err?.response?.status
    if (status === 401 || status === 403) {
      verifyError.value = 'Token 无效或无权限，请确认后重试'
    } else if (status === 404) {
      verifyError.value = '命名空间不存在或服务器未就绪'
    } else {
      verifyError.value = err?.response?.data?.message || err?.message || '验证失败，请稍后重试'
    }
  } finally {
    verifying.value = false
  }
}

const useLocalMode = () => {
  setSetting('server.provider', 'kv-local')
  visible.value = false
  // 轻量刷新以让首页数据源切换
  window.location.reload()
  emit('done')
}

const goKv = () => {
  router.push('/kv')
}
</script>

<style scoped>
.init-overlay { position: relative; }
.init-container { max-width: 1080px; margin: 24px auto; padding: 8px 16px; }
.init-header .title { font-size: 20px; font-weight: 600; }
.init-header .subtitle { margin-top: 4px; font-size: 13px; opacity: .75; }
.card-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.service-card { min-height: 220px; }
.card-title { display: flex; align-items: center; }
.clickable { cursor: pointer; }
.gradient-left { background: linear-gradient(135deg, rgba(103,80,164,.18), rgba(103,80,164,0) 60%); }
.gradient-right { background: linear-gradient(135deg, rgba(0,184,212,.18), rgba(0,184,212,0) 60%); }
.action-grid { display: grid; grid-template-columns: repeat(3, max-content); gap: 12px; align-items: center; }
.footer-hint { margin-top: 12px; font-size: 12px; opacity: .7; }
@media (max-width: 900px) { .card-row { grid-template-columns: 1fr; } }
</style>
