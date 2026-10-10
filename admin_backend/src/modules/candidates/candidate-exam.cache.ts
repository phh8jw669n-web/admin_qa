/**
 * One exam paper and one exam-details payload per company and test.
 * Change ttlSeconds to use a different lifetime for both.
 * lockTtlSeconds is only the build lock, not the stored lifetime.
 * A question write removes that test's paper.
 * A test, test setting, category, or instruction-language write removes that test's details.
 */
export const candidateExamCache = {
  description:
    'Candidate exam paper and exam details for one test. Every mapped candidate reuses the same stored payload. The first request to miss a payload builds it while the others wait. A question write removes the paper. A test, test setting, category, or instruction-language write removes the details.',
  ttlSeconds: 3 * 60 * 60,
  lockTtlSeconds: 15,
  paperKey(companyId: string, testId: string): string {
    return `cache:candidate-exam:${companyId}:${testId}`;
  },
  lockKey(companyId: string, testId: string): string {
    return `cache:candidate-exam:${companyId}:${testId}:lock`;
  },
  detailsKey(companyId: string, testId: string): string {
    return `cache:candidate-exam:${companyId}:${testId}:details`;
  },
  detailsLockKey(companyId: string, testId: string): string {
    return `cache:candidate-exam:${companyId}:${testId}:details:lock`;
  },
};
