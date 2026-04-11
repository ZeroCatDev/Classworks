<template>
  <settings-card border icon="mdi-image" title="背景设置">
    <v-list>
      <setting-item :key="settingItemKey" :setting-key="'background.enabled'" />
    </v-list>

    <v-divider class="mb-4" />

    <div class="px-4 pb-4">
      <!-- 预览区域 -->
      <div class="preview-area mb-6" :style="previewContainerStyle">
        <div class="preview-bg" :style="previewBgStyle" />
        <div class="preview-overlay" :style="previewOverlayStyle" />
        <div class="preview-text">背景预览</div>
      </div>

      <!-- 图片来源 -->
      <div class="d-flex align-center mb-4">
        <v-icon class="mr-2" color="primary">mdi-image-search</v-icon>
        <span class="text-subtitle-1 font-weight-bold">图片来源</span>
      </div>

      <!-- 来源选择 -->
      <v-btn-toggle
        v-model="imageSource"
        color="primary"
        density="comfortable"
        class="mb-4"
        mandatory
        rounded="xl"
      >
        <v-btn value="url" prepend-icon="mdi-link-variant">网络地址</v-btn>
        <v-btn value="upload" prepend-icon="mdi-upload">本地上传</v-btn>
      </v-btn-toggle>

      <!-- URL 输入 -->
      <div v-if="imageSource === 'url'" class="mb-4">
        <v-text-field
          v-model="localUrl"
          label="图片地址"
          placeholder="https://example.com/background.jpg"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-link"
          clearable
          hide-details="auto"
          :rules="[validateUrl]"
          @update:model-value="onUrlChange"
        />
        <div class="d-flex flex-wrap gap-2 mt-2">
          <v-chip
            v-for="preset in urlPresets"
            :key="preset.label"
            size="small"
            variant="tonal"
            color="primary"
            class="cursor-pointer"
            @click="applyPreset(preset.url)"
          >
            {{ preset.label }}
          </v-chip>
        </div>
      </div>

      <!-- 本地上传 -->
      <div v-if="imageSource === 'upload'" class="mb-4">
        <div
          class="upload-area rounded-xl pa-6 text-center mb-3"
          :class="{ 'upload-hover': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
        >
          <v-icon size="40" color="primary" class="mb-2">mdi-image-plus</v-icon>
          <div class="text-body-2">点击或拖拽图片到此处上传</div>
          <div class="text-caption text-medium-emphasis mt-1">支持 JPG、PNG、WebP、GIF（建议小于 {{ maxImageSizeMB }}MB）</div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleFileChange"
          />
        </div>

        <v-alert
          v-if="uploadWarning"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-2"
          icon="mdi-alert"
        >
          {{ uploadWarning }}
        </v-alert>

        <div v-if="localImageData" class="d-flex align-center ga-2">
          <v-chip color="success" prepend-icon="mdi-check-circle" size="small">
            已上传本地图片
          </v-chip>
          <v-btn
            size="small"
            variant="text"
            color="error"
            prepend-icon="mdi-delete"
            @click="clearUploadedImage"
          >
            清除
          </v-btn>
        </div>
      </div>

      <v-divider class="my-5" />

      <!-- 毛玻璃效果设置 -->
      <div class="d-flex align-center mb-4">
        <v-icon class="mr-2" color="blue">mdi-blur</v-icon>
        <span class="text-subtitle-1 font-weight-bold">毛玻璃效果</span>
      </div>

      <div class="mb-4">
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-body-2 text-medium-emphasis">模糊幅度</span>
          <span class="text-body-2 font-weight-bold">{{ localBlur }}px</span>
        </div>
        <v-slider
          v-model="localBlur"
          :min="0"
          :max="50"
          :step="1"
          color="primary"
          track-color="grey-lighten-3"
          thumb-label
          hide-details
          @update:model-value="onBlurChange"
        >
          <template #prepend>
            <v-icon size="small" color="grey">mdi-blur-off</v-icon>
          </template>
          <template #append>
            <v-icon size="small" color="primary">mdi-blur</v-icon>
          </template>
        </v-slider>
      </div>

      <div class="mb-4">
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-body-2 text-medium-emphasis">遮罩暗色程度</span>
          <span class="text-body-2 font-weight-bold">{{ localOpacity }}%</span>
        </div>
        <v-slider
          v-model="localOpacity"
          :min="0"
          :max="80"
          :step="1"
          color="blue-grey"
          track-color="grey-lighten-3"
          thumb-label
          hide-details
          @update:model-value="onOpacityChange"
        >
          <template #prepend>
            <v-icon size="small" color="grey">mdi-brightness-7</v-icon>
          </template>
          <template #append>
            <v-icon size="small" color="blue-grey">mdi-brightness-2</v-icon>
          </template>
        </v-slider>
      </div>

      <v-divider class="my-5" />

      <!-- 保存按钮 -->
      <div class="d-flex justify-end ga-3">
        <v-btn variant="text" prepend-icon="mdi-restore" @click="resetAll">
          重置
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-content-save"
          :loading="saving"
          @click="saveAll"
        >
          保存设置
        </v-btn>
      </div>
    </div>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '@/components/settings/SettingItem.vue';
import { getSetting, setSetting, resetSetting } from '@/utils/settings';

const URL_PRESETS = [
  { label: 'Bing 随机壁纸', url: 'https://bing.img.run/rand.php' },
  { label: 'Bing 每日壁纸', url: 'https://bing.img.run/1920x1080.php' },
  { label: '随机风景', url: 'https://picsum.photos/1920/1080?random=1' },
  { label: '随机二次元', url: 'https://uapis.cn/api/v1/random/image?category=acg&type=pc' },
];

const MAX_IMAGE_SIZE_MB = 2;

export default {
  name: 'BackgroundSettingsCard',
  components: { SettingsCard, SettingItem },

  data() {
    const imageData = getSetting('background.imageData') || '';
    const url = getSetting('background.url') || '';

    return {
      imageSource: imageData ? 'upload' : 'url',
      localUrl: url,
      localImageData: imageData,
      localBlur: getSetting('background.blur') ?? 10,
      localOpacity: getSetting('background.opacity') ?? 30,
      isDragging: false,
      saving: false,
      uploadWarning: '',
      urlPresets: URL_PRESETS,
      settingItemKey: 0,
      maxImageSizeMB: MAX_IMAGE_SIZE_MB,
    };
  },

  computed: {
    /** The active image src for preview */
    activeImageSrc() {
      if (this.imageSource === 'upload' && this.localImageData) {
        return this.localImageData;
      }
      if (this.imageSource === 'url' && this.localUrl) {
        return this.localUrl;
      }
      return '';
    },

    previewContainerStyle() {
      return {
        position: 'relative',
        width: '100%',
        height: '160px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(128,128,128,0.3)',
      };
    },

    previewBgStyle() {
      if (!this.activeImageSrc) {
        return {
          position: 'absolute',
          inset: '0',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          filter: `blur(${this.localBlur}px)`,
          transform: 'scale(1.1)',
        };
      }
      return {
        position: 'absolute',
        inset: '0',
        backgroundImage: `url(${this.activeImageSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `blur(${this.localBlur}px)`,
        transform: 'scale(1.1)',
      };
    },

    previewOverlayStyle() {
      return {
        position: 'absolute',
        inset: '0',
        background: `rgba(0, 0, 0, ${this.localOpacity / 100})`,
      };
    },
  },

  methods: {
    validateUrl(val) {
      if (!val) return true;
      try {
        new URL(val);
        return true;
      } catch {
        return '请输入有效的图片地址';
      }
    },

    onUrlChange(val) {
      this.localUrl = val || '';
    },

    onBlurChange(val) {
      this.localBlur = val;
    },

    onOpacityChange(val) {
      this.localOpacity = val;
    },

    applyPreset(url) {
      this.localUrl = url;
      this.imageSource = 'url';
    },

    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    handleDrop(event) {
      this.isDragging = false;
      const file = event.dataTransfer?.files?.[0];
      if (file) this.processFile(file);
    },

    handleFileChange(event) {
      const file = event.target.files?.[0];
      if (file) this.processFile(file);
      // Reset input so same file can be re-selected
      event.target.value = '';
    },

    processFile(file) {
      this.uploadWarning = '';

      if (!file.type.startsWith('image/')) {
        this.uploadWarning = '请选择图片文件';
        return;
      }

      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > MAX_IMAGE_SIZE_MB) {
        this.uploadWarning = `图片大小为 ${sizeMB.toFixed(1)}MB，超过 ${MAX_IMAGE_SIZE_MB}MB 限制，请压缩后重试`;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this.localImageData = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    clearUploadedImage() {
      this.localImageData = '';
      this.uploadWarning = '';
    },

    async saveAll() {
      this.saving = true;
      try {
        // Determine which image source to persist
        if (this.imageSource === 'upload') {
          setSetting('background.imageData', this.localImageData || '');
          setSetting('background.url', '');
        } else {
          setSetting('background.url', this.localUrl || '');
          setSetting('background.imageData', '');
        }

        setSetting('background.blur', this.localBlur);
        setSetting('background.opacity', this.localOpacity);
      } finally {
        this.saving = false;
      }
    },

    resetAll() {
      resetSetting('background.enabled');
      resetSetting('background.url');
      resetSetting('background.imageData');
      resetSetting('background.blur');
      resetSetting('background.opacity');

      this.localUrl = getSetting('background.url') || '';
      this.localImageData = getSetting('background.imageData') || '';
      this.localBlur = getSetting('background.blur') ?? 10;
      this.localOpacity = getSetting('background.opacity') ?? 30;
      this.imageSource = 'url';
      this.uploadWarning = '';
      // Force re-render of SettingItem to reflect reset enabled state
      this.settingItemKey++;
    },
  },
};
</script>

<style scoped>
.preview-area {
  transition: all 0.3s ease;
}

.preview-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  z-index: 1;
  pointer-events: none;
}

.upload-area {
  border: 2px dashed rgba(128, 128, 128, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(128, 128, 128, 0.05);
}

.upload-area:hover,
.upload-hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.gap-2 {
  gap: 8px;
}
</style>
