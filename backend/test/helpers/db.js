import mongoose from 'mongoose';
import { connectToMongoDB } from '../../src/config/DBconnect.js';
import { User } from '../../src/models/user.model.js';
import { Meeting } from '../../src/models/meeting.model.js';
import { MeetingSummary } from '../../src/models/meetingSummary.model.js';
import { MeetingEmbedding } from '../../src/models/meetingEmbedding.model.js';
import { testPrefix, testRunId } from './testData.js';

export const connectTestDb = async () => {
    if (mongoose.connection.readyState === 1) return;
    await connectToMongoDB();
};

export const disconnectTestDb = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
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
