const crypto = require('crypto');

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Never fall back to a fixed, publicly known secret: anyone could forge tokens.
  // A random per-process secret is safe; it just logs everyone out on restart.
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  JWT_SECRET is not set — using a temporary random secret. Set JWT_SECRET in .env.');
}

module.exports = { JWT_SECRET };
