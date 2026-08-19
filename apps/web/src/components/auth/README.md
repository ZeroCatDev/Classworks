# 认证组件

这个目录包含可复用的认证相关组件,可以在应用的任何地方使用。

## 组件列表

### DeviceAuthDialog.vue

设备认证对话框,用于通过 namespace 和密码进行设备认证。

**Props:**

- `showCancel` (Boolean): 是否显示取消按钮,默认为 `false`

**Events:**

- `@success`: 认证成功时触发,传递认证数据
- `@cancel`: 点击取消按钮时触发

**暴露的方法:**

- `reset()`: 清空表单和错误信息

**使用示例:**

```vue
<template>
  <v-dialog v-model="dialog">
    <DeviceAuthDialog
      :show-cancel="true"
      @success="handleSuccess"
      @cancel="dialog = false"
    />
  </v-dialog>
</template>

<script setup>
import DeviceAuthDialog from '@/components/auth/DeviceAuthDialog.vue'
</script>
```

---

### TokenInputDialog.vue

Token 输入对话框,用于手动输入 KV 授权 Token。

**Props:**

- `showCancel` (Boolean): 是否显示取消按钮,默认为 `false`

**Events:**

- `@success`: Token 验证成功时触发
- `@cancel`: 点击取消按钮时触发

**暴露的方法:**

- `reset()`: 清空表单和错误信息

**使用示例:**

```vue
<template>
  <v-dialog v-model="dialog">
    <TokenInputDialog
      :show-cancel="true"
      @success="handleSuccess"
      @cancel="dialog = false"
    />
  </v-dialog>
</template>

<script setup>
import TokenInputDialog from '@/components/auth/TokenInputDialog.vue'
</script>
```

---

### AlternativeCodeDialog.vue

替代代码输入对话框（功能暂未实现）。

**Props:**

- `showCancel` (Boolean): 是否显示取消按钮,默认为 `false`

**Events:**

- `@submit`: 提交代码时触发,传递代码内容
- `@cancel`: 点击取消按钮时触发

**暴露的方法:**

- `reset()`: 清空表单

**使用示例:**

```vue
<template>
  <v-dialog v-model="dialog">
    <AlternativeCodeDialog
      :show-cancel="true"
      @submit="handleSubmit"
      @cancel="dialog = false"
    />
  </v-dialog>
</template>

<script setup>
import AlternativeCodeDialog from '@/components/auth/AlternativeCodeDialog.vue'
</script>
```

---

### FirstTimeGuide.vue

初次使用指南,介绍 Classworks KV 的功能和使用方式。

**Events:**

- `@close`: 关闭指南时触发

**使用示例:**

```vue
<template>
  <v-dialog v-model="dialog">
    <FirstTimeGuide @close="dialog = false" />
  </v-dialog>
</template>

<script setup>
import FirstTimeGuide from '@/components/auth/FirstTimeGuide.vue'
</script>
```

## 设计原则

1. **可复用性**: 所有组件都被设计为独立可复用的,可以在应用的任何地方使用
2. **独立性**: 每个组件都包含自己的逻辑和样式,不依赖外部状态
3. **统一接口**: 所有对话框组件都遵循相同的 props 和 events 模式
4. **响应式设计**: 组件适配各种屏幕尺寸

## 注意事项

- 这些组件需要配合 Vuetify 使用
- 组件内部使用了 `@/utils/settings` 和 `@/axios/axios`,确保这些依赖可用
- 建议将这些组件包裹在 `v-dialog` 中使用,以获得最佳的用户体验
