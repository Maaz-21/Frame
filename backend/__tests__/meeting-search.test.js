import request from 'supertest';
import httpStatus from 'http-status';
import { app } from '../src/app.js';
import { connectTestDb, cleanupTestData, disconnectTestDb } from '../test/helpers/db.js';
import { buildTestUsername } from '../test/helpers/testData.js';
import { registerTestUser, loginTestUser, authHeader } from '../test/helpers/auth.js';

const user = {
    name: 'Search User',
    username: buildTestUsername('search'),
    password: 'password123'
};

describe('Meeting search API', () => {
    let token = '';

    beforeAll(async () => {
        await connectTestDb();
        await registerTestUser(app, user);
        const loginResponse = await loginTestUser(app, user);
        token = loginResponse.body?.user?.token;
    });

    afterAll(async () => {
        await cleanupTestData();
        await disconnectTestDb();
    });

    it('returns empty results when user has no meetings', async () => {
        const response = await request(app)
            .get('/api/users/meeting-search')
            .query({ q: 'decisions' })
            .set(authHeader(token));

        expect(response.status).toBe(httpStatus.OK);
        expect(Array.isArray(response.body.results)).toBe(true);
        expect(response.body.results.length).toBe(0);
    });

    it('rejects missing query', async () => {
        const response = await request(app)
            .get('/api/users/meeting-search')
            .set(authHeader(token));

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });
});
