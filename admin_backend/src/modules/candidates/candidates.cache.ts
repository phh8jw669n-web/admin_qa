import { QueryCandidateDto } from './dto/query-candidate.dto';

/**
 * Candidate list pages and one candidate by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const candidatesCache = {
  description:
    'Paginated candidate lists and a single candidate for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:candidates:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryCandidateDto): string {
    return [
      'cache:candidates',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `e${query.email ?? ''}`,
      `enr${query.enrollmentNumber ?? ''}`,
      `g${query.groupId ?? ''}`,
      `gender${query.gender ?? ''}`,
      `pay${query.paymentStatus ?? ''}`,
      `enroll${query.isEnroll ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:candidates:${companyId}:id:${id}`;
  },
};
