import request from 'supertest';
import httpStatus from 'http-status';
import { app, start, stop } from '../src/app.js';
import { createSocketClient, waitForEvent } from '../test/helpers/socket.js';
import { connectTestDb, cleanupTestData, disconnectTestDb } from '../test/helpers/db.js';
import { buildTestMeetingCode } from '../test/helpers/testData.js';
import { waitForSummaryCompletion } from '../test/helpers/summary.js';

const meetingCode = `g-${buildTestMeetingCode('status')}`;

describe('Meeting status API', () => {
    let baseUrl = '';

    beforeAll(async () => {
        process.env.PORT = '0';
        await connectTestDb();
        const { server } = await start();
        const address = server.address();
        baseUrl = `http://localhost:${address.port}`;
    });

    afterAll(async () => {
        await stop();
        await cleanupTestData();
        await disconnectTestDb();
    });

    it('rejects empty meeting code', async () => {
        const response = await request(app).get('/api/users/meeting-status/%20');
        expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it('returns inactive status when no participants', async () => {
        const response = await request(app).get(`/api/users/meeting-status/${meetingCode}`);
        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.active).toBe(false);
    });

    it('returns active status when participants are connected', async () => {
        const socket = createSocketClient(baseUrl);
        await waitForEvent(socket, 'connect');

        const joinPromise = waitForEvent(socket, 'user-joined');
        socket.emit('join-call', {
            meetingCode,
            username: 'Guest One',
            isGuest: true
        });

        await joinPromise;

        const response = await request(app).get(`/api/users/meeting-status/${meetingCode}`);
        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.active).toBe(true);

        socket.disconnect();
        await waitForSummaryCompletion(meetingCode);
    });
});
