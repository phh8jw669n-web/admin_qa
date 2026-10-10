import { QueryRegionDto } from './dto/query-region.dto';

/**
 * Region list pages and one region by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const regionsCache = {
  description:
    'Paginated region lists and a single region for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:regions:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryRegionDto): string {
    return [
      'cache:regions',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `z${query.zoneId ?? ''}`,
      `state${query.stateName ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:regions:${companyId}:id:${id}`;
  },
};
