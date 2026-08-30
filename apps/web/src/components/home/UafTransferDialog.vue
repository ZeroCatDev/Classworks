<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="920" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          :icon="mode === 'export' ? 'mdi-file-export-outline' : 'mdi-file-import-outline'"
          class="mr-2"
        />
        {{ mode === 'export' ? '导出 UAF' : '导入 UAF' }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
      </v-card-title>

      <v-divider />

      <v-card-text class="transfer-content">
        <template v-if="mode === 'export'">
          <v-tabs v-if="mobile" v-model="mobileTab" fixed-tabs class="mb-3">
            <v-tab value="edit"> 编辑 </v-tab>
            <v-tab value="preview"> 预览 </v-tab>
          </v-tabs>

          <div
            class="export-layout"
            :class="{ mobile: mobile, 'show-preview': mobile && mobileTab === 'preview' }"
          >
            <div class="editor-section">
              <v-text-field
                v-model="exportDate"
                class="mb-3"
                label="导出日期"
                prepend-inner-icon="mdi-calendar"
                type="date"
                hide-details
                :disabled="busy"
                @update:model-value="loadExportPreview"
              />

              <v-progress-linear v-if="loadingPreview" class="mb-3" indeterminate />

              <v-alert v-if="exportError" class="mb-3" type="warning" variant="tonal">
                {{ exportError }}
              </v-alert>

              <div v-if="previewRows.length" class="d-flex align-center mb-2">
                <v-checkbox-btn
                  :model-value="allValidSelected"
                  :indeterminate="someValidSelected && !allValidSelected"
                  @click="toggleAll"
                />
                <span class="text-body-2">选择全部有效作业</span>
                <v-spacer />
                <span class="text-caption text-medium-emphasis">
                  已选择 {{ selectedAssignments.length }} / {{ previewRows.length }} 项
                </span>
              </div>

              <v-list v-if="previewRows.length" border lines="three">
                <v-list-item v-for="row in previewRows" :key="row.id" class="edit-list-item">
                  <template #prepend>
                    <v-checkbox-btn v-model="row.selected" :disabled="row.issues.length > 0" />
                  </template>
                  <div class="d-flex flex-column w-100">
                    <v-list-item-title>{{ row.assignment.subject }}</v-list-item-title>
                    <v-list-item-subtitle class="content-preview">
                      {{ row.assignment.content }}
                    </v-list-item-subtitle>
                    <div class="d-flex flex-wrap align-center mt-1 ga-1">
                      <v-chip size="x-small" variant="tonal">
                        {{ row.assignment.date }}
                      </v-chip>
                      <v-chip
                        v-for="tag in row.assignment.tags"
                        :key="tag"
                        size="x-small"
                        color="primary"
                        variant="tonal"
                      >
                        {{ tag }}
                      </v-chip>
                      <span v-if="row.issues.length" class="text-caption text-error">
                        {{ row.issues.join('；') }}
                      </span>
                    </div>
                  </div>
                </v-list-item>
              </v-list>

              <v-empty-state
                v-else-if="!loadingPreview && !exportError"
                icon="mdi-book-open-blank-variant-outline"
                text="该日期没有可导出的作业"
                title="暂无作业"
              />
            </div>

            <div class="preview-section">
              <div class="preview-placeholder">
                <div class="preview-scroll-container">
                  <v-progress-linear v-if="previewLoading" indeterminate />
                  <v-alert v-else-if="previewError" type="error" variant="tonal">
                    {{ previewError }}
                  </v-alert>
                  <v-alert v-else-if="!previewUrl" type="info" variant="tonal">
                    请选择有效作业以预览
                  </v-alert>
                  <iframe v-else :src="previewUrl" class="pdf-preview-frame" title="UAF 导出预览" />
                </div>
              </div>

              <v-expansion-panels
                v-model="fontSettingsPanels"
                variant="accordion"
                class="mt-3 font-settings-panels"
              >
                <v-expansion-panel value="settings">
                  <v-expansion-panel-title> 导出字体设置 </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div v-for="field in styleFields" :key="field.key" class="mb-3">
                      <div class="d-flex align-center ga-3">
                        <span class="text-caption label-min-width">{{ field.label }}</span>
                        <v-slider
                          v-model="globalStyle[field.key].fontSize"
                          :min="field.min"
                          :max="field.max"
                          :step="0.5"
                          hide-details
                          class="flex-grow-1"
                        />
                        <v-text-field
                          :model-value="globalStyle[field.key].fontSize"
                          type="number"
                          :min="field.min"
                          :max="field.max"
                          step="0.5"
                          density="compact"
                          hide-details
                          variant="outlined"
                          class="style-number-field"
                          @update:model-value="setGlobalFontSize(field.key, $event)"
                        />
                      </div>
                      <div class="d-flex align-center ga-3 mt-2">
                        <span class="text-caption label-min-width">字重</span>
                        <v-select
                          v-model="globalStyle[field.key].fontWeight"
                          :items="fontWeightOptions"
                          item-title="title"
                          item-value="value"
                          density="compact"
                          hide-details
                          variant="outlined"
                          class="style-weight-select"
                        />
                      </div>
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </div>
        </template>

        <template v-else>
          <v-file-input
            v-model="importFile"
            accept="application/pdf,.pdf"
            clearable
            label="选择 UAF PDF"
            prepend-icon="mdi-file-pdf-box"
            :disabled="busy"
            @update:model-value="prepareImport"
          />

          <v-progress-linear v-if="loadingImport" class="mb-3" indeterminate />

          <v-alert v-if="importError" class="mb-3" type="error" variant="tonal">
            {{ importError }}
          </v-alert>

          <v-alert v-if="planIssues.length" class="mb-3" type="warning" variant="tonal">
            {{ planIssues.join('；') }}
          </v-alert>

          <template v-if="importPlan">
            <div class="text-body-2 mb-3">
              共 {{ importPlan.rows.length }} 项作业，分布在 {{ groupedRows.length }} 个日期。
              冲突项默认保留现有内容。
            </div>
            <v-expansion-panels multiple variant="accordion">
              <v-expansion-panel v-for="group in groupedRows" :key="group.date">
                <v-expansion-panel-title>
                  {{ displayDate(group.date) }}
                  <v-chip class="ml-2" size="small" variant="tonal">
                    {{ group.rows.length }} 项
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list lines="three">
                    <v-list-item v-for="row in group.rows" :key="row.id">
                      <v-list-item-title class="d-flex align-center">
                        {{ row.assignment.subject }}
                        <v-chip
                          v-if="row.conflict"
                          class="ml-2"
                          color="warning"
                          size="x-small"
                          variant="tonal"
                        >
                          已有同名卡片
                        </v-chip>
                      </v-list-item-title>
                      <v-list-item-subtitle class="content-preview">
                        {{ row.assignment.content }}
                      </v-list-item-subtitle>
                      <template #append>
                        <v-select
                          v-model="row.action"
                          class="action-select"
                          density="compact"
                          hide-details
                          :items="actionOptions(row)"
                          item-title="title"
                          item-value="value"
                          variant="outlined"
                        />
                      </template>
                    </v-list-item>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </template>
        </template>
      </v-card-text>

      <v-divider />
      <v-card-actions>
        <span class="text-caption text-medium-emphasis ml-2">
          {{ footerText }}
        </span>
        <v-spacer />
        <v-btn variant="text" :disabled="busy" @click="dialog = false"> 取消 </v-btn>
        <v-btn
          color="primary"
          :disabled="primaryDisabled"
          :loading="busy"
          :prepend-icon="mode === 'export' ? 'mdi-download' : 'mdi-database-import-outline'"
          @click="mode === 'export' ? exportSelected() : importSelected()"
        >
          {{ mode === 'export' ? '导出所选作业' : '确认导入' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import dataProvider from '@/utils/dataProvider'
import { debounce } from '@/utils/debounce'
import {
  buildUafPdfBytes,
  createExportPreview,
  createImportPlan,
  downloadUafAssignments,
  executeImportPlan,
  findImportPlanIssues,
  itemsFromBoardData,
  parseUafPdf,
  UafExportValidationError,
} from '@/utils/uafExport'

const props = defineProps({
  modelValue: Boolean,
  mode: {
    type: String,
    default: 'export',
  },
  currentDate: {
    type: String,
    required: true,
  },
  currentItems: {
    type: Array,
    default: () => [],
  },
  currentBoardData: {
    type: Object,
    required: true,
  },
  subjects: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'success', 'error', 'imported'])
const { mobile } = useDisplay()
const fontWeightOptions = [
  { title: 'Light', value: 'light' },
  { title: 'Regular', value: 'regular' },
  { title: 'Bold', value: 'bold' },
]
const styleFields = [
  { key: 'subject', label: '标题', min: 10, max: 32 },
  { key: 'content', label: '正文', min: 8, max: 24 },
  { key: 'tags', label: '标签', min: 6, max: 16 },
]
const globalStyle = ref({
  subject: { fontSize: 17, fontWeight: 'regular' },
  content: { fontSize: 13.5, fontWeight: 'regular' },
  tags: { fontSize: 9.5, fontWeight: 'regular' },
})
const fontSettingsPanels = ref([])
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const exportDate = ref('')
const previewRows = ref([])
const exportError = ref('')
const loadingPreview = ref(false)
const exporting = ref(false)
const importFile = ref(null)
const importPlan = ref(null)
const importError = ref('')
const loadingImport = ref(false)
const importing = ref(false)
const mobileTab = ref('edit')
const previewUrl = ref('')
const previewLoading = ref(false)
const previewError = ref('')
const busy = computed(() => exporting.value || importing.value || loadingImport.value)

const selectedAssignments = computed(() =>
  previewRows.value.filter((row) => row.selected).map((row) => row.assignment),
)
const styledSelectedAssignments = computed(() =>
  selectedAssignments.value.map((assignment) => ({
    ...assignment,
    style: JSON.parse(JSON.stringify(globalStyle.value)),
  })),
)
const validRows = computed(() => previewRows.value.filter((row) => row.issues.length === 0))
const allValidSelected = computed(
  () => validRows.value.length > 0 && validRows.value.every((row) => row.selected),
)
const someValidSelected = computed(() => validRows.value.some((row) => row.selected))
const groupedRows = computed(() => {
  if (!importPlan.value) return []
  const groups = new Map()
  for (const row of importPlan.value.rows) {
    if (!groups.has(row.date)) groups.set(row.date, [])
    groups.get(row.date).push(row)
  }
  return [...groups].map(([date, rows]) => ({ date, rows }))
})
const planIssues = computed(() => findImportPlanIssues(importPlan.value?.rows || []))
const primaryDisabled = computed(() =>
  props.mode === 'export'
    ? selectedAssignments.value.length === 0 || loadingPreview.value
    : !importPlan.value || planIssues.value.length > 0 || importing.value,
)
const footerText = computed(() => {
  if (props.mode === 'export') return `文件日期：${exportDate.value || '未选择'}`
  if (!importPlan.value) return '仅支持内嵌 uaf_payload.csv 的 UAF PDF'
  const active = importPlan.value.rows.filter((row) => row.action !== 'keep').length
  return `将导入 ${active} 项，保留 ${importPlan.value.rows.length - active} 项`
})

watch(
  () => props.modelValue,
  (open, oldOpen) => {
    if (!open && oldOpen) {
      releasePreviewUrl()
      mobileTab.value = 'edit'
    }
    if (!open) return
    if (props.mode === 'export') {
      exportDate.value = displayDate(props.currentDate)
      loadExportPreview()
    } else {
      importFile.value = null
      importPlan.value = null
      importError.value = ''
    }
  },
)

watch(
  selectedAssignments,
  () => {
    generatePreview()
  },
  { deep: true },
)

watch(globalStyle, () => generatePreview(), { deep: true })

onUnmounted(() => {
  releasePreviewUrl()
})

function cloneBoard(board) {
  return JSON.parse(JSON.stringify(board || { homework: {}, attendance: {} }))
}

async function loadBoard(date) {
  if (date === props.currentDate) return cloneBoard(props.currentBoardData)
  const result = await dataProvider.loadData(`classworks-data-${date}`)
  if (result?.success === false) {
    if (result.error?.code === 'NOT_FOUND') {
      return { homework: {}, attendance: { absent: [], late: [], exclude: [] } }
    }
    throw new Error(result.error?.message || `无法读取 ${date} 的作业`)
  }
  return cloneBoard(result)
}

async function loadExportPreview() {
  if (!exportDate.value) return
  loadingPreview.value = true
  exportError.value = ''
  try {
    const date = exportDate.value.replaceAll('-', '')
    const items =
      date === props.currentDate
        ? props.currentItems
        : itemsFromBoardData(await loadBoard(date), props.subjects)
    previewRows.value = createExportPreview(items, exportDate.value)
  } catch (error) {
    previewRows.value = []
    exportError.value = error.message || '无法加载该日期的作业'
  } finally {
    loadingPreview.value = false
  }
}

function toggleAll() {
  const selected = !allValidSelected.value
  for (const row of validRows.value) row.selected = selected
}

function setGlobalFontSize(fieldKey, value) {
  const field = styleFields.find((f) => f.key === fieldKey)
  const parsed = Number(value)
  const size = Number.isFinite(parsed) ? parsed : field.min
  globalStyle.value[fieldKey].fontSize =
    Math.round(Math.min(field.max, Math.max(field.min, size)) * 2) / 2
}

function releasePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

const generatePreview = debounce(async () => {
  if (!styledSelectedAssignments.value.length) {
    releasePreviewUrl()
    previewError.value = ''
    previewLoading.value = false
    return
  }
  previewLoading.value = true
  previewError.value = ''
  try {
    const pdfBytes = await buildUafPdfBytes(styledSelectedAssignments.value)
    const blob = new window.Blob([pdfBytes], { type: 'application/pdf' })
    releasePreviewUrl()
    previewUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    releasePreviewUrl()
    previewError.value = formatError(error)
  } finally {
    previewLoading.value = false
  }
}, 800)

async function exportSelected() {
  exporting.value = true
  try {
    const filename = await downloadUafAssignments(styledSelectedAssignments.value, exportDate.value)
    emit('success', '导出成功', filename)
    dialog.value = false
  } catch (error) {
    emitError('导出失败', error)
  } finally {
    exporting.value = false
  }
}

async function prepareImport(value) {
  const file = Array.isArray(value) ? value[0] : value
  importPlan.value = null
  importError.value = ''
  if (!file) return
  loadingImport.value = true
  try {
    const document = await parseUafPdf(file)
    importPlan.value = await createImportPlan(document, props.subjects, loadBoard)
  } catch (error) {
    importError.value = formatError(error)
  } finally {
    loadingImport.value = false
  }
}

function actionOptions(row) {
  return row.conflict
    ? [
        { title: '保留现有', value: 'keep' },
        { title: '覆盖现有', value: 'overwrite' },
      ]
    : [
        { title: '导入', value: 'import' },
        { title: '跳过', value: 'keep' },
      ]
}

async function importSelected() {
  importing.value = true
  try {
    const result = await executeImportPlan(importPlan.value, async (date, board) => {
      const response = await dataProvider.saveData(`classworks-data-${date}`, board)
      if (response?.success === false) throw new Error(response.error?.message || '保存失败')
    })
    emit('imported', result)
    if (result.failedDates.length) {
      emit(
        'error',
        '部分日期导入失败',
        `已保存：${result.savedDates.join('、') || '无'}\n失败：${result.failedDates.map((item) => item.date).join('、')}`,
      )
    } else {
      emit('success', '导入完成', `已导入 ${result.imported} 项，保留 ${result.skipped} 项`)
      dialog.value = false
    }
  } catch (error) {
    emitError('导入失败', error)
  } finally {
    importing.value = false
  }
}

function emitError(title, error) {
  emit('error', title, formatError(error))
}

function formatError(error) {
  if (error instanceof UafExportValidationError) return error.issues.join('\n')
  return error?.message || '发生未知错误'
}

function displayDate(date) {
  if (/^\d{8}$/.test(date)) return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  return date
}
</script>

<style scoped>
.transfer-content {
  min-height: 360px;
}

.content-preview {
  display: -webkit-box;
  overflow: hidden;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.export-layout {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 360px;
}

.editor-section {
  flex: 7;
  min-width: 0;
  overflow-y: auto;
}

.preview-section {
  flex: 5;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.preview-placeholder {
  flex: 1 1 auto;
  min-height: 360px;
  max-height: 480px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-scroll-container {
  flex: 1;
  overflow: auto;
  position: relative;
}

.pdf-preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.edit-list-item {
  align-items: flex-start;
}

.style-weight-select {
  max-width: 110px;
}

.label-min-width {
  min-width: 40px;
  text-align: right;
}

.style-number-field {
  max-width: 90px;
}

.style-select-field {
  max-width: 110px;
}

.export-layout.mobile {
  flex-direction: column;
  max-height: none;
}

.export-layout.mobile .editor-section,
.export-layout.mobile .preview-section {
  display: none;
  overflow-y: visible;
  min-height: 60vh;
}

.export-layout.mobile.show-preview .preview-section {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}

.export-layout.mobile.show-preview .preview-placeholder {
  max-height: none;
}

.export-layout.mobile:not(.show-preview) .editor-section {
  display: block;
}

.action-select {
  min-width: 132px;
  width: 132px;
}

@media (max-width: 600px) {
  .action-select {
    min-width: 112px;
    width: 112px;
  }
}
</style>
