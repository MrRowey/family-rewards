export function groupByCategory<T extends { category?: string | null }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const category = item.category?.trim() || "Uncategorized";
    const entries = groups.get(category);
    if (entries) entries.push(item);
    else groups.set(category, [item]);
  }
  return [...groups].toSorted(([left], [right]) => left.localeCompare(right));
}
