<template>
  <v-card
    border
    class="fill-height d-flex flex-column cursor-pointer hover-elevation"
    elevation="0"
    @click="$emit('click')"
  >
    <v-card-title
      class="d-flex align-center py-2 px-3 bg-primary-lighten-5 text-subtitle-1 font-weight-bold"
    >
      <span class="text-truncate">{{ exam?.examName || "加载中..." }}</span>
    </v-card-title>

    <v-card-text
      class="flex-grow-1 pa-4 overflow-y-auto"
      :style="contentStyle"
    >
      <div
        v-if="loading"
        class="d-flex justify-center align-center py-4"
      >
        <v-progress-circular
          indeterminate
          size="24"
          color="primary"
        />
      </div>

      <template v-else-if="exam">
        <!--<div v-if="exam.message" class="text-caption text-grey mb-2 px-1">
          {{ exam.message }}
        </div>-->

        <div class="d-flex flex-column">
          <div
            v-for="(group, gIndex) in groupedExamInfos"
            :key="gIndex"
            class="mb-3"
          >
            <div class="text-subtitle-2 font-weight-bold text-primary mb-1">
              <RelativeTimeDisplay :time="group.date" />
            </div>
            <div
              v-for="(info, index) in group.infos"
              :key="index"
              class="d-flex align-center justify-space-between py-1 border-b-sm"
              :class="{
                'border-none': index === group.infos.length - 1,
                'text-grey': isPast(info.end),
              }"
            >
              <div
                class="font-weight-bold mr-2"
                style="font-size: 1.1em"
              >
                {{ info.name }}
              </div>
              <div
                class="font-weight-medium text-grey-darken-2"
                style="font-size: 0.85em"
              >
                {{ formatTimeOnly(info.start) }} -
                {{ formatTimeOnly(info.end) }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <div
        v-else
        class="text-center text-caption text-grey py-2"
      >
        无法加载
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { useExamStore } from "@/stores/examStore";
import { mapState, mapActions } from "pinia";
import RelativeTimeDisplay from "@/components/RelativeTimeDisplay.vue";

export default {
  name: "ConciseExamCard",
  components: {
    RelativeTimeDisplay,
  },
  props: {
    examId: {
      type: String,
      required: true,
    },
    contentStyle: {
      type: Object,
      default: () => ({}),
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapState(useExamStore, ["exams", "loadingDetails"]),
    exam() {
      return this.exams[this.examId];
    },
    loading() {
      return this.loadingDetails[this.examId];
    },
    groupedExamInfos() {
      if (!this.exam || !this.exam.examInfos) return [];

      const sortedInfos = [...this.exam.examInfos].sort(
        (a, b) => new Date(a.start) - new Date(b.start)
      );
      const groups = [];
      let currentGroup = null;

      sortedInfos.forEach((info) => {
        const date = new Date(info.start);
        const dateKey = date.toDateString();

        if (!currentGroup || currentGroup.key !== dateKey) {
          currentGroup = {
            key: dateKey,
            date: info.start,
            infos: [],
          };
          groups.push(currentGroup);
        }
        currentGroup.infos.push(info);
      });

      return groups;
    },
  },
  mounted() {
    this.fetchExam(this.examId);
  },
  methods: {
    ...mapActions(useExamStore, ["fetchExam"]),
    formatTimeOnly(timeStr) {
      if (!timeStr) return "";
      try {
        const date = new Date(timeStr);
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
      } catch (e) {
        return "";
      }
    },
    isPast(timeStr) {
      if (!timeStr) return false;
      return new Date(timeStr) < new Date();
    },
  },
};
</script>

<style scoped>
.gap-1 {
  gap: 0px;
}
.border-b-sm {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
.border-none {
  border-bottom: none;
}
.hover-elevation {
  transition: box-shadow 0.2s;
}
.hover-elevation:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
}
</style>
