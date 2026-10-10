import { QueryLanguageDto } from './dto/query-language.dto';

/**
 * Language list pages and one language by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const languagesCache = {
  description:
    'Paginated language lists and a single language for one company. Page 2 is stored separately from page 1. A name search is not stored. A create, update, or delete removes the stored list pages and that language.',
  ttlSeconds: 3 * 60 * 60,
  listKey(companyId: string, query: QueryLanguageDto): string {
    return [
      'cache:languages',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  listKeysKey(companyId: string): string {
    return `cache:languages:${companyId}:keys`;
  },
  itemKey(companyId: string, id: string): string {
    return `cache:languages:${companyId}:id:${id}`;
  },
};
