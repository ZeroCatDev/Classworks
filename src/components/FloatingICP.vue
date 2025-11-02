<template>
  <a
    class="floating-icp-link"
    href="https://beian.miit.gov.cn/"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="浙ICP备2024068645号"
  >
    浙ICP备2024068645号
  </a>
</template>

<script>
export default {
  name: 'FloatingICP',
}

</script>

<style scoped>
.floating-icp-link {
  position: fixed;
  right: 4px;
  bottom: 0;
  z-index: 100;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.2px;
  color: rgb(107, 107, 107);
  text-decoration: none;
  background: transparent;
  border: none;
  box-shadow: none;
  transition: none !important;
}

.floating-icp-link:hover,
.floating-icp-link:focus,
.floating-icp-link:active {
  color: rgb(65, 65, 65);
  text-decoration: none;
  outline: none;
}

@media (max-width: 600px) {
  .floating-icp-link {
    right: 16px;
    bottom: 0;
    font-size: 14px;
  }
}
</style>
