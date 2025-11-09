<template>
  <v-card class="my-4" :loading="loading" :disabled="!hasNamespaceInfo">
    <template #loader>
      <v-progress-linear v-if="loading" indeterminate color="primary" />
    </template>


    <v-card-title>
      <v-icon
        class="me-2"
      >
        mdi-cloud-check
      </v-icon>
      设备信息
    </v-card-title>

    <v-card-text v-if="hasNamespaceInfo">
      <!-- 未绑定账号时的提示卡片 -->
      <div
        v-if="namespaceInfo.hasAccount === false"
        class="mb-4"
      >
        <v-alert
          type="warning"
          variant="tonal"
          border
        >
          <v-alert-title>设备未绑定账号</v-alert-title>
          <div>当前设备尚未绑定账号,部分功能可能受限。请前往绑定账号以获得完整体验。</div>
          <v-btn
            class="mt-3"
            variant="outlined"
            :href="getBindAccountUrl()"
            append-icon="mdi-open-in-new"
            target="_blank"
          >
            前往绑定账号
          </v-btn>
        </v-alert>
      </div>

      <!-- 已绑定账号时显示账号信息 -->
      <div
        v-if="namespaceInfo.hasAccount && namespaceInfo.account"
        class="d-flex align-center mb-4"
      >
        <v-card
          border
          hover
          class="w-100"
          variant="tonal"
          :prepend-avatar="namespaceInfo.account.avatarUrl"
          :title="namespaceInfo.account.name || '未命名用户'"
          :subtitle="'此设备由贵校管理 管理员账号 ID: ' + namespaceInfo.account.id"
        >
          <v-card-text>
            此设备由贵校或贵单位管理，该管理员系此空间所有者，如有疑问请咨询他，对于恶意绑定、滥用行为请反馈。
          </v-card-text>
        </v-card>
      </div>

      <!-- 设备信息卡片 -->
      <v-card
        v-if="namespaceInfo.device"
        variant="tonal"
        class="mb-4"
        border
        hover
      >
        <v-card-title class="pb-1">
          设备信息
        </v-card-title>
        <v-card-text>
          <div class="d-flex flex-column gap-1">
            <div class="d-flex align-center">
              <v-icon
                size="small"
                class="me-2"
              >
                mdi-tag
              </v-icon>
              <span class="font-weight-medium me-2">设备名称:</span>
              <span>{{ namespaceInfo.device.name || '未命名设备' }}</span>
            </div>
            <div class="d-flex align-center">
              <v-icon
                size="small"
                class="me-2"
              >
                mdi-identifier
              </v-icon>
              <span class="font-weight-medium me-2">设备 ID:</span>
              <span>{{ namespaceInfo.device.id }}</span>
            </div>
            <!-- 仅未绑定账号时显示 UUID -->
            <div
              v-if="namespaceInfo.hasAccount === false && namespaceInfo.device.uuid"
              class="d-flex align-center"
            >
              <v-icon
                size="small"
                class="me-2"
              >
                mdi-uuid
              </v-icon>
              <span class="font-weight-medium me-2">UUID:</span>
              <span class="text-truncate">{{ namespaceInfo.device.uuid }}</span>
            </div>
            <div class="d-flex align-center">
              <v-icon
                size="small"
                class="me-2"
              >
                mdi-calendar
              </v-icon>
              <span class="font-weight-medium me-2">创建时间:</span>
              <span>{{ formatDate(namespaceInfo.device.createdAt) }}</span>
            </div>
            <div
              v-if="namespaceInfo.device.updatedAt"
              class="d-flex align-center"
            >
              <v-icon
                size="small"
                class="me-2"
              >
                mdi-calendar-clock
              </v-icon>
              <span class="font-weight-medium me-2">更新时间:</span>
              <span>{{ formatDate(namespaceInfo.device.updatedAt) }}</span>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card
        title="Classworks KV"
        subtitle="文档形键值数据库"
        border
        hover
      >
        <v-card-text>
          Classworks KV 是厚浪云推出的文档形键值数据库，其是一个开放的云应用平台，为各种应用提供存储服务。此设备正在使用其服务，如果您希望管理设备信息，请前往 Classworks KV 的网站，如果您在服务推出前就在使用 Classworks，您的数据已被自动迁移。
          <br><br>
          Classworks KV 的全域管理员是
          <a
            href="https://wuyuan.dev"
            target="_blank"
          >
            孙悟元
          </a>
        </v-card-text>
        <v-card-actions>
          <v-btn
            :href="defaultAuthServer"
            class="text-none"
            append-icon="mdi-open-in-new"
            target="_blank"
          >
            前往 Classworks KV
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-card-text>

    <v-card-text v-else>
      <v-alert
        type="info"
        variant="tonal"
      >
        <v-alert-title>未获取到设备信息</v-alert-title>
        <p>您尚未完成云端存储授权或连接失败，请点击下方按钮进行初始化。</p>
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        color="primary"
        variant="outlined"
        :loading="loading"
        @click="reloadInfo"
      >
        刷新设备信息
      </v-btn>

      <v-btn
        color="error"
        variant="outlined"
        @click="showReinitDialog = true"
      >
        重新初始化云端存储
      </v-btn>
    </v-card-actions>

    <!-- 重新初始化确认对话框 -->
    <v-dialog
      v-model="showReinitDialog"
      max-width="500"
    >
      <v-card>
        <v-card-title>确认重新初始化</v-card-title>
        <v-card-text>
          <v-alert
            type="warning"
            variant="tonal"
            class="mb-3"
          >
            <v-alert-title>警告</v-alert-title>
            此操作将清除当前的云端存储配置（包括 Token），您需要重新进行授权。
          </v-alert>
          <p>您确定要重新初始化云端存储吗？</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showReinitDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            color="error"
            @click="confirmReinitialize"
          >
            确认
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import { kvServerProvider } from "@/utils/providers/kvServerProvider";
import { setSetting, getSetting } from "@/utils/settings";

