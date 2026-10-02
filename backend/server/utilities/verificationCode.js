const crypto = require("crypto");

// Shared by both verification flows that use emailVerificationCodeHash/
// emailVerificationExpires/emailVerificationAttempts on the User model:
// signup email verification (models/userModel.js's own `email`) and the
// email-CHANGE flow (routes/userProfile.js's `pendingEmail`). The two never
// overlap for the same user - pendingEmail is only set once signup itself is
// already verified - so reusing the same fields for both is safe.
const CODE_EXPIRY_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const generateCode = () => String(crypto.randomInt(100000, 1000000));
const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");

module.exports = { CODE_EXPIRY_MS, MAX_VERIFY_ATTEMPTS, RESEND_COOLDOWN_MS, generateCode, hashCode };
