/**
 * Lightweight in-memory TTL cache.
 * Used for hot, read-heavy endpoints (dashboard summary, app list).
 * No external dependency — a Map is sufficient at this scale.
 */

const _store = new Map();

const set = (key, value, ttlMs) => {
  _store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const get = (key) => {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return null;
  }
  return entry.value;
};

const del = (key) => _store.delete(key);

// Invalidate all keys that start with a given prefix
const invalidatePrefix = (prefix) => {
  for (const key of _store.keys()) {
    if (key.startsWith(prefix)) _store.delete(key);
  }
};

const size = () => _store.size;

module.exports = { set, get, del, invalidatePrefix, size };
