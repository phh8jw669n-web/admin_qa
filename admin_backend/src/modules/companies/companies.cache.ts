import { QueryCompanyDto } from './dto/query-company.dto';

/**
 * Company list pages and one company by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const companiesCache = {
  description:
    'Paginated super-admin company lists and a single company by id. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(): string {
    return 'cache:companies:keys';
  },
  listKey(query: QueryCompanyDto): string {
    return [
      'cache:companies',
      `p${query.page}`,
      `l${query.limit}`,
      `city${query.city ?? ''}`,
      `plan${query.plan ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(id: string): string {
    return `cache:companies:id:${id}`;
  },
};
