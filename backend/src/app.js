import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { connectToMongoDB } from './config/DBconnect.js';
import { connectToSocket } from './socket/socketManager.js';
import userRoutes from './routes/user.routes.js';

const resolvePort = () => {
    const raw = process.env.PORT;
    if (raw === undefined || raw === '') return 8000;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? 8000 : parsed;
};

const app = express();
const server = createServer(app);
let io = null;
let started = false;
const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '');
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        const normalizedRequestOrigin = normalizeOrigin(origin || '');
        if (!origin || allowedOrigins.includes(normalizedRequestOrigin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${normalizedRequestOrigin}`));
    },
    credentials: true
};

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json({ limit: '40kb' }));
app.use(express.urlencoded({ limit: '40kb', extended: true }));

// --- Routes ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/users', userRoutes);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.message);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error'
    });
});

// --- Start ---
const start = async () => {
    if (started) return { server, io };
    await connectToMongoDB();
    io = connectToSocket(server);
    const port = resolvePort();
    await new Promise((resolve) => server.listen(port, resolve));
    console.log(`🚀 Server running on port ${port}`);
    started = true;
    return { server, io };
};

const stop = async () => {
    if (io) {
        await new Promise((resolve) => io.close(resolve));
        io = null;
    }
    if (server.listening) {
        await new Promise((resolve) => server.close(resolve));
    }
    started = false;
};

if (process.env.NODE_ENV !== 'test') {
    start().catch((err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
}

export { app, server, start, stop };