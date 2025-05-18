<template>
  <settings-card
    title="命名空间设置"
    icon="mdi-database-lock"
    :loading="loading"
  >
    <!-- 命名空间标识符 -->
    <v-card variant="tonal" class="rounded-lg mb-4">
      <v-card-item>
        <template #prepend>
          <v-icon
            icon="mdi-identifier"
            size="large"
            class="mr-3"
            color="primary"
          />
        </template>
        <v-card-title>命名空间标识符</v-card-title>
        <v-card-subtitle>
          <div class="d-flex align-center mt-2">
            <code class="text-body-1">{{ namespaceInfo.uuid }}</code>
            <v-btn
              icon="mdi-content-copy"
              variant="text"
              size="small"
              class="ml-2"
              @click="copyUuid"
            />
          </div>
        </v-card-subtitle>
      </v-card-item>
    </v-card>

    <!-- 命名空间信息表单 -->
    <v-card variant="tonal" class="rounded-lg mb-4">
      <v-card-item>
        <template #prepend>
          <v-icon
            icon="mdi-form-textbox"
            size="large"
            class="mr-3"
            color="primary"
          />
        </template>
        <v-card-title>命名空间信息</v-card-title>
      </v-card-item>

      <v-card-text>
        <v-form ref="form" @submit.prevent="saveNamespaceInfo">
          <v-text-field
            v-model="namespaceForm.name"
            label="命名空间名称"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-4"
            :loading="loading"
            :rules="[(v) => !!v || '请输入命名空间名称']"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-tag-text" />
            </template>
          </v-text-field>

          <v-select
            v-model="namespaceForm.accessType"
            :items="accessTypeOptions"
            label="访问权限"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-6"
            :loading="loading"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-shield-lock" />
            </template>
          </v-select>

          <div class="d-flex justify-end">
            <v-btn
              color="primary"
              :loading="loading"
              :disabled="!isFormChanged"
              @click="saveNamespaceInfo"
            >
              保存更改
              <template #prepend>
                <v-icon icon="mdi-content-save" />
              </template>
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- 访问密码设置 -->
    <v-card variant="tonal" class="rounded-lg">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-key" size="large" class="mr-3" color="primary" />
        </template>
        <v-card-title>访问密码</v-card-title>
        <v-card-subtitle class="mt-2">
          设置访问密码以保护数据安全，留空表示无需密码
        </v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <v-form ref="passwordForm" @submit.prevent="savePassword">
          <v-text-field
            v-model="passwordForm.newPassword"
            label="新密码"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-4"
            type="password"
            :loading="passwordLoading"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-lock-plus" />
            </template>
          </v-text-field>

          <v-text-field
            v-model="passwordForm.confirmPassword"
            label="确认新密码"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-6"
            type="password"
            :loading="passwordLoading"
            :rules="[
              (v) =>
                !passwordForm.newPassword ||
                v === passwordForm.newPassword ||
                '两次输入的密码不一致',
            ]"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-lock-check" />
            </template>
          </v-text-field>

          <div class="d-flex justify-space-between align-center">
            <v-btn
              v-if="namespaceInfo.hasPassword"
              color="error"
              variant="tonal"
              :loading="passwordLoading"
              @click="showDeleteConfirm = true"
            >
              删除密码
              <template #prepend>
                <v-icon icon="mdi-lock-remove" />
              </template>
            </v-btn>
            <v-spacer v-else />

            <v-btn
              color="primary"
              :loading="passwordLoading"
              :disabled="!isPasswordFormValid"
              @click="savePassword"
            >
              保存密码
              <template #prepend>
                <v-icon icon="mdi-content-save" />
              </template>
            </v-btn>
          </div>
        </v-form>
        <setting-item
          setting-key="namespace.password"
          title="访问密码"
        ></setting-item>
      </v-card-text>
    </v-card>

    <!-- 删除密码确认对话框 -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-item>
          <v-card-title>确认删除密码</v-card-title>
          <v-card-text class="mt-4">
            删除密码后，任何人都可以访问和修改此命名空间的数据。确定要继续吗？
          </v-card-text>
        </v-card-item>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="showDeleteConfirm = false"
          >
            取消
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            :loading="passwordLoading"
            @click="deletePassword"
          >
            确认删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="showSnackbar"
      :timeout="3000"
      :color="snackbarColor"
      location="top"
    >
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" @click="showSnackbar = false"> 关闭 </v-btn>
      </template>
    </v-snackbar>
  </settings-card>
</template>

<script>
import SettingsCard from "@/components/SettingsCard.vue";
import { kvServerProvider } from "@/utils/providers/kvServerProvider";
import { getSetting } from "@/utils/settings";
import SettingItem from "@/components/settings/SettingItem.vue";

