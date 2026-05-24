import { start, stop } from '../src/app.js';
import { createSocketClient, waitForEvent } from '../test/helpers/socket.js';
import { cleanupTestData, disconnectTestDb } from '../test/helpers/db.js';
import { buildTestMeetingCode } from '../test/helpers/testData.js';
import { waitForSummaryCompletion } from '../test/helpers/summary.js';

const meetingCode = `g-${buildTestMeetingCode('transcription')}`;
const hasDeepgram = Boolean(process.env.DEEPGRAM_API_KEY);

describe('Live transcription socket events', () => {
    let baseUrl = '';
    let socket;

    beforeAll(async () => {
        if (!hasDeepgram) return;
        process.env.PORT = '0';
        const { server } = await start();
        const address = server.address();
        baseUrl = `http://localhost:${address.port}`;
    });

    afterAll(async () => {
        if (socket) socket.disconnect();
        if (hasDeepgram) {
            await stop();
            await cleanupTestData();
            await disconnectTestDb();
        }
    });

    const runTest = hasDeepgram ? it : it.skip;

    runTest('starts and stops transcription', async () => {
        socket = createSocketClient(baseUrl);
        await waitForEvent(socket, 'connect');
        socket.emit('join-call', { meetingCode, username: 'Guest', isGuest: true });
        await waitForEvent(socket, 'user-joined');

        const startState = await new Promise((resolve, reject) => {
            const handleState = (state) => {
                socket.off('transcription-error', handleError);
                resolve(state);
            };
            const handleError = (payload) => {
                socket.off('transcription-state', handleState);
                reject(new Error(payload?.message || 'transcription error'));
            };
            socket.once('transcription-state', handleState);
            socket.once('transcription-error', handleError);
            socket.emit('transcription-start', { shareEnabled: true, language: 'en-US' });
        });

        expect(startState.active).toBe(true);

        const sharePromise = waitForEvent(socket, 'transcription-share-state');
        socket.emit('transcription-share-toggle', { shareEnabled: false });
        const [sharePayload] = await sharePromise;
        expect(sharePayload.shareEnabled).toBe(false);

        const stopPromise = waitForEvent(socket, 'transcription-state');
        socket.emit('transcription-stop');
        const [stopState] = await stopPromise;
        expect(stopState.active).toBe(false);

        socket.disconnect();
        await waitForSummaryCompletion(meetingCode);
    });
});
