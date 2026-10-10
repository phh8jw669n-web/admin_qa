import { QueryZoneDto } from './dto/query-zone.dto';

/**
 * Zone list pages and one zone by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const zonesCache = {
  description:
    'Paginated zone lists and a single zone for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:zones:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryZoneDto): string {
    return [
      'cache:zones',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:zones:${companyId}:id:${id}`;
  },
};
