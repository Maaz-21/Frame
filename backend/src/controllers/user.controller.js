import httpStatus from 'http-status';
import { User } from '../models/user.model.js';
import { Meeting } from '../models/meeting.model.js';
import { MeetingSummary } from '../models/meetingSummary.model.js';
import { generateMeetingSummary } from '../services/meetingSummary.service.js';
import { searchMeetingEmbeddings, upsertMeetingEmbedding } from '../services/meetingEmbedding.service.js';
import { parseMeetingQuery } from '../services/meetingQuery.service.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import twilio from 'twilio';
import { getActiveMeetingSnapshot, isMeetingActive } from '../socket/socketManager.js';

const canUserAccessMeeting = async (username, meetingCode) => {
    if (!username || !meetingCode) return false;
    const activity = await Meeting.findOne({ user_id: username, meetingCode }).select('_id');
    return Boolean(activity);
};

const clampLimit = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return 6;
    return Math.min(Math.max(parsed, 1), 20);
};

const parseDateParam = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const buildInsightsForIntent = (payload, intent = 'general') => {
    if (!payload) return {};

    switch (intent) {
        case 'decisions':
            return { decisions: payload.decisions || [] };
        case 'action_items':
            return { actionItems: payload.actionItems || [] };
        case 'risks':
            return { blockersOrRisks: payload.blockersOrRisks || [] };
        case 'discussion':
            return { mainDiscussionPoints: payload.mainDiscussionPoints || [] };
        case 'summary':
            return { shortOverview: payload.shortOverview || '' };
        default:
            return {
                decisions: payload.decisions || [],
                actionItems: payload.actionItems || [],
                blockersOrRisks: payload.blockersOrRisks || []
            };
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Name, username, and password are required'
        });
    }

    if (password.length < 6) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Password must be at least 6 characters'
        });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({
                message: 'User already exists with this username'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            username,
            password: hashedPassword
        });
        await newUser.save();

        res.status(httpStatus.CREATED).json({
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                username: newUser.username
            }
        });
    } catch (err) {
        console.error('[Register Error]', err.message);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Internal server error'
        });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Username and password are required'
        });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Invalid credentials'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Invalid credentials'
            });
        }

        // Generate secure token
        const token = crypto.randomBytes(20).toString('hex');
        user.token = token;
        await user.save();

        return res.status(httpStatus.OK).json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                token: user.token
            }
        });
    } catch (err) {
        console.error('[Login Error]', err.message);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Internal server error'
        });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const user = req.user; // Populated by auth middleware
        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        res.json(meetings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;

    if (!meeting_code) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Meeting code is required'
        });
    }

    try {
        const user = req.user; // Populated by auth middleware
        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        });

        await newMeeting.save();
        res.status(httpStatus.CREATED).json({ message: 'Added code to history' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getMeetingStatus = (req, res) => {
    const meetingCode = (req.params.meetingCode || '').trim();

    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Meeting code is required'
        });
    }

    return res.status(httpStatus.OK).json({
        meetingCode,
        active: isMeetingActive(meetingCode)
    });
};

const getIceServers = async (req, res) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Twilio credentials are not configured'
        });
    }

    try {
        const client = twilio(accountSid, authToken);
        const token = await client.tokens.create();

        return res.status(httpStatus.OK).json({
            iceServers: token.iceServers || []
        });
    } catch (error) {
        console.error('[Twilio ICE Error]', error.message);
        return res.status(httpStatus.BAD_GATEWAY).json({
            message: 'Failed to fetch ICE servers from Twilio'
        });
    }
};

const getMeetingSummary = async (req, res) => {
    const meetingCode = (req.params.meetingCode || '').trim();
    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Meeting code is required'
        });
    }

    try {
        const user = req.user;
        const hasAccess = await canUserAccessMeeting(user.username, meetingCode);
        if (!hasAccess) {
            return res.status(httpStatus.FORBIDDEN).json({
                message: 'You do not have access to this meeting summary'
            });
        }

        const summary = await MeetingSummary.findOne({ meetingCode }).sort({ sessionEnd: -1 });
        if (!summary) {
            return res.status(httpStatus.OK).json({
                meetingCode,
                summaryStatus: 'pending',
                summaryPayload: null,
                summaryError: 'Summary not available yet'
            });
        }

        return res.status(httpStatus.OK).json(summary);
    } catch (error) {
        console.error('[Get Summary Error]', error?.message || error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Failed to fetch meeting summary'
        });
    }
};

