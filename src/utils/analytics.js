// Google Analytics Utility
export const initGA = (trackingId) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('js', new Date());
    window.gtag('config', trackingId);
  }
};

export const trackEvent = (action, category, label, value) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export const trackPageView = (page) => {
  if (typeof window !== 'undefined' && window.gtag) {
    const trackingId = process.env.REACT_APP_GA_TRACKING_ID || 'G-3ZLDQ77HQY';
    window.gtag('config', trackingId, {
      page_path: page,
    });
  }
};

// Health Assessment Events
export const trackAssessmentStart = () => {
  trackEvent('start_assessment', 'Health Assessment', 'User started health assessment');
};

export const trackAssessmentComplete = (results) => {
  trackEvent('complete_assessment', 'Health Assessment', 'User completed health assessment', results?.bmi?.value);
};

export const trackStepProgress = (step) => {
  trackEvent('assessment_step', 'Health Assessment', `Step ${step} completed`);
};

export const trackUserRegistration = () => {
  trackEvent('sign_up', 'User', 'New user registration');
};

export const trackUserLogin = () => {
  trackEvent('login', 'User', 'User login');
};

export const trackFeatureView = (feature) => {
  trackEvent('view_feature', 'Engagement', feature);
};
