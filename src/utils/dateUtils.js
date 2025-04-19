/**
 * Ensures the input is a valid Date object
 * @param {Date|string} dateInput - A date object or string
 * @returns {Date} A valid Date object
 */
export function ensureDate(dateInput) {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  if (typeof dateInput === "string") {
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date(); // If unable to parse, return current date
}

/**
 * Formats a date to YYYY-MM-DD string
 * @param {Date|string} dateInput - A date object or string
 * @returns {string} Formatted date string
 */
export function formatDate(dateInput) {
  const date = ensureDate(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date
 * @returns {Date} Current date
 */
export function getToday() {
  return new Date();
}

/**
 * Checks if a date is today
 * @param {Date|string} dateInput - Date to check
 * @returns {boolean} True if the date is today
 */
export function isToday(dateInput) {
  const today = getToday();
  return formatDate(dateInput) === formatDate(today);
}

/**
 * Gets yesterday's date
 * @returns {Date} Yesterday's date
 */
export function getYesterday() {
  const today = getToday();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

/**
 * Returns a formatted display text for a date relative to today
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Descriptive text
 */
export function getRelativeDateText(dateString) {
  const today = getToday();
  const yesterday = getYesterday();

  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(yesterday);

  if (dateString === todayStr) {
    return "今天的作业";
  } else if (dateString === yesterdayStr) {
    return "昨天的作业";
  } else {
    return `${dateString}的作业`;
  }
}