import { QueryDifficultyDto } from './dto/query-difficulty.dto';

/**
 * Difficulty list pages and one difficulty by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const difficultiesCache = {
  description:
    'Paginated difficulty lists and a single difficulty for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:difficulties:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryDifficultyDto): string {
    return [
      'cache:difficulties',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `lang${query.languageId ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:difficulties:${companyId}:id:${id}`;
  },
};
