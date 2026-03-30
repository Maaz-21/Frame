const GEMINI_MODEL = process.env.GEMINI_SUMMARY_MODEL || 'gemini-3-flash-preview';

const normalizeArray = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim())).filter(Boolean);
    }
    return [];
};

const normalizeActionItems = (value) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => ({
            owner: (item?.owner || 'Unassigned').toString().trim() || 'Unassigned',
            task: (item?.task || '').toString().trim(),
            dueDate: (item?.dueDate || 'Not mentioned').toString().trim() || 'Not mentioned',
            source: (item?.source || '').toString().trim()
        }))
        .filter((item) => item.task);
};

const buildSummaryInput = ({ meetingCode, participants, transcript, chatMessages, eventLog, sessionStart, sessionEnd }) => {
    const transcriptText = (transcript || [])
        .map((line) => `${line.speakerName || 'Speaker'}: ${line.text}`)
        .join('\n')
        .slice(0, 32000);

    const chatText = (chatMessages || [])
        .map((message) => `${message.sender || 'User'}: ${message.data || ''}`)
        .join('\n')
        .slice(0, 12000);

    const eventText = (eventLog || [])
        .map((event) => {
            const suffix = event?.metadata ? ` ${JSON.stringify(event.metadata)}` : '';
            return `${event.type || 'event'} by ${event.username || 'unknown'}${suffix}`;
        })
        .join('\n')
        .slice(0, 12000);

    return JSON.stringify({
        meetingCode,
        sessionStart,
        sessionEnd,
        participants: participants || [],
        transcript: transcriptText,
        chat: chatText,
        events: eventText
    });
};

const getGeminiConfig = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing');
    }

    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is unavailable. Use Node.js 18+ for Gemini requests');
    }

    return {
        apiKey,
        model: GEMINI_MODEL
    };
};

const getGeminiEndpoint = (model, apiKey) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

const extractGeminiText = (payload) => {
    const parts = payload?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';

    return parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('\n')
        .trim();
};

const parseSummaryJson = (text) => {
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch (error) {
        const normalized = text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```$/i, '')
            .trim();
        return JSON.parse(normalized);
    }
};

const requestGeminiSummary = async ({ model, apiKey, systemPrompt, userPrompt }) => {
    const response = await fetch(getGeminiEndpoint(model, apiKey), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userPrompt }]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = payload?.error?.message || `Gemini request failed with status ${response.status}`;
        throw new Error(message);
    }

    const text = extractGeminiText(payload);
    return parseSummaryJson(text || '{}');
};

const defaultSummaryPayload = {
    meetingTopic: 'Not clear',
    shortOverview: 'Summary unavailable.',
    mainDiscussionPoints: [],
    decisions: [],
    actionItems: [],
    blockersOrRisks: [],
    conclusions: [],
    timelineHighlights: [],
    confidence: 'low'
};

const generateMeetingSummary = async ({
    meetingCode,
    participants,
    transcript,
    chatMessages,
    eventLog,
    sessionStart,
    sessionEnd
}) => {
    const { apiKey, model } = getGeminiConfig();

    if ((!transcript || transcript.length === 0) && (!chatMessages || chatMessages.length === 0)) {
        return {
            model,
            summary: {
                ...defaultSummaryPayload,
                shortOverview: 'No transcript or chat content was available for summarization.'
            }
        };
    }

    const systemPrompt = [
        'You summarize online meeting data into structured JSON.',
        'Use ONLY provided content. Do not invent facts.',
        'If information is missing, write "Not mentioned".',
        'Focus on: what meeting was about, key discussions, decisions, action items, conclusions.'
    ].join(' ');

    const userPrompt = [
        'Return valid JSON with this exact shape:',
        '{',
        '  "meetingTopic": string,',
        '  "shortOverview": string,',
        '  "mainDiscussionPoints": string[],',
        '  "decisions": string[],',
        '  "actionItems": [{"owner": string, "task": string, "dueDate": string, "source": string}],',
        '  "blockersOrRisks": string[],',
        '  "conclusions": string[],',
        '  "timelineHighlights": string[],',
        '  "confidence": "low" | "medium" | "high"',
        '}',
        'Meeting data:',
        buildSummaryInput({
            meetingCode,
            participants,
            transcript,
            chatMessages,
            eventLog,
            sessionStart,
            sessionEnd
        })
    ].join('\n');

    const parsed = await requestGeminiSummary({
        model,
        apiKey,
        systemPrompt,
        userPrompt
    });

    return {
        model,
        summary: {
            meetingTopic: (parsed.meetingTopic || 'Not clear').toString().trim(),
            shortOverview: (parsed.shortOverview || '').toString().trim(),
            mainDiscussionPoints: normalizeArray(parsed.mainDiscussionPoints),
            decisions: normalizeArray(parsed.decisions),
            actionItems: normalizeActionItems(parsed.actionItems),
            blockersOrRisks: normalizeArray(parsed.blockersOrRisks),
            conclusions: normalizeArray(parsed.conclusions),
            timelineHighlights: normalizeArray(parsed.timelineHighlights),
            confidence: ['low', 'medium', 'high'].includes((parsed.confidence || '').toLowerCase())
                ? parsed.confidence.toLowerCase()
                : 'low'
        }
    };
};

export { generateMeetingSummary };
