import request from 'supertest';
import httpStatus from 'http-status';
import { app } from '../src/app.js';
import { Meeting } from '../src/models/meeting.model.js';
import { MeetingSummary } from '../src/models/meetingSummary.model.js';
import { connectTestDb, cleanupTestData, disconnectTestDb } from '../test/helpers/db.js';
import { buildTestUsername, buildTestMeetingCode } from '../test/helpers/testData.js';
import { registerTestUser, loginTestUser, authHeader } from '../test/helpers/auth.js';
import { waitForSummaryCompletion } from '../test/helpers/summary.js';

const user = {
    name: 'Summary User',
    username: buildTestUsername('summary'),
    password: 'password123'
};

const meetingCode = buildTestMeetingCode('summary');
const noSummaryCode = buildTestMeetingCode('summary-missing');

const buildSummaryDoc = (code) => ({
    meetingCode: code,
    roomMode: 'member',
    sessionStart: new Date(Date.now() - 60000),
    sessionEnd: new Date(),
    durationSeconds: 60,
    participants: [{ socketId: 'test', username: 'Tester', joinedAt: new Date(), leftAt: new Date() }],
    transcript: [{ speakerSocketId: 'test', speakerName: 'Tester', text: 'Hello', timestamp: Date.now() }],
    chatMessages: [{ sender: 'Tester', data: 'Hi', socketId: 'test', timestamp: Date.now() }],
    eventLog: [],
    summaryStatus: 'ready',
    summaryModel: 'test',
    summaryPayload: {
        meetingTopic: 'Test Meeting',
        shortOverview: 'Overview',
        mainDiscussionPoints: ['Point'],
        decisions: ['Decision'],
        actionItems: [{ owner: 'Tester', task: 'Task', dueDate: 'Tomorrow', source: 'chat' }],
        blockersOrRisks: [],
        conclusions: [],
        timelineHighlights: [],
        confidence: 'low'
    }
});

describe('Meeting summary API', () => {
    let token = '';

    beforeAll(async () => {
        await connectTestDb();
        await registerTestUser(app, user);
        const loginResponse = await loginTestUser(app, user);
        token = loginResponse.body?.user?.token;

        await Meeting.create({ user_id: user.username, meetingCode });
        await Meeting.create({ user_id: user.username, meetingCode: noSummaryCode });
    });

    afterAll(async () => {
        await cleanupTestData();
        await disconnectTestDb();
    });

    it('returns pending when summary is not available', async () => {
        const response = await request(app)
            .get(`/api/users/meeting-summary/${meetingCode}`)
            .set(authHeader(token));

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.summaryStatus).toBe('pending');
    });

    it('returns forbidden when user has no access', async () => {
        const response = await request(app)
            .get('/api/users/meeting-summary/unauthorized')
            .set(authHeader(token));

        expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it('returns summary details when available', async () => {
        await MeetingSummary.create(buildSummaryDoc(meetingCode));

        const response = await request(app)
            .get(`/api/users/meeting-summary/${meetingCode}`)
            .set(authHeader(token));

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.meetingCode).toBe(meetingCode);
        expect(response.body.summaryPayload?.meetingTopic).toBe('Test Meeting');
    });

    it('regenerates an existing summary', async () => {
        const response = await request(app)
            .post(`/api/users/meeting-summary/${meetingCode}/regenerate`)
            .set(authHeader(token));

        expect(response.status).toBe(httpStatus.ACCEPTED);

        const updated = await waitForSummaryCompletion(meetingCode);
        expect(updated).toBeTruthy();
        expect(['ready', 'failed']).toContain(updated.summaryStatus);
    });

    it('returns not found when summary data is missing', async () => {
        const response = await request(app)
            .post(`/api/users/meeting-summary/${noSummaryCode}/regenerate`)
            .set(authHeader(token));

        expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
});
