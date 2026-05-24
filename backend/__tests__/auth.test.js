import request from 'supertest';
import httpStatus from 'http-status';
import { app } from '../src/app.js';
import { connectTestDb, cleanupTestData, disconnectTestDb } from '../test/helpers/db.js';
import { buildTestUsername } from '../test/helpers/testData.js';
import { registerTestUser, loginTestUser } from '../test/helpers/auth.js';

const baseUser = {
    name: 'Jest User',
    username: buildTestUsername('auth'),
    password: 'password123'
};

describe('Auth API', () => {
    beforeAll(async () => {
        await connectTestDb();
    });

    afterAll(async () => {
        await cleanupTestData();
        await disconnectTestDb();
    });

    it('registers a new user', async () => {
        const response = await registerTestUser(app, baseUser);
        expect(response.status).toBe(httpStatus.CREATED);
        expect(response.body?.user?.username).toBe(baseUser.username);
    });

    it('rejects missing fields', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({ name: '', username: '', password: '' });
        expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it('rejects short passwords', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({ name: 'Short', username: buildTestUsername('short'), password: '123' });
        expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it('rejects duplicate registration', async () => {
        const response = await registerTestUser(app, baseUser);
        expect(response.status).toBe(httpStatus.FOUND);
    });

    it('logs in with valid credentials', async () => {
        const response = await loginTestUser(app, baseUser);
        expect(response.status).toBe(httpStatus.OK);
        expect(response.body?.user?.token).toBeTruthy();
    });

    it('rejects invalid credentials', async () => {
        const response = await request(app)
            .post('/api/users/login')
            .send({ username: baseUser.username, password: 'wrongpass' });
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
});
