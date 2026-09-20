/**
 * LifeSync AI - Analytics Module
 * Architecture: React -> window.dataLayer.push() -> Google Tag Manager (GTM-WC9DPPQM) -> Google Analytics 4 (G-ZD2BJPZRWN)
 *
 * Principles:
 * 1. Single GTM dataLayer pipeline (Zero direct GA4 or gtag initialization).
 * 2. Dedicated custom navigation events for genuine route transitions.
 * 3. Dedicated action events fired only upon successful API completion.
 * 4. Strict privacy filter: ZERO PII, ZERO passwords, emails, tokens, health details, financial amounts, or private vault notes.
 */

declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Ensure dataLayer array exists on window object
if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
}

/**
 * Sensitive parameter keys that must NEVER be passed to analytics.
 */
const SENSITIVE_KEYS = new Set([
  'email',
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'secret',
  'apikey',
  'otp',
  'userid',
  'rawuserid',
  'id',
  'name',
  'fullname',
  'phone',
  'phonenumber',
  'address',
  'content',
  'encryptedcontent',
  'note',
  'notes',
  'details',
  'logvalue',
  'amount',
  'balance',
  'totalincome',
  'totalexpense',
  'prompt',
  'company',
  'position',
  'title',
  'description',
  'insighttext',
  'profilephoto',
  'authorization',
  'auth',
  'bearer',
  'salary',
  'medical',
  'diagnosis',
  'prescription',
  'health',
  'connection',
  'database',
  'connectionstring',
  'ssn',
  'card',
  'creditcard',
  'message',
  'reply'
]);

/**
 * Whitelist of explicitly allowed analytics parameter keys.
 */
const ALLOWED_PARAM_KEYS = new Set([
  'module',
  'action',
  'method',
  'item_type',
  'frequency',
  'format',
  'page_path',
  'event'
]);

/**
 * Sanitizes an event parameter dictionary, stripping all PII and sensitive parameters.
 */
export function sanitizeParams(params?: Record<string, any>): Record<string, any> {
  if (!params) return {};
  const clean: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;

    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Check against sensitive blacklist
    if (SENSITIVE_KEYS.has(normalizedKey)) {
      continue;
    }

    // 2. Reject sensitive patterns unless explicitly whitelisted
    if (!ALLOWED_PARAM_KEYS.has(normalizedKey)) {
      if (/password|secret|token|auth|email|salary|medical|health|credit|card|ssn|phone|address|prompt|note|content|message|reply/i.test(normalizedKey)) {
        continue;
      }
    }

    // 3. Inspect string values for emails, JWT tokens, connection strings, or bearer headers
    if (typeof value === 'string') {
      // Filter email addresses
      if (value.includes('@') && value.includes('.')) {
        continue;
      }
      // Filter potential JWT tokens
      if (value.startsWith('ey') && value.length > 30) {
        continue;
      }
      // Filter connection strings
      if (value.includes('Host=') || value.includes('postgres://') || value.includes('postgresql://') || value.includes('Data Source=')) {
        continue;
      }
    }

    clean[key] = value;
  }

  return clean;
}

/**
 * Pushes a sanitized event payload to window.dataLayer.
 */
export const pushToDataLayer = (event: string, params?: Record<string, any>) => {
  if (typeof window === 'undefined') return;

  const safeParams = sanitizeParams(params);
  const payload = {
    event,
    ...safeParams,
  };

  window.dataLayer.push(payload);

  if (import.meta.env.DEV) {
    console.debug('[GTM dataLayer.push]', payload);
  }
};

/**
 * Tracks dedicated navigation events for genuine route transitions.
 * @param eventName Dedicated route view name (e.g., 'dashboard_view', 'planner_view', 'vault_view')
 * @param params Optional safe navigation params (e.g. section path)
 */
export const trackNavigation = (eventName: string, params?: Record<string, any>) => {
  pushToDataLayer(eventName, {
    page_path: window.location.pathname,
    ...params,
  });
};

/**
 * Tracks action events for genuine feature interactions following successful API responses.
 * @param eventName Dedicated action name (e.g., 'planner_event_created', 'job_application_updated')
 * @param params Safe contextual metadata (e.g. { module: 'planner', action: 'create' })
 */
export const trackAction = (eventName: string, params?: Record<string, any>) => {
  pushToDataLayer(eventName, params);
};
