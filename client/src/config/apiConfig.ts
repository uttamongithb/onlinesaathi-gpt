/**
 * API Configuration for OnlineSaathi GPT
 * 
 * यो file ले backend API URL configure गर्छ।
 * Production मा अलग backend use गर्दा VITE_API_BASE_URL set गर्नुहोस्।
 */

import { setApiBaseUrl } from 'librechat-data-provider';

// Get API base URL from environment variable
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

// Initialize API base URL if set
if (apiBaseUrl) {
  console.log('[API Config] Using custom API base URL:', apiBaseUrl);
  setApiBaseUrl(apiBaseUrl);
  
  // Also set on globalThis for any modules that check it directly
  if (typeof globalThis !== 'undefined') {
    (globalThis as typeof globalThis & { __VITE_API_BASE_URL__?: string }).__VITE_API_BASE_URL__ = apiBaseUrl;
  }
}

export { apiBaseUrl };
