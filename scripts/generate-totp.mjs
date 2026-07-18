#!/usr/bin/env node
/**
 * One-time TOTP setup for the dashboard.
 *
 * Usage: node scripts/generate-totp.mjs
 *
 * Generates a TOTP secret, prints the otpauth:// URI and a QR code to scan
 * with an authenticator app, plus a random AUTH_SECRET for session signing.
 * Then store both:
 *   npx wrangler secret put TOTP_SECRET
 *   npx wrangler secret put AUTH_SECRET
 * and mirror them in .dev.vars for local development.
 */
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0;
  let bitCount = 0;
  let out = '';
  for (const byte of buf) {
    bits = (bits << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      out += B32[(bits >>> (bitCount - 5)) & 31];
      bitCount -= 5;
    }
  }
  if (bitCount > 0) out += B32[(bits << (5 - bitCount)) & 31];
  return out;
}

const secret = base32Encode(randomBytes(20));
const authSecret = randomBytes(32).toString('hex');

// Deliberately generic labels — nothing identifying the site.
const uri = `otpauth://totp/Dashboard:owner?secret=${secret}&issuer=Dashboard&algorithm=SHA1&digits=6&period=30`;

console.log('─'.repeat(60));
console.log('TOTP secret (base32):', secret);
console.log('\nProvisioning URI:\n' + uri + '\n');
console.log(await QRCode.toString(uri, { type: 'terminal', small: true }));
console.log('─'.repeat(60));
console.log(`
1. Scan the QR above with your authenticator app (or enter the secret manually).
2. Store the secrets in Cloudflare:
     npx wrangler secret put TOTP_SECRET   → paste: ${secret}
     npx wrangler secret put AUTH_SECRET   → paste: ${authSecret}
3. Add to .dev.vars (gitignored) for local dev:
     TOTP_SECRET=${secret}
     AUTH_SECRET=${authSecret}
`);
