<template>
  <v-card border>
    <v-card-item>
      <template #prepend>
        <v-icon icon="mdi-information" size="large" class="mr-2" />
      </template>
      <v-card-title class="text-h6">关于</v-card-title>
    </v-card-item>

    <v-card-text>
      <v-row justify="center" align="center">
        <v-col cols="12" md="8" class="text-center">
          <v-avatar size="120" class="mb-4">
            <v-img
              src="https://avatars.githubusercontent.com/u/88357633?v=4"
              alt="作者头像"
            />
          </v-avatar>

          <h2 class="text-h5 mb-2">ClassworkS</h2>
          <p class="text-body-1 mb-4">
            由 <a
              href="https://github.com/sunwuyuan"
              target="_blank"
              class="text-decoration-none font-weight-medium"
            >Sunwuyuan</a> 开发
          </p>

          <div class="d-flex justify-center gap-2 flex-wrap">
            <v-btn
              color="primary"
              variant="outlined"
              href="https://github.com/ClassworksDev/Classworks"
              target="_blank"
              prepend-icon="mdi-github"
            >
              前端 GitHub
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              href="https://github.com/ClassworksDev/ClassworksServer"
              target="_blank"
              prepend-icon="mdi-github"
            >
              后端 GitHub
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              href="https://github.com/ClassworksDev/Classworks/issues"
              target="_blank"
              prepend-icon="mdi-bug"
            >
              报告问题
            </v-btn>
          </div>

          <p class="mt-4 text-caption text-medium-emphasis">
            GPL License © 2024
          </p>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'AboutCard'
}
</script>
