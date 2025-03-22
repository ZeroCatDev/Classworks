<template>
  <settings-card
    border
    title="回声洞"
    icon="mdi-thought-bubble"
    @click="handleClick"
  >
    <v-card-text>
      <div ref="typewriter" class="typewriter-text"></div>
      <div ref="sourceWriter" class="source-text"></div>
    </v-card-text>
    <transition name="fade">
      <v-chip v-if="currentQuote?.contributor" class="contributor">
        <v-avatar start>
          <v-img :src="`https://github.com/${currentQuote.contributor}.png`" />
        </v-avatar>
        {{ currentQuote.contributor }}
      </v-chip>
    </transition>
  </settings-card>
</template>

<script>
import Typewriter from "typewriter-effect/dist/core";
import quotes from "@/data/echoChamber.json";
import SettingsCard from "@/components/SettingsCard.vue";

const INITIAL_STATE = {
  text: "点击此处可以查看 Classworks 用户群里沙雕群友们的发言",
  author: "点击后会复制当前句子到剪贴板中"
};

const TYPEWRITER_CONFIG = {
  main: { delay: 50, deleteSpeed: 100 },
  source: { delay: 10, deleteSpeed: 10, cursor: "" }
};

export default {
  name: "EchoChamberCard",
  components: { SettingsCard },
  data: () => ({
    typewriter: null,
    sourceWriter: null,
    currentQuote: INITIAL_STATE,
    hasClicked: false
  }),

  mounted() {
    this.initTypewriters();
  },

  methods: {
    initTypewriters() {
      this.typewriter = new Typewriter(this.$refs.typewriter, TYPEWRITER_CONFIG.main);
      this.sourceWriter = new Typewriter(this.$refs.sourceWriter, TYPEWRITER_CONFIG.source);
      this.typeQuote(INITIAL_STATE);
    },

    typeQuote(quote) {
      this.typewriter.deleteAll(30).typeString(quote.text).start();
      if (quote.author) {
        this.sourceWriter.deleteAll(20).typeString(quote.author).start();
      }
    },

    async handleClick() {
      if (!this.hasClicked) {
        this.hasClicked = true;
      }
      await this.copyToClipboard();
      this.currentQuote = this.getRandomQuote();
      this.typeQuote(this.currentQuote);
    },

    getRandomQuote() {
      return quotes.quotes[Math.floor(Math.random() * quotes.quotes.length)];
    },

    async copyToClipboard() {
      if (!this.currentQuote) return;

      const { text, author, contributor, link } = this.currentQuote;
      const parts = [
        text,
        author && `作者：${author}`,
        contributor && `贡献者：${contributor}`,
        (link || contributor) && `来源：${link || `https://github.com/${contributor}`}`
      ].filter(Boolean);

      try {
        await navigator.clipboard.writeText(parts.join('\n'));
      } catch (err) {
        console.error("复制失败:", err);
      }
    }
  },

  beforeUnmount() {
    [this.typewriter, this.sourceWriter].forEach(writer => writer?.stop());
  }
};
</script>

<style scoped>
.source-text, .contributor {
  opacity: 0.7;
  font-size: 0.9em;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
