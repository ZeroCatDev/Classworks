<template>
  <v-container class="fill-height">
    <v-responsive class="align-centerfill-height mx-auto" max-width="900">
      <v-img class="mb-4" height="150" src="@/assets/logo.svg"/>

      <div class="text-center">
        <div class="text-body-2 font-weight-light mb-n1">出现了错误</div>

        <h1 class="text-h2 font-weight-bold">404</h1>
      </div>

      <div class="py-4"/>

      <v-row>
        <v-col cols="12">
          <v-card
            class="py-4"
            color="surface-variant"
            prepend-icon="mdi-help"
            rounded="lg"
            variant="outlined"
          >
            <template #image>
              <v-img position="top right"/>
            </template>

            <template #title>
              <h2 class="text-h5 font-weight-bold">为什么会出现此错误？</h2>
            </template>

            <template #subtitle>
              <div class="text-subtitle-1">大概是页面未找到</div>
            </template>

            <v-overlay
              contained
              model-value
              opacity=".12"
              persistent
              scrim="primary"
            />
          </v-card>
        </v-col>

        <v-col cols="6">
          <v-card
            class="py-4"
            color="surface-variant"
            prepend-icon="mdi-home"
            rounded="lg"
            title="返回首页"
            to="/"
            variant="text"
          >
            <v-overlay
              contained
              model-value
              opacity=".06"
              persistent
              scrim="primary"
            />
          </v-card>
        </v-col>

        <v-col cols="6">
          <v-card
            class="py-4"
            color="surface-variant"
            prepend-icon="mdi-arrow-left-drop-circle"
            rounded="lg"
            title="返回上一页"
            variant="text"
            @click="this.$router.back()"
          >
            <v-overlay
              contained
              model-value
              opacity=".06"
              persistent
              scrim="primary"
            />
          </v-card>
        </v-col>
      </v-row>
    </v-responsive>
  </v-container>
</template>

<script setup>
//
</script>
