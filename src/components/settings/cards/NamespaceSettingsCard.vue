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
          设置访问密码以保护数据安全，可以将老师、电教的名字、学号等作为密码
        </v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <v-form ref="passwordForm" @submit.prevent="savePassword">
          <v-text-field
            v-if="namespaceInfo.hasPassword"
            v-model="passwordForm.oldPassword"
            label="当前密码"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-4"
            :loading="passwordLoading"
            :rules="[(v) => !!v || '请输入当前密码']"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-lock" />
            </template>
          </v-text-field><v-text-field
            v-model="passwordForm.newPassword"
            label="新密码"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-4"
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
            class="mb-4"
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
            <div>
              <v-btn
                v-if="namespaceInfo.hasPassword"
                color="error"
                variant="tonal"
                :loading="passwordLoading"
                @click="confirmDeletePassword"
                class="mr-2"
              >
                删除密码
                <template #prepend>
                  <v-icon icon="mdi-lock-remove" />
                </template>
              </v-btn>
              <v-btn
                v-if="namespaceInfo.hasPassword"
                color="primary"
                variant="tonal"
                :loading="hintLoading"
                @click="openHintDialog"
              >
                设置密码提示
                <template #prepend>
                  <v-icon icon="mdi-lightbulb-outline" />
                </template>
              </v-btn>
            </div>

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
        <!--<setting-item
          setting-key="namespace.password"
          title="访问密码"
        ></setting-item>-->
      </v-card-text>
    </v-card>

    <!-- 密码提示设置对话框 -->
    <v-dialog v-model="showHintDialog" max-width="400">
      <v-card>
        <v-card-item>
          <v-card-title>设置密码提示</v-card-title>
          <v-card-subtitle class="mt-2">
            设置一个提示帮助记忆密码
          </v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <v-text-field
            v-model="passwordHintForm.hint"
            label="密码提示"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-4"
            :loading="hintLoading"
            placeholder="例如：我的生日"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-lightbulb-outline" />
            </template>
          </v-text-field>
          <div class="text-caption text-grey">
            当前提示：{{ namespaceInfo.passwordHint || "未设置" }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="showHintDialog = false"
            :disabled="hintLoading"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            :loading="hintLoading"
            @click="savePasswordHint"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

    <!-- 密码验证对话框 -->
    <v-dialog v-model="showVerifyDialog" max-width="400" persistent>
      <v-card>
        <v-card-item>
          <v-card-title>验证密码</v-card-title>
          <v-card-subtitle class="mt-2">
            请输入当前密码以继续操作
          </v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <v-text-field
            v-model="verifyForm.password"
            label="当前密码"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-4"
            :loading="verifyLoading"
            :error="!!verifyForm.error"
            :error-messages="verifyForm.error"
            @keyup.enter="verifyPassword"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-lock" />
            </template>
          </v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="cancelVerify"
            :disabled="verifyLoading"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            :loading="verifyLoading"
            :disabled="!verifyForm.password"
            @click="verifyPassword"
          >
            确认
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
import axios from "@/axios/axios";

// Helper function to get request headers
const getHeaders = () => {
  const headers = { Accept: "application/json" };
  const siteKey = getSetting("server.siteKey");
  const password = getSetting("namespace.password");

  if (siteKey) {
    headers["x-site-key"] = siteKey;
  }
  if (password) {
    headers["x-namespace-password"] = password;
  }

  return headers;
};

export default {
  name: "NamespaceSettingsCard",
  components: { SettingsCard },

  data() {
    return {
      loading: false,
      passwordLoading: false,
      hintLoading: false,
      verifyLoading: false,
      showSnackbar: false,
      showDeleteConfirm: false,
      showHintDialog: false,
      showVerifyDialog: false,
      snackbarText: "",
      snackbarColor: "success",
      namespaceInfo: {
        uuid: "",
        name: "",
        accessType: "PUBLIC",
        hasPassword: false,
        passwordHint: null,
      },
      namespaceForm: {
        name: "",
        accessType: "PUBLIC",
      },
      passwordForm: {
        newPassword: "",
        oldPassword: "",
        confirmPassword: "",
      },
      passwordHintForm: {
        hint: "",
      },
      verifyForm: {
        password: "",
        error: "",
        action: null, // 'delete' | 'hint'
        onSuccess: null,
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
      const isConfirmMatch = this.passwordForm.newPassword === this.passwordForm.confirmPassword;
      if (this.namespaceInfo.hasPassword) {
        return isConfirmMatch && !!this.passwordForm.oldPassword;
      }
      return isConfirmMatch;
    },
  },

  async created() {
    await this.loadNamespaceInfo();
    await this.loadPasswordHint();
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
          this.passwordForm.passwordHint = response.data.passwordHint || "";
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
        const response = await kvServerProvider.updatePassword(
          this.passwordForm.newPassword || null,
          this.passwordForm.oldPassword || null
        );

        if (response.status === 200) {
          this.namespaceInfo.hasPassword = !!this.passwordForm.newPassword;
          this.passwordForm = {
            newPassword: "",
            oldPassword: "",
            confirmPassword: "",
          };
          this.showSuccess("密码已更新");
          this.$router.push("/");
        } else {
          throw new Error(response.error?.message || "保存失败");
        }
      } catch (error) {
        console.error("保存密码失败:", error);
        this.showError(error.response?.data?.message || "保存密码失败");
      } finally {
        this.passwordLoading = false;
      }
    },

    async confirmDeletePassword() {
      this.verifyForm = {
        password: "",
        error: "",
        action: "delete",
        onSuccess: () => {
          this.showDeleteConfirm = true;
        },
      };
      this.showVerifyDialog = true;
    },

    async deletePassword() {
      this.passwordLoading = true;
      try {
        const response = await kvServerProvider.deletePassword();

        if (response.status === 200) {
          this.namespaceInfo.hasPassword = false;
          this.namespaceInfo.passwordHint = null;
          this.passwordForm = {
            newPassword: "",
            oldPassword: "",
            confirmPassword: "",
          };
          this.showDeleteConfirm = false;
          this.showSuccess("密码已删除");
        } else {
          throw new Error(response.error?.message || "删除失败");
        }
      } catch (error) {
        console.error("删除密码失败:", error);
        this.showError(error.response?.data?.message || "删除密码失败");
      } finally {
        this.passwordLoading = false;
      }
    },

    async loadPasswordHint() {
      try {
        const serverUrl = getSetting("server.domain");
        const machineId = getSetting("device.uuid");
        const response = await axios.get(
          `${serverUrl}/${machineId}/_hint`,
          { headers: getHeaders() }
        );

        if (response.data && response.data.passwordHint !== undefined) {
          this.namespaceInfo.passwordHint = response.data.passwordHint;
          this.passwordHintForm.hint = response.data.passwordHint || "";
        }
      } catch (error) {
        console.error("加载密码提示失败:", error);
        this.showError("加载密码提示失败");
      }
    },

    async savePasswordHint() {
      this.hintLoading = true;
      try {
        const serverUrl = getSetting("server.domain");
        const machineId = getSetting("device.uuid");
        const response = await axios.put(
          `${serverUrl}/${machineId}/_hint`,
          { hint: this.passwordHintForm.hint || null },
          { headers: getHeaders() }
        );

        if (response.data) {
          this.namespaceInfo.passwordHint = response.data.passwordHint;
          this.showSuccess("密码提示已更新");
          this.showHintDialog = false;
        }
      } catch (error) {
        console.error("保存密码提示失败:", error);
        this.showError(error.response?.data?.message || "保存密码提示失败");
      } finally {
        this.hintLoading = false;
      }
    },

    async openHintDialog() {
      this.verifyForm = {
        password: "",
        error: "",
        action: "hint",
        onSuccess: () => {
          this.showHintDialog = true;
        },
      };
      this.showVerifyDialog = true;
    },

    cancelVerify() {
      this.showVerifyDialog = false;
      this.verifyForm = {
        password: "",
        error: "",
        action: null,
        onSuccess: null,
      };
    },

    async verifyPassword() {
      if (!this.verifyForm.password) return;

      this.verifyLoading = true;
      this.verifyForm.error = "";

      try {
        const response = await axios.post(
          `${getSetting("server.domain")}/${getSetting("device.uuid")}/_checkpassword`,
          { password: this.verifyForm.password },
          { headers: getHeaders() }
        );

        if (response.status == 200) {
          // 验证成功，执行对应操作
          this.showVerifyDialog = false;
          if (this.verifyForm.onSuccess) {
            this.verifyForm.onSuccess();
          }
        } else {
          this.verifyForm.error = "密码错误";
        }
      } catch (error) {
        console.error("密码验证失败:", error);
        this.verifyForm.error = "密码验证失败";
      } finally {
        this.verifyLoading = false;
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
