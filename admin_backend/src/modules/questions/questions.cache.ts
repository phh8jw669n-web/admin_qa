import { QueryQuestionDto } from './dto/query-question.dto';

/**
 * Question list pages and one question by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const questionsCache = {
  description:
    'Paginated question lists and a single question for one company. Child questions are returned with their comprehension and are left out of the list. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:questions:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryQuestionDto): string {
    return [
      'cache:questions',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `test${query.testId ?? ''}`,
      `s${query.subjectId ?? ''}`,
      `t${query.topicId ?? ''}`,
      `type${query.questionType ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:questions:${companyId}:id:${id}`;
  },
};
