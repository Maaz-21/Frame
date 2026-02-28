import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { connectToMongoDB } from './config/DBconnect.js';
import { connectToSocket } from './socket/socketManager.js';
import userRoutes from './routes/user.routes.js';

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 8000;
const allowedOrigins = process.env.FRONTEND_URLS.split(',')
                                                .map((origin) => origin.trim())
                                                .filter(Boolean);                                             
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
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
    await connectToMongoDB();
    connectToSocket(server);
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
};

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});