import { Router } from 'express';
import { login, register, getUserHistory, addToHistory, getMeetingStatus, getIceServers } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
router.get('/meeting-status/:meetingCode', getMeetingStatus);
router.get('/ice-servers', getIceServers);

// Protected routes (require token)
router.post('/add_to_activity', authenticateToken, addToHistory);
router.get('/get_all_activity', authenticateToken, getUserHistory);

export default router;