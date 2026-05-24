import { MeetingSummary } from '../../src/models/meetingSummary.model.js';

export const waitForSummaryCompletion = async (meetingCode, options = {}) => {
    const timeoutMs = options.timeoutMs ?? 45000;
    const intervalMs = options.intervalMs ?? 1000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const summary = await MeetingSummary.findOne({ meetingCode }).sort({ sessionEnd: -1 });
        if (summary && summary.summaryStatus !== 'pending') {
            return summary;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Timed out waiting for summary for ${meetingCode}`);
};
