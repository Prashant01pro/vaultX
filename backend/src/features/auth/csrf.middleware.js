import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import AppError from '../../utils/appError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { authSession } from './auth.session.model.js';

const hashToken = (token) => {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};

const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

export const csrfProtection = catchAsync(
    async (req, res, next) => {
        if (safeMethods.includes(req.method)) {
            return next();
        }

        const csrfToken = req.headers['x-csrf-token'];

        if (!csrfToken) {
            throw new AppError('CSRF token is required', 403);
        }

        // Normal protected routes already have req.session.
        let session = req.session;

        // Refresh/logout may run with an expired access token.
        // Use the refresh token only to find the relevant session.
        if (!session) {
            const refreshToken = req.cookies.refreshToken;

            if (!refreshToken) {
                throw new AppError('Authentication is required', 401);
            }

            const decoded = jwt.decode(refreshToken);

            if (!decoded?.sid) {
                throw new AppError('Invalid session', 401);
            }

            session = await authSession
                .findOne({
                    _id: decoded.sid,
                    revokedAt: null,
                    expiresAt: { $gt: new Date() }
                })
                .select('+csrfTokenHash');
        } else {
            session = await authSession
                .findById(session._id)
                .select('+csrfTokenHash');
        }

        if (!session) {
            throw new AppError('Session is no longer active', 401);
        }

        const receivedTokenHash = hashToken(csrfToken);

        if (receivedTokenHash !== session.csrfTokenHash) {
            throw new AppError('Invalid CSRF token', 403);
        }

        next();
    }
);