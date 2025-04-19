<template>
  <v-dialog v-model="dialogVisible" width="500" @click:outside="handleClose">
    <v-card border>
      <v-card-title>{{ subject.name }}</v-card-title>
      <v-card-subtitle>
        {{ autoSave ? "自动保存已启用" : "写完后点击保存" }}
      </v-card-subtitle>
      <v-card-text>
        <v-textarea ref="inputRef" v-model="content" auto-grow placeholder="使用换行表示分条" rows="5" />
      </v-card-text>
      <v-card-actions v-if="!autoSave">
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="handleSave">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'SubjectDialog',
  props: {
    subject: {
      type: Object,
      default: () => ({ name: '', content: '' })
    },
    autoSave: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      dialogVisible: false,
      content: ''
    };
  },

  methods: {
    open() {
      this.content = this.subject.content || '';
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.inputRef) {
          this.$refs.inputRef.focus();
        }
      });
    },

    handleClose() {
      if (this.autoSave) {
        this.saveContent();
      }
      this.dialogVisible = false;
    },

    handleSave() {
      this.saveContent();
      this.dialogVisible = false;
    },

    saveContent() {
      if (this.content !== this.subject.content) {
        this.$emit('save', this.content);
      }
    }
  }
}
</script>