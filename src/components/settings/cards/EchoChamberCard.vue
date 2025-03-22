<template>
  <settings-card
    border
    title="回声洞"
    icon="mdi-thought-bubble"
    @click="handleClick"
  >
    <v-card-text>
      <div ref="typewriter" class="typewriter-text"></div>
      <div ref="sourceWriter" class="source-text text-caption text-grey"></div>
    </v-card-text>
    <div class="d-flex align-center">
      <transition name="fade">
        <div v-if="currentQuote?.contributor" class="contributor">
          <v-chip>
            <v-avatar start>
              <v-img
                :src="`https://github.com/${currentQuote.contributor}.png`"
              ></v-img> </v-avatar
            >{{ currentQuote.contributor }}
          </v-chip>
        </div>
      </transition>
    </div>
  </settings-card>
</template>

<script>
import Typewriter from "typewriter-effect/dist/core";
import quotes from "@/data/echoChamber.json";
import SettingsCard from "@/components/SettingsCard.vue";

export default {
  name: "EchoChamberCard",
  components: { SettingsCard },
  data() {
    return {
      typewriter: null,
      sourceWriter: null,
      currentQuote: {
        text: this.INITIAL_TEXT,
        author: this.INITIAL_SOURCE,
      },
      showCopySuccess: false,
      hasClicked: false,
      INITIAL_TEXT: "点击此处可以查看 Classworks 用户群里沙雕群友们的发言",
      INITIAL_SOURCE: "点击后会复制当前句子到剪贴板中",
    };
  },
  mounted() {
    this.initTypewriters();
  },
  methods: {
    getRandomQuote() {
      const index = Math.floor(Math.random() * quotes.quotes.length);
      return quotes.quotes[index];
    },
    initTypewriters() {
      // 主文本打字机
      this.typewriter = new Typewriter(this.$refs.typewriter, {
        delay: 50,
        deleteSpeed: 100,
        loop: false,
      });

      // 来源文本打字机
      this.sourceWriter = new Typewriter(this.$refs.sourceWriter, {
        delay: 10,
        deleteSpeed: 10,
        loop: false,
        cursor: "",
      });

      // 显示初始提示
      this.typewriter.typeString(this.INITIAL_TEXT).start();
      this.sourceWriter.typeString(this.INITIAL_SOURCE).start();
    },

    typeQuote(quote) {
      this.typewriter.deleteAll(30).typeString(quote.text).start();

      if (quote.author) {
        this.sourceWriter.deleteAll(20).typeString(`${quote.author}`).start();
      }
    },

    refreshQuote() {
      this.currentQuote = this.getRandomQuote();
      this.typeQuote(this.currentQuote);
    },

    async handleClick() {
      if (!this.hasClicked) {
        this.hasClicked = true;
        this.currentQuote = this.getRandomQuote();
      }
      await this.copyToClipboard();
      this.refreshQuote();
    },

    async copyToClipboard() {
      if (!this.currentQuote) return;

      const quote = this.currentQuote;
      const text = `${quote.text}\n${
        quote.author ? `作者：${quote.author}` : ""
      }\n${quote.contributor ? `贡献者：${quote.contributor}` : ""}${
        quote.link
          ? `\n来源：${quote.link}`
          : quote.contributor
          ? "\n来源：https://github.com/" + quote.contributor
          : ""
      }`;

      try {
        await navigator.clipboard.writeText(text);
        this.showCopySuccess = true;
      } catch (err) {
        console.error("复制失败:", err);
      }
    },
  },
  beforeUnmount() {
    if (this.typewriter) {
      this.typewriter.stop();
    }
    if (this.sourceWriter) {
      this.sourceWriter.stop();
    }
  },
};
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.source-text {
  opacity: 0.7;
  font-size: 0.9em;
}

.contributor {
  opacity: 0.7;
  font-size: 0.9em;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
