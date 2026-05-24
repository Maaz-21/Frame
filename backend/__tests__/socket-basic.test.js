import { start, stop } from '../src/app.js';
import { createSocketClient, waitForEvent } from '../test/helpers/socket.js';
import { cleanupTestData, disconnectTestDb } from '../test/helpers/db.js';
import { buildTestMeetingCode } from '../test/helpers/testData.js';
import { waitForSummaryCompletion } from '../test/helpers/summary.js';

const meetingCode = `g-${buildTestMeetingCode('socket')}`;

describe('Socket basic events', () => {
    let baseUrl = '';
    let socketA;
    let socketB;

    beforeAll(async () => {
        process.env.PORT = '0';
        const { server } = await start();
        const address = server.address();
        baseUrl = `http://localhost:${address.port}`;
    });

    afterAll(async () => {
        if (socketA) socketA.disconnect();
        if (socketB) socketB.disconnect();
        await stop();
        await cleanupTestData();
        await disconnectTestDb();
    });

    it('supports join, chat, typing, reactions, and media state', async () => {
        socketA = createSocketClient(baseUrl);
        await waitForEvent(socketA, 'connect');
        const joinPromiseA = waitForEvent(socketA, 'user-joined');
        const startTimePromise = waitForEvent(socketA, 'meeting-start-time');
        socketA.emit('join-call', { meetingCode, username: 'Alice', isGuest: true });

        await joinPromiseA;
        const [startTime] = await startTimePromise;
        expect(typeof startTime).toBe('number');

        socketB = createSocketClient(baseUrl);
        await waitForEvent(socketB, 'connect');
        const joinPromiseB = waitForEvent(socketA, 'user-joined');
        socketB.emit('join-call', { meetingCode, username: 'Bob', isGuest: true });

        const [joinedId, clients] = await joinPromiseB;
        expect(clients).toContain(joinedId);

        const chatPromise = waitForEvent(socketB, 'chat-message');
        socketA.emit('chat-message', 'hello', 'Alice');
        const [chatData, chatSender] = await chatPromise;
        expect(chatData).toBe('hello');
        expect(chatSender).toBe('Alice');

        const typingPromise = waitForEvent(socketB, 'typing');
        socketA.emit('typing', 'Alice');
        const [typingUser] = await typingPromise;
        expect(typingUser).toBe('Alice');

        const stopTypingPromise = waitForEvent(socketB, 'stop-typing');
        socketA.emit('stop-typing');
        await stopTypingPromise;

        const reactionPromise = waitForEvent(socketB, 'reaction');
        socketA.emit('reaction', 'party', 'Alice');
        const [emoji, reactUser] = await reactionPromise;
        expect(emoji).toBe('party');
        expect(reactUser).toBe('Alice');

        const raisePromise = waitForEvent(socketB, 'raise-hand');
        socketA.emit('raise-hand', 'Alice');
        const [raiseUser] = await raisePromise;
        expect(raiseUser).toBe('Alice');

        const lowerPromise = waitForEvent(socketB, 'lower-hand');
        socketA.emit('lower-hand');
        await lowerPromise;

        const mediaPromise = waitForEvent(socketB, 'media-state');
        socketA.emit('media-state', { audio: false, video: true });
        const [peerSocketId, mediaState] = await mediaPromise;
        expect(peerSocketId).toBe(socketA.id);
        expect(mediaState.audio).toBe(false);

        socketA.disconnect();
        socketB.disconnect();
        await waitForSummaryCompletion(meetingCode);
    });
});
