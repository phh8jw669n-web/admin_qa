import { QuerySessionDto } from './dto/query-session.dto';

/**
 * Session list pages and one session by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const sessionsCache = {
  description:
    'Paginated session lists and a single session for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:sessions:${companyId}:keys`;
  },
  listKey(companyId: string, query: QuerySessionDto): string {
    return [
      'cache:sessions',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `code${query.code ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:sessions:${companyId}:id:${id}`;
  },
};
