import request from 'supertest';
import httpStatus from 'http-status';
import { app } from '../src/app.js';
import { Meeting } from '../src/models/meeting.model.js';
import { connectTestDb, cleanupTestData, disconnectTestDb } from '../test/helpers/db.js';
import { buildTestUsername, buildTestMeetingCode } from '../test/helpers/testData.js';
import { registerTestUser, loginTestUser, authHeader } from '../test/helpers/auth.js';

const user = {
    name: 'History User',
    username: buildTestUsername('history'),
    password: 'password123'
};

const meetingCode = buildTestMeetingCode('history');

describe('Meeting history API', () => {
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

    it('requires auth token for history', async () => {
        const response = await request(app).get('/api/users/get_all_activity');
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('adds a meeting code to history', async () => {
        const response = await request(app)
            .post('/api/users/add_to_activity')
            .set(authHeader(token))
            .send({ meeting_code: meetingCode });
        expect(response.status).toBe(httpStatus.CREATED);
    });

    it('returns user history entries', async () => {
        const response = await request(app)
            .get('/api/users/get_all_activity')
            .set(authHeader(token));

        expect(response.status).toBe(httpStatus.OK);
        const codes = response.body.map((item) => item.meetingCode);
        expect(codes).toContain(meetingCode);
    });

    it('persists history in the database', async () => {
        const entry = await Meeting.findOne({ meetingCode });
        expect(entry).toBeTruthy();
        expect(entry.user_id).toBe(user.username);
    });
});
