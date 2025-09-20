# 创建新的作业编辑对话框组件
<template>
  <v-dialog v-model="dialogVisible" width="auto" max-width="900" @click:outside="handleClose">
    <v-card border>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-subtitle>
        {{ autoSave ? "喵？喵呜！" : "写完后点击上传谢谢喵" }}
      </v-card-subtitle>
      <v-card-text>
        <div class="d-flex">
          <div class="flex-grow-1">
            <v-textarea
              ref="inputRef"
              v-model="content"
              auto-grow
              placeholder="使用换行表示分条"
              rows="5"
              @click="updateCurrentLine"
              @keyup="updateCurrentLine"
            width="480"
            />

            <!-- Template Buttons Section -->
            <div v-if="templateData" class="mt-4">
              <div v-if="hasTemplates" class="template-buttons">


                <!-- Subject specific books -->
                <template v-if="subjectBooks">
                  <div v-for="(pages, book) in subjectBooks" :key="book" class="button-group">
                    <v-chip
                      class="ma-1 book-chip"
                      :color="isBookSelected(book) ? 'success' : 'default'"
                      :variant="isBookSelected(book) ? 'elevated' : 'flat'"
                      @click="handleBookClick(book)"
                    >
                      {{ book }}
                    </v-chip>

                    <!-- Show pages only if book is selected -->
                    <div v-if="isBookSelected(book)" class="pages-container mt-2">
                      <v-chip
                        v-for="page in pages"
                        :key="page"
                        class="ma-1"
                        :color="isPageSelected(book, page) ? 'info' : 'default'"
                        :variant="isPageSelected(book, page) ? 'elevated' : 'flat'"
                        @click="handlePageClick(book, page)"
                      >
                        {{ page }}
                      </v-chip>
                    </div>
                  </div>
                </template>

                <!-- Common books -->
                <template v-if="commonBooks">
                  <div v-for="(pages, book) in commonBooks" :key="book" class="button-group">
                    <v-chip
                      class="ma-1 book-chip"
                      :color="isBookSelected(book) ? 'success' : 'default'"
                      :variant="isBookSelected(book) ? 'elevated' : 'flat'"
                      @click="handleBookClick(book)"
                    >
                      {{ book }}
                    </v-chip>

                    <!-- Show pages only if book is selected -->
                    <div v-if="isBookSelected(book)" class="pages-container mt-2">
                      <v-chip
                        v-for="page in pages"
                        :key="page"
                        class="ma-1"
                        :color="isPageSelected(book, page) ? 'info' : 'default'"
                        :variant="isPageSelected(book, page) ? 'elevated' : 'flat'"
                        @click="handlePageClick(book, page)"
                      >
                        {{ page }}
                      </v-chip>
                    </div>
                  </div>
                </template>

                <!-- Actions -->
                <div v-if="templateData.actions?.length" class="button-group">
                  <v-chip
                    v-for="action in templateData.actions"
                    :key="action"
                    class="ma-1"
                    color="primary"
                    variant="flat"
                    @click="insertTemplate(action)"
                  >
                    {{ action }}
                  </v-chip>
                </div>
              </div>
              <div v-else class="text-center text-body-2 text-disabled mt-2">
                暂无可用的模板
              </div>
            </div>
          </div>

          <!-- Quick Tools Section -->
          <div class="quick-tools ml-4" style="min-width: 180px;" v-if="showQuickTools">
            <!-- Numeric Keypad -->
            <div class="numeric-keypad mb-4">
              <div class="keypad-row">
                <v-btn
                  v-for="n in 3"
                  :key="n"
                  size="small"
                  variant="tonal"
                  class="keypad-btn"
                  @click="insertAtCursor(String(n))"
                >
                  {{ n }}
                </v-btn>
              </div>
              <div class="keypad-row">
                <v-btn
                  v-for="n in 3"
                  :key="n"
                  size="small"
                  variant="tonal"
                  class="keypad-btn"
                  @click="insertAtCursor(String(n + 3))"
                >
                  {{ n + 3 }}
                </v-btn>
              </div>
              <div class="keypad-row">
                <v-btn
                  v-for="n in 3"
                  :key="n"
                  size="small"
                  variant="tonal"
                  class="keypad-btn"
                  @click="insertAtCursor(String(n + 6))"
                >
                  {{ n + 6 }}
                </v-btn>
              </div>
              <div class="keypad-row">
                <v-btn
                  size="small"
                  variant="tonal"
                  class="keypad-btn"
                  @click="insertAtCursor('-')"
                >
                  -
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  class="keypad-btn"
                  @click="insertAtCursor('0')"
                >
                  0
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  class="keypad-btn"
                  color="error"
                  @click="deleteLastChar"
                >
                  ←
                </v-btn>
              </div>
              <div class="keypad-row">
                <v-btn
                  size="small"
                  variant="tonal"
                  class="keypad-btn space-btn"
                  @click="insertAtCursor(' ')"
                >
                  空格
                </v-btn><v-btn
                  size="small"
                  variant="tonal"
                  class="keypad-btn space-btn"
                  @click="insertAtCursor('\n')"
                >
                  换行
                </v-btn>
              </div>
            </div>

            <div class="d-flex flex-wrap gap-1">
              <v-btn
                v-for="text in quickTexts"
                :key="text"
                size="small"
                variant="flat"
                @click="insertAtCursor(text)"
              >
                {{ text }}
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>

      <div class="text-center text-body-2 text-disabled mb-5">
        点击空白处完成编辑
      </div>

    </v-card>
  </v-dialog>
