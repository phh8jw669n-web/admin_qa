/**
 * Test settings by id and by test id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const testSettingsCache = {
  description:
    'One test setting by id, and the setting that belongs to a test.',
  ttlSeconds: 3 * 60 * 60,
  itemKey(companyId: string, id: string): string {
    return `cache:test-settings:${companyId}:id:${id}`;
  },
  byTestKey(companyId: string, testId: string): string {
    return `cache:test-settings:${companyId}:test:${testId}`;
  },
};
