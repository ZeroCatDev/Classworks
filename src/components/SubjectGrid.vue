<template>
  <div>
    <!-- 有内容的科目卡片 -->
    <div ref="gridContainer" class="grid-masonry">
      <TransitionGroup name="grid">
        <div v-for="item in sortedItems" :key="item.key" class="grid-item"
          :style="{
            'grid-row-end': `span ${item.rowSpan}`,
            order: item.order,
          }">
          <subject-card
            :subject="item"
            :content-style="contentStyle"
            :disabled="disabled"
            @click="$emit('edit', item.key)"
          />
        </div>
      </TransitionGroup>
    </div>

    <!-- 单独显示空科目 -->
    <div class="empty-subjects mt-4">
      <template v-if="emptySubjectDisplay === 'button'">
        <v-btn-group divided variant="outlined">
          <v-btn v-for="subject in unusedSubjects" :key="subject.key" :disabled="disabled"
            @click="$emit('edit', subject.key)">
            <v-icon start>mdi-plus</v-icon>
            {{ subject.name }}
          </v-btn>
        </v-btn-group>
      </template>
      <div v-else class="empty-subjects-grid">
        <TransitionGroup name="v-list">
          <empty-subject-card
            v-for="subject in unusedSubjects"
            :key="subject.key"
            :subject="subject"
            :disabled="disabled"
            @click="$emit('edit', subject.key)"
          />
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script>
import SubjectCard from './SubjectCard.vue';
import EmptySubjectCard from './EmptySubjectCard.vue';
import { optimizeGridLayout } from '@/utils/gridUtils';
import { throttle } from "@/utils/debounce";

export default {
  name: 'SubjectGrid',
  components: {
    SubjectCard,
    EmptySubjectCard
  },

  props: {
    homework: {
      type: Object,
      default: () => ({})
    },
    availableSubjects: {
      type: Array,
      default: () => []
    },
    contentStyle: {
      type: Object,
      default: () => ({})
    },
    emptySubjectDisplay: {
      type: String,
      default: 'grid'
    },
    dynamicSort: {
      type: Boolean,
      default: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      throttledReflow: null,
      sortedItemsCache: {
        key: "",
        value: []
      }
    };
  },

  computed: {
    sortedItems() {
      const key = `${JSON.stringify(this.homework)}_${this.dynamicSort}`;
      if (this.sortedItemsCache.key === key) {
        return this.sortedItemsCache.value;
      }

      const items = Object.entries(this.homework)
        .filter(([, value]) => value.content?.trim())
        .map(([key, value]) => ({
          key,
          name: this.availableSubjects.find((s) => s.key === key)?.name || key,
          content: value.content,
          rowSpan: Math.ceil(
            (value.content.split("\n").filter((line) => line.trim()).length + 1) * 0.8
          ),
        }));

      const result = this.dynamicSort
        ? optimizeGridLayout(items)
        : items.sort((a, b) => this.availableSubjects.findIndex(s => s.key === a.key) -
                               this.availableSubjects.findIndex(s => s.key === b.key));

      this.updateSortedItemsCache(key, result);
      return result;
    },

    unusedSubjects() {
      const usedKeys = Object.keys(this.homework).filter(
        key => this.homework[key].content?.trim()
      );
      return this.availableSubjects.filter(
        (subject) => !usedKeys.includes(subject.key)
      );
    }
  },

  watch: {
    '$vuetify.display.width': {
      handler() {
        this.throttledReflow();
      },
      deep: true
    }
  },

  created() {
    // Create throttled reflow function
    this.throttledReflow = throttle(() => {
      if (this.$refs.gridContainer) {
        // Trigger layout recalculation
        this.updateSortedItemsCache('', []);
      }
    }, 200);
  },

  methods: {
    updateSortedItemsCache(key, value) {
      this.sortedItemsCache = { key, value };
    }
  }
}
</script>

<style scoped>
.grid-masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-auto-rows: minmax(80px, auto);
  grid-gap: 1rem;
}

.grid-item {
  width: 100%;
  transition: all 0.3s ease;
}

.empty-subjects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.empty-subject-card {
  transition: all 0.3s ease;
}

.empty-subject-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>