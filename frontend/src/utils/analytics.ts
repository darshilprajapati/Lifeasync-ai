import ReactGA from 'react-ga4';

const TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID || '';

/**
 * Initializes Google Analytics 4 with the tracking ID.
 */
export const initGA = () => {
  if (TRACKING_ID) {
    ReactGA.initialize(TRACKING_ID);
    console.log('[Analytics] GA4 initialized with ID:', TRACKING_ID);
  } else {
    console.warn('[Analytics] GA4 Tracking ID is missing. Event tracking disabled.');
  }
};

/**
 * Tracks a page view event.
 * @param path URL path (e.g. '/dashboard')
 */
export const trackPageView = (path: string) => {
  if (TRACKING_ID) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
};

/**
 * Tracks a custom user interaction event.
 * @param category Category grouping (e.g., 'Health', 'Finance', 'Planner', 'AI')
 * @param action Interactive action (e.g., 'Log Hydration', 'Create Task', 'Generate Report')
 * @param label Optional identifier label (e.g., 'Water log - 500ml')
 * @param value Optional numeric value (e.g., 500)
 */
export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  if (TRACKING_ID) {
    ReactGA.event({
      category,
      action,
      label,
      value
    });
    console.log(`[Analytics] Tracked event - Category: ${category}, Action: ${action}, Label: ${label || ''}`);
  }
};
