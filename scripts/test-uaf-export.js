import assert from "node:assert/strict";
import {
  createExportPreview,
  createImportPlan,
  createUafDocument,
  executeImportPlan,
  findImportPlanIssues,
  hasExportableHomework,
  itemsFromBoardData,
  normalizeUafDate,
  UafExportValidationError,
} from "../src/utils/uafExport.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const items = [
  { type: "exam", name: "考试安排", content: "ignored" },
  { type: "homework", name: "数学", content: "完成第 1、2 题", tags: ["必做"] },
  { type: "time", name: "时间" },
  { type: "custom", name: "班级任务", content: "整理讲台" },
];

assert.equal(normalizeUafDate("20260711"), "2026-07-11");
assert.equal(normalizeUafDate("2026-07-11T08:30:00+08:00"), "2026-07-11");
assert.equal(hasExportableHomework(items), true);
assert.deepEqual(createUafDocument(items, "20260711"), [
  { subject: "数学", date: "2026-07-11", content: "完成第 1、2 题", tags: ["必做"] },
  { subject: "班级任务", date: "2026-07-11", content: "整理讲台", tags: [] },
]);
assert.throws(() => createUafDocument([], "20260711"), UafExportValidationError);
assert.throws(
  () => createUafDocument([{ type: "homework", name: "数学", content: "x".repeat(2001) }], "20260711"),
  /2000/,
);

const board = {
  homework: {
    数学: { content: "旧数学作业", tags: ["旧标签"] },
    "custom-existing": { type: "custom", name: "班级任务", content: "旧任务" },
    "exam-1": { type: "exam", examId: "1", content: "" },
  },
  attendance: { absent: ["张三"], late: [], exclude: [] },
};
assert.deepEqual(itemsFromBoardData(board, [{ name: "数学", order: 0 }]), [
  { key: "数学", name: "数学", type: "homework", content: "旧数学作业", tags: ["旧标签"], order: 0 },
  {
    key: "custom-existing",
    name: "班级任务",
    type: "custom",
    content: "旧任务",
    tags: [],
    order: 9999,
  },
]);
assert.equal(createExportPreview(items, "20260711")[0].selected, true);

const importedDocument = [
  { subject: "数学", date: "2026-07-11", content: "新数学作业", tags: ["导入"] },
  { subject: "班级任务", date: "2026-07-11", content: "新任务", tags: [] },
  { subject: "物理", date: "2026-07-12", content: "新日期作业", tags: ["实验"] },
];
const boardsByDate = {
  20260711: board,
  20260712: { homework: {}, attendance: { absent: [], late: ["李四"], exclude: [] } },
};
const plan = await createImportPlan(
  importedDocument,
  [{ name: "数学", order: 0 }],
  async (date) => clone(boardsByDate[date]),
);
assert.deepEqual(plan.rows.map((row) => [row.targetType, row.conflict, row.action]), [
  ["homework", true, "keep"],
  ["custom", true, "keep"],
  ["custom", false, "import"],
]);
plan.rows[0].action = "overwrite";
const saved = new Map();
const result = await executeImportPlan(plan, async (date, value) => saved.set(date, clone(value)));
assert.deepEqual(result, { imported: 2, skipped: 1, savedDates: ["20260711", "20260712"], failedDates: [] });
assert.deepEqual(saved.get("20260711").homework.数学, { content: "新数学作业", tags: ["导入"] });
assert.deepEqual(saved.get("20260711").attendance.absent, ["张三"]);
assert.equal(saved.get("20260711").homework["exam-1"].type, "exam");
assert.equal(Object.values(saved.get("20260712").homework)[0].name, "物理");

const duplicatePlan = await createImportPlan(
  [importedDocument[0], { ...importedDocument[0], content: "重复作业" }],
  [{ name: "数学", order: 0 }],
  async () => clone(board),
);
duplicatePlan.rows.forEach((row) => { row.action = "overwrite"; });
assert.equal(findImportPlanIssues(duplicatePlan.rows).length, 1);

console.log("Classworks UAF import/export tests passed.");
