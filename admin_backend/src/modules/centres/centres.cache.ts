import { QueryCentreDto } from './dto/query-centre.dto';

/**
 * Centre list pages and one centre by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const centresCache = {
  description:
    'Paginated centre lists and a single centre for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:centres:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryCentreDto): string {
    return [
      'cache:centres',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `z${query.zoneId ?? ''}`,
      `r${query.regionId ?? ''}`,
      `code${query.code ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:centres:${companyId}:id:${id}`;
  },
};
