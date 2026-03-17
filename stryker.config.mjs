/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.test.*',
    '!**/*.d.ts',
    '!**/test-utils/**',
    // share-card.ts wraps html2canvas + navigator.share — browser APIs that
    // cannot be meaningfully mutation-tested via jsdom.
    '!lib/tarot/share-card.ts',
  ],
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  reporters: ['html', 'json', 'clear-text'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/report.json' },
  thresholds: { high: 80, low: 60, break: 55 },
  concurrency: 4,
  timeoutMS: 30000,
};
