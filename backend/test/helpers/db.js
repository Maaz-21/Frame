import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/user.model.js';
import { Meeting } from '../../src/models/meeting.model.js';
import { MeetingSummary } from '../../src/models/meetingSummary.model.js';
import { MeetingEmbedding } from '../../src/models/meetingEmbedding.model.js';
import { testPrefix, testRunId } from './testData.js';

let mongoServer;

export const connectTestDb = async () => {
    if (mongoose.connection.readyState === 1) return;
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
};

export const disconnectTestDb = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
    if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
    }
};

export const cleanupTestData = async () => {
    const runMarker = `${testPrefix}${testRunId}_`;
    const prefixRegex = new RegExp(`^(g-)?${runMarker}`);

    await Promise.all([
        User.deleteMany({ username: prefixRegex }),
        Meeting.deleteMany({ meetingCode: prefixRegex }),
        MeetingSummary.deleteMany({ meetingCode: prefixRegex }),
        MeetingEmbedding.deleteMany({ meetingCode: prefixRegex })
    ]);
};
