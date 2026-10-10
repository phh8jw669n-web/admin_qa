import { QueryTopicDto } from './dto/query-topic.dto';

/**
 * Topic list pages and one topic by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const topicsCache = {
  description:
    'Paginated topic lists, including categoryId and subjectId filters, and a single topic for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:topics:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryTopicDto): string {
    return [
      'cache:topics',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `r${query.ranking ?? ''}`,
      `lang${query.languageId ?? ''}`,
      `c${query.categoryId ?? ''}`,
      `s${query.subjectId ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:topics:${companyId}:id:${id}`;
  },
};
