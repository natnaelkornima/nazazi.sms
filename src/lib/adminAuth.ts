import { NextRequest } from 'next/server';
import crypto from 'crypto';

const AUTH_SECRET =
  process.env.ADMIN_AUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'nazazi_admin_secure_hmac_secret_2026';

/**
 * Verifies an HMAC session token sent in Authorization: Bearer <token> or x-admin-token
 */
export function verifySessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  try {
    const decoded = Buffer.from(token.trim(), 'base64').toString('utf-8');
    const [expiresAtStr, randomHex, signature] = decoded.split(':');
    if (!expiresAtStr || !randomHex || !signature) return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expectedPayload = `${expiresAtStr}:${randomHex}`;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(expectedPayload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

/**
 * Extracts and validates the admin session token from an incoming NextRequest.
 */
export function authorizeAdminRequest(req: NextRequest): { authorized: boolean; error?: string } {
  // Check Authorization header
  const authHeader = req.headers.get('authorization') || '';
  let token = '';

  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = req.headers.get('x-admin-token')?.trim() || '';
  }

  // Also check cookie if present
  if (!token) {
    token = req.cookies.get('nazazi_admin_token')?.value || '';
  }

  if (!token) {
    return {
      authorized: false,
      error: 'Unauthorized: Admin authentication token is missing. Please log in.',
    };
  }

  if (!verifySessionToken(token)) {
    return {
      authorized: false,
      error: 'Forbidden: Invalid or expired administrator session. Please log in again.',
    };
  }

  return { authorized: true };
}
