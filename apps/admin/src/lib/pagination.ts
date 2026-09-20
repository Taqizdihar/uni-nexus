export type PaginationItem = number | 'ellipsis';

export function paginationRange(currentPage: number, totalPages: number): PaginationItem[] {
  const total = Math.max(1, Math.floor(totalPages));
  const current = Math.min(total, Math.max(1, Math.floor(currentPage)));
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const visible = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const pages = [...visible].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: PaginationItem[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1]! > 1) result.push('ellipsis');
    result.push(page);
  });
  return result;
}

export function rowNumber(page: number, pageSize: number, rowIndex: number): number {
  return Math.max(0, page - 1) * pageSize + rowIndex + 1;
}
