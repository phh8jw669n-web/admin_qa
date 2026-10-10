import { QueryGroupDto } from './dto/query-group.dto';

/**
 * Group list pages and one group by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const groupsCache = {
  description:
    'Paginated group lists and a single group for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:groups:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryGroupDto): string {
    return [
      'cache:groups',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:groups:${companyId}:id:${id}`;
  },
};
