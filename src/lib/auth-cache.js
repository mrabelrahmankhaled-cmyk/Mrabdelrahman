/**
 * ============================================================
 * src/lib/auth-cache.js
 * ✅ In-memory session cache for AuthContext
 * ============================================================
 * PROBLEM: AuthContext fires 3-5 DB queries on EVERY page load /
 * auth state change. With 10,000 users this = 50,000 DB queries/sec.
 *
 * SOLUTION: Cache the result of the heavy auth sync (profile +
 * center + features) in-memory per user ID. Cache TTL = 5 minutes.
 *
 * This is safe because:
 *   - Role/feature changes take effect within 5 minutes
 *   - signOut() clears the cache immediately
 *   - The cache is per-tab memory — no cross-user leakage
 * ============================================================
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Map<userId, { data, expiresAt }>
const cache = new Map();

export function getCachedAuthData(userId) {
  if (!userId) return null;
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry.data;
}

export function setCachedAuthData(userId, data) {
  if (!userId) return;
  cache.set(userId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearCachedAuthData(userId) {
  if (userId) cache.delete(userId);
  else cache.clear();
}
