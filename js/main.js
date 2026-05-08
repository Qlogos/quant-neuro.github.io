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

  /* ══════════════════════════════════════════════════════════
     DNA DIVIDER — responsive wave period
  ══════════════════════════════════════════════════════════ */
  const dnaDivider = document.querySelector('.dna-divider');
  const dnaSvg     = dnaDivider && dnaDivider.querySelector('svg');
  if (dnaDivider && dnaSvg) {
    const PERIOD = 150;   // wave period in screen pixels — constant on all screens
    const MID    = 30;    // vertical centre of the 60-unit viewBox
    const AMP    = 20.9;  // amplitude (units)
    const PHASE2 = (2 * Math.PI) / 3;   // strand-2 phase offset
    const RUNG_INTERVAL = PERIOD / 10;  // one rung every 15 px

    function buildDNA() {
      const W = dnaDivider.offsetWidth;
      const steps = W * 2;   // 2 sample points per pixel → smooth curve
      let d1 = '', d2 = '', rungs = '';

      for (let i = 0; i <= steps; i++) {
        const x  = (W / steps) * i;
        const y1 = MID - AMP * Math.sin(2 * Math.PI * x / PERIOD);
        const y2 = MID - AMP * Math.sin(2 * Math.PI * x / PERIOD + PHASE2);
        const cmd = i === 0 ? 'M' : 'L';
        d1 += `${cmd}${x.toFixed(1)},${y1.toFixed(1)} `;
        d2 += `${cmd}${x.toFixed(1)},${y2.toFixed(1)} `;
      }

      for (let x = 0; x <= W; x += RUNG_INTERVAL) {
        const y1 = MID - AMP * Math.sin(2 * Math.PI * x / PERIOD);
        const y2 = MID - AMP * Math.sin(2 * Math.PI * x / PERIOD + PHASE2);
        rungs += `<line class="rung" x1="${x.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      }

      dnaSvg.setAttribute('viewBox', `0 0 ${W} 60`);
      dnaSvg.setAttribute('preserveAspectRatio', 'none');
      dnaSvg.innerHTML = `<path class="strand-1" d="${d1}"/><path class="strand-2" d="${d2}"/>${rungs}`;
    }

    buildDNA();
    window.addEventListener('resize', buildDNA, { passive: true });
  }

})();
