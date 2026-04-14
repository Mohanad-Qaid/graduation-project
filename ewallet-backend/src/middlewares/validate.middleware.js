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
        return sendError(res, {
            statusCode: 400,
            message: 'Validation failed.',
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    next();
}

module.exports = { validate };
