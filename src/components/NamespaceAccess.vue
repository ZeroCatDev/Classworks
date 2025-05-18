<template>
  <div class="namespace-access" v-if="shouldShowAccess">
    <!-- 只读状态显示 -->
    <v-chip
      v-if="isReadOnly"
      color="warning"
      prepend-icon="mdi-lock-outline"
    >
      只读
    </v-chip>
    <v-btn
      v-if="isReadOnly"
      color="primary"
      class="rounded-xl"
      prepend-icon="mdi-lock-open-variant"
      @click="openPasswordDialog"
      :disabled="loading"
    >
      启用编辑
    </v-btn>

    <!-- 密码输入对话框 -->
    <v-dialog v-model="dialog" max-width="400" persistent>
      <v-card class="rounded-xl" border hover>
        <v-card-title class="text-h6">输入访问密码</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="password"
            label="密码"
            variant="outlined"
            :error="!!error"
            :error-messages="error"
            @keyup.enter="checkPassword"
            @click:append-inner="showPassword = !showPassword"
            :disabled="loading"
            autofocus
          />

          <p v-if="passwordHint">密码提示：{{ passwordHint }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            class="rounded-xl"
            @click="dialog = false"
            :disabled="loading"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            class="rounded-xl"
            variant="tonal"

            @click="checkPassword"
            :loading="loading"
            :disabled="!password"
          >
            确认
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { getSetting, setSetting } from "@/utils/settings";
import axios from "@/axios/axios";

export default {
  name: "NamespaceAccess",
  data() {
    return {
      dialog: false,
      password: "",
      error: "",
      loading: false,
      showPassword: false,
      isReadOnly: false,
      accessType: "PUBLIC", // 默认为公开访问
      passwordHint: null, // 密码提示
    };
  },
  computed: {
    shouldShowAccess() {
      const provider = getSetting("server.provider");
      return provider === "kv-server" || provider === "classworkscloud";
    }
  },
  async created() {
    if (this.shouldShowAccess) {
      await this.checkAccess();
    }
  },
  methods: {
    async checkAccess() {
      if (!this.shouldShowAccess) {
        return;
      }

      try {
        // 获取命名空间访问类型
        const response = await axios.get(
          `${getSetting("server.domain")}/${getSetting("device.uuid")}/_info`
        );

        if (
          response.data &&
          response.data.accessType &&
          ["PRIVATE", "PROTECTED", "PUBLIC"].includes(response.data.accessType)
        ) {
          this.accessType = response.data.accessType;

        } else {
          return;
        }

        // 如果是私有或受保护的命名空间，检查密码
        if (this.accessType === "PRIVATE" || this.accessType === "PROTECTED") {
          const storedPassword = getSetting("namespace.password");
          if (storedPassword) {
            await this.verifyPassword(storedPassword);
          } else if (this.accessType === "PRIVATE") {
            // 如果是私有且没有密码，立即打开密码对话框
            this.openPasswordDialog();
          } else {
            // 如果是受保护的且没有密码，设置为只读
            this.setReadOnly(true);
          }
        }
        const passwordHintresponse = await axios.get(
          `${getSetting("server.domain")}/${getSetting("device.uuid")}/_hint`
        );
        if (passwordHintresponse.data && passwordHintresponse.data.passwordHint) {
          this.passwordHint = passwordHintresponse.data.passwordHint || null;
        }

      } catch (error) {
        // 处理403错误
        if (error.response && error.response.status === 403) {
          this.accessType = "PRIVATE";
          this.setReadOnly(true);
          this.openPasswordDialog();
        } else {
          console.error("访问检查失败:", error);
          this.$message?.error("访问检查失败");
        }
      }
    },

    async verifyPassword(password) {
      try {
        const uuid = getSetting("device.uuid");
        const response = await axios.post(
          `${getSetting("server.domain")}/${uuid}/_checkpassword`,
          { password }
        );

        if (response.status != 200) {
          throw new Error(response.data?.error?.message || "密码错误");
        }

        // 密码验证成功
        setSetting("namespace.password", password);
        this.setReadOnly(false);
        this.dialog = false;
        this.$message?.success("验证成功", "已启用编辑功能");
      } catch (error) {
        // 密码验证失败
        setSetting("namespace.password", "");
        this.setReadOnly(true);
        throw error;
      }
    },

    openPasswordDialog() {
      this.password = "";
      this.error = "";
      this.dialog = true;
    },

    async checkPassword() {
      if (!this.password) {
        this.error = "请输入密码";
        return;
      }

      this.loading = true;
      this.error = "";

      try {
        await this.verifyPassword(this.password);
      } catch (error) {
        console.error("密码验证失败:", error);
        this.error = "密码验证失败";
      } finally {
        this.loading = false;
      }
    },

    setReadOnly(value) {
      this.isReadOnly = value;
      setSetting("namespace.accessType", value ? "readonly" : "readwrite");
    },
  },
};
</script>

<style scoped>
.namespace-access {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.password-hint {
  max-width: 100%;
  word-wrap: break-word;
}
</style>
