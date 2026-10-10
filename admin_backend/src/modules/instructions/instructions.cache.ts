import { QueryInstructionDto } from './dto/query-instruction.dto';

/**
 * Instruction list pages and one instruction by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const instructionsCache = {
  description:
    'Paginated instruction lists and a single instruction for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:instructions:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryInstructionDto): string {
    return [
      'cache:instructions',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `r${query.ranking ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:instructions:${companyId}:id:${id}`;
  },
};
