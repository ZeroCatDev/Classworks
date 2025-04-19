/**
 * Optimizes the layout of grid items using a greedy algorithm
 * @param {Array} items - Array of items to layout
 * @returns {Array} - Array of items with optimized order
 */
export function optimizeGridLayout(items) {
  // Set maximum columns based on viewport width
  const maxColumns = Math.min(3, Math.floor(window.innerWidth / 300));
  if (maxColumns <= 1) return items;

  // Use greedy algorithm to allocate
  const columns = Array.from({ length: maxColumns }, () => ({
    height: 0,
    items: [],
  }));

  items.forEach((item) => {
    const shortestColumn = columns.reduce(
      (min, col, i) => (col.height < columns[min].height ? i : min),
      0
    );
    columns[shortestColumn].items.push(item);
    columns[shortestColumn].height += item.rowSpan;
  });

  // Flatten result and add order
  return columns
    .flatMap((col) => col.items)
    .map((item, index) => ({
      ...item,
      order: index,
    }));
}

/**
 * Applies a fixed layout to grid items based on subject groups
 * @param {Array} items - Array of items to layout
 * @returns {Array} - Array of items with fixed order
 */
export function fixedGridLayout(items) {
  const rowSubjects = [
    ["语文", "数学", "英语"],
    ["物理", "化学", "生物"],
    ["政治", "历史", "地理", "其他"],
  ];

  return items
    .sort((a, b) => {
      const getRowIndex = (subject) => {
        for (let i = 0; i < rowSubjects.length; i++) {
          if (rowSubjects[i].includes(subject)) {
            return i;
          }
        }
        return rowSubjects.length;
      };

      const getColumnIndex = (subject) => {
        for (const row of rowSubjects) {
          const index = row.indexOf(subject);
          if (index !== -1) return index;
        }
        return 999;
      };

      const rowA = getRowIndex(a.key);
      const rowB = getRowIndex(b.key);

      if (rowA !== rowB) {
        return rowA - rowB;
      }

      const colA = getColumnIndex(a.key);
      const colB = getColumnIndex(b.key);
      return colA - colB;
    })
    .map((item, index) => ({
      ...item,
      order: index,
      rowSpan: item.content ? 2 : 1,
    }));
}