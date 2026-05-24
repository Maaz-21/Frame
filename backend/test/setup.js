import { jest } from '@jest/globals';

jest.setTimeout(60000);

if (!process.env.TEST_RUN_ID) {
	process.env.TEST_RUN_ID = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}
