// Google Analytics 4, loaded only after the visitor agrees (EU consent rules for analytics cookies).
// The measurement id comes from the production build (VITE_GA_ID); without it nothing is sent,
// so local runs and tests never report. Events carry action names only, never the coach's data.

export const CONSENT_KEY = 'plangryAnalyticsConsent'; // 'granted' | 'denied'

export const gaId = () => import.meta.env.VITE_GA_ID || '';

export function getConsent() {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

// The banner is shown once: when statistics are configured and the visitor has not chosen yet.
export const needsConsent = () => Boolean(gaId()) && getConsent() === null;

let loaded = false;

function load(id) {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtagShim() { window.dataLayer.push(arguments); }; // gtag.js reads Arguments objects
  window.gtag('consent', 'default', {
    analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

// Starts statistics when the visitor has agreed before (called once at start-up).
export function initAnalytics() {
  if (gaId() && getConsent() === 'granted') load(gaId());
}

const removeGaCookies = () => {
  document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => n === '_ga' || n.startsWith('_ga_')).forEach(name => {
    const host = window.location.hostname;
    [host, `.${host}`, ''].forEach(domain => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
    });
  });
};

export function setConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* private mode: asked again next time */ }
  if (value === 'granted') {
    if (gaId()) load(gaId());
    if (loaded) window.gtag('consent', 'update', { analytics_storage: 'granted' });
  } else {
    if (loaded) window.gtag('consent', 'update', { analytics_storage: 'denied' });
    removeGaCookies();
  }
}

// Records an action, e.g. track('print_session', { kind: 'cert' }). Does nothing without consent.
export function track(name, params = {}) {
  if (!loaded || getConsent() !== 'granted') return;
  window.gtag('event', name, params);
}

// Only for tests: forget that the script was loaded.
export function resetAnalyticsForTests() { loaded = false; }