export default {
  name: "NamespaceSettingsCard",
  components: { SettingsCard, SettingItem },

  data() {
    return {
      loading: false,
      passwordLoading: false,
      showSnackbar: false,
      showDeleteConfirm: false,
      snackbarText: "",
      snackbarColor: "success",
      namespaceInfo: {
        uuid: "",
        name: "",
        accessType: "PUBLIC",
        hasPassword: false,
      },
      namespaceForm: {
        name: "",
        accessType: "PUBLIC",
      },
      passwordForm: {
        newPassword: "",
        confirmPassword: "",
      },
      originalForm: {
        name: "",
        accessType: "PUBLIC",
      },
      accessTypeOptions: [
        {
          title: "公开（无需密码）",
          value: "PUBLIC",
          icon: "mdi-lock-open",
        },
        {
          title: "受保护（需要密码写入）",
          value: "PROTECTED",
          icon: "mdi-lock",
        },
        {
          title: "私有（需要密码读写）",
          value: "PRIVATE",
          icon: "mdi-lock-alert",
        },
      ],
    };
  },

  computed: {
    deviceUuid() {
      return this.namespaceInfo.uuid;
    },
    isFormChanged() {
      return (
        this.namespaceForm.name !== this.originalForm.name ||
        this.namespaceForm.accessType !== this.originalForm.accessType
      );
    },
    isPasswordFormValid() {
      if (!this.passwordForm.newPassword) {
        return true; // 允许清空密码
      }
      return (
        this.passwordForm.newPassword === this.passwordForm.confirmPassword
      );
    },
  },

  async created() {
    await this.loadNamespaceInfo();
  },

  methods: {
    async loadNamespaceInfo() {
      this.loading = true;
      try {
        const response = await kvServerProvider.loadNamespaceInfo();
        if (response.status == 200 && response.data) {
          this.namespaceInfo = response.data;
          this.namespaceForm.name = response.data.name;
          this.namespaceForm.accessType = response.data.accessType;
          // 保存原始值用于比较
          this.originalForm = { ...this.namespaceForm };
        }
      } catch (error) {
        console.error("加载命名空间信息失败:", error);
        this.showError("加载命名空间信息失败");
      } finally {
        this.loading = false;
      }
    },

    async saveNamespaceInfo() {
      if (!this.isFormChanged) return;

      this.loading = true;
      try {
        const response = await kvServerProvider.updateNamespaceInfo({
          name: this.namespaceForm.name,
          accessType: this.namespaceForm.accessType,
        });
        console.log(response);
        if (response.status == 200) {
          this.originalForm = { ...this.namespaceForm };
          this.showSuccess("命名空间信息已更新");
        } else {
          throw new Error(response.error.message || "保存失败");
        }
      } catch (error) {
        console.error("保存命名空间信息失败:", error);
        this.showError(error.message || "保存命名空间信息失败");
      } finally {
        this.loading = false;
      }
    },

    async copyUuid() {
      try {
        await navigator.clipboard.writeText(this.namespaceInfo.uuid);
        this.showSuccess("命名空间标识符已复制到剪贴板");
      } catch (error) {
        console.error("复制失败:", error);
        this.showError("复制失败");
      }
    },

    async savePassword() {
      if (!this.isPasswordFormValid) return;

      this.passwordLoading = true;
      try {
        const oldPassword = getSetting("namespace.password");
        const response = await kvServerProvider.updatePassword(
          this.passwordForm.newPassword || null, // 如果为空字符串则发送null
          oldPassword
        );

        if (response.status === 200) {
          this.namespaceInfo.hasPassword = !!this.passwordForm.newPassword;
          this.passwordForm = {
            newPassword: "",
            confirmPassword: "",
          };
          this.showSuccess("密码已更新");
          this.$router.push("/");
        } else {
          console.log(response);
          throw new Error(response.error.message || "保存失败 #1");
        }
      } catch (error) {
        console.error("保存密码失败:", error);
        this.showError(error.message || "保存密码失败");
      } finally {
        this.passwordLoading = false;
      }
    },

    async deletePassword() {
      this.passwordLoading = true;
      try {
        const response = await kvServerProvider.deletePassword();

        if (response.status == 200) {
          this.namespaceInfo.hasPassword = false;
          this.passwordForm = {
            newPassword: "",
            confirmPassword: "",
          };
          this.showDeleteConfirm = false;
          this.showSuccess("密码已删除");
        } else {
          throw new Error(response.error.message || "删除失败");
        }
      } catch (error) {
        console.error("删除密码失败:", error);
        this.showError(error.message || "删除密码失败");
      } finally {
        this.passwordLoading = false;
      }
    },

    showSuccess(message) {
      this.snackbarColor = "success";
      this.snackbarText = message;
      this.showSnackbar = true;
    },

    showError(message) {
      this.snackbarColor = "error";
      this.snackbarText = message;
      this.showSnackbar = true;
    },
  },
};
</script>
