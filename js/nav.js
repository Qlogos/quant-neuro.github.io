/* ============================================================
   nav.js — single-source navigation.

   Each HTML page contains:
     <div id="nav-slot"></div>
     <script src="/js/nav.js"></script>      (load BEFORE main.js)

   This script replaces the slot with the canonical <nav> markup
   and marks the link matching the current URL with .active.

   To add or rename a link: edit the LINKS array below. That is
   the only change needed; every page picks it up automatically.
   ============================================================ */
(function () {
  'use strict';

  const slot = document.getElementById('nav-slot');
  if (!slot) return;

  const LINKS = [
    { href: '/',              label: 'Home' },
    { href: '/research/',     label: 'Research' },
    { href: '/publications/', label: 'Publications' },
    { href: '/news/',         label: 'News' },
    { href: '/team/',         label: 'Team' },
    { href: '/contact/',      label: 'Contact' },
  ];

  const path = location.pathname;
  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path === href || path.startsWith(href);
  }

  const linksHtml = LINKS.map(function (l) {
    const active = isActive(l.href) ? ' class="active"' : '';
    return '<li><a href="' + l.href + '"' + active + '>' + l.label + '</a></li>';
  }).join('');

  slot.outerHTML =
    '<nav class="nav" role="navigation" aria-label="Main">' +
      '<a href="/" class="nav__logo">' +
        '<img src="/images/design_assets/logo_QUANTNEURO.png" alt="QuantNeuro">' +
      '</a>' +
      '<button class="nav__toggle" aria-label="Toggle menu" aria-expanded="false">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
      '<ul class="nav__links">' + linksHtml + '</ul>' +
    '</nav>';
})();
