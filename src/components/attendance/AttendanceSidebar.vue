<template>
  <v-col
    v-if="studentList && studentList.length"
    v-ripple="{
      class: `text-${
        ['primary', 'secondary', 'info', 'success', 'warning', 'error'][
          Math.floor(Math.random() * 6)
        ]
      }`,
    }"
    class="attendance-area no-select"
    cols="1"
    @click="$emit('click')"
  >
    <h1>出勤</h1>
    <h2>
      <span style="white-space: nowrap"> 应到</span>
      :
      <span style="white-space: nowrap">
        {{ studentList.length - attendance.exclude.length }}人
      </span>
    </h2>
    <h2>
      <span style="white-space: nowrap"> 实到</span>
      :
      <span style="white-space: nowrap">
        {{
          studentList.length -
          attendance.absent.length -
          attendance.late.length -
          attendance.exclude.length
        }}人
      </span>
    </h2>
    <h2>
      <span style="white-space: nowrap"> 请假</span>
      :
      <span style="white-space: nowrap">
        {{ attendance.absent.length }}人
      </span>
    </h2>
    <h3
      v-for="(name, index) in attendance.absent"
      :key="'absent-' + index"
      class="gray-text"
    >
      <span v-if="display.lgAndUp.value">{{ `${index + 1}. ` }}</span
      ><span style="white-space: nowrap">{{ name }}</span>
    </h3>
    <h2>
      <span style="white-space: nowrap">迟到</span>
      :
      <span style="white-space: nowrap">
        {{ attendance.late.length }}人
      </span>
    </h2>
    <h3
      v-for="(name, index) in attendance.late"
      :key="'late-' + index"
      class="gray-text"
    >
      <span v-if="display.lgAndUp.value">{{ `${index + 1}. ` }}</span
      ><span style="white-space: nowrap">{{ name }}</span>
    </h3>
    <h2>
      <span style="white-space: nowrap">不参与</span>
      :
      <span style="white-space: nowrap">
        {{ attendance.exclude.length }}人
      </span>
    </h2>
    <h3
      v-for="(name, index) in attendance.exclude"
      :key="'exclude-' + index"
      class="gray-text"
    >
      <span v-if="display.lgAndUp.value">{{ `${index + 1}. ` }}</span
      ><span style="white-space: nowrap">{{ name }}</span>
    </h3>
  </v-col>
</template>

<script>
import { useDisplay } from "vuetify";

export default {
  name: "AttendanceSidebar",
  props: {
    studentList: {
      type: Array,
      required: true,
    },
    attendance: {
      type: Object,
      required: true,
    },
  },
  emits: ["click"],
  setup() {
    const display = useDisplay();
    return { display };
  },
};
</script>

<style scoped>
/* Add any specific styles here if needed, or rely on global styles */
</style>