const searchMeetingIntelligence = async (req, res) => {
    const query = (req.query.q || '').toString().trim();
    if (!query) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Query is required'
        });
    }

    const limit = clampLimit(req.query.limit);
    const timezone = (req.query.timezone || 'UTC').toString().trim() || 'UTC';
    const explicitFrom = parseDateParam(req.query.from);
    const explicitTo = parseDateParam(req.query.to);

    let parsed = null;
    try {
        parsed = await parseMeetingQuery({
            query,
            now: new Date(),
            timezone
        });
    } catch (error) {
        parsed = {
            searchText: query,
            intent: 'general',
            fromDate: null,
            toDate: null,
            keywords: [],
            model: null
        };
    }

    const searchText = (parsed?.searchText || query).toString().trim() || query;
    const intent = parsed?.intent || 'general';
    const fromDate = explicitFrom || parsed?.fromDate || null;
    const toDate = explicitTo || parsed?.toDate || null;

    try {
        const user = req.user;
        const meetingCodes = await Meeting.find({ user_id: user.username }).distinct('meetingCode');

        if (!meetingCodes.length) {
            return res.status(httpStatus.OK).json({
                query,
                parsedQuery: {
                    searchText,
                    intent,
                    fromDate: fromDate ? fromDate.toISOString() : null,
                    toDate: toDate ? toDate.toISOString() : null,
                    keywords: parsed?.keywords || [],
                    model: parsed?.model || null
                },
                results: []
            });
        }

        const results = await searchMeetingEmbeddings({
            query: searchText,
            meetingCodes,
            fromDate,
            toDate,
            limit
        });

        const formattedResults = results.map((result) => ({
            meetingCode: result.meetingCode,
            sessionStart: result.sessionStart,
            sessionEnd: result.sessionEnd,
            score: result.score,
            summaryStatus: result.summaryStatus,
            summaryPayload: result.summaryPayload,
            insights: buildInsightsForIntent(result.summaryPayload, intent)
        }));

        return res.status(httpStatus.OK).json({
            query,
            parsedQuery: {
                searchText,
                intent,
                fromDate: fromDate ? fromDate.toISOString() : null,
                toDate: toDate ? toDate.toISOString() : null,
                keywords: parsed?.keywords || [],
                model: parsed?.model || null
            },
            results: formattedResults
        });
    } catch (error) {
        console.error('[Meeting Search Error]', error?.message || error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Failed to search meetings'
        });
    }
};

const regenerateMeetingSummary = async (req, res) => {
    const meetingCode = (req.params.meetingCode || '').trim();
    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Meeting code is required'
        });
    }

    try {
        const user = req.user;
        const hasAccess = await canUserAccessMeeting(user.username, meetingCode);
        if (!hasAccess) {
            return res.status(httpStatus.FORBIDDEN).json({
                message: 'You do not have access to regenerate this summary'
            });
        }

        let summary = await MeetingSummary.findOne({ meetingCode }).sort({ sessionEnd: -1 });
        let payload = null;

        if (!summary) {
            const liveSnapshot = getActiveMeetingSnapshot(meetingCode);
            if (!liveSnapshot) {
                return res.status(httpStatus.NOT_FOUND).json({
                    message: 'Summary source data is not available yet'
                });
            }

            summary = await MeetingSummary.create({
                meetingCode: liveSnapshot.meetingCode,
                roomMode: liveSnapshot.roomMode,
                sessionStart: liveSnapshot.sessionStart,
                sessionEnd: liveSnapshot.sessionEnd,
                durationSeconds: liveSnapshot.durationSeconds,
                participants: liveSnapshot.participants,
                transcript: liveSnapshot.transcript,
                chatMessages: liveSnapshot.chatMessages,
                eventLog: liveSnapshot.eventLog,
                summaryStatus: 'pending'
            });

            payload = liveSnapshot;
        } else {
            summary.summaryStatus = 'pending';
            summary.summaryError = '';
            await summary.save();

            payload = {
                meetingCode: summary.meetingCode,
                participants: summary.participants || [],
                transcript: summary.transcript || [],
                chatMessages: summary.chatMessages || [],
                eventLog: summary.eventLog || [],
                sessionStart: summary.sessionStart,
                sessionEnd: summary.sessionEnd
            };
        }

        generateMeetingSummary(payload)
            .then(async ({ model, summary: nextSummary }) => {
                await MeetingSummary.findByIdAndUpdate(summary._id, {
                    summaryStatus: 'ready',
                    summaryModel: model,
                    summaryPayload: nextSummary,
                    summaryError: ''
                });

                try {
                    await upsertMeetingEmbedding({
                        summaryDoc: summary,
                        summaryPayload: nextSummary
                    });
                } catch (error) {
                    console.error(`[Embedding Error] ${summary.meetingCode}:`, error?.message || error);
                }
            })
            .catch(async (error) => {
                await MeetingSummary.findByIdAndUpdate(summary._id, {
                    summaryStatus: 'failed',
                    summaryError: error?.message || 'Summary regeneration failed'
                });
                console.error('[Regenerate Summary Error]', error?.message || error);
            });

        return res.status(httpStatus.ACCEPTED).json({
            message: 'Summary regeneration started'
        });
    } catch (error) {
        console.error('[Regenerate Summary Error]', error?.message || error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Failed to regenerate summary'
        });
    }
};

export {
    login,
    register,
    getUserHistory,
    addToHistory,
    getMeetingStatus,
    getIceServers,
    getMeetingSummary,
    searchMeetingIntelligence,
    regenerateMeetingSummary
};