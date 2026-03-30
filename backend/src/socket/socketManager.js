import { Server } from 'socket.io';
import { User } from '../models/user.model.js';
import { MeetingSummary } from '../models/meetingSummary.model.js';
import { generateMeetingSummary } from '../services/meetingSummary.service.js';
import {
    startTranscriptionSession,
    sendTranscriptionAudioChunk,
    setTranscriptionShareEnabled,
    stopTranscriptionSession,
    getTranscriptionSessionState
} from './transcriptionManager.js';

const connections = new Map();
const messages = new Map();
const transcriptHistory = new Map(); // roomKey -> final transcript lines
const timeOnline = new Map();
const roomStartTimes = new Map();
const roomAccessModes = new Map(); // roomKey -> 'guest' | 'member'
const socketRooms = new Map(); // socketId -> roomKey
const usernames = new Map(); // socketId -> username
const mediaStates = new Map(); // socketId -> { audio, video }
const roomParticipants = new Map(); // roomKey -> Map<socketId, participant>
const roomEventLogs = new Map(); // roomKey -> event[]
const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '');
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

export const isMeetingActive = (meetingCode) => {
    const clients = connections.get((meetingCode || '').trim());
    return Array.isArray(clients) && clients.length > 0;
};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                const normalizedRequestOrigin = normalizeOrigin(origin || '');
                if (!origin || allowedOrigins.includes(normalizedRequestOrigin)) {
                    return callback(null, true);
                }
                return callback(new Error(`Socket CORS blocked for origin: ${normalizedRequestOrigin}`));
            },
            methods: ['GET', 'POST'],
            allowedHeaders: ['*'],
            credentials: true
        }
    });

    // Helper: find room for a socket
    const findRoom = (socketId) => {
        if (socketRooms.has(socketId)) return socketRooms.get(socketId);
        for (const [roomKey, roomClients] of connections) {
            if (roomClients.includes(socketId)) return roomKey;
        }
        return null;
    };

    const isGuestRoom = (meetingCode = '') => meetingCode.toLowerCase().startsWith('g-');

    // Helper: broadcast to room
    const broadcastToRoom = (roomKey, event, ...args) => {
        const clients = connections.get(roomKey);
        if (clients) {
            clients.forEach(id => io.to(id).emit(event, ...args));
        }
    };

    // Helper: get usernames map for a room
    const getRoomUsernames = (roomKey) => {
        const clients = connections.get(roomKey) || [];
        const names = {};
        clients.forEach(id => {
            if (usernames.has(id)) names[id] = usernames.get(id);
        });
        return names;
    };

    const getRoomMediaStates = (roomKey) => {
        const clients = connections.get(roomKey) || [];
        const states = {};
        clients.forEach(id => {
            if (mediaStates.has(id)) states[id] = mediaStates.get(id);
        });
        return states;
    };

    const ensureRoomTracking = (roomKey) => {
        if (!roomParticipants.has(roomKey)) {
            roomParticipants.set(roomKey, new Map());
        }
        if (!roomEventLogs.has(roomKey)) {
            roomEventLogs.set(roomKey, []);
        }
    };

    const appendRoomEvent = (roomKey, event) => {
        ensureRoomTracking(roomKey);
        const logs = roomEventLogs.get(roomKey);
        logs.push({
            ...event,
            timestamp: event?.timestamp || Date.now()
        });
        if (logs.length > 1200) {
            logs.splice(0, logs.length - 1200);
        }
    };

    const upsertRoomParticipant = (roomKey, socketId, username) => {
        ensureRoomTracking(roomKey);
        const participants = roomParticipants.get(roomKey);
        if (!participants.has(socketId)) {
            participants.set(socketId, {
                socketId,
                username,
                joinedAt: new Date(),
                leftAt: null
            });
            return;
        }

        const current = participants.get(socketId);
        current.username = username || current.username;
    };

    const markParticipantLeft = (roomKey, socketId) => {
        const participants = roomParticipants.get(roomKey);
        if (!participants) return null;
        const current = participants.get(socketId);
        if (!current) return null;
        current.leftAt = current.leftAt || new Date();
        return current;
    };

    const buildRoomSummarySnapshot = (roomKey) => {
        const sessionStartMs = roomStartTimes.get(roomKey) || Date.now();
        const sessionEnd = new Date();
        const sessionStart = new Date(sessionStartMs);
        const durationSeconds = Math.max(0, Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000));

        const participantsList = Array.from((roomParticipants.get(roomKey) || new Map()).values()).map((participant) => ({
            socketId: participant.socketId,
            username: participant.username,
            joinedAt: participant.joinedAt,
            leftAt: participant.leftAt || sessionEnd
        }));

        const transcriptList = (transcriptHistory.get(roomKey) || []).map((line) => ({ ...line }));
        const chatList = (messages.get(roomKey) || []).map((message) => ({ ...message }));
        const eventList = (roomEventLogs.get(roomKey) || []).map((event) => ({ ...event }));

        return {
            meetingCode: roomKey,
            roomMode: roomAccessModes.get(roomKey) || (isGuestRoom(roomKey) ? 'guest' : 'member'),
            sessionStart,
            sessionEnd,
            durationSeconds,
            participants: participantsList,
            transcript: transcriptList,
            chatMessages: chatList,
            eventLog: eventList
        };
    };

    const persistRoomSummary = async (snapshot) => {
        const summaryDoc = await MeetingSummary.create({
            meetingCode: snapshot.meetingCode,
            roomMode: snapshot.roomMode,
            sessionStart: snapshot.sessionStart,
            sessionEnd: snapshot.sessionEnd,
            durationSeconds: snapshot.durationSeconds,
            participants: snapshot.participants,
            transcript: snapshot.transcript,
            chatMessages: snapshot.chatMessages,
            eventLog: snapshot.eventLog,
            summaryStatus: 'pending'
        });

        try {
            const { model, summary } = await generateMeetingSummary(snapshot);
            await MeetingSummary.findByIdAndUpdate(summaryDoc._id, {
                summaryStatus: 'ready',
                summaryModel: model,
                summaryPayload: summary,
                summaryError: ''
            });
        } catch (error) {
            await MeetingSummary.findByIdAndUpdate(summaryDoc._id, {
                summaryStatus: 'failed',
                summaryError: error?.message || 'Summary generation failed'
            });
            console.error(`[Summary Error] ${snapshot.meetingCode}:`, error?.message || error);
        }
    };

    const appendTranscriptHistory = (roomKey, line) => {
        if (!transcriptHistory.has(roomKey)) {
            transcriptHistory.set(roomKey, []);
        }
        const items = transcriptHistory.get(roomKey);
        items.push(line);
        if (items.length > 100) {
            items.splice(0, items.length - 100);
        }
    };

    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // --- Join Call ---
        socket.on('join-call', async (joinPayload, fallbackUsername) => {
            try {
                const payload = typeof joinPayload === 'object' && joinPayload !== null
                    ? joinPayload
                    : { meetingCode: joinPayload, username: fallbackUsername };

                const roomKey = (payload.meetingCode || '').trim();
                const requestedUsername = (payload.username || '').trim();
                const token = typeof payload.token === 'string' ? payload.token.trim() : '';
                const clientIsGuest = Boolean(payload.isGuest);

                if (!roomKey) {
                    io.to(socket.id).emit('join-error', { message: 'Meeting code is required' });
                    return;
                }

                const roomMode = isGuestRoom(roomKey) ? 'guest' : 'member';
                const storedRoomMode = roomAccessModes.get(roomKey);
                if (storedRoomMode && storedRoomMode !== roomMode) {
                    io.to(socket.id).emit('join-error', { message: 'Invalid meeting type' });
                    return;
                }

                let verifiedUsername = requestedUsername || 'Guest';

                if (roomMode === 'guest') {
                    if (!clientIsGuest || token) {
                        io.to(socket.id).emit('join-error', { message: 'Only guests can join guest meetings' });
                        return;
                    }
                } else {
                    if (!token) {
                        io.to(socket.id).emit('join-error', { message: 'Please sign in to join this meeting' });
                        return;
                    }

                    const user = await User.findOne({ token }).select('username name');
                    if (!user) {
                        io.to(socket.id).emit('join-error', { message: 'Invalid or expired session. Please sign in again.' });
                        return;
                    }

                    if (!requestedUsername) {
                        verifiedUsername = user.name || user.username || 'Member';
                    }
                }

                if (!connections.has(roomKey)) {
                    connections.set(roomKey, []);
                    roomStartTimes.set(roomKey, Date.now());
                    roomAccessModes.set(roomKey, roomMode);
                    ensureRoomTracking(roomKey);
                    appendRoomEvent(roomKey, {
                        type: 'meeting-started',
                        username: verifiedUsername,
                        socketId: socket.id,
                        metadata: { roomMode }
                    });
                }

                const roomClients = connections.get(roomKey);
                if (!roomClients.includes(socket.id)) {
                    roomClients.push(socket.id);
                }

                timeOnline.set(socket.id, Date.now());
                socketRooms.set(socket.id, roomKey);
                usernames.set(socket.id, verifiedUsername);
                upsertRoomParticipant(roomKey, socket.id, verifiedUsername);
                appendRoomEvent(roomKey, {
                    type: 'participant-joined',
                    username: verifiedUsername,
                    socketId: socket.id,
                    metadata: { participants: roomClients.length }
                });

                socket.join(roomKey);

                const roomNames = getRoomUsernames(roomKey);
                const roomMediaStates = getRoomMediaStates(roomKey);

                // Send user-joined with client list AND usernames map
                roomClients.forEach((clientId) => {
                    io.to(clientId).emit('user-joined', socket.id, roomClients, roomNames, roomMediaStates);
                });

                // Send meeting start time to the new user
                io.to(socket.id).emit('meeting-start-time', roomStartTimes.get(roomKey));

                // Send existing messages
                if (messages.has(roomKey)) {
                    messages.get(roomKey).forEach((msg) => {
                        io.to(socket.id).emit('chat-message', msg.data, msg.sender, msg.socketId);
                    });
                }

                if (transcriptHistory.has(roomKey)) {
                    io.to(socket.id).emit('transcript-history', transcriptHistory.get(roomKey));
                }
            } catch (error) {
                console.error('[Socket Join Error]', error.message);
                io.to(socket.id).emit('join-error', { message: 'Unable to join meeting' });
            }
        });

        // --- WebRTC Signaling ---
        socket.on('signal', (toId, message) => {
            io.to(toId).emit('signal', socket.id, message);
        });

        // --- Chat Messages ---
        socket.on('chat-message', (data, sender) => {
            const room = findRoom(socket.id);
            if (!room) return;

            if (!messages.has(room)) messages.set(room, []);

            const msgObj = {
                sender,
                data,
                socketId: socket.id,
                timestamp: Date.now()
            };

            messages.get(room).push(msgObj);
            appendRoomEvent(room, {
                type: 'chat-message',
                username: sender,
                socketId: socket.id,
                metadata: { text: data }
            });
            broadcastToRoom(room, 'chat-message', data, sender, socket.id);
        });

        // --- Typing Indicator ---
        socket.on('typing', (username) => {
            const room = findRoom(socket.id);
            if (!room) return;
            const clients = connections.get(room);
            if (clients) {
                clients.forEach(id => {
                    if (id !== socket.id) {
                        io.to(id).emit('typing', username, socket.id);
                    }
                });
            }
        });

        socket.on('stop-typing', () => {
            const room = findRoom(socket.id);
            if (!room) return;
            const clients = connections.get(room);
            if (clients) {
                clients.forEach(id => {
                    if (id !== socket.id) {
                        io.to(id).emit('stop-typing', socket.id);
                    }
                });
            }
        });

        // --- Emoji Reaction ---
        socket.on('reaction', (emoji, username) => {
            const room = findRoom(socket.id);
            if (!room) return;
            appendRoomEvent(room, {
                type: 'reaction',
                username,
                socketId: socket.id,
                metadata: { emoji }
            });
            broadcastToRoom(room, 'reaction', emoji, username, socket.id);
        });

        socket.on('media-state', (state = {}) => {
            const room = findRoom(socket.id);
            if (!room) return;

            const nextState = {
                audio: typeof state.audio === 'boolean' ? state.audio : true,
                video: typeof state.video === 'boolean' ? state.video : true
            };

            mediaStates.set(socket.id, nextState);
            broadcastToRoom(room, 'media-state', socket.id, nextState);
        });

        // --- Raise Hand ---
        socket.on('raise-hand', (username) => {
            const room = findRoom(socket.id);
            if (!room) return;
            appendRoomEvent(room, {
                type: 'raise-hand',
                username,
                socketId: socket.id
            });
            broadcastToRoom(room, 'raise-hand', username, socket.id);
        });

        socket.on('lower-hand', () => {
            const room = findRoom(socket.id);
            if (!room) return;
            appendRoomEvent(room, {
                type: 'lower-hand',
                username: usernames.get(socket.id) || 'Guest',
                socketId: socket.id
            });
            broadcastToRoom(room, 'lower-hand', socket.id);
        });

        // --- Live Transcription (Deepgram) ---
        socket.on('transcription-start', async (payload = {}) => {
            const room = findRoom(socket.id);
            if (!room) {
                io.to(socket.id).emit('transcription-error', { message: 'Join a meeting before starting transcription' });
                return;
            }

            const username = usernames.get(socket.id) || 'Guest';
            const requestedLanguage = typeof payload.language === 'string' && payload.language.trim()
                ? payload.language.trim()
                : undefined;

            try {
                const state = await startTranscriptionSession({
                    socketId: socket.id,
                    roomKey: room,
                    username,
                    shareEnabled: Boolean(payload.shareEnabled),
                    language: requestedLanguage,
                    onSegment: ({ text, isFinal, speechFinal, timestamp, shareEnabled }) => {
                        const segmentPayload = {
                            speakerSocketId: socket.id,
                            speakerName: username,
                            text,
                            isFinal,
                            speechFinal,
                            timestamp
                        };

                        // Always show own transcription locally.
                        io.to(socket.id).emit('transcript-segment', segmentPayload);

                        if (shareEnabled) {
                            const roomClients = connections.get(room) || [];
                            roomClients.forEach((clientId) => {
                                if (clientId !== socket.id) {
                                    io.to(clientId).emit('transcript-segment', segmentPayload);
                                }
                            });

                            if (isFinal) {
                                appendTranscriptHistory(room, segmentPayload);
                            }
                        }
                    },
                    onError: (error) => {
                        io.to(socket.id).emit('transcription-error', {
                            message: error?.message || 'Transcription connection failed'
                        });
                    }
                });

                io.to(socket.id).emit('transcription-state', state);
                appendRoomEvent(room, {
                    type: 'transcription-start',
                    username,
                    socketId: socket.id,
                    metadata: { shareEnabled: state.shareEnabled }
                });
                broadcastToRoom(room, 'transcription-share-state', {
                    socketId: socket.id,
                    username,
                    shareEnabled: state.shareEnabled
                });
            } catch (error) {
                io.to(socket.id).emit('transcription-error', {
                    message: error?.message || 'Unable to start transcription'
                });
            }
        });

        socket.on('transcription-audio-chunk', (chunk) => {
            const state = getTranscriptionSessionState(socket.id);
            if (!state.active) return;

            const chunkSize = Buffer.isBuffer(chunk)
                ? chunk.byteLength
                : (chunk?.byteLength || chunk?.length || 0);

            if (chunkSize > 512000) {
                io.to(socket.id).emit('transcription-error', { message: 'Audio chunk too large' });
                return;
            }

            const sent = sendTranscriptionAudioChunk(socket.id, chunk);
            if (!sent) {
                io.to(socket.id).emit('transcription-error', { message: 'Failed to stream audio chunk' });
            }
        });

        socket.on('transcription-share-toggle', (payload = {}) => {
            const room = findRoom(socket.id);
            if (!room) return;

            const nextState = setTranscriptionShareEnabled(socket.id, Boolean(payload.shareEnabled));
            if (!nextState) return;

            const username = usernames.get(socket.id) || 'Guest';
            io.to(socket.id).emit('transcription-state', nextState);
            appendRoomEvent(room, {
                type: 'transcription-share-toggle',
                username,
                socketId: socket.id,
                metadata: { shareEnabled: nextState.shareEnabled }
            });
            broadcastToRoom(room, 'transcription-share-state', {
                socketId: socket.id,
                username,
                shareEnabled: nextState.shareEnabled
            });
        });

        socket.on('transcription-stop', () => {
            const room = findRoom(socket.id);
            const stopped = stopTranscriptionSession(socket.id);
            io.to(socket.id).emit('transcription-state', {
                active: false,
                shareEnabled: false
            });

            if (stopped && room) {
                const username = usernames.get(socket.id) || 'Guest';
                appendRoomEvent(room, {
                    type: 'transcription-stop',
                    username,
                    socketId: socket.id
                });
                broadcastToRoom(room, 'transcription-share-state', {
                    socketId: socket.id,
                    username,
                    shareEnabled: false
                });
            }
        });

        // --- Disconnect ---
        socket.on('disconnect', () => {
            const onlineTime = timeOnline.has(socket.id)
                ? Math.abs(Date.now() - timeOnline.get(socket.id))
                : 0;
            console.log(`[Socket] Disconnected: ${socket.id} (online ${Math.round(onlineTime / 1000)}s)`);
            stopTranscriptionSession(socket.id);
            timeOnline.delete(socket.id);
            socketRooms.delete(socket.id);
            usernames.delete(socket.id);
            mediaStates.delete(socket.id);

            for (const [roomKey, roomClients] of connections) {
                const idx = roomClients.indexOf(socket.id);
                if (idx !== -1) {
                    const leftParticipant = markParticipantLeft(roomKey, socket.id);
                    appendRoomEvent(roomKey, {
                        type: 'participant-left',
                        username: leftParticipant?.username || usernames.get(socket.id) || 'Guest',
                        socketId: socket.id,
                        metadata: { participants: Math.max(0, roomClients.length - 1) }
                    });

                    roomClients.forEach((clientId) => {
                        if (clientId !== socket.id) {
                            io.to(clientId).emit('user-left', socket.id);
                        }
                    });

                    roomClients.splice(idx, 1);

                    if (roomClients.length === 0) {
                        const snapshot = buildRoomSummarySnapshot(roomKey);
                        persistRoomSummary(snapshot).catch((error) => {
                            console.error(`[Summary Persist Error] ${roomKey}:`, error?.message || error);
                        });

                        connections.delete(roomKey);
                        messages.delete(roomKey);
                        transcriptHistory.delete(roomKey);
                        roomParticipants.delete(roomKey);
                        roomEventLogs.delete(roomKey);
                        roomStartTimes.delete(roomKey);
                        roomAccessModes.delete(roomKey);
                    }
                }
            }
        });
    });

    return io;
};
