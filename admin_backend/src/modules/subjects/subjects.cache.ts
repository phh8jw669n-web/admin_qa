import { QuerySubjectDto } from './dto/query-subject.dto';

/**
 * Subject list pages and one subject by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const subjectsCache = {
  description:
    'Paginated subject lists, including the categoryId filter, and a single subject for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:subjects:${companyId}:keys`;
  },
  listKey(companyId: string, query: QuerySubjectDto): string {
    return [
      'cache:subjects',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `r${query.ranking ?? ''}`,
      `lang${query.languageId ?? ''}`,
      `c${query.categoryId ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:subjects:${companyId}:id:${id}`;
  },
};
