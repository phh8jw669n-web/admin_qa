import { QueryDocumentDto } from './dto/query-document.dto';

/**
 * Candidate document pages and one document by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const candidateDocumentsCache = {
  description:
    'Paginated documents for one candidate, and a single document. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string, candidateId: string): string {
    return `cache:candidate-documents:${companyId}:${candidateId}:keys`;
  },
  listKey(
    companyId: string,
    candidateId: string,
    query: QueryDocumentDto,
  ): string {
    return [
      'cache:candidate-documents',
      companyId,
      candidateId,
      `p${query.page}`,
      `l${query.limit}`,
      `type${query.documentType ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, candidateId: string, id: string): string {
    return `cache:candidate-documents:${companyId}:${candidateId}:id:${id}`;
  },
};
