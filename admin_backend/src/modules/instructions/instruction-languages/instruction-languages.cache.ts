import { QueryInstructionLanguageDto } from './dto/query-instruction-language.dto';

/**
 * Instruction language list pages and one instruction language by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const instructionLanguagesCache = {
  description:
    'Paginated instruction languages for one instruction, and a single instruction language. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string, instructionId: string): string {
    return `cache:instruction-languages:${companyId}:${instructionId}:keys`;
  },
  listKey(
    companyId: string,
    instructionId: string,
    query: QueryInstructionLanguageDto,
  ): string {
    return [
      'cache:instruction-languages',
      companyId,
      instructionId,
      `p${query.page}`,
      `l${query.limit}`,
      `lang${query.languageId ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, instructionId: string, id: string): string {
    return `cache:instruction-languages:${companyId}:${instructionId}:id:${id}`;
  },
};
