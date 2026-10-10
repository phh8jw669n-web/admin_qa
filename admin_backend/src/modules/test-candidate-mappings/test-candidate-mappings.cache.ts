import { QueryTestCandidateMappingDto } from './dto/query-test-candidate-mapping.dto';

/**
 * Test candidate mapping pages and one mapping by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const testCandidateMappingsCache = {
  description:
    'Paginated test-candidate mappings and a single mapping for one company. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:test-candidate-mappings:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryTestCandidateMappingDto): string {
    return [
      'cache:test-candidate-mappings',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `g${query.groupId ?? ''}`,
      `c${query.candidateId ?? ''}`,
      `t${query.testId ?? ''}`,
      `attempt${query.attemptNo ?? ''}`,
      `status${query.status ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:test-candidate-mappings:${companyId}:id:${id}`;
  },
};
