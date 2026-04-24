'use strict';

const { GoogleGenAI } = require('@google/genai');
const logger = require('./logger.util');

const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-2.5-pro';
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
 * Sends the enriched fraud context to Gemini and returns a structured score.
 * This function is intentionally slow-tolerant (no hard timeout) because
 * it is always called in a fire-and-forget pattern AFTER the transaction commits.
 *
 * @param {object} context - The full fraud context object
 * @returns {Promise<{ score: number, reasons: string[] }>}
 */
async function assessFraudWithGemini(context) {
    const userPrompt = `Analyze this transaction for fraud risk:
${JSON.stringify(context, null, 2)}`;

    const response = await genAI.models.generateContent({
        model: MODEL_ID,
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

    logger.info(`[fraud:gemini] score=${parsed.score} model=${MODEL_ID}`);
    return { score: Math.min(100, Math.max(0, Math.round(parsed.score))), reasons: parsed.reasons };
}

module.exports = { assessFraudWithGemini };
