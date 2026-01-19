/**
 * Server rotation utility for Classworks Cloud provider
 * Provides fallback mechanism across multiple server endpoints
 */

import { getSetting } from "./settings";

// Server list for classworkscloud provider (in priority order)
const CLASSWORKS_CLOUD_SERVERS = [
  "https://kv-service.houlang.cloud",
  "https://kv-service.wuyuan.dev",
];

// Track the current primary server (the one that's currently working)
let primaryServerUrl = null;

/**
 * Get the list of servers to try for the given provider
 * @param {string} provider - The provider type
 * @returns {string[]} Array of server URLs to try
 */
export function getServerList(provider) {
  if (provider === "classworkscloud") {
    return [...CLASSWORKS_CLOUD_SERVERS];
  }
  
  // For other providers, use the configured domain
  const domain = getSetting("server.domain");
  return domain ? [domain] : [];
}

/**
 * Try an operation with server rotation fallback
 * @param {Function} operation - Async function that takes a serverUrl and returns a promise
 * @param {Object} options - Options
 * @param {string} options.provider - Provider type (optional, defaults to current setting)
 * @param {Function} options.onServerTried - Callback called when a server is tried (optional)
 *                                           Receives: { url, status, tried } where tried is a snapshot of attempts
 * @returns {Promise} Result from the first successful server, or throws the last error
 */
export async function tryWithRotation(operation, options = {}) {
  const provider = options.provider || getSetting("server.provider");
  const onServerTried = options.onServerTried;
  const hasCallback = typeof onServerTried === 'function';
  
  const servers = getServerList(provider);
  const triedServers = [];
  let lastError = null;

  for (const serverUrl of servers) {
    try {
      triedServers.push({ url: serverUrl, status: "trying" });
      if (hasCallback) {
        // Provide a snapshot to prevent callback from mutating internal state
        onServerTried({ url: serverUrl, status: "trying", tried: [...triedServers] });
      }
      
      const result = await operation(serverUrl);
      
      triedServers[triedServers.length - 1].status = "success";
      if (hasCallback) {
        onServerTried({ url: serverUrl, status: "success", tried: [...triedServers] });
      }
      
      // Update primary server on success (for classworkscloud provider)
      if (provider === "classworkscloud") {
        primaryServerUrl = serverUrl;
      }
      
      return result;
    } catch (error) {
      lastError = error;
      triedServers[triedServers.length - 1].status = "failed";
      triedServers[triedServers.length - 1].error = error.message || String(error);
      if (hasCallback) {
        onServerTried({ url: serverUrl, status: "failed", error, tried: [...triedServers] });
      }
      
      // Continue to next server
      console.warn(`Server ${serverUrl} failed:`, error.message);
    }
  }

  // All servers failed
  console.error("All servers failed. Tried:", triedServers);
  const error = lastError || new Error("All servers failed");
  error.triedServers = triedServers;
  throw error;
}

/**
 * Get the effective server URL for the current provider
 * For classworkscloud, returns the primary server (last successful in current session) or first server in the list
 * Note: Primary server tracking resets on page reload
 * For other providers, returns the configured domain
 * @returns {string} Server URL
 */
export function getEffectiveServerUrl() {
  const provider = getSetting("server.provider");
  
  if (provider === "classworkscloud") {
    // Return primary server if available, otherwise first in list
    return primaryServerUrl || CLASSWORKS_CLOUD_SERVERS[0];
  }
  
  return getSetting("server.domain") || "";
}

/**
 * Check if rotation is enabled for the current provider
 * @returns {boolean}
 */
export function isRotationEnabled() {
  const provider = getSetting("server.provider");
  return provider === "classworkscloud";
}

/**
 * Try operation with primary server first, fallback to rotation on any error
 * Uses the last successful server first for efficiency
 * @param {Function} operation - Async function that takes a serverUrl and returns a promise
 * @param {Object} options - Options
 * @param {string} options.provider - Provider type (optional, defaults to current setting)
 * @returns {Promise} Result from the operation
 */
export async function tryWithPrimaryServer(operation, options = {}) {
  const provider = options.provider || getSetting("server.provider");
  
  // For non-classworkscloud providers, just use the configured domain
  if (provider !== "classworkscloud") {
    const serverUrl = getSetting("server.domain");
    return await operation(serverUrl);
  }
  
  // For classworkscloud, try primary server first
  const primaryUrl = getEffectiveServerUrl();
  
  try {
    return await operation(primaryUrl);
  } catch (error) {
    // On any error, try rotation with all servers
    console.warn(`Primary server ${primaryUrl} failed, trying rotation...`);
    // Use full rotation, which will update the primary server if a different one succeeds
    return await tryWithRotation(operation, options);
  }
}