export default {
  name: "CloudNamespaceInfoCard",
  props: {
    visible: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      namespaceInfo: {},
      loading: false,
      hasNamespaceInfo: false,
      showReinitDialog: false, // 确认对话框显示状态
      defaultAuthServer: getSetting('server.authDomain'),
    };
  },
  watch: {
    visible(newVal) {
      if (newVal === true) {
        this.fetchNamespaceInfo();
      }
    },
  },
  mounted() {
    if (this.visible) {
      this.fetchNamespaceInfo();
    }
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) return "未知";
      try {
        const date = new Date(dateString);
        return date.toLocaleString("zh-CN");
      } catch {
        return dateString;
      }
    },
    async fetchNamespaceInfo() {
      this.loading = true;
      try {
        const response = await kvServerProvider.loadNamespaceInfo();

        this.namespaceInfo = response;
        this.hasNamespaceInfo = true;
        this.loading = false;
      } catch (e) {
        console.error("获取命名空间信息失败:", e);
        this.hasNamespaceInfo = false;
        this.namespaceInfo = {};
      } finally {
        this.loading = false;
      }
    },
    async reloadInfo() {
      await this.fetchNamespaceInfo();
    },
    getBindAccountUrl() {
      const uuid = this.namespaceInfo?.device?.uuid;
      if (uuid) {
        return `${this.defaultAuthServer}?uuid=${encodeURIComponent(uuid)}&tolinktoaccount=true`;
      }
      return this.defaultAuthServer;
    },
    confirmReinitialize() {
      // 删除 token 配置（设置为空字符串以触发 shouldShowInit）
      setSetting('server.kvToken', '');
      setSetting('device.uuid', '');

      // 关闭对话框
      this.showReinitDialog = false;

      // 返回主页（将触发 InitServiceChooser 组件显示）
      this.$router.push('/');
    },
  },
};
</script>
