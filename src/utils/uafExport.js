const LIMITS = {
  subjectMax: 200,
  contentMax: 2000,
  tagMax: 50,
  tagCountMax: 20,
};

export class UafExportValidationError extends Error {
  constructor(issues) {
    super(issues.join("；"));
    this.name = "UafExportValidationError";
    this.issues = issues;
  }
}

export function normalizeUafDate(value) {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !Number.isNaN(Date.parse(value))
  ) {
    return value.slice(0, 10);
  }
  throw new UafExportValidationError([
    `日期 ${value || "（空）"} 不是有效的 YYYYMMDD 或 YYYY-MM-DD 格式`,
  ]);
}

export function toClassworksDate(value) {
  return normalizeUafDate(value).replaceAll("-", "");
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.map((tag) => String(tag)) : [];
}

export function validateUafAssignment(assignment, label = assignment.subject || "作业") {
  const issues = [];
  if (!assignment.subject) issues.push(`${label}：科目名称不能为空`);
  if (assignment.subject.length > LIMITS.subjectMax) {
    issues.push(`${label}：科目名称超过 ${LIMITS.subjectMax} 个字符`);
  }
  try {
    normalizeUafDate(assignment.date);
  } catch (error) {
    issues.push(...error.issues.map((issue) => `${label}：${issue}`));
  }
  if (!assignment.content) issues.push(`${label}：正文不能为空`);
  if (assignment.content.length > LIMITS.contentMax) {
    issues.push(`${label}：正文超过 ${LIMITS.contentMax} 个字符`);
  }
  if (assignment.tags.length > LIMITS.tagCountMax) {
    issues.push(`${label}：标签超过 ${LIMITS.tagCountMax} 个`);
  }
  if (assignment.tags.some((tag) => !tag || tag.length > LIMITS.tagMax || tag.includes(";"))) {
    issues.push(`${label}：包含无效标签`);
  }
  return issues;
}

export function createUafDocument(items, dateValue) {
  const date = normalizeUafDate(dateValue);
  const assignments = items
    .filter((item) => item && (item.type === "homework" || item.type === "custom"))
    .filter((item) => typeof item.content === "string" && item.content.trim().length > 0)
    .map((item) => ({
      subject: String(item.name || "").trim(),
      date,
      content: item.content,
      tags: normalizeTags(item.tags),
    }));

  if (assignments.length === 0) {
    throw new UafExportValidationError(["所选日期没有可导出的作业"]);
  }

  const issues = assignments.flatMap((assignment, index) =>
    validateUafAssignment(assignment, assignment.subject || `第 ${index + 1} 张卡片`),
  );
  if (issues.length > 0) throw new UafExportValidationError(issues);
  return assignments;
}

export function createExportPreview(items, dateValue) {
  const date = normalizeUafDate(dateValue);
  return items
    .filter((item) => item && (item.type === "homework" || item.type === "custom"))
    .filter((item) => typeof item.content === "string" && item.content.trim().length > 0)
    .map((item, index) => {
      const assignment = {
        subject: String(item.name || "").trim(),
        date,
        content: item.content,
        tags: normalizeTags(item.tags),
      };
      const issues = validateUafAssignment(assignment, assignment.subject || `第 ${index + 1} 张卡片`);
      return { id: `${item.key || index}-${index}`, assignment, selected: issues.length === 0, issues };
    });
}

export function itemsFromBoardData(boardData, subjects = []) {
  const homework = boardData?.homework || {};
  const items = [];
  for (const subject of subjects) {
    const card = homework[subject.name];
    if (card?.content?.trim()) {
      items.push({
        key: subject.name,
        name: subject.name,
        type: "homework",
        content: card.content,
        tags: normalizeTags(card.tags),
        order: subject.order ?? 0,
      });
    }
  }
  for (const [key, card] of Object.entries(homework)) {
    if (key.startsWith("custom-") && card?.content?.trim()) {
      items.push({
        key,
        name: card.name,
        type: "custom",
        content: card.content,
        tags: normalizeTags(card.tags),
        order: 9999,
      });
    }
  }
  return items.sort((a, b) => a.order - b.order);
}

export function hasExportableHomework(items) {
  return items.some(
    (item) =>
      item &&
      (item.type === "homework" || item.type === "custom") &&
      typeof item.content === "string" &&
      item.content.trim().length > 0,
  );
}

async function loadBrowserUaf() {
  return import("../vendor/uaf/browser.js");
}

