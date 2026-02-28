import httpStatus from 'http-status';
import { User } from '../models/user.model.js';
import { Meeting } from '../models/meeting.model.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { isMeetingActive } from '../socket/socketManager.js';

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

export { login, register, getUserHistory, addToHistory, getMeetingStatus };