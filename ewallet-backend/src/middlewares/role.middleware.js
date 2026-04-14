'use strict';

const { sendError } = require('../utils/response.util');

/**
 * Factory: require specific roles.
 * Usage: router.get('/admin-route', authorize('ADMIN'), handler)
 * @param {...string} roles - Allowed role(s)
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, { statusCode: 401, message: 'Not authenticated.' });
        }
        if (!roles.includes(req.user.role)) {
            return sendError(res, {
                statusCode: 403,
                message: `Access denied. Requires one of: [${roles.join(', ')}].`,
            });
        }
        next();
    };
}

/**
 * Middleware: ensure the authenticated user has APPROVED status.
 * Call AFTER authenticate() middleware.
 */
function requireApproved(req, res, next) {
    if (!req.user) {
        return sendError(res, { statusCode: 401, message: 'Not authenticated.' });
    }
    if (req.user.status !== 'APPROVED') {
        return sendError(res, {
            statusCode: 403,
            message: `Account is not approved. Current status: ${req.user.status}.`,
        });
    }
    next();
}

module.exports = { authorize, requireApproved };
