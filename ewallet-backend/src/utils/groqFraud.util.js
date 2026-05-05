'use strict';

/**
 * groqFraud.util.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement for geminiFraud.util.js.
 * Uses the Groq SDK (OpenAI-compatible) to analyse transaction fraud risk.
 *
 * Exported surface is IDENTICAL to the old Gemini util so fraud.util.js only
 * needs to update its require() path — no other callers are affected.
 *
 * Robustness guarantees:
 *  1. `response_format: { type: 'json_object' }` — tells the model to ONLY
 *     return valid JSON (supported by Groq for all chat models).
 *  2. Defensive JSON parsing with code-fence stripping (belt-and-suspenders).
 *  3. Score coercion — handles both numeric 75 and string "75" from the model.
 *  4. Shape validation — throws a descriptive error if score/reasons are absent
 *     so the caller (fraud.util.js) safely falls back to heuristics.
 *  5. No uncaught promise rejections — every error path either throws cleanly
 *     or is caught and re-thrown with context.
 */

const Groq = require('groq-sdk');
const logger = require('./logger.util');

// ─── Configuration ────────────────────────────────────────────────────────────

const MODEL_ID = process.env.GROQ_MODEL_ID || 'openai/gpt-oss-120b';

// Lazy-initialised so the module can be required even without the key set
// (the error surfaces only when the function is actually called).
let _groqClient = null;
function getClient() {
    if (!_groqClient) {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY environment variable is not set');
        }
        _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return _groqClient;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

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

// ─── Core API call ────────────────────────────────────────────────────────────

/**
 * Call the Groq model and parse the JSON risk assessment.
 * Throws a descriptive Error on any failure so the caller can fall back safely.
 *
 * @param {object} context - Full fraud context from buildFraudContext()
 * @returns {Promise<{ score: number, reasons: string[] }>}
 */
async function callGroq(context) {
    const userPrompt = `Analyze this transaction for fraud risk:\n${JSON.stringify(context, null, 2)}`;

    let response;
    try {
        response = await getClient().chat.completions.create({
            model: MODEL_ID,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user',   content: userPrompt },
            ],
            // Instructs the model to return ONLY valid JSON — primary enforcement
            response_format: { type: 'json_object' },
            temperature: 0.1,   // low temperature for deterministic scoring
            max_tokens: 512,    // score + a handful of reasons is well under 512
        });
    } catch (apiErr) {
        // Network errors, auth failures, rate limits, etc.
        throw new Error(`Groq API request failed: ${apiErr.message}`);
    }

    // ── Extract raw text ─────────────────────────────────────────────────────
    const raw = response.choices?.[0]?.message?.content?.trim();
    if (!raw) {
        throw new Error('Groq returned an empty response body');
    }

    // ── Parse JSON (defensive — strip accidental code fences just in case) ──
    let parsed;
    try {
        const clean = raw
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
        parsed = JSON.parse(clean);
    } catch {
        throw new Error(`Groq response was not valid JSON: ${raw.substring(0, 200)}`);
    }

    // ── Validate shape ───────────────────────────────────────────────────────
    if (parsed === null || typeof parsed !== 'object') {
        throw new Error(`Groq response is not a JSON object: ${raw.substring(0, 200)}`);
    }

    // Coerce score — some models return "75" (string) instead of 75 (number)
    const rawScore = parsed.score;
    const numericScore = Number(rawScore);
    if (!Number.isFinite(numericScore)) {
        throw new Error(`Groq response missing or invalid "score" field: ${raw.substring(0, 200)}`);
    }

    if (!Array.isArray(parsed.reasons)) {
        throw new Error(`Groq response missing or invalid "reasons" array: ${raw.substring(0, 200)}`);
    }

    // Clamp to [0, 100] and round to nearest integer
    const score   = Math.min(100, Math.max(0, Math.round(numericScore)));
    // Ensure every reason is a non-empty string
    const reasons = parsed.reasons
        .map(r => String(r).trim())
        .filter(r => r.length > 0);

    return { score, reasons };
}

// ─── Public entry-point ───────────────────────────────────────────────────────

/**
 * Assess fraud risk using Groq.
 * On any failure throws so fraud.util.js safely falls back to heuristics.
 *
 * Returns the same shape as the old Gemini util so fraud.util.js is unchanged:
 *   { score: number, reasons: string[], analyzedBy: string }
 *
 * @param {object} context - The full fraud context object from buildFraudContext
 * @returns {Promise<{ score: number, reasons: string[], analyzedBy: string }>}
 */
async function assessFraudWithFallback(context) {
    try {
        const result = await callGroq(context);
        logger.info(`[fraud:groq] model=${MODEL_ID} score=${result.score}`);
        return { ...result, analyzedBy: MODEL_ID };
    } catch (err) {
        logger.warn(`[fraud:groq] model=${MODEL_ID} failed: ${err.message}`);
        // Re-throw — fraud.util.js catches this and falls back to heuristics
        throw err;
    }
}

module.exports = { assessFraudWithFallback };
