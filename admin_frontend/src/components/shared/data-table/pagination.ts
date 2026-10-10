export type PaginationItem = number | 'dots'

export function getPaginationItems(currentPage: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i)
  }

  if (currentPage <= 3) {
    return [0, 1, 2, 3, 4, 'dots', pageCount - 1]
  }

  if (currentPage >= pageCount - 4) {
    return [0, 'dots', pageCount - 5, pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1]
  }

  return [0, 'dots', currentPage - 1, currentPage, currentPage + 1, 'dots', pageCount - 1]
}