</template>

<script>
import dataProvider from "@/utils/dataProvider";
import { getSetting } from "@/utils/settings";

export default {
  name: "HomeworkEditDialog",
  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    initialContent: {
      type: String,
      default: ""
    },
    autoSave: {
      type: Boolean,
      default: false
    }
  },
  emits: ["update:modelValue", "save"],
  data() {
    return {
      content: "",
      templateData: null,
      currentLine: "",
      currentLineStart: 0,
      currentLineEnd: 0,
      quickTexts: ["课", "题", "例","变","T", "P"]
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit("update:modelValue", value);
      }
    },
    subject() {
      // 标题直接就是科目名称
      return this.title;
    },
    hasTemplates() {
      return !!(
        (this.templateData?.actions?.length) ||
        this.subjectBooks ||
        this.commonBooks
      );
    },
    subjectBooks() {
      if (!this.subject || !this.templateData?.subjects?.[this.subject]?.books) {
        return null;
      }
      return this.templateData.subjects[this.subject].books;
    },
    commonBooks() {
      if (!this.templateData?.commonSubject?.books) {
        return null;
      }
      return this.templateData.commonSubject.books;
    },
    showQuickTools() {
      return getSetting("display.showQuickTools");
    }
  },
  watch: {
    async modelValue(newValue) {
      if (newValue) {
        // 当对话框打开时，重置内容为初始内容
        this.content = this.initialContent;
        // 加载模板数据
        try {
          this.templateData = await dataProvider.loadData("classworks-config-homework-template");
        } catch (error) {
          console.error("Failed to load homework templates:", error);
          this.templateData = null;
        }
        this.$nextTick(() => {
          if (this.$refs.inputRef) {
            this.$refs.inputRef.focus();
            this.updateCurrentLine();
          }
        });
      }
    }
  },
  methods: {
    handleClose() {
      const trimmedContent = this.content.trim();
      if (trimmedContent !== this.initialContent.trim()) {
        this.$emit("save", trimmedContent);
      }
      this.dialogVisible = false;
    },
    updateCurrentLine() {
      const textarea = this.$refs.inputRef.$el.querySelector('textarea');
      const cursorPosition = textarea.selectionStart;
      const content = this.content;

      let currentPos = 0;
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length;
        const totalLength = currentPos + lineLength;

        if (cursorPosition <= totalLength || i === lines.length - 1) {
          this.currentLine = lines[i];
          this.currentLineStart = currentPos;
          this.currentLineEnd = totalLength;
          break;
        }

        currentPos = totalLength + 1; // +1 for the newline character
      }

      // 如果光标在文本末尾或内容为空
      if (!this.currentLine) {
        this.currentLine = "";
        this.currentLineStart = content.length;
        this.currentLineEnd = content.length;
      }
    },
    isBookSelected(book) {
      return this.currentLine.includes(book);
    },
    isPageSelected(book, page) {
      return this.currentLine.includes(page);
    },
    handleBookClick(book) {
      if (this.isBookSelected(book)) {
        // 删除包含该作业本的整行
        const lines = this.content.split('\n');
        const lineToDelete = lines.findIndex(line => line.includes(book));
        if (lineToDelete !== -1) {
          lines.splice(lineToDelete, 1);
          this.content = lines.join('\n');
        }
      } else {
        // 在末尾插入新行
        const hasContent = this.content.trim().length > 0;
        this.content = (hasContent ? this.content.trim() + '\n' : '') + book;
      }
      this.$nextTick(() => {
        const textarea = this.$refs.inputRef.$el.querySelector('textarea');
        textarea.focus();

        if (!this.isBookSelected(book)) {
          // 找到新插入的行的末尾位置
          const lines = this.content.split('\n');
          let position = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(book)) {
              position += lines[i].length;
              break;
            }
            position += lines[i].length + 1; // +1 for newline
          }
          textarea.setSelectionRange(position, position);
        }
        this.updateCurrentLine();
      });
    },
    handlePageClick(book, page) {
      if (this.isPageSelected(book, page)) {
        // 删除当前行最后一处匹配的页码
        const start = this.currentLineStart;
        const end = this.currentLineEnd;
        const currentLineContent = this.content.slice(start, end);
        const lastIndex = currentLineContent.lastIndexOf(page);
        if (lastIndex !== -1) {
          const newLineContent =
            currentLineContent.slice(0, lastIndex) +
            currentLineContent.slice(lastIndex + page.length);
          this.content = this.content.slice(0, start) +
                        newLineContent.trim() +
                        this.content.slice(end);
        }
      } else {
        // 在当前行末尾插入
        const start = this.currentLineStart;
        const end = this.currentLineEnd;
        const currentLineContent = this.content.slice(start, end);
        this.content = this.content.slice(0, start) +
                      currentLineContent.trim() +
                      (currentLineContent.trim().length > 0 ? ' ' : '') +
                      page +
                      this.content.slice(end);
      }
      this.$nextTick(() => {
        const textarea = this.$refs.inputRef.$el.querySelector('textarea');
        textarea.focus();

        // 将光标移动到当前行末尾
        const lines = this.content.split('\n');
        let position = 0;
        for (let i = 0; i < lines.length; i++) {
          position += lines[i].length;
          if (position > this.currentLineStart) {
            break;
          }
          position += 1; // +1 for newline
        }
        textarea.setSelectionRange(position, position);
        this.updateCurrentLine();
      });
    },
    insertTemplate(text) {
      const textarea = this.$refs.inputRef.$el.querySelector('textarea');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // 在快捷操作前添加空格
      const needsSpace = start > 0 && this.content[start - 1] !== ' ' && this.content[start - 1] !== '\n';
      this.content = this.content.slice(0, start) + (needsSpace ? ' ' : '') + text + this.content.slice(end);

      this.$nextTick(() => {
        textarea.focus();
        const newPosition = start + text.length + (needsSpace ? 1 : 0);
        textarea.setSelectionRange(newPosition, newPosition);
        this.updateCurrentLine();
      });
    },
    insertAtCursor(text) {
      if (!text) return;

      const textarea = this.$refs.inputRef.$el.querySelector('textarea');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      this.content = this.content.slice(0, start) + text + this.content.slice(end);

      this.$nextTick(() => {
        textarea.focus();
        const newPosition = start + text.length;
        textarea.setSelectionRange(newPosition, newPosition);
        this.updateCurrentLine();
      });
    },
    deleteLastChar() {
      const textarea = this.$refs.inputRef.$el.querySelector('textarea');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start === end) {
        // 如果没有选中文本，删除光标前一个字符
        if (start > 0) {
          this.content = this.content.slice(0, start - 1) + this.content.slice(start);
          this.$nextTick(() => {
            textarea.focus();
            textarea.setSelectionRange(start - 1, start - 1);
            this.updateCurrentLine();
          });
        }
      } else {
        // 如果有选中文本，删除选中部分
        this.content = this.content.slice(0, start) + this.content.slice(end);
        this.$nextTick(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start);
          this.updateCurrentLine();
        });
      }
    }
  }
};
</script>

<style scoped>
.template-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}



.book-chip {
  align-self: flex-start;
}

.pages-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-left: 16px;
}

.group-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-right: 8px;
  white-space: nowrap;
}

:deep(.v-chip) {
  cursor: pointer;
  user-select: none;
}

.quick-tools {
  border-left: 1px solid rgba(0, 0, 0, 0.12);
  padding-left: 16px;
}

.gap-1 {
  gap: 4px;
}

.numeric-keypad {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.keypad-row {
  display: flex;
  gap: 4px;
}

.keypad-btn {
  flex: 1;
  min-width: 36px !important;
}

.space-btn {
  width: 100% !important;
}
</style>