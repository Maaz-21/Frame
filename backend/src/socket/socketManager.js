import { Server } from 'socket.io';

const connections = new Map();
const messages = new Map();
const timeOnline = new Map();
const roomStartTimes = new Map();
const usernames = new Map(); // socketId -> username
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
            },
            methods: ['GET', 'POST'],
            allowedHeaders: ['*'],
            credentials: true
        }
    });

    // Helper: find room for a socket
    const findRoom = (socketId) => {
        for (const [roomKey, roomClients] of connections) {
            if (roomClients.includes(socketId)) return roomKey;
        }
        return null;
    };

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

    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // --- Join Call ---
        socket.on('join-call', (path, username) => {
            if (!connections.has(path)) {
                connections.set(path, []);
                roomStartTimes.set(path, Date.now());
            }
            connections.get(path).push(socket.id);
            timeOnline.set(socket.id, Date.now());

            // Store username
            if (username) {
                usernames.set(socket.id, username);
            }

            socket.join(path);

            const roomClients = connections.get(path);
            const roomNames = getRoomUsernames(path);

            // Send user-joined with client list AND usernames map
            roomClients.forEach((clientId) => {
                io.to(clientId).emit('user-joined', socket.id, roomClients, roomNames);
            });

            // Send meeting start time to the new user
            io.to(socket.id).emit('meeting-start-time', roomStartTimes.get(path));

            // Send existing messages
            if (messages.has(path)) {
                messages.get(path).forEach((msg) => {
                    io.to(socket.id).emit('chat-message', msg.data, msg.sender, msg.socketId);
                });
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
            broadcastToRoom(room, 'reaction', emoji, username, socket.id);
        });

        // --- Raise Hand ---
        socket.on('raise-hand', (username) => {
            const room = findRoom(socket.id);
            if (!room) return;
            broadcastToRoom(room, 'raise-hand', username, socket.id);
        });

        socket.on('lower-hand', () => {
            const room = findRoom(socket.id);
            if (!room) return;
            broadcastToRoom(room, 'lower-hand', socket.id);
        });

        // --- Disconnect ---
        socket.on('disconnect', () => {
            const onlineTime = timeOnline.has(socket.id)
                ? Math.abs(Date.now() - timeOnline.get(socket.id))
                : 0;
            console.log(`[Socket] Disconnected: ${socket.id} (online ${Math.round(onlineTime / 1000)}s)`);
            timeOnline.delete(socket.id);
            usernames.delete(socket.id);

            for (const [roomKey, roomClients] of connections) {
                const idx = roomClients.indexOf(socket.id);
                if (idx !== -1) {
                    roomClients.forEach((clientId) => {
                        if (clientId !== socket.id) {
                            io.to(clientId).emit('user-left', socket.id);
                        }
                    });

                    roomClients.splice(idx, 1);

                    if (roomClients.length === 0) {
                        connections.delete(roomKey);
                        messages.delete(roomKey);
                        roomStartTimes.delete(roomKey);
                    }
                }
            }
        });
    });

    return io;
};
