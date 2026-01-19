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
 * @returns {Promise} Result from the first successful server, or throws the last error
 */
export async function tryWithRotation(operation, options = {}) {
  const provider = options.provider || getSetting("server.provider");
  const onServerTried = options.onServerTried || (() => {});
  
  const servers = getServerList(provider);
  const triedServers = [];
  let lastError = null;

  for (const serverUrl of servers) {
    try {
      triedServers.push({ url: serverUrl, status: "trying" });
      onServerTried({ url: serverUrl, status: "trying", tried: [...triedServers] });
      
      const result = await operation(serverUrl);
      
      triedServers[triedServers.length - 1].status = "success";
      onServerTried({ url: serverUrl, status: "success", tried: [...triedServers] });
      
      return result;
    } catch (error) {
      lastError = error;
      triedServers[triedServers.length - 1].status = "failed";
      triedServers[triedServers.length - 1].error = error.message || String(error);
      onServerTried({ url: serverUrl, status: "failed", error, tried: [...triedServers] });
      
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
 * For classworkscloud, returns the first server in the list
 * For other providers, returns the configured domain
 * @returns {string} Server URL
 */
export function getEffectiveServerUrl() {
  const provider = getSetting("server.provider");
  
  if (provider === "classworkscloud") {
    return CLASSWORKS_CLOUD_SERVERS[0];
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
