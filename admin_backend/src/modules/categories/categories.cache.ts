import { QueryCategoryDto } from './dto/query-category.dto';

/**
 * Category list pages and one category by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const categoriesCache = {
  description:
    'Paginated category lists and a single category for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:categories:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryCategoryDto): string {
    return [
      'cache:categories',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `r${query.ranking ?? ''}`,
      `lang${query.languageId ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:categories:${companyId}:id:${id}`;
  },
};
