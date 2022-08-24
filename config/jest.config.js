/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  setupFiles: ['jest-date-mock'],
  setupFilesAfterEnv: ['<rootDir>/config/jest-setupAfterEnv.ts'],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/packages/@ledger-sync/config/.next/',
  ],
  watchPathIgnorePatterns: [
    '\\.gen\\.d\\.ts',
    '\\.gen\\.ts',
    '\\.gen\\.json',
    '\\.schema\\.json',
  ],
  testRegex: '\\.(spec|test)\\.[jt]sx?$',
  transform: {
    '^.+\\.(js|ts|tsx)$': [
      'esbuild-jest',
      {
        sourcemap: true,
        target: 'node14',
        format: 'cjs',
      },
    ],
  },
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
}
