<template>
  <v-card>
    <v-card-title>输入替代代码</v-card-title>
    <v-card-text>
      <v-textarea
        v-model="code"
        density="comfortable"
        hide-details="auto"
        label="替代代码"
        placeholder="请输入替代代码"
        rows="5"
        variant="outlined"
      />
      <v-alert
        class="mt-3"
        type="info"
        variant="tonal"
      >
        替代代码功能暂未实现，敬请期待
      </v-alert>
    </v-card-text>
    <v-card-actions>
      <v-spacer/>
      <v-btn
        v-if="showCancel"
        variant="text"
        @click="$emit('cancel')"
      >
        取消
      </v-btn>
      <v-btn
        :disabled="!code"
        color="primary"
        @click="submit"
      >
        提交
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import {ref} from 'vue'

defineProps({
  showCancel: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

const code = ref('')

const submit = () => {
  if (!code.value) return
  // TODO: 实现替代代码逻辑
  emit('submit', code.value)
}

// 暴露清空表单的方法
defineExpose({
  reset: () => {
    code.value = ''
  }
})
</script>
