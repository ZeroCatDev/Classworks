<template>
  <v-footer height="40" app>
    <a
      v-for="item in items"
      :key="item.title"
      :href="item.href"
      :title="item.title"
      class="d-inline-block mx-2 social-link"
      rel="noopener noreferrer"
      target="_blank"
    >
      <v-icon :icon="item.icon" :size="item.icon === 'mdi-earth' ? 24 : 16" />
    </a>

  
    <div
      class="text-caption text-disabled"
      style="position: absolute; right: 16px"
    >
      &copy; 2020-{{ new Date().getFullYear() }}
      <span class="d-none d-sm-inline-block">SunWuyuan</span>
      —
      <a
        class="text-decoration-none on-surface"
        href="https://github.com/sunwuyuan/classworks-frontend"
        rel="noopener noreferrer"
        target="_blank"
      >
        Classworks
      </a>  <a
        class="text-decoration-none on-surface"
        href="https://beiancx.miit.gov.cn"
        rel="noopener noreferrer"
        target="_blank"
      >
        浙ICP备2024068645号
      </a>
    </div>
  </v-footer>
</template>

<script setup>
import { useDisplay } from "vuetify";
const { mobile } = useDisplay();

const items = [
  {
    title: "孙悟远",
    icon: `mdi-earth`,
    href: "https://wuyuan.dev",
  },
  {
    title: "ZeroCat",
    icon: "mdi-xml",
    href: "https://zerocat.houlangs.com",
  },
  {
    title: "GitHub",
    icon: "mdi-github",
    href: "https://github.com/sunwuyuan/classworks-frontend",
  },
];
</script>

<style scoped lang="sass">
.social-link :deep(.v-icon)
  color: rgba(var(--v-theme-on-background), var(--v-disabled-opacity))
  text-decoration: none
  transition: .2s ease-in-out

  &:hover
    color: rgba(25, 118, 210, 1)
</style>
