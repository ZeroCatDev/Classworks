/**
 * Store index - exports all application stores
 * This barrel file simplifies imports in components
 */

import dataStore from './dataStore';
import uiStore from './uiStateStore';
import configStore from './configStore';

export {
  dataStore,
  uiStore,
  configStore
};

// Default export for convenience
export default {
  dataStore,
  uiStore,
  configStore
};