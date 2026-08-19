<template>
  <v-container
    class="fill-height"
    fluid
  >
    <v-row
      align="center"
      justify="center"
    >
      <v-col
        cols="12"
        md="6"
        sm="8"
      >
        <v-card>
          <v-card-title class="text-h5">
            {{ status === 'processing' ? '正在处理授权...' : status === 'success' ? '授权成功' : '授权失败' }}
          </v-card-title>
          <v-card-text>
            <v-progress-linear
              v-if="status === 'processing'"
              class="mb-4"
              color="primary"
              indeterminate
            />
            <p>{{ message }}</p>
          </v-card-text>
          <v-card-actions v-if="status !== 'processing'">
            <v-spacer />
            <v-btn
              color="primary"
              @click="goToHome"
            >
              返回首页
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {getSetting, setSetting} from '@/utils/settings';

const route = useRoute();
const router = useRouter();

const status = ref('processing');
const message = ref('正在验证授权信息...');

onMounted(async () => {
  try {
    const token = route.query.token;

    if (!token) {
      status.value = 'error';
      message.value = '未获取到授权令牌';
      return;
    }

    // 保存token到设置
    setSetting('server.kvToken', token);

    const uuid = getSetting('device.uuid');
    if (uuid && uuid !== '00000000-0000-4000-8000-000000000000') {
      // 设置uuid为默认值，标记迁移完成
      setSetting('device.uuid', '00000000-0000-4000-8000-000000000000');
      message.value = '授权成功！已完成数据迁移。';
    } else {
      message.value = '授权成功！';
    }

    status.value = 'success';
    router.push('/');

  } catch (error) {
    console.error('授权处理失败:', error);
    status.value = 'error';
    message.value = `授权失败: ${error.message}`;
  }
});

const goToHome = () => {
  router.push('/');
};
</script>
