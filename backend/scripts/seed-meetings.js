import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../src/models/user.model.js';
import { Meeting } from '../src/models/meeting.model.js';
import { MeetingSummary } from '../src/models/meetingSummary.model.js';
import { MeetingEmbedding } from '../src/models/meetingEmbedding.model.js';
import { upsertMeetingEmbedding } from '../src/services/meetingEmbedding.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const USERNAME = 'abc';
const PASSWORD = 'abcabc';

const seedMeetings = [
    {
        meetingCode: 'pay-ops-01',
        daysAgo: 7,
        summary: {
            meetingTopic: 'Payments reliability and retries',
            shortOverview: 'Reviewed payment failures, retry strategy, and webhook stability for Stripe.',
            mainDiscussionPoints: [
                'Stripe webhook delivery latency',
                'Idempotency keys for duplicate charges',
                'Retry schedule and user notifications'
            ],
            decisions: [
                'Adopt exponential backoff for retries',
                'Add idempotency keys on charge creation'
            ],
            actionItems: [
                { owner: 'Sara', task: 'Add webhook signature validation', dueDate: 'Next sprint', source: 'Decision' },
                { owner: 'Devon', task: 'Implement retry job with backoff', dueDate: 'May 15', source: 'Discussion' }
            ],
            blockersOrRisks: ['Delayed payout reconciliation'],
            conclusions: ['Payments stability is the top priority this sprint'],
            timelineHighlights: ['Retry flow rollout by May 15'],
            confidence: 'high'
        },
        transcript: [
            'Sara: We saw multiple Stripe webhook retries causing duplicate handling.',
            'Devon: We should add idempotency keys and exponential backoff on retries.',
            'Liam: Let us also notify users when a retry happens.'
        ]
    },
    {
        meetingCode: 'deploy-ops-02',
        daysAgo: 5,
        summary: {
            meetingTopic: 'Deployment incidents and rollout plan',
            shortOverview: 'Discussed deployment issues after the last release and agreed on canary rollouts.',
            mainDiscussionPoints: [
                'Rollback procedure gaps',
                'Canary release for backend services',
                'Monitoring alert noise'
            ],
            decisions: ['Introduce canary releases with 10% traffic', 'Update rollback checklist'],
            actionItems: [
                { owner: 'Priya', task: 'Draft canary rollout checklist', dueDate: 'May 10', source: 'Decision' },
                { owner: 'Marco', task: 'Tune alerts for deployment errors', dueDate: 'May 12', source: 'Discussion' }
            ],
            blockersOrRisks: ['Alert fatigue during rollout'],
            conclusions: ['Next release will use staged rollout'],
            timelineHighlights: ['Canary process ready before May 12'],
            confidence: 'medium'
        },
        transcript: [
            'Priya: The last deployment caused timeouts due to config mismatch.',
            'Marco: We should run canary deploys to catch errors early.',
            'Ava: Let us update the rollback checklist and runbook.'
        ]
    },
    {
        meetingCode: 'auth-rev-03',
        daysAgo: 4,
        summary: {
            meetingTopic: 'Authentication flow review',
            shortOverview: 'Reviewed login issues and decided to add MFA and token refresh updates.',
            mainDiscussionPoints: [
                'Token expiry and refresh cadence',
                'Multi-factor authentication rollout',
                'Login latency on mobile'
            ],
            decisions: ['Add MFA for admin accounts', 'Reduce token lifetime to 4 hours'],
            actionItems: [
                { owner: 'Nora', task: 'Implement MFA prompts for admins', dueDate: 'May 18', source: 'Decision' },
                { owner: 'Eli', task: 'Update refresh token logic', dueDate: 'May 14', source: 'Discussion' }
            ],
            blockersOrRisks: ['Mobile login latency spikes'],
            conclusions: ['Security improvements take priority'],
            timelineHighlights: ['MFA pilot starts May 18'],
            confidence: 'high'
        },
        transcript: [
            'Nora: Authentication failures were tied to token refresh delays.',
            'Eli: We need to reduce token lifetime and improve refresh logic.',
            'Tina: MFA should start with admins and expand later.'
        ]
    },
    {
        meetingCode: 'roadmap-04',
        daysAgo: 3,
        summary: {
            meetingTopic: 'Q3 roadmap planning',
            shortOverview: 'Aligned on Q3 priorities: AI summaries, analytics, and onboarding improvements.',
            mainDiscussionPoints: [
                'AI meeting summaries',
                'Usage analytics dashboard',
                'Onboarding walkthrough'
            ],
            decisions: ['Focus on AI summaries first', 'Analytics MVP after onboarding'],
            actionItems: [
                { owner: 'Iris', task: 'Draft AI summary milestones', dueDate: 'May 20', source: 'Decision' },
                { owner: 'Leo', task: 'Define analytics MVP scope', dueDate: 'May 22', source: 'Discussion' }
            ],
            blockersOrRisks: ['Engineering bandwidth'],
            conclusions: ['AI summaries are the flagship Q3 feature'],
            timelineHighlights: ['AI summaries MVP by June 5'],
            confidence: 'medium'
        },
        transcript: [
            'Iris: Q3 must highlight AI summaries and analytics.',
            'Leo: Onboarding needs improvements before analytics MVP.',
            'Sasha: Let us sequence AI summaries first for impact.'
        ]
    },
    {
        meetingCode: 'incident-05',
        daysAgo: 2,
        summary: {
            meetingTopic: 'Incident review: Call drops',
            shortOverview: 'Investigated call drops and agreed on WebRTC monitoring updates.',
            mainDiscussionPoints: [
                'Packet loss spikes',
                'Server region failover',
                'Client reconnection UX'
            ],
            decisions: ['Add WebRTC quality monitoring', 'Improve reconnection prompts'],
            actionItems: [
                { owner: 'Maya', task: 'Ship WebRTC quality metrics', dueDate: 'May 11', source: 'Decision' },
                { owner: 'Omar', task: 'Design reconnection UI update', dueDate: 'May 13', source: 'Discussion' }
            ],
            blockersOrRisks: ['Missing packet loss telemetry'],
            conclusions: ['Focus on stability monitoring'],
            timelineHighlights: ['Monitoring dashboard by May 11'],
            confidence: 'high'
        },
        transcript: [
            'Maya: Call drops were linked to packet loss spikes.',
            'Omar: We should improve reconnection UX for users.',
            'Zoe: Add region failover signals to monitoring.'
        ]
    },
    {
        meetingCode: 'onboard-06',
        daysAgo: 1,
        summary: {
            meetingTopic: 'Onboarding flow updates',
            shortOverview: 'Refined onboarding steps and decided on guided walkthroughs.',
            mainDiscussionPoints: [
                'First-call setup friction',
                'Guided walkthrough content',
                'Help center integration'
            ],
            decisions: ['Add guided walkthrough after signup'],
            actionItems: [
                { owner: 'Jin', task: 'Create walkthrough script', dueDate: 'May 16', source: 'Decision' },
                { owner: 'Rhea', task: 'Integrate help center links', dueDate: 'May 17', source: 'Discussion' }
            ],
            blockersOrRisks: ['Content review delays'],
            conclusions: ['Onboarding improvements should reduce churn'],
            timelineHighlights: ['Walkthrough live by May 16'],
            confidence: 'medium'
        },
        transcript: [
            'Jin: New users struggle with first-call setup.',
            'Rhea: A guided walkthrough can reduce friction.',
            'Kai: Add help center links directly in the flow.'
        ]
    }
];

