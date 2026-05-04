import { MeetingEmbedding } from '../models/meetingEmbedding.model.js';
import { buildEmbeddingTextFromSummary, embedText } from './embedding.service.js';

const DEFAULT_LIMIT = 6;
const DEFAULT_INDEX = process.env.MEETING_EMBEDDING_INDEX || 'meeting_embeddings';

const clampLimit = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return DEFAULT_LIMIT;
    return Math.min(Math.max(parsed, 1), 20);
};

const buildVectorFilter = ({ meetingCodes, fromDate, toDate }) => {
    const filter = {};
    if (Array.isArray(meetingCodes) && meetingCodes.length > 0) {
        filter.meetingCode = { $in: meetingCodes };
    }

    if (fromDate || toDate) {
        filter.sessionStart = {};
        if (fromDate) filter.sessionStart.$gte = fromDate;
        if (toDate) filter.sessionStart.$lte = toDate;
    }

    return filter;
};

const upsertMeetingEmbedding = async ({ summaryDoc, summaryPayload }) => {
    if (!summaryDoc || !summaryPayload) return null;

    const text = buildEmbeddingTextFromSummary(summaryPayload);
    if (!text) return null;

    const { embedding, model } = await embedText(text);

    return MeetingEmbedding.findOneAndUpdate(
        { summaryId: summaryDoc._id },
        {
            meetingCode: summaryDoc.meetingCode,
            sessionStart: summaryDoc.sessionStart,
            sessionEnd: summaryDoc.sessionEnd,
            summaryId: summaryDoc._id,
            embedding,
            embeddingModel: model,
            source: 'summary'
        },
        { upsert: true, new: true }
    );
};

const searchMeetingEmbeddings = async ({ query, meetingCodes, fromDate, toDate, limit }) => {
    const cleaned = (query || '').toString().trim();
    if (!cleaned) return [];
    if (!Array.isArray(meetingCodes) || meetingCodes.length === 0) return [];

    const { embedding } = await embedText(cleaned);
    const resultLimit = clampLimit(limit);
    const filter = buildVectorFilter({ meetingCodes, fromDate, toDate });

    const vectorSearch = {
        index: DEFAULT_INDEX,
        path: 'embedding',
        queryVector: embedding,
        numCandidates: Math.max(resultLimit * 6, 50),
        limit: resultLimit
    };

    if (Object.keys(filter).length > 0) {
        vectorSearch.filter = filter;
    }

    const pipeline = [
        { $vectorSearch: vectorSearch },
        {
            $lookup: {
                from: 'meetingsummaries',
                localField: 'summaryId',
                foreignField: '_id',
                as: 'summary'
            }
        },
        { $unwind: '$summary' },
        {
            $project: {
                _id: 0,
                meetingCode: 1,
                sessionStart: 1,
                sessionEnd: 1,
                score: { $meta: 'vectorSearchScore' },
                summaryPayload: '$summary.summaryPayload',
                summaryStatus: '$summary.summaryStatus',
                summaryModel: '$summary.summaryModel',
                summaryError: '$summary.summaryError'
            }
        },
        { $match: { score: { $gte: 0.80 } } }
    ];

    return MeetingEmbedding.aggregate(pipeline).exec();
};

export { upsertMeetingEmbedding, searchMeetingEmbeddings };
