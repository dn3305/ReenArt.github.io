// Admin authentication module compatible with Edge Runtime

// Store admin credentials (hashed password) – do not expose plain text
export const ADMIN_EMAIL = 'naureennaz00@gmail.com';
// SHA-256 hash of 'Nazia@8366'
export const ADMIN_PASS_HASH = 'e0321fde2d00f906aee22fced1a0bd7dadc01113ad0d78bf3c7918c16a799f90';

export const SESSION_TOKEN = 'reen-admin-8xk2-session-9f3d';
export const SESSION_COOKIE = 'ra_session';

/**
 * Compute SHA-256 hash of a string using Web Crypto API and return hex string.
 */
async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  console.log('--- verifyCredentials Debug ---');
  console.log('Incoming Email:', email);
  console.log('Incoming Pass:', password);
  const emailMatch = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const passHash = await hashPassword(password.trim());
  const passMatch = passHash === ADMIN_PASS_HASH;
  console.log('Email Match:', emailMatch);
  console.log('Password Hash:', passHash);
  console.log('Expected Hash:', ADMIN_PASS_HASH);
  console.log('Password Match:', passMatch);
  console.log('--------------------------------');
  return emailMatch && passMatch;
}