const buildTranscript = (lines, sessionStart) => {
    const start = sessionStart.getTime();
    return lines.map((text, index) => ({
        speakerSocketId: `seed-${index}`,
        speakerName: text.split(':')[0],
        text,
        timestamp: start + index * 15000
    }));
};

const buildChatMessages = (sessionStart) => [
    {
        sender: 'System',
        data: 'Meeting notes captured by the assistant.',
        socketId: 'seed-system',
        timestamp: sessionStart.getTime() + 120000
    }
];

const buildEventLog = (sessionStart, meetingCode) => [
    {
        type: 'meeting-started',
        socketId: 'seed-system',
        username: 'System',
        timestamp: sessionStart.getTime(),
        metadata: { meetingCode }
    },
    {
        type: 'meeting-ended',
        socketId: 'seed-system',
        username: 'System',
        timestamp: sessionStart.getTime() + 1800000,
        metadata: { meetingCode }
    }
];

const run = async () => {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        throw new Error('MONGO_URL is missing');
    }

    await mongoose.connect(mongoUrl);

    let user = await User.findOne({ username: USERNAME });
    if (!user) {
        const password = await bcrypt.hash(PASSWORD, 10);
        user = await User.create({
            name: 'Seed User',
            username: USERNAME,
            password
        });
    }

    const meetingCodes = seedMeetings.map((meeting) => meeting.meetingCode);
    await MeetingEmbedding.deleteMany({ meetingCode: { $in: meetingCodes } });
    await MeetingSummary.deleteMany({ meetingCode: { $in: meetingCodes } });
    await Meeting.deleteMany({ meetingCode: { $in: meetingCodes }, user_id: USERNAME });

    for (const seed of seedMeetings) {
        const sessionStart = new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000);
        const sessionEnd = new Date(sessionStart.getTime() + 35 * 60 * 1000);
        const transcript = buildTranscript(seed.transcript, sessionStart);

        await Meeting.create({
            user_id: USERNAME,
            meetingCode: seed.meetingCode,
            date: sessionStart
        });

        const summaryDoc = await MeetingSummary.create({
            meetingCode: seed.meetingCode,
            roomMode: 'member',
            sessionStart,
            sessionEnd,
            durationSeconds: Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000),
            participants: [
                { socketId: 'seed-1', username: USERNAME, joinedAt: sessionStart, leftAt: sessionEnd },
                { socketId: 'seed-2', username: 'Teammate', joinedAt: sessionStart, leftAt: sessionEnd }
            ],
            transcript,
            chatMessages: buildChatMessages(sessionStart),
            eventLog: buildEventLog(sessionStart, seed.meetingCode),
            summaryStatus: 'ready',
            summaryModel: 'seed',
            summaryError: '',
            summaryPayload: seed.summary
        });

        await upsertMeetingEmbedding({ summaryDoc, summaryPayload: seed.summary });
    }

    console.log(`Seeded ${seedMeetings.length} meetings for user ${USERNAME}.`);
    await mongoose.disconnect();
};

run().catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
});
