<template>
  <div ref="gridContainer" class="grid-masonry">
    <TransitionGroup name="grid">
      <div
        v-for="item in sortedItems"
        :key="item.key"
        :style="{
          'grid-row-end': `span ${item.rowSpan}`,
          order: item.order,
        }"
        class="grid-item"
      >
        <!-- 出勤卡片 -->
        <v-card
          v-if="item.type === 'attendance'"
          :class="{ 'glow-highlight': highlightedCards[item.key] }"
          border
          class="glow-track"
          height="100%"
          @click="$emit('open-attendance')"
          @mousemove="handleMouseMove"
          @touchmove="handleTouchMove"
        >
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary" icon="mdi-account-group" />
            出勤统计
          </v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-2">
              <span>应到/实到</span>
              <span class="text-h6">
                {{ item.data.total - item.data.exclude.length }}/{{
                  item.data.total -
                  item.data.absent.length -
                  item.data.late.length -
                  item.data.exclude.length
                }}
              </span>
            </div>
            <v-divider class="mb-2" />

            <div v-if="item.data.absent.length > 0" class="mb-2">
              <div class="text-error text-caption mb-1">请假 ({{ item.data.absent.length }})</div>
              <div class="d-flex flex-wrap" style="gap: 4px">
                <v-chip v-for="name in item.data.absent" :key="name" color="error" size="x-small" variant="flat">
                  {{ name }}
                </v-chip>
              </div>
            </div>

            <div v-if="item.data.late.length > 0" class="mb-2">
              <div class="text-warning text-caption mb-1">迟到 ({{ item.data.late.length }})</div>
              <div class="d-flex flex-wrap" style="gap: 4px">
                <v-chip v-for="name in item.data.late" :key="name" color="warning" size="x-small" variant="flat">
                  {{ name }}
                </v-chip>
              </div>
            </div>

            <div v-if="item.data.exclude.length > 0" class="mb-2">
              <div class="text-grey text-caption mb-1">不参与 ({{ item.data.exclude.length }})</div>
              <div class="d-flex flex-wrap" style="gap: 4px">
                <v-chip v-for="name in item.data.exclude" :key="name" color="grey" size="x-small" variant="flat">
                  {{ name }}
                </v-chip>
              </div>
            </div>

            <div
              v-if="
                item.data.absent.length === 0 &&
                item.data.late.length === 0 &&
                item.data.exclude.length === 0
              "
              class="text-success text-center mt-2"
            >
              全勤
            </div>
          </v-card-text>
        </v-card>

        <!-- 自定义/测试卡片 -->
        <v-card
          v-else-if="item.type === 'custom'"
          :class="{ 'glow-highlight': highlightedCards[item.key] }"
          border
          class="glow-track"
          height="100%"
          @click="!isEditingDisabled && $emit('open-dialog', item.key)"
          @mousemove="handleMouseMove"
          @touchmove="handleTouchMove"
        >
          <v-card-title class="text-primary">
            <v-icon class="mr-2" icon="mdi-card-text-outline" size="small" />
            {{ item.name }}
          </v-card-title>
          <v-card-text :style="contentStyle">
            {{ item.content }}
          </v-card-text>
        </v-card>

        <!-- 普通作业卡片 -->
        <v-card
          v-else
          :class="{ 'glow-highlight': highlightedCards[item.key] }"
          border
          class="glow-track"
          height="100%"
          @click="!isEditingDisabled && $emit('open-dialog', item.key)"
          @mousemove="handleMouseMove"
          @touchmove="handleTouchMove"
        >
          <v-card-title>{{ item.name }}</v-card-title>
          <v-card-text :style="contentStyle">
            <v-list>
              <v-list-item
                v-for="text in splitPoint(item.content)"
                :key="text"
              >
                {{ text }}
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </div>
    </TransitionGroup>
  </div>

  <!-- 单独显示空科目 -->
  <div class="empty-subjects mt-4">
    <template v-if="emptySubjectDisplay === 'button'">
      <v-btn-group divided variant="tonal">
        <v-btn
          v-for="subject in unusedSubjects"
          :key="subject.name"
          :disabled="isEditingDisabled"
          @click="$emit('open-dialog', subject.name)"
        >
          <v-icon start> mdi-plus</v-icon>
          {{ subject.name }}
        </v-btn>
      </v-btn-group>
    </template>
    <div v-else class="empty-subjects-grid">
      <TransitionGroup name="v-list">
        <v-card
          v-for="subject in unusedSubjects"
          :key="subject.name"
          :disabled="isEditingDisabled"
          border
          class="empty-subject-card"
          @click="$emit('open-dialog', subject.name)"
        >
          <v-card-title class="text-subtitle-1">
            {{ subject.name }}
          </v-card-title>
          <v-card-text class="text-center">
            <v-icon color="grey" size="small"> mdi-plus</v-icon>
            <div class="text-caption text-grey">点击添加作业</div>
          </v-card-text>
        </v-card>
      </TransitionGroup>
    </div>
  </div>
</template>

<script>
export default {
  name: "HomeworkGrid",
  props: {
    sortedItems: {
      type: Array,
      required: true,
    },
    unusedSubjects: {
      type: Array,
      required: true,
    },
    emptySubjectDisplay: {
      type: String,
      default: "button",
    },
    isEditingDisabled: {
      type: Boolean,
      default: false,
    },
    contentStyle: {
      type: Object,
      default: () => ({}),
    },
    highlightedCards: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["open-dialog", "open-attendance"],
  methods: {
    splitPoint(content) {
      return content.split("\n").filter((text) => text.trim());
    },
    handleMouseMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--x", `${x}%`);
      card.style.setProperty("--y", `${y}%`);
    },
    handleTouchMove(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--x", `${x}%`);
        card.style.setProperty("--y", `${y}%`);
      }
    },
  },
};
</script>
