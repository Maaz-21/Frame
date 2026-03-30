import mongoose from 'mongoose';

const summaryPayloadSchema = new mongoose.Schema({
    meetingTopic: { type: String, default: '' },
    shortOverview: { type: String, default: '' },
    mainDiscussionPoints: { type: [String], default: [] },
    decisions: { type: [String], default: [] },
    actionItems: {
        type: [{
            owner: { type: String, default: 'Unassigned' },
            task: { type: String, default: '' },
            dueDate: { type: String, default: 'Not mentioned' },
            source: { type: String, default: '' }
        }],
        default: []
    },
    blockersOrRisks: { type: [String], default: [] },
    conclusions: { type: [String], default: [] },
    timelineHighlights: { type: [String], default: [] },
    confidence: { type: String, default: 'low' }
}, { _id: false });

const eventLogEntrySchema = new mongoose.Schema({
    type: { $type: String, default: '' },
    socketId: { $type: String, default: '' },
    username: { $type: String, default: '' },
    timestamp: { $type: Number, default: 0 },
    metadata: { $type: mongoose.Schema.Types.Mixed, default: null }
}, {
    _id: false,
    typeKey: '$type'
});

const meetingSummarySchema = new mongoose.Schema({
    meetingCode: {
        type: String,
        required: true,
        index: true
    },
    roomMode: {
        type: String,
        enum: ['guest', 'member'],
        default: 'member'
    },
    sessionStart: {
        type: Date,
        required: true
    },
    sessionEnd: {
        type: Date,
        required: true
    },
    durationSeconds: {
        type: Number,
        default: 0
    },
    participants: {
        type: [{
            socketId: String,
            username: String,
            joinedAt: Date,
            leftAt: Date
        }],
        default: []
    },
    transcript: {
        type: [{
            speakerSocketId: String,
            speakerName: String,
            text: String,
            timestamp: Number
        }],
        default: []
    },
    chatMessages: {
        type: [{
            sender: String,
            data: String,
            socketId: String,
            timestamp: Number
        }],
        default: []
    },
    eventLog: {
        type: [eventLogEntrySchema],
        default: []
    },
    summaryStatus: {
        type: String,
        enum: ['pending', 'ready', 'failed'],
        default: 'pending'
    },
    summaryModel: {
        type: String,
        default: ''
    },
    summaryError: {
        type: String,
        default: ''
    },
    summaryPayload: {
        type: summaryPayloadSchema,
        default: () => ({})
    }
}, {
    timestamps: true
});

meetingSummarySchema.index({ meetingCode: 1, sessionStart: -1 });

const MeetingSummary = mongoose.model('MeetingSummary', meetingSummarySchema);

export { MeetingSummary };
