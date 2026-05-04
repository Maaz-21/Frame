const DEFAULT_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const MAX_EMBEDDING_CHARS = 12000;

const getEmbeddingConfig = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing');
    }

    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is unavailable. Use Node.js 18+ for embedding requests');
    }

    return {
        apiKey,
        model: DEFAULT_EMBEDDING_MODEL
    };
};

const getEmbeddingEndpoint = (model, apiKey) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(apiKey)}`;

const extractEmbedding = (payload) => {
    const values = payload?.embedding?.values;
    return Array.isArray(values) ? values : [];
};

const normalizeList = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
        .filter(Boolean);
};

const normalizeActionItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => {
            const task = (item?.task || '').toString().trim();
            if (!task) return null;
            return {
                task,
                owner: (item?.owner || 'Unassigned').toString().trim() || 'Unassigned',
                dueDate: (item?.dueDate || 'Not mentioned').toString().trim() || 'Not mentioned'
            };
        })
        .filter(Boolean);
};

const buildSection = (label, items) => {
    if (!items.length) return '';
    return `${label}: ${items.join(' | ')}`;
};

const buildActionItemsSection = (items) => {
    if (!items.length) return '';
    const text = items
        .map((item) => `${item.task} (owner: ${item.owner}, due: ${item.dueDate})`)
        .join(' | ');
    return `Action Items: ${text}`;
};

const buildEmbeddingTextFromSummary = (summaryPayload = {}) => {
    const topic = (summaryPayload.meetingTopic || 'Not mentioned').toString().trim();
    const overview = (summaryPayload.shortOverview || '').toString().trim();

    const discussion = normalizeList(summaryPayload.mainDiscussionPoints);
    const decisions = normalizeList(summaryPayload.decisions);
    const blockers = normalizeList(summaryPayload.blockersOrRisks);
    const conclusions = normalizeList(summaryPayload.conclusions);
    const timeline = normalizeList(summaryPayload.timelineHighlights);
    const actionItems = normalizeActionItems(summaryPayload.actionItems);

    const parts = [
        `Topic: ${topic}`,
        overview ? `Overview: ${overview}` : '',
        buildSection('Discussion', discussion),
        buildSection('Decisions', decisions),
        buildActionItemsSection(actionItems),
        buildSection('Risks', blockers),
        buildSection('Conclusions', conclusions),
        buildSection('Timeline', timeline)
    ].filter(Boolean);

    const text = parts.join('\n').trim();
    return text.slice(0, MAX_EMBEDDING_CHARS);
};

const embedText = async (text) => {
    const cleaned = (text || '').toString().trim();
    if (!cleaned) {
        throw new Error('Embedding text is empty');
    }

    const { apiKey, model } = getEmbeddingConfig();

    const response = await fetch(getEmbeddingEndpoint(model, apiKey), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: `models/${model}`,
            content: {
                parts: [{ text: cleaned }]
            }
        })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.error?.message || `Embedding request failed with status ${response.status}`;
        throw new Error(message);
    }

    const embedding = extractEmbedding(payload);
    if (!embedding.length) {
        throw new Error('Embedding response was empty');
    }

    return { embedding, model };
};

export { embedText, buildEmbeddingTextFromSummary };