export async function parseUafPdf(file) {
  if (!file || !file.name?.toLowerCase().endsWith(".pdf")) {
    throw new UafExportValidationError(["请选择 UAF PDF 文件"]);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { validateUafPdf, extractUafPayload } = await loadBrowserUaf();
  const validation = await validateUafPdf(bytes);
  if (!validation.valid) {
    throw new UafExportValidationError(
      validation.errors.length ? validation.errors : ["文件不是有效的 UAF PDF"],
    );
  }
  return validation.payload || extractUafPayload(bytes);
}

export async function createImportPlan(document, subjects, loadBoardData) {
  const subjectNames = new Set(subjects.map((subject) => subject.name));
  const dates = [...new Set(document.map((assignment) => toClassworksDate(assignment.date)))];
  const boards = new Map();
  for (const date of dates) boards.set(date, await loadBoardData(date));

  const rows = document.map((assignment, index) => {
    const date = toClassworksDate(assignment.date);
    const board = boards.get(date);
    const isSubject = subjectNames.has(assignment.subject);
    let targetKey = isSubject ? assignment.subject : null;
    if (!isSubject) {
      targetKey = Object.keys(board.homework || {}).find(
        (key) => key.startsWith("custom-") && board.homework[key]?.name === assignment.subject,
      );
    }
    const conflict = Boolean(targetKey && board.homework?.[targetKey]?.content?.trim());
    return {
      id: `uaf-import-${index}`,
      index,
      date,
      assignment: { ...assignment, tags: normalizeTags(assignment.tags) },
      targetType: isSubject ? "homework" : "custom",
      targetKey,
      conflict,
      action: conflict ? "keep" : "import",
    };
  });
  return { rows, boards };
}

export function findImportPlanIssues(rows) {
  const issues = [];
  const activeTargets = new Map();
  for (const row of rows) {
    if (row.action === "keep") continue;
    const key = row.targetKey ? `${row.date}:${row.targetKey}` : null;
    if (key && activeTargets.has(key)) {
      issues.push(`${row.date} 的“${row.assignment.subject}”有多条记录指向同一卡片`);
    }
    if (key) activeTargets.set(key, row.id);
  }
  return issues;
}

export async function executeImportPlan(plan, saveBoardData) {
  const issues = findImportPlanIssues(plan.rows);
  if (issues.length) throw new UafExportValidationError(issues);
  const changedDates = new Set();
  let imported = 0;
  let skipped = 0;

  for (const row of plan.rows) {
    if (row.action === "keep") {
      skipped += 1;
      continue;
    }
    const board = plan.boards.get(row.date);
    board.homework ||= {};
    if (row.targetType === "homework") {
      board.homework[row.assignment.subject] = {
        ...(board.homework[row.assignment.subject] || {}),
        content: row.assignment.content,
        tags: row.assignment.tags,
      };
    } else if (row.targetKey) {
      board.homework[row.targetKey] = {
        ...board.homework[row.targetKey],
        name: row.assignment.subject,
        type: "custom",
        content: row.assignment.content,
        tags: row.assignment.tags,
      };
    } else {
      const key = `custom-uaf-${Date.now()}-${row.index}`;
      board.homework[key] = {
        name: row.assignment.subject,
        type: "custom",
        content: row.assignment.content,
        tags: row.assignment.tags,
      };
    }
    imported += 1;
    changedDates.add(row.date);
  }

  const savedDates = [];
  const failedDates = [];
  for (const date of changedDates) {
    try {
      await saveBoardData(date, plan.boards.get(date));
      savedDates.push(date);
    } catch (error) {
      failedDates.push({ date, error });
    }
  }
  return { imported, skipped, savedDates, failedDates };
}

export async function downloadUafAssignments(assignments, dateValue) {
  if (!assignments.length) throw new UafExportValidationError(["请至少选择一项作业"]);
  const issues = assignments.flatMap((assignment) => validateUafAssignment(assignment));
  if (issues.length) throw new UafExportValidationError(issues);
  const { createUafPdf } = await loadBrowserUaf();
  const base = import.meta.env.BASE_URL || "/";
  const fontUrl = new URL(`${base}uaf/NotoSansSC-Regular.otf`, window.location.origin);
  const wasmUrl = new URL(`${base}uaf/hb-subset.wasm`, window.location.origin);
  const pdfBytes = await createUafPdf(assignments, {
    fontUrl,
    wasmUrl,
    theme: "classworks-dark",
  });
  const blob = new window.Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = normalizeUafDate(dateValue);
  link.href = url;
  link.download = `Classworks-作业-${date}.uaf.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return link.download;
}

export async function downloadUafDocument(items, dateValue) {
  return downloadUafAssignments(createUafDocument(items, dateValue), dateValue);
}
