<template>
  <v-dialog v-model="isVisible" max-width="500" persistent>
    <v-card class="rate-limit-modal">
      <v-card-title class="text-center pa-4 bg-error text-white">
        <v-icon class="mr-2" icon="mdi-clock-alert-outline" size="large"/>
        请求频率超限
      </v-card-title>

      <v-card-text class="pa-6">
        <div class="text-body-1 mb-4">您的请求过于频繁，请稍后再试。</div>

        <v-card v-if="activeRequests.length > 0" class="mb-4" flat>
          <v-card-text>
            <v-list
              v-for="(request, index) in activeRequests"
              :key="index"
              class="mb-4"
            >
              <v-list-item color="primary" prepend-icon="mdi-web">
                <v-list-item-title>
                  等待时间:
                  <span class="text-primary font-weight-bold">{{
                    request.remainingSeconds
                  }}</span>
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ request.method }} {{ request.path }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list
            >
            <v-divider
              v-if="index < activeRequests.length - 1"
              class="my-3"
            ></v-divider>
          </v-card-text>
        </v-card>

        <div class="text-body-2 text-grey">
          请在等待时间后再次尝试，或减少请求频率以避免限制。
        </div>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="tonal" @click="close"> 我知道了</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
// 创建一个全局实例，用于存储和管理限速状态
let instance = null;

const RateLimitModalComponent = {
  name: "RateLimitModal",
  data() {
    return {
      isVisible: false,
      activeRequests: [],
    };
  },
  computed: {
    hasActiveRequests() {
      return this.activeRequests.length > 0;
    },
  },
  watch: {
    hasActiveRequests(newValue) {
      this.isVisible = newValue;
    },
  },
  methods: {
    close() {
      this.isVisible = false;
    },
    show(resetTime, path, method) {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const remainingSeconds = Math.max(
        0,
        Math.floor((new Date(resetTime) - new Date()) / 1000)
      );

      const request = {
        id,
        resetTime,
        path,
        method,
        remainingSeconds,
      };

      this.activeRequests.push(request);
      this.startCountdown(id);
      this.isVisible = true;
    },
    startCountdown(id) {
      const request = this.activeRequests.find((req) => req.id === id);
      if (!request) return;

      const intervalId = setInterval(() => {
        const index = this.activeRequests.findIndex((req) => req.id === id);
        if (index === -1) {
          clearInterval(intervalId);
          return;
        }

        this.activeRequests[index].remainingSeconds--;

        if (this.activeRequests[index].remainingSeconds <= 0) {
          clearInterval(intervalId);
          this.activeRequests.splice(index, 1);
        }
      }, 1000);

      // 存储intervalId以便清理
      request.intervalId = intervalId;
    },
    clearAllCountdowns() {
      this.activeRequests.forEach((request) => {
        if (request.intervalId) {
          clearInterval(request.intervalId);
        }
      });
      this.activeRequests = [];
    },
  },
  beforeUnmount() {
    this.clearAllCountdowns();
  },
  created() {
    // 保存组件实例的引用，以便静态方法可以访问
    instance = this;
  },
};

// 添加静态方法到组件上
RateLimitModalComponent.show = function (resetTime, path, method) {
  if (instance) {
    instance.show(resetTime, path, method);
  }
};

export default RateLimitModalComponent;
</script>
