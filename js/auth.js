// ─── Site-wide password protection ──────────────────────────────────────────
// Set to false before pushing to production to open the site publicly.
const PROTECTION_ENABLED = true;

(function () {
  if (!PROTECTION_ENABLED) return;

  if (sessionStorage.getItem('VERIFIED') !== 'true') {
    // Save the page the user was trying to reach so we can send them there after login.
    sessionStorage.setItem('AUTH_REDIRECT', window.location.href);
    window.location.replace('index.html');
  }
})();
