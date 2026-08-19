<template>
  <v-card class="notification-sound-settings">
    <v-card-title>
      通知铃声设置
    </v-card-title>

    <v-card-text>
      <!-- 自动播放提示 -->
      <v-alert
        v-if="showAutoplayWarning"
        type="info"
        variant="tonal"
        closable
        class="mb-4"
        @click:close="showAutoplayWarning = false"
      >
        <div class="d-flex align-center">
          <v-icon class="mr-2">
            mdi-information
          </v-icon>
          <span>首次使用请点击试听按钮测试音频播放是否正常</span>
        </div>
      </v-alert>

      <v-row>
        <!-- 单次通知铃声 -->
        <v-col cols="12">
          <v-card border>
            <v-card-title class="text-subtitle-1">
              <v-icon left>
                mdi-bell-ring
              </v-icon>
              单次通知铃声
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="singleSound"
                :items="soundOptions"
                label="选择铃声"
                prepend-icon="mdi-music-note"
                variant="outlined"
                density="comfortable"
                @update:model-value="onSingleSoundChange"
              >
                <template #item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    @click="previewSound(item.value)"
                  >
                    <template #prepend>
                      <v-icon>mdi-music-note</v-icon>
                    </template>
                    <template #append>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        @click.stop="previewSound(item.value)"
                      >
                        <v-icon>mdi-play</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <div class="mt-3 d-flex gap-2">
                <v-btn
                  color="primary"
                  variant="tonal"
                  @click="previewSound(singleSound)"
                >
                  <v-icon left>
                    mdi-play
                  </v-icon>
                  试听
                </v-btn>
                <v-btn
                  @click="resetSingleSound"
                >
                  <v-icon left>
                    mdi-restore
                  </v-icon>
                  恢复
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- 持续通知铃声（紧急通知） -->
        <v-col cols="12">
          <v-card border>
            <v-card-title class="text-subtitle-1">
              <v-icon
                left
                color="error"
              >
                mdi-bell-alert
              </v-icon>
              紧急通知铃声
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="urgentSound"
                :items="soundOptions"
                label="选择铃声"
                prepend-icon="mdi-music-note"
                variant="outlined"
                density="comfortable"
                @update:model-value="onUrgentSoundChange"
              >
                <template #item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    @click="previewSound(item.value)"
                  >
                    <template #prepend>
                      <v-icon>mdi-music-note</v-icon>
                    </template>
                    <template #append>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        @click.stop="previewSound(item.value)"
                      >
                        <v-icon>mdi-play</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <div class="mt-3 d-flex gap-2">
                <v-btn
                  color="error"
                  variant="tonal"
                  @click="previewSound(urgentSound)"
                >
                  <v-icon left>
                    mdi-play
                  </v-icon>
                  试听
                </v-btn>
                <v-btn
                  @click="resetUrgentSound"
                >
                  <v-icon left>
                    mdi-restore
                  </v-icon>
                  恢复
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { getSetting, setSetting } from '@/utils/settings.js';
import { soundFiles, stopSound } from '@/utils/soundList.js';

export default {
  name: 'NotificationSoundSettings',
  data() {
    return {
      singleSound: '',
      urgentSound: '',
      currentAudio: null,
      showAutoplayWarning: true,
    };
  },
  computed: {
    soundOptions() {
      return soundFiles.map(file => ({
        title: file.replace('.mp3', ''),
        value: file,
      }));
    },
  },
  mounted() {
    this.loadSettings();
  },
  beforeUnmount() {
    this.stopPreview();
  },
  methods: {
    loadSettings() {
      this.singleSound = getSetting('notification.singleSound');
      this.urgentSound = getSetting('notification.urgentSound');
    },
    onSingleSoundChange(value) {
      setSetting('notification.singleSound', value);
      this.$message?.success('设置已保存', `单次通知铃声: ${value}`);
    },
    onUrgentSoundChange(value) {
      setSetting('notification.urgentSound', value);
      this.$message?.success('设置已保存', `紧急通知铃声: ${value}`);
    },
    async previewSound(filename) {
      // 隐藏自动播放警告
      this.showAutoplayWarning = false;

      // 先停止当前播放
      this.stopPreview();

      try {
        // 播放新音频（不循环）
        const audio = await this.playSoundWithPromise(filename, false);
        this.currentAudio = audio;

        // 音频播放结束后清除引用
        if (this.currentAudio) {
          this.currentAudio.addEventListener('ended', () => {
            this.currentAudio = null;
          }, { once: true });
        }
      } catch (error) {
        console.error('播放音频失败:', error);
        // 提示用户
        if (error.name === 'NotAllowedError') {
          this.$message?.warning('无法播放音频', '浏览器阻止了自动播放，请再次点击试听按钮');
        } else {
          this.$message?.error('播放失败', '音频文件加载失败，请稍后重试');
        }
      }
    },
    // 使用Promise包装音频播放，以便捕获错误
    playSoundWithPromise(filename, loop = false) {
      return new Promise((resolve, reject) => {
        const path = this.getSoundPath(filename);
        if (!path) {
          reject(new Error('音频文件不存在'));
          return;
        }

        try {
          // eslint-disable-next-line no-undef
          const audio = new Audio(path);
          audio.loop = loop;

          // 尝试播放
          audio.play()
            .then(() => {
              resolve(audio);
            })
            .catch(err => {
              reject(err);
            });
        } catch (error) {
          reject(error);
        }
      });
    },
    getSoundPath(filename) {
      if (!filename) return null;
      try {
        // 使用public目录路径，Vite会在构建时将public目录的文件复制到dist根目录
        // 这样开发和生产环境都能正确加载音频文件
        return `/sounds/${filename}`;
      } catch {
        return null;
      }
    },
    stopPreview() {
      if (this.currentAudio) {
        stopSound(this.currentAudio);
        this.currentAudio = null;
      }
    },
    resetSingleSound() {
      this.singleSound = 'Teams 默认.mp3';
      setSetting('notification.singleSound', this.singleSound);
      this.$message?.success('已恢复单次通知铃声默认设置');
    },
    resetUrgentSound() {
      this.urgentSound = 'Teams 默认通话铃.mp3';
      setSetting('notification.urgentSound', this.urgentSound);
      this.$message?.success('已恢复紧急通知铃声默认设置');
    },
  },
};
</script>

<style scoped>
.notification-sound-settings {
  margin: 16px 0;
}
</style>
