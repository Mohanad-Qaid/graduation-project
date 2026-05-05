'use strict';

const { GoogleGenAI } = require('@google/genai');
const logger = require('./logger.util');

const PRIMARY_MODEL   = process.env.GEMINI_MODEL_ID          || 'gemini-2.5-pro';
const FALLBACK_MODEL  = process.env.GEMINI_FALLBACK_MODEL_ID || 'gemini-2.0-flash';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are an expert fraud analyst for a digital e-wallet platform operating in Turkey (TRY currency).

Your ONLY job is to analyze the provided transaction context and return a JSON risk assessment.

You must respond with ONLY a raw JSON object. No markdown. No explanation. No code fences.

The JSON must have exactly this shape:
{
  "score": <integer from 0 to 100>,
  "reasons": [<short string reason 1>, <short string reason 2>, ...]
}

Score guide:
0-30:  Low risk. Normal transaction.
31-69: Medium risk. Warrants monitoring.
70-100: High risk. Likely fraudulent. Flag for review.

Threat patterns to consider:
- Account draining: Sending 80%+ of balance, especially within hours of a top-up
- Impossible travel: Transaction location country/city differs from user's home location
- New account risk: Sender or recipient account less than 7 days old
- Velocity attacks: Many transactions in a short period
- Money mule: First-time relationship with receiver on a large amount
- Unusual hours: Transactions between 00:00–05:00`;

/**
 * Call Gemini with a specific model and parse the JSON response.
 * Throws on any failure (network error, rate limit, bad JSON, wrong shape).
 * @param {string} modelId
 * @param {object} context
 * @returns {Promise<{ score: number, reasons: string[] }>}
 */
async function callGemini(modelId, context) {
    const userPrompt = `Analyze this transaction for fraud risk:\n${JSON.stringify(context, null, 2)}`;

    const response = await genAI.models.generateContent({
        model: modelId,
        contents: userPrompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
        },
    });

    const raw = response.text?.trim();
    if (!raw) throw new Error('Gemini returned empty response');

    let parsed;
    try {
        // Strip any accidental code fences just in case
        const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        parsed = JSON.parse(clean);
    } catch {
        throw new Error(`Gemini response was not valid JSON: ${raw.substring(0, 200)}`);
    }

    if (typeof parsed.score !== 'number' || !Array.isArray(parsed.reasons)) {
        throw new Error(`Gemini response had unexpected shape: ${raw.substring(0, 200)}`);
    }

    return { score: Math.min(100, Math.max(0, Math.round(parsed.score))), reasons: parsed.reasons };
}

/**
 * Assess fraud risk using a 2-tier Gemini fallback strategy:
 *   1. Try the primary model (gemini-2.5-pro by default)
 *   2. On any failure, try the fallback model (gemini-2.0-flash by default)
 *   3. If both fail, throw so the caller can fall back to heuristics
 *
 * Returns the score, reasons, AND which model actually answered (analyzedBy).
 *
 * @param {object} context - The full fraud context object from buildFraudContext
 * @returns {Promise<{ score: number, reasons: string[], analyzedBy: string }>}
 */
async function assessFraudWithFallback(context) {
    // ── Attempt 1: Primary model ────────────────────────────────────────────
    try {
        const result = await callGemini(PRIMARY_MODEL, context);
        logger.info(`[fraud:gemini] model=${PRIMARY_MODEL} score=${result.score}`);
        return { ...result, analyzedBy: PRIMARY_MODEL };
    } catch (primaryErr) {
        logger.warn(`[fraud:gemini] Primary model (${PRIMARY_MODEL}) failed: ${primaryErr.message}. Trying fallback…`);
    }

    // ── Attempt 2: Fallback model ───────────────────────────────────────────
    try {
        const result = await callGemini(FALLBACK_MODEL, context);
        logger.info(`[fraud:gemini] model=${FALLBACK_MODEL} score=${result.score} (fallback)`);
        return { ...result, analyzedBy: FALLBACK_MODEL };
    } catch (fallbackErr) {
        logger.warn(`[fraud:gemini] Fallback model (${FALLBACK_MODEL}) also failed: ${fallbackErr.message}.`);
        // Re-throw so evaluateAndFlagTransaction falls back to heuristics
        throw fallbackErr;
    }
}

module.exports = { assessFraudWithFallback };
