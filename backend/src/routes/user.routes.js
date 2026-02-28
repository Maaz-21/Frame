import { Router } from 'express';
import { login, register, getUserHistory, addToHistory } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes (require token)
router.post('/add_to_activity', authenticateToken, addToHistory);
router.get('/get_all_activity', authenticateToken, getUserHistory);

export default router;