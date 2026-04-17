<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
    scrollable
  >
    <v-card>
      <v-card-title>迁移到云端</v-card-title>
      <v-card-text style="height: 400px;">
        <div
          v-if="loading"
          class="d-flex justify-center align-center fill-height"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>
        <div
          v-else-if="keys.length === 0"
          class="d-flex justify-center align-center fill-height"
        >
          没有找到本地数据
        </div>
        <div v-else>
          <!-- Category Selection -->
          <v-list
            select-strategy="classic"
            class="mb-4"
          >
            <v-list-subheader>选择数据类型</v-list-subheader>

            <v-list-item
              v-for="category in categories"
              :key="category.id"
              @click="toggleCategory(category)"
            >
              <template #prepend>
                <v-checkbox-btn
                  :model-value="getCategoryState(category)"
                  :indeterminate="getCategoryIndeterminate(category)"
                  @click.stop="toggleCategory(category)"
                />
              </template>
              <v-list-item-title>{{ category.label }}</v-list-item-title>
              <v-list-item-subtitle>{{ category.description }} ({{ getCategoryCount(category) }} 项)</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider class="mb-4" />

          <!-- Individual Keys Expansion -->
          <v-expansion-panels>
            <v-expansion-panel title="详细数据列表">
              <v-expansion-panel-text>
                <v-list
                  select-strategy="classic"
                  density="compact"
                >
                  <v-list-item
                    v-for="key in keys"
                    :key="key"
                    :value="key"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        v-model="selectedKeys"
                        :value="key"
                      />
                    </template>
                    <v-list-item-title>{{ key }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <div class="text-caption ml-4 text-medium-emphasis">
          已选择 {{ selectedKeys.length }} 项
        </div>
        <v-spacer />
        <v-btn
          variant="text"
          @click="dialog = false"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          :loading="migrating"
          :disabled="selectedKeys.length === 0"
          @click="migrate"
        >
          开始迁移
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Result Dialog -->
  <v-dialog
    v-model="resultDialog"
    max-width="500"
  >
    <v-card>
      <v-card-title>迁移结果</v-card-title>
      <v-card-text>
        <div v-if="result">
          <p>总计: {{ result.summary.total }}</p>
          <p>成功: {{ result.summary.successful }}</p>
          <p>失败: {{ result.summary.failed }}</p>
        </div>
        <div v-else-if="error">
          <p class="text-error">
            {{ error }}
          </p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          @click="resultDialog = false"
        >
          关闭
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { kvLocalProvider } from '@/utils/providers/kvLocalProvider';
import { getSetting } from '@/utils/settings';
import axios from '@/axios/axios';

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue']);

const dialog = ref(false);
const loading = ref(false);
const migrating = ref(false);
const keys = ref([]);
const selectedKeys = ref([]);
const resultDialog = ref(false);
const result = ref(null);
const error = ref(null);

const categories = [
  {
    id: 'student-list',
    label: '学生列表',
    description: 'classworks-list-main',
    matcher: (key) => key === 'classworks-list-main' || key.startsWith('classworks-list-main')
  },
  {
    id: 'homework-data',
    label: '作业数据',
    description: 'classworks-data-*',
    matcher: (key) => key.startsWith('classworks-data-')
  },
  {
    id: 'lists',
    label: '列表',
    description: 'classworks-list-*',
    matcher: (key) => key.startsWith('classworks-list-')
  },
  {
    id: 'other',
    label: '其他',
    description: '所有其他键',
    matcher: (key) => !key.startsWith('classworks-data-') && !key.startsWith('classworks-list-')
  }
];

watch(() => props.modelValue, (val) => {
  dialog.value = val;
  if (val) {
    loadKeys();
  }
});

watch(dialog, (val) => {
  emit('update:modelValue', val);
});

const loadKeys = async () => {
  loading.value = true;
  try {
    const res = await kvLocalProvider.loadKeys({ limit: 1000 }); // Load many keys
    keys.value = res.keys || [];
    selectedKeys.value = [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const getCategoryKeys = (category) => {
  return keys.value.filter(category.matcher);
};

const getCategoryCount = (category) => {
  return getCategoryKeys(category).length;
};

const getCategoryState = (category) => {
  const catKeys = getCategoryKeys(category);
  if (catKeys.length === 0) return false;
  const selectedCount = catKeys.filter(k => selectedKeys.value.includes(k)).length;
  return selectedCount === catKeys.length;
};

const getCategoryIndeterminate = (category) => {
  const catKeys = getCategoryKeys(category);
  if (catKeys.length === 0) return false;
  const selectedCount = catKeys.filter(k => selectedKeys.value.includes(k)).length;
  return selectedCount > 0 && selectedCount < catKeys.length;
};

const toggleCategory = (category) => {
  const catKeys = getCategoryKeys(category);
  if (catKeys.length === 0) return;

  const currentState = getCategoryState(category);

  const newSelectedKeys = new Set(selectedKeys.value);

  if (currentState) {
    // Unselect
    catKeys.forEach(k => newSelectedKeys.delete(k));
  } else {
    // Select
    catKeys.forEach(k => newSelectedKeys.add(k));
  }

  selectedKeys.value = Array.from(newSelectedKeys);
};

const migrate = async () => {
  migrating.value = true;
  error.value = null;
  result.value = null;

  try {
    const batchData = {};
    for (const key of selectedKeys.value) {
      const res = await kvLocalProvider.loadData(key);
      if (res) {
        // kvLocalProvider.loadData returns formatResponse(JSON.parse(data)) which is just the data object if successful?
        // Let's check formatResponse in dataProvider.js: export const formatResponse = (data) => data;
        // So it returns the data directly?
        // Wait, kvLocalProvider.js: return formatResponse(JSON.parse(data));
        // But if error: return formatError(...) which returns { success: false, error: ... }
        // formatResponse is just identity function.
        // So if success, it returns the object.
        // But wait, formatError returns an object with success: false.
        // If success, it returns the data object directly?
        // Let's re-read dataProvider.js

        // export const formatResponse = (data) => data;
        // export const formatError = (message, code = "UNKNOWN_ERROR") => ({ success: false, error: {code, message} });

        // So if successful, it returns the data object.
        // If failed, it returns { success: false, ... }
        // This is a bit ambiguous if the data object itself has a success property.
        // But assuming the data is what we want.

        // However, looking at kvLocalProvider.js:
        // if (!data) return formatError(...)
        // return formatResponse(JSON.parse(data))

        // So if I get an object that has success: false, it might be an error.
        // But usually data is just the stored object.

        if (res && res.success === false && res.error) {
            console.warn(`Skipping key ${key} due to load error`, res.error);
            continue;
        }
        batchData[key] = res;
      }
    }

    const serverUrl = getSetting("server.domain");
    const token = getSetting("server.kvToken");

    if (!serverUrl || !token) {
      throw new Error("请先配置服务器地址和 Token");
    }

    // Remove trailing slash if present
    const baseUrl = serverUrl.replace(/\/$/, '');

    const response = await axios.post(`${baseUrl}/kv/_batchimport`, batchData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.code === 200) {
        result.value = response.data.data;
        resultDialog.value = true;
        dialog.value = false;
    } else {
        throw new Error(response.data?.message || "迁移失败");
    }

  } catch (e) {
    console.error(e);
    error.value = e.response?.data?.message || e.message || "发生未知错误";
    resultDialog.value = true;
  } finally {
    migrating.value = false;
  }
};
</script>
