const crypto = require("crypto");

// Same hash-at-rest approach as utilities/verificationCode.js, sized for a
// link token rather than a typed code: 32 random bytes (256 bits) is
// unguessable, and only its SHA-256 hash is ever stored (see
// driverConfirmationTokenHash on the Ride model).
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours to respond

const generateToken = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

module.exports = { TOKEN_EXPIRY_MS, generateToken, hashToken };
