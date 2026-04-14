'use strict';

/**
 * Uniform API response helpers.
 * All responses follow the shape: { success, message, data?, meta? }
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {object}  options
 * @param {number}  [options.statusCode=200]
 * @param {string}  [options.message='Success']
 * @param {*}       [options.data=null]
 * @param {object}  [options.meta]  - pagination etc.
 */
function sendSuccess(res, { statusCode = 200, message = 'Success', data = null, meta } = {}) {
    const body = { success: true, message };
    if (data !== null && data !== undefined) body.data = data;
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
}

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {object}  options
 * @param {number}  [options.statusCode=500]
 * @param {string}  [options.message='Internal Server Error']
 * @param {*}       [options.errors]
 */
function sendError(res, { statusCode = 500, message = 'Internal Server Error', errors } = {}) {
    const body = { success: false, message };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
