/**
 * 优化网格布局算法
 * 目标：使各列高度尽可能平均且最大高度最小
 * 策略：LPT (Longest Processing Time) + 局部搜索 (Local Search)
 *
 * @param {Array} items - 待排序的卡片项，每项需包含 rowSpan 属性
 * @param {number} maxColumns - 最大列数
 * @returns {Array} - 排序后的卡片项，包含 order 属性
 */
export function optimizeGridLayout(items, maxColumns) {
  if (maxColumns <= 1 || !items || items.length === 0) return items;

  // 1. 初始分配：LPT (Longest Processing Time) 算法
  // 按高度降序排序，优先处理大卡片
  // 使用浅拷贝避免修改原数组
  const sortedByHeight = [...items].sort((a, b) => b.rowSpan - a.rowSpan);

  // 初始化列状态
  // 使用 Int32Array 存储高度以提高性能（假设高度不会溢出）
  const columnHeights = new Int32Array(maxColumns);
  const columnItems = Array.from({ length: maxColumns }, () => []);

  // 贪心分配
  for (let i = 0; i < sortedByHeight.length; i++) {
    const item = sortedByHeight[i];
    // 寻找当前最矮的列
    let shortestColIndex = 0;
    let minHeight = columnHeights[0];

    for (let j = 1; j < maxColumns; j++) {
      if (columnHeights[j] < minHeight) {
        minHeight = columnHeights[j];
        shortestColIndex = j;
      }
    }

    columnItems[shortestColIndex].push(item);
    columnHeights[shortestColIndex] += item.rowSpan;
  }

  // 2. 优化阶段：尝试平衡最高和最低列
  // 限制迭代次数，防止耗时过长
  const MAX_ITERATIONS = 50;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // 找到最高和最低的列
    let minIdx = 0;
    let maxIdx = 0;
    let minH = columnHeights[0];
    let maxH = columnHeights[0];

    for (let i = 1; i < maxColumns; i++) {
      const h = columnHeights[i];
      if (h < minH) {
        minH = h;
        minIdx = i;
      } else if (h > maxH) {
        maxH = h;
        maxIdx = i;
      }
    }

    const heightDiff = maxH - minH;
    // 如果高度差很小，或者只有一列（逻辑上不可能，前面已拦截），则停止
    if (heightDiff <= 1) break;

    let bestAction = null;
    let bestDiffReduction = 0;

    const maxColItems = columnItems[maxIdx];
    const minColItems = columnItems[minIdx];

    // 策略 A: 尝试从高列移动一个卡片到低列
    // 只需要检查能减少高度差的卡片
    // 移动卡片 h，新高度差为 |(maxH - h) - (minH + h)| = |maxH - minH - 2h|
    // 我们希望 |maxH - minH - 2h| < maxH - minH
    for (let i = 0; i < maxColItems.length; i++) {
      const item = maxColItems[i];
      const h = item.rowSpan;

      // 如果卡片高度大于高度差的一半，移动后反而可能导致低列变得比高列还高很多，需要检查绝对值
      // 优化目标是最小化新的 max(newMaxH, newMinH) - min(newMaxH, newMinH)
      // 但这里简化为只关注这两列的平衡

      const newMaxH = maxH - h;
      const newMinH = minH + h;
      const newDiff = Math.abs(newMaxH - newMinH);

      if (newDiff < heightDiff) {
        const reduction = heightDiff - newDiff;
        if (reduction > bestDiffReduction) {
          bestDiffReduction = reduction;
          bestAction = { type: "move", itemIdx: i, reduction };

          // 如果已经找到非常好的移动（几乎完美平衡），可以提前结束搜索
          if (newDiff <= 1) break;
        }
      }
    }

    // 策略 B: 尝试交换高列的一个大卡片和低列的一个小卡片
    // 仅当策略 A 没有找到完美解时尝试
    if (!bestAction || bestAction.reduction < heightDiff * 0.5) {
      for (let i = 0; i < maxColItems.length; i++) {
        const itemA = maxColItems[i];
        for (let j = 0; j < minColItems.length; j++) {
          const itemB = minColItems[j];

          const hA = itemA.rowSpan;
          const hB = itemB.rowSpan;

          // 必须是高列拿出更大的卡片
          if (hA <= hB) continue;

          const change = hA - hB;
          const newMaxH = maxH - change;
          const newMinH = minH + change;
          const newDiff = Math.abs(newMaxH - newMinH);

          if (newDiff < heightDiff) {
            const reduction = heightDiff - newDiff;
            if (reduction > bestDiffReduction) {
              bestDiffReduction = reduction;
              bestAction = { type: "swap", idxA: i, idxB: j };
            }
          }
        }
      }
    }

    if (bestAction) {
      if (bestAction.type === "move") {
        const item = maxColItems[bestAction.itemIdx];
        // 移除
        maxColItems.splice(bestAction.itemIdx, 1);
        // 添加
        minColItems.push(item);
        // 更新高度
        columnHeights[maxIdx] -= item.rowSpan;
        columnHeights[minIdx] += item.rowSpan;
      } else {
        const itemA = maxColItems[bestAction.idxA];
        const itemB = minColItems[bestAction.idxB];
        // 交换
        maxColItems[bestAction.idxA] = itemB;
        minColItems[bestAction.idxB] = itemA;
        // 更新高度
        const diff = itemA.rowSpan - itemB.rowSpan;
        columnHeights[maxIdx] -= diff;
        columnHeights[minIdx] += diff;
      }
    } else {
      // 无法进一步优化
      break;
    }
  }

  // 3. 保持列内科目顺序并展平
  // 预先计算总长度以分配数组
  const result = new Array(items.length);
  let resultIdx = 0;

  for (let i = 0; i < maxColumns; i++) {
    const colItems = columnItems[i];
    // 列内排序
    if (colItems.length > 1) {
      colItems.sort((a, b) => a.order - b.order);
    }

    for (let j = 0; j < colItems.length; j++) {
      // 复制对象以避免修改原始引用（如果需要纯函数特性）
      // 这里为了性能直接修改或浅拷贝，根据需求调整
      // 题目要求返回带 order 的新对象
      const item = colItems[j];
      result[resultIdx] = { ...item, order: resultIdx };
      resultIdx++;
    }
  }

  return result;
}
