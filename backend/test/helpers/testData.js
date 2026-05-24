const TEST_PREFIX = 'jest_test_';
const RUN_ID = process.env.TEST_RUN_ID || 'local';

export const buildTestUsername = (label = 'user') => `${TEST_PREFIX}${RUN_ID}_${label}`;
export const buildTestMeetingCode = (label = 'meeting') => `${TEST_PREFIX}${RUN_ID}_${label}`;
export const testPrefix = TEST_PREFIX;
export const testRunId = RUN_ID;
