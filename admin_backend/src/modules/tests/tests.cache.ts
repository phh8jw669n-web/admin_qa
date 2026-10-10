import { QueryTestDto } from './dto/query-test.dto';

/**
 * Test list pages, one test by id, and question stats for a test.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const testsCache = {
  description:
    'Paginated test lists, a single test, and question stats for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:tests:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryTestDto): string {
    return [
      'cache:tests',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `code${query.testCode ?? ''}`,
      `c${query.categoryId ?? ''}`,
      `t${query.templateId ?? ''}`,
      `draft${query.isDraft ?? ''}`,
      `pub${query.isPublished ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:tests:${companyId}:id:${id}`;
  },
  statsKey(companyId: string, id: string): string {
    return `cache:tests:${companyId}:stats:${id}`;
  },
};
