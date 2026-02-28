import { User } from '../models/user.model.js';
import httpStatus from 'http-status';

/**
 * Middleware to authenticate requests via token.
 * Accepts token from Authorization header (Bearer <token>) or query param.
 */
export const authenticateToken = async (req, res, next) => {
    try {
        let token = req.query.token;

        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        // Also check body
        if (!token && req.body && req.body.token) {
            token = req.body.token;
        }

        if (!token) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Authentication token is required'
            });
        }

        const user = await User.findOne({ token });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Authentication error'
        });
    }
};
