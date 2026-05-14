'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger.util');

// ── Transporter ───────────────────────────────────────────────────────────────
// Uses Gmail SMTP with an App Password (not the account password).
// Generate one at: Google Account → Security → 2-Step Verification → App Passwords

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM = `"${process.env.SMTP_FROM_NAME || 'E-Wallet'}" <${process.env.SMTP_USER}>`;

// ── Templates ─────────────────────────────────────────────────────────────────

function otpEmailHtml(code, purpose) {
    const purposeText = purpose === 'reset'
        ? 'reset your PIN'
        : 'verify your email address';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F5FB;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5FB;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:20px;overflow:hidden;
                    box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1A006B;padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:1px;">
              E-WALLET
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#333;font-size:16px;margin:0 0 12px;">Hello,</p>
            <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 28px;">
              Use the code below to ${purposeText}.
              This code is valid for <strong>3 minutes</strong>.
            </p>
            <!-- OTP Box -->
            <div style="text-align:center;margin:0 0 28px;">
              <span style="display:inline-block;background:#EDE7F6;color:#1A006B;
                           font-size:36px;font-weight:900;letter-spacing:12px;
                           padding:18px 32px;border-radius:14px;">
                ${code}
              </span>
            </div>
            <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
              If you did not request this, you can safely ignore this email.
              Do not share this code with anyone.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F9F7FF;padding:20px 40px;text-align:center;
                     border-top:1px solid #EEE;">
            <p style="color:#ABABAB;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} E-Wallet. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send an OTP email.
 * @param {string} to      - Recipient email address
 * @param {string} code    - 6-digit OTP string
 * @param {'verify'|'reset'} purpose
 */
async function sendOTPEmail(to, code, purpose = 'verify') {
    const subject = purpose === 'reset'
        ? 'Your E-Wallet PIN Reset Code'
        : 'Verify Your E-Wallet Email';

    const info = await transporter.sendMail({
        from: FROM,
        to,
        subject,
        html: otpEmailHtml(code, purpose),
    });

    logger.info(`OTP email sent to ${to} (messageId: ${info.messageId})`);
    return info;
}

module.exports = { sendOTPEmail };
