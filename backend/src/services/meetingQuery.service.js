const DEFAULT_QUERY_MODEL = process.env.GEMINI_QUERY_MODEL || process.env.GEMINI_SUMMARY_MODEL || 'gemini-3-flash-preview';

const getQueryConfig = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing');
    }

    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is unavailable. Use Node.js 18+ for Gemini requests');
    }

    return {
        apiKey,
        model: DEFAULT_QUERY_MODEL
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

const parseJsonPayload = (text) => {
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

const requestGeminiJson = async ({ model, apiKey, systemPrompt, userPrompt }) => {
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
    return parseJsonPayload(text || '{}');
};

const normalizeIntent = (value) => {
    const allowed = ['decisions', 'discussion', 'summary', 'action_items', 'risks', 'general'];
    const normalized = (value || '').toString().trim().toLowerCase();
    return allowed.includes(normalized) ? normalized : 'general';
};

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const normalizeKeywords = (value) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
        .filter(Boolean);
};

const parseMeetingQuery = async ({ query, now = new Date(), timezone = 'UTC' }) => {
    const cleaned = (query || '').toString().trim();
    if (!cleaned) {
        return {
            searchText: '',
            intent: 'general',
            fromDate: null,
            toDate: null,
            keywords: [],
            model: DEFAULT_QUERY_MODEL
        };
    }

    const { apiKey, model } = getQueryConfig();
    const nowIso = now.toISOString();

    const systemPrompt = [
        'You parse meeting search queries into structured JSON.',
        'Return only valid JSON. Do not add extra keys.',
        'Use ISO-8601 UTC for dates.'
    ].join(' ');

    const userPrompt = [
        'Return JSON with this exact shape:',
        '{',
        '  "searchText": string,',
        '  "intent": "decisions" | "discussion" | "summary" | "action_items" | "risks" | "general",',
        '  "fromDate": string | null,',
        '  "toDate": string | null,',
        '  "keywords": string[]',
        '}',
        `Current time (UTC): ${nowIso}`,
        `User timezone: ${timezone}`,
        `Query: ${cleaned}`
    ].join('\n');

    try {
        const parsed = await requestGeminiJson({
            model,
            apiKey,
            systemPrompt,
            userPrompt
        });

        return {
            searchText: (parsed.searchText || cleaned).toString().trim() || cleaned,
            intent: normalizeIntent(parsed.intent),
            fromDate: normalizeDate(parsed.fromDate),
            toDate: normalizeDate(parsed.toDate),
            keywords: normalizeKeywords(parsed.keywords),
            model
        };
    } catch (error) {
        return {
            searchText: cleaned,
            intent: 'general',
            fromDate: null,
            toDate: null,
            keywords: [],
            model
        };
    }
};

export { parseMeetingQuery };
