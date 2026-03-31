/* ============================================================
   QuantNeuro — main.js
   Nav scroll · Mobile menu · Scroll reveal · Contact form
   Background is handled by network-bg.js / NetworkBackground.
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     NAV SCROLL
  ══════════════════════════════════════════════════════════ */
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════════════
     MOBILE MENU
  ══════════════════════════════════════════════════════════ */
  const toggle = document.querySelector('.nav__toggle');
  const links  = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
    document.addEventListener('click', e => {
      if (!nav.contains(e.target)) links.classList.remove('open');
    });
  }

  /* ══════════════════════════════════════════════════════════
     SCROLL REVEAL
  ══════════════════════════════════════════════════════════ */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const delay = Array.from(e.target.parentNode.children).indexOf(e.target) * 80;
          setTimeout(() => { e.target.classList.add('visible'); io.unobserve(e.target); }, delay);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach(el => io.observe(el));
  }

  /* ══════════════════════════════════════════════════════════
     CONTACT FORM
  ══════════════════════════════════════════════════════════ */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn  = form.querySelector('button[type="submit"]');
      const orig = btn.innerHTML;
      btn.innerHTML = 'Sending...';
      btn.disabled  = true;

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(res => {
        if (res.ok) {
          btn.innerHTML = 'Sent — Thank you! ✓';
          btn.style.opacity = '0.7';
          setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; btn.style.opacity = '1'; form.reset(); }, 3500);
        } else {
          btn.innerHTML = 'Error — try again';
          btn.disabled = false;
        }
      }).catch(() => {
        btn.innerHTML = 'Error — try again';
        btn.disabled = false;
      });
    });
  }

})();
