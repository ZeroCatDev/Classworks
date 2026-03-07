<template>
  <settings-card
    border
    icon="mdi-microphone"
    title="噪音监测"
  >
    <v-list>
      <setting-item :setting-key="'noiseMonitor.enabled'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'noiseMonitor.autoStart'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'noiseMonitor.permissionDismissed'" />
    </v-list>

    <v-divider class="mb-4" />

    <!-- 晚自习时间段配置 -->
    <div class="px-4 pb-4">
      <div class="d-flex align-center mb-4">
        <v-icon
          class="mr-2"
          color="teal"
        >
          mdi-clock-edit-outline
        </v-icon>
        <span class="text-subtitle-1 font-weight-bold">晚自习时间段</span>
        <v-spacer />
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          prepend-icon="mdi-plus"
          @click="addSession"
        >
          添加时段
        </v-btn>
      </div>

      <div class="text-caption text-medium-emphasis mb-4">
        配置晚自习时间段后，系统会在对应时段内自动开启噪音监测并记录统计报告。时间段外不会长期记录。
      </div>

      <v-skeleton-loader
        v-if="sessionLoading"
        type="card"
        class="mb-4"
      />
      <template v-else>
        <div
          v-for="(session, idx) in editSessions"
          :key="idx"
          class="mb-3"
        >
          <v-card
            variant="outlined"
            rounded="xl"
          >
            <v-card-text class="pa-4">
              <div class="d-flex align-center ga-3 flex-wrap">
                <v-text-field
                  v-model="session.name"
                  density="compact"
                  variant="outlined"
                  label="名称"
                  hide-details
                  style="max-width: 160px;"
                />
                <v-menu
                  v-model="timePickerMenus[idx]"
                  :close-on-content-click="false"
                  location="bottom"
                >
                  <template #activator="{ props: menuProps }">
                    <v-text-field
                      v-bind="menuProps"
                      :model-value="session.start"
                      density="compact"
                      variant="outlined"
                      label="开始时间"
                      readonly
                      hide-details
                      prepend-inner-icon="mdi-clock-outline"
                      style="max-width: 170px;"
                    />
                  </template>
                  <v-time-picker
                    v-model="session.start"
                    color="primary"
                    format="24hr"
                    scrollable
                    @update:model-value="timePickerMenus[idx] = false"
                  />
                </v-menu>
                <v-text-field
                  v-model.number="session.duration"
                  density="compact"
                  variant="outlined"
                  type="number"
                  label="时长"
                  suffix="分钟"
                  hide-details
                  style="max-width: 130px;"
                  :min="10"
                  :max="300"
                />
                <span class="text-caption text-medium-emphasis">
                  至 {{ sessionEndTime(session) }}
                </span>
                <v-switch
                  v-model="session.enabled"
                  density="compact"
                  color="primary"
                  hide-details
                  label="启用"
                />
                <v-btn
                  icon="mdi-delete"
                  color="error"
                  size="x-small"
                  variant="text"
                  @click="editSessions.splice(idx, 1)"
                />
              </div>
            </v-card-text>
          </v-card>
        </div>

        <div
          v-if="editSessions.length === 0"
          class="text-center text-medium-emphasis py-4"
        >
          <v-icon class="mb-1">
            mdi-clock-outline
          </v-icon>
          <div class="text-caption">
            暂无时间段，点击上方「添加时段」创建
          </div>
        </div>
      </template>

      <v-divider class="my-5" />

      <!-- 监测参数 -->
      <div class="d-flex align-center mb-4">
        <v-icon
          class="mr-2"
          color="orange"
        >
          mdi-alert-decagram
        </v-icon>
        <span class="text-subtitle-1 font-weight-bold">监测参数</span>
      </div>

      <div class="d-flex align-center flex-wrap ga-4 mb-4">
        <v-text-field
          v-model.number="editAlertThreshold"
          density="compact"
          variant="outlined"
          type="number"
          label="噪音报警阈值"
          suffix="dB"
          hide-details
          style="max-width: 200px;"
          :min="30"
          :max="90"
        />
      </div>

      <div class="d-flex justify-end ga-3 mb-2">
        <v-btn
          variant="text"
          prepend-icon="mdi-restore"
          @click="resetSessionConfig"
        >
          重置
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-content-save"
          :loading="sessionSaving"
          @click="saveSessionConfig"
        >
          保存配置
        </v-btn>
      </div>
    </div>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '@/components/settings/SettingItem.vue';
import dataProvider from '@/utils/dataProvider';

const DEFAULT_SESSION_CONFIG = {
  sessions: [
    { name: '第1节晚自习', start: '19:20', duration: 70, enabled: true },
    { name: '第2节晚自习', start: '20:20', duration: 110, enabled: true },
  ],
  alertThresholdDb: 55,
};

export default {
  name: 'NoiseSettingsCard',
  components: { SettingsCard, SettingItem },

  data() {
    return {
      // 自习配置
      sessionLoading: true,
      sessionSaving: false,
      editSessions: [],
      editAlertThreshold: 55,
      timePickerMenus: {},
    };
  },

  mounted() {
    this.loadSessionConfig();
  },

  methods: {
    // ===== 自习配置 =====
    async loadSessionConfig() {
      this.sessionLoading = true;
      try {
        const res = await dataProvider.loadData('noise-session-config');
        const data = res?.data || res;
        if (data && data.sessions) {
          this.editSessions = JSON.parse(JSON.stringify(data.sessions));
          this.editAlertThreshold = data.alertThresholdDb || 55;
        } else {
          this.resetSessionConfig();
        }
      } catch {
        this.resetSessionConfig();
      } finally {
        this.sessionLoading = false;
      }
    },

    async saveSessionConfig() {
      this.sessionSaving = true;
      try {
        const config = {
          sessions: this.editSessions,
          alertThresholdDb: this.editAlertThreshold,
        };
        await dataProvider.saveData('noise-session-config', config);
      } catch (e) {
        console.error('保存自习配置失败:', e);
      } finally {
        this.sessionSaving = false;
      }
    },

    resetSessionConfig() {
      this.editSessions = JSON.parse(JSON.stringify(DEFAULT_SESSION_CONFIG.sessions));
      this.editAlertThreshold = DEFAULT_SESSION_CONFIG.alertThresholdDb;
    },

    addSession() {
      this.editSessions.push({
        name: `第${this.editSessions.length + 1}节晚自习`,
        start: '19:00',
        duration: 70,
        enabled: true,
      });
    },

    sessionEndTime(session) {
      if (!session?.start || !session?.duration) return '--:--';
      const [h, m] = session.start.split(':').map(Number);
      const totalMin = h * 60 + m + (session.duration || 0);
      const eh = Math.floor(totalMin / 60) % 24;
      const em = totalMin % 60;
      return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
    },
  },
};
</script>
