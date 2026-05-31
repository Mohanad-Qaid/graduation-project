'use strict';

const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.util');

/**
 * Run express-validator checks and short-circuit on errors.
 * Place it AFTER your validation chains, e.g.:
 *
 *   router.post('/register', [...validationRules], validate, handler)
 */
function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const fieldErrors = errors.array().map((e) => ({ field: e.path, message: e.msg }));
        const primaryMessage = fieldErrors[0]?.message || 'Validation failed.';
        return sendError(res, {
            statusCode: 400,
            message: primaryMessage,
            errors: fieldErrors,
        });
    }
    next();
}

module.exports = { validate };
