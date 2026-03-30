import { DeepgramClient } from '@deepgram/sdk';

const KEEP_ALIVE_MS = 8000;

const sessions = new Map(); // socketId -> session

const getDeepgramConfig = () => ({
    apiKey: process.env.DEEPGRAM_API_KEY,
    model: process.env.DEEPGRAM_MODEL || 'nova-3',
    language: process.env.DEEPGRAM_LANGUAGE || 'en-US'
});

const getClient = () => {
    const { apiKey } = getDeepgramConfig();
    if (!apiKey) {
        throw new Error('DEEPGRAM_API_KEY is missing');
    }
    return new DeepgramClient({ apiKey });
};

const normalizeAudioChunk = (chunk) => {
    if (!chunk) return null;
    if (Buffer.isBuffer(chunk)) return chunk;
    if (chunk instanceof ArrayBuffer) return Buffer.from(chunk);
    if (ArrayBuffer.isView(chunk)) {
        return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    }
    return null;
};

const getTranscriptFromMessage = (message) => {
    if (!message || message.type !== 'Results') return null;
    const text = message.channel?.alternatives?.[0]?.transcript?.trim();
    if (!text) return null;
    return {
        text,
        isFinal: Boolean(message.is_final),
        speechFinal: Boolean(message.speech_final)
    };
};

const stopKeepAlive = (session) => {
    if (session?.keepAliveTimer) {
        clearInterval(session.keepAliveTimer);
        session.keepAliveTimer = null;
    }
};

const closeSessionSocket = (session) => {
    if (!session?.connection) return;
    stopKeepAlive(session);
    try {
        session.connection.sendCloseStream({ type: 'CloseStream' });
    } catch (error) {
        // No-op: socket may already be closed
    }
    try {
        session.connection.close();
    } catch (error) {
        // No-op: close should be best-effort
    }
};

const startTranscriptionSession = async ({
    socketId,
    roomKey,
    username,
    shareEnabled = false,
    language,
    onSegment,
    onError
}) => {
    if (!socketId || !roomKey || !username) {
        throw new Error('Missing transcription session metadata');
    }

    if (sessions.has(socketId)) {
        stopTranscriptionSession(socketId);
    }

    const { model, language: defaultLanguage } = getDeepgramConfig();

    const deepgram = getClient();
    const connection = await deepgram.listen.v1.createConnection({
        model,
        language: language || defaultLanguage,
        punctuate: true,
        smart_format: true,
        interim_results: true,
        endpointing: 200,
        vad_events: true
    });

    const session = {
        socketId,
        roomKey,
        username,
        shareEnabled: Boolean(shareEnabled),
        connection,
        keepAliveTimer: null
    };

    connection.on('message', (message) => {
        const result = getTranscriptFromMessage(message);
        if (!result) return;

        if (typeof onSegment === 'function') {
            onSegment({
                socketId,
                roomKey,
                username,
                text: result.text,
                isFinal: result.isFinal,
                speechFinal: result.speechFinal,
                shareEnabled: session.shareEnabled,
                timestamp: Date.now()
            });
        }
    });

    connection.on('error', (error) => {
        if (typeof onError === 'function') {
            onError(error);
        }
    });

    connection.on('close', () => {
        const active = sessions.get(socketId);
        if (active && active.connection === connection) {
            stopKeepAlive(active);
            sessions.delete(socketId);
        }
    });

    connection.connect();
    await connection.waitForOpen();

    session.keepAliveTimer = setInterval(() => {
        try {
            session.connection.sendKeepAlive({ type: 'KeepAlive' });
        } catch (error) {
            // No-op: if this fails, socket close event will handle cleanup
        }
    }, KEEP_ALIVE_MS);

    sessions.set(socketId, session);
    return { active: true, shareEnabled: session.shareEnabled };
};

const sendTranscriptionAudioChunk = (socketId, chunk) => {
    const session = sessions.get(socketId);
    if (!session) return false;

    const payload = normalizeAudioChunk(chunk);
    if (!payload) return false;

    try {
        session.connection.sendMedia(payload);
        return true;
    } catch (error) {
        return false;
    }
};

const setTranscriptionShareEnabled = (socketId, shareEnabled) => {
    const session = sessions.get(socketId);
    if (!session) return null;
    session.shareEnabled = Boolean(shareEnabled);
    return {
        active: true,
        shareEnabled: session.shareEnabled
    };
};

const stopTranscriptionSession = (socketId) => {
    const session = sessions.get(socketId);
    if (!session) return false;
    closeSessionSocket(session);
    sessions.delete(socketId);
    return true;
};

const getTranscriptionSessionState = (socketId) => {
    const session = sessions.get(socketId);
    if (!session) {
        return { active: false, shareEnabled: false };
    }
    return {
        active: true,
        shareEnabled: session.shareEnabled,
        roomKey: session.roomKey,
        username: session.username
    };
};

export {
    startTranscriptionSession,
    sendTranscriptionAudioChunk,
    setTranscriptionShareEnabled,
    stopTranscriptionSession,
    getTranscriptionSessionState
};
