import { QueryLabDto } from './dto/query-lab.dto';

/**
 * Lab list pages and one lab by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const labsCache = {
  description:
    'Paginated lab lists and a single lab for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:labs:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryLabDto): string {
    return [
      'cache:labs',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `z${query.zoneId ?? ''}`,
      `r${query.regionId ?? ''}`,
      `c${query.centreId ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:labs:${companyId}:id:${id}`;
  },
};
