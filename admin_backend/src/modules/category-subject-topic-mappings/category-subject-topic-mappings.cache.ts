import { QueryCategorySubjectTopicMappingDto } from './dto/query-category-subject-topic-mapping.dto';

/**
 * Category, subject, and topic mapping pages and one mapping by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const categorySubjectTopicMappingsCache = {
  description:
    'Paginated category-subject-topic mappings and a single mapping for one company. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:category-subject-topic-mappings:${companyId}:keys`;
  },
  listKey(
    companyId: string,
    query: QueryCategorySubjectTopicMappingDto,
  ): string {
    return [
      'cache:category-subject-topic-mappings',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `c${query.categoryId ?? ''}`,
      `s${query.subjectId ?? ''}`,
      `t${query.topicId ?? ''}`,
      `r${query.ranking ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:category-subject-topic-mappings:${companyId}:id:${id}`;
  },
};
