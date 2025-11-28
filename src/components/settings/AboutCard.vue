<template>
  <v-card border hover rounded="xl">
    <v-card-item>
      <template #prepend>
        <v-icon class="mr-2" icon="mdi-information" size="large"/>
      </template>
      <v-card-title class="text-h6">关于</v-card-title>
    </v-card-item>

    <v-card-text>
      <v-row>
        <v-col class="mx-auto" cols="12" md="8">
          <div class="d-flex flex-column align-start">
            <v-avatar class="mb-4" size="120">
              <v-img
                alt="Classworks"
                src="../../assets/cslogo.png"
              />
            </v-avatar>

            <h2 class="text-h5 mb-2">Classworks</h2>
            <p class="text-body-1 mb-4">适用于班级大屏的作业板小工具</p>

            <div class="d-flex gap-2 flex-wrap mb-6">
              <v-btn
                color="red"
                href="https://github.com/ClassworksDev/Classworks/issues"
                prepend-icon="mdi-bug"
                target="_blank"
                variant="tonal"
              >
                报告问题
              </v-btn>
              <v-btn
                color="primary"
                href="https://qm.qq.com/q/qNBX4ZZVeg"
                prepend-icon="mdi-qqchat"
                target="_blank"
                variant="tonal"
              >
                QQ 群
              </v-btn>
              <v-btn
                href="https://github.com/ClassworksDev/Classworks"
                prepend-icon="mdi-github"
                target="_blank"
                variant="text"
              >
                前端
              </v-btn>
              <v-btn
                href="https://github.com/ClassworksDev/ClassworksServer"
                prepend-icon="mdi-github"
                target="_blank"
                variant="text"
              >
                后端
              </v-btn>
            </div>

            <v-divider class="mb-4 w-100"></v-divider>

            <h3 class="text-h6 mb-2">备注与致谢</h3>
            <v-list class="mb-4 bg-transparent">
              <v-list-item
                append-icon="mdi-link"
                href="https://github.com/EnderWolf006/HomeworkBoard"
                target="_blank"
              >
                <v-list-item-title>
                  本项目受到 HomeworkBoard 的启发而开发
                </v-list-item-title>
                <v-list-item-subtitle>
                  感谢 EnderWolf006 (@EnderWolf) fhzit(@Hellofhz) KeyFac
                  等人的贡献
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item
                append-icon="mdi-link"
                href="https://hlyun.org"
                target="_blank"
              >
                <v-list-item-title>
                  Classworks 由<strong>厚浪云</strong>提供
                </v-list-item-title>
                <v-list-item-subtitle>
                  长江后浪推前浪 浮事新人换旧人
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item
                append-icon="mdi-link"
                href="https://zerocat.houlangs.com"
                target="_blank"
              >
                <v-list-item-title>
                  感谢 ZeroCat 社区的开发者们
                </v-list-item-title>
                <v-list-item-subtitle>
                  新一代，开源，编程社区
                </v-list-item-subtitle>
              </v-list-item>
              <v-divider class="ma-1"></v-divider>
              <v-list-item
                append-icon="mdi-link"
                href="https://github.com/HUSX100/IslandCaller"
                target="_blank"
              >
                <v-list-item-title>
                  本项目与 IslandCaller 没有从属关系
                </v-list-item-title>
                <v-list-item-subtitle>
                  IslandCaller 是由 HUSX100 开发的基于 ClassIsland
                  提醒服务的轻量级点名器
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item
                append-icon="mdi-link"
                href="https://classisland.tech"
                target="_blank"
              >
                <v-list-item-title>
                  本项目与 ClassIsland 没有从属关系
                </v-list-item-title>
                <v-list-item-subtitle>
                  ClassIsland 是由 HelloWRC
                  开发的适用于班级大屏的课表信息显示工具
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-btn
              class="mb-4"
              prepend-icon="mdi-package-variant"
              variant="text"
              @click="showDeps = true"
            >
              查看使用的第三方库
            </v-btn>

            <v-dialog
              v-model="showDeps"
              fullscreen
              transition="dialog-bottom-transition"
            >
              <v-card
              >
                <v-toolbar>
                  <v-btn icon="mdi-close" @click="showDeps = false"></v-btn>
                  <v-toolbar-title>使用的第三方库</v-toolbar-title>
                  <v-spacer></v-spacer>
                </v-toolbar>
                <v-card-text>
                  <v-list>
                    <v-list-item
                      v-for="dep in Dependencies"
                      :key="dep.name"
                      :href="'https://www.npmjs.com/package/' + dep.name"
                      append-icon="mdi-link"
                      target="_blank"
                    >
                      <v-list-item-title>
                        {{ dep.name }}
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        v{{ dep.version }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-dialog>

            <p class="text-caption text-medium-emphasis">
              Copyright © {{ new Date().getFullYear() }} Sunwuyuan
            </p>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import {ref, onMounted} from "vue";
import packageJson from "../../../package.json";

export default {
  name: "AboutCard",
  setup() {
    const Dependencies = ref([]);
    const showDeps = ref(false); // 添加对话框显示状态

    const loadDependencies = () => {
      try {
        // 合并 dependencies 和 devDependencies
        const allDependencies = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
        };

        // 转换为数组并过滤掉不需要显示的依赖
        const deps = Object.entries(allDependencies).map(([name, version]) => ({
          name,
          version: version.replace(/[\^~]/g, ""),
          description: getDependencyDescription(name),
        }));

        Dependencies.value = deps;
      } catch (error) {
        console.error("加载依赖信息失败:", error);
        Dependencies.value = [];
      }
    };

    const getDependencyDescription = (name) => {
      const descriptions = {
        vue: "渐进式 JavaScript 框架",
        vuetify: "材料设计组件框架",
        axios: "Promise 基础的 HTTP 客户端",
        pinia: "Vue 状态管理库",
        "vue-router": "Vue.js 官方路由管理器",
        "@vitejs/plugin-vue": "Vite 的 Vue 插件",
      };
      return descriptions[name] || "";
    };

    onMounted(() => {
      loadDependencies();
    });

    return {
      Dependencies,
      showDeps,
    };
  },
};
</script>
