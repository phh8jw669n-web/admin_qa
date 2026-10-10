/** QA black-box API suite. Runs against a live server (QA_BASE_URL). */
module.exports = {
  rootDir: __dirname,
  testRegex: 'specs/.*\\.qa\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/helpers/global-setup.ts',
  testTimeout: 60000,
  maxWorkers: 1,
};
