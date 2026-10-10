import { QueryCandidateCentreMappingDto } from './dto/query-candidate-centre-mapping.dto';

export const candidateCentreMappingsCache = {
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:candidate-centre-mappings:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryCandidateCentreMappingDto): string {
    return [
      'cache:candidate-centre-mappings',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `candidate${query.candidateId ?? ''}`,
      `centre${query.centreId ?? ''}`,
      `date${query.examDate ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:candidate-centre-mappings:${companyId}:id:${id}`;
  },
};
