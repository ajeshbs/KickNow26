const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
  let bits = 0;
  let bitCount = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const val = B32_ALPHABET.indexOf(ch);
    if (val === -1) throw new Error('Invalid base32 character');
    bits = (bits << 5) | val;
    bitCount += 5;
    if (bitCount >= 8) {
      out.push((bits >>> (bitCount - 8)) & 0xff);
      bitCount -= 8;
    }
  }
  return new Uint8Array(out);
}

async function hotp(key: Uint8Array, counter: number): Promise<string> {
  const counterBuf = new Uint8Array(8);
  const view = new DataView(counterBuf.buffer);
  view.setUint32(4, counter >>> 0, false);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBuf));

  const offset = sig[sig.length - 1] & 0x0f;
  const code =
    (((sig[offset] & 0x7f) << 24) |
      ((sig[offset + 1] & 0xff) << 16) |
      ((sig[offset + 2] & 0xff) << 8) |
      (sig[offset + 3] & 0xff)) %
    1_000_000;
  return String(code).padStart(6, '0');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const TOTP_PERIOD = 30;

/**
 * Verify a 6-digit TOTP code against the base32 secret, allowing ±1 period of
 * clock skew. Returns the matched counter (for replay prevention) or null.
 */
export async function verifyTotp(
  secret: string,
  code: string,
  now: number = Date.now(),
): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const key = base32Decode(secret);
  const counter = Math.floor(now / 1000 / TOTP_PERIOD);
  for (const c of [counter, counter - 1, counter + 1]) {
    if (timingSafeEqual(await hotp(key, c), code)) return c;
  }
  return null;
}

/** Generate the current code — used by the setup script for a sanity check. */
export async function generateTotp(secret: string, now: number = Date.now()): Promise<string> {
  const key = base32Decode(secret);
  return hotp(key, Math.floor(now / 1000 / TOTP_PERIOD));
}
