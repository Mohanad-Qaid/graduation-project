'use strict';

/**
 * Platform fee configuration.
 * Centralised here so the rate can be changed once without touching service code.
 */
module.exports = {
    /** Percentage taken from every approved merchant bank withdrawal (0.07 = 7%). */
    WITHDRAWAL_FEE_RATE: 0.07,
};
