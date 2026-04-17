/**
 * Server rotation utility for Classworks Cloud provider
 * Provides fallback mechanism across multiple server endpoints with
 * latency-based preference, background probing, and response caching.
 */

import { getSetting } from "./settings";

// Server list for classworkscloud provider (in default priority order)
const CLASSWORKS_CLOUD_SERVERS = [
  "https://kv-service.houlang.cloud",
  "https://kv-service.wuyuan.dev",
];

// Cache TTL for server preference (5 minutes)
const SERVER_PREFERENCE_TTL = 5 * 60 * 1000;

// Probe timeout (3 seconds)
const PROBE_TIMEOUT_MS = 3000;

// Server preference cache
const serverPreference = {
  preferred: null,   // URL of the fastest responding server
  cachedAt: 0,       // Timestamp when the preference was last updated
  probing: false,    // Whether a background probe is currently running
};

/**
 * Update the preference cache to mark the given server URL as preferred.
 * @param {string} url
 */
function setCachedPreference(url) {
  serverPreference.preferred = url;
  serverPreference.cachedAt = Date.now();
}

/**
 * Determine whether an error should trigger rotation to the next server.
 * Network errors and 5xx server errors warrant rotation.
 * HTTP 4xx responses mean the server is reachable and should NOT trigger rotation
 * (e.g. 404 simply means the key does not exist on a healthy server).
 * @param {Error} error
 * @returns {boolean}
 */
function shouldRotateOnError(error) {
  if (!error.response) {
    // Network / timeout error — server unreachable, rotate
    return true;
  }
  // Only rotate for server-side (5xx) errors
  return error.response.status >= 500;
}

/**
 * Probe a single server and return its round-trip latency in milliseconds.
 * Returns Infinity when the server cannot be reached within the timeout.
 * Any HTTP response (including 4xx) counts as reachable.
 * @param {string} serverUrl
 * @returns {Promise<number>}
 */
async function probeServer(serverUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const start = Date.now();
  try {
    await fetch(`${serverUrl}/`, { method: "HEAD", signal: controller.signal });
    return Date.now() - start;
  } catch {
    return Infinity;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Probe all cloud servers concurrently and update the preference cache
 * with the fastest reachable one.  Runs silently in the background.
 */
async function updateServerPreference() {
  if (serverPreference.probing) return;
  serverPreference.probing = true;
  try {
    const results = await Promise.all(
      CLASSWORKS_CLOUD_SERVERS.map(async (url) => ({
        url,
        latency: await probeServer(url),
      }))
    );
    const reachable = results
      .filter((r) => r.latency < Infinity)
      .sort((a, b) => a.latency - b.latency);
    if (reachable.length > 0) {
      setCachedPreference(reachable[0].url);
    }
  } catch {
    // Probe failure is non-fatal; keep existing preference
  } finally {
    serverPreference.probing = false;
  }
}

/**
 * Return the cloud server list ordered by cached preference (fastest first).
 * Triggers a background probe when the cache is stale without blocking.
 * @returns {string[]}
 */
function getOrderedCloudServers() {
  const now = Date.now();
  const cacheStale = now - serverPreference.cachedAt > SERVER_PREFERENCE_TTL;

  if (cacheStale && !serverPreference.probing) {
    // Non-blocking background probe to refresh the preference
    updateServerPreference().catch(() => {});
  }

  const preferred = serverPreference.preferred;
  if (preferred && CLASSWORKS_CLOUD_SERVERS.includes(preferred)) {
    return [preferred, ...CLASSWORKS_CLOUD_SERVERS.filter((s) => s !== preferred)];
  }
  return [...CLASSWORKS_CLOUD_SERVERS];
}

/**
 * Get the list of servers to try for the given provider.
 * For classworkscloud the list is ordered by latency preference (fastest first).
 * @param {string} provider - The provider type
 * @returns {string[]} Array of server URLs to try
 */
export function getServerList(provider) {
  if (provider === "classworkscloud") {
    return getOrderedCloudServers();
  }

  // For other providers, use the configured domain
  const domain = getSetting("server.domain");
  return domain ? [domain] : [];
}

/**
 * Try an operation with server rotation fallback.
 *
 * Key behaviours:
 * - HTTP 4xx responses (e.g. 404) are treated as valid server replies and are
 *   propagated immediately without trying the next server.
 * - Only network errors or HTTP 5xx responses cause rotation to the next server.
 * - On success, the responding server is remembered as the preferred server.
 *
 * @param {Function} operation - Async function that receives a serverUrl and returns a promise
 * @param {Object} options
 * @param {string} [options.provider] - Provider type (defaults to current setting)
 * @param {Function} [options.onServerTried] - Callback invoked on each attempt;
 *   receives { url, status, tried } where tried is a snapshot of all attempts so far
 * @returns {Promise} Result from the first successful server, or throws the last error
 */
export async function tryWithRotation(operation, options = {}) {
  const provider = options.provider || getSetting("server.provider");
  const onServerTried = options.onServerTried;
  const hasCallback = typeof onServerTried === "function";

  const servers = getServerList(provider);
  const triedServers = [];
  let lastError = null;

  for (const serverUrl of servers) {
    triedServers.push({ url: serverUrl, status: "trying" });
    if (hasCallback) {
      onServerTried({ url: serverUrl, status: "trying", tried: [...triedServers] });
    }

    try {
      const result = await operation(serverUrl);

      triedServers[triedServers.length - 1].status = "success";
      if (hasCallback) {
        onServerTried({ url: serverUrl, status: "success", tried: [...triedServers] });
      }

      // Remember this server as the preferred one for future requests
      if (provider === "classworkscloud") {
        setCachedPreference(serverUrl);
      }

      return result;
    } catch (error) {
      // For HTTP 4xx errors the server is alive — propagate immediately without rotation
      if (!shouldRotateOnError(error)) {
        triedServers[triedServers.length - 1].status = "client-error";
        if (hasCallback) {
          onServerTried({ url: serverUrl, status: "client-error", error, tried: [...triedServers] });
        }
        throw error;
      }

      lastError = error;
      triedServers[triedServers.length - 1].status = "failed";
      triedServers[triedServers.length - 1].error = error.message || String(error);
      if (hasCallback) {
        onServerTried({ url: serverUrl, status: "failed", error, tried: [...triedServers] });
      }

      console.warn(`Server ${serverUrl} failed, trying next:`, error.message);
    }
  }

  // All servers exhausted
  console.error("All servers failed. Tried:", triedServers);
  const error = lastError || new Error("All servers failed");
  error.triedServers = triedServers;
  throw error;
}

/**
 * Get the effective server URL for the current provider.
 * For classworkscloud, returns the cached preferred server (fastest known),
 * falling back to the first server in the list.
 * @returns {string} Server URL
 */
export function getEffectiveServerUrl() {
  const provider = getSetting("server.provider");

  if (provider === "classworkscloud") {
    return serverPreference.preferred || CLASSWORKS_CLOUD_SERVERS[0];
  }

  return getSetting("server.domain") || "";
}

/**
 * Check if rotation is enabled for the current provider.
 * @returns {boolean}
 */
export function isRotationEnabled() {
  const provider = getSetting("server.provider");
  return provider === "classworkscloud";
}
