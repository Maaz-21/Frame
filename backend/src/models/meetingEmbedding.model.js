import mongoose from 'mongoose';

const meetingEmbeddingSchema = new mongoose.Schema({
    meetingCode: {
        type: String,
        required: true,
        index: true
    },
    sessionStart: {
        type: Date,
        required: true,
        index: true
    },
    sessionEnd: {
        type: Date,
        required: true
    },
    summaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MeetingSummary',
        required: true,
        index: true
    },
    embedding: {
        type: [Number],
        required: true
    },
    embeddingModel: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        enum: ['summary'],
        default: 'summary'
    }
}, {
    timestamps: true
});

meetingEmbeddingSchema.index({ meetingCode: 1, sessionStart: -1 });

const MeetingEmbedding = mongoose.model('MeetingEmbedding', meetingEmbeddingSchema);

export { MeetingEmbedding };
