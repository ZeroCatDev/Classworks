<template>
  <v-container>
    <v-form @submit.prevent="saveServerUrl">
      <v-text-field
        v-model="serverUrl"
        label="Backend Server URL"
        required
      />
      <v-btn type="submit" color="primary">Save</v-btn>
    </v-form>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      serverUrl: ''
    };
  },
  methods: {
    saveServerUrl() {
      localStorage.setItem('backendServerUrl', this.serverUrl);
      alert('Server URL saved!');
    },
    loadServerUrl() {
      const savedUrl = localStorage.getItem('backendServerUrl');
      if (savedUrl) {
        this.serverUrl = savedUrl;
      }
    }
  },
  mounted() {
    this.loadServerUrl();
  }
};
</script>
