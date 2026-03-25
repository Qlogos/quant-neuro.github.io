/* ============================================================
   QuantNeuro — main.js  v3 (LIGHT THEME)
   Subtle biological canvas for light cream background
   Nav scroll  ·  Mobile menu  ·  Scroll reveal
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     SUBTLE BIOLOGICAL CANVAS — light cream background
     Muted neurons + axons + DNA strand + quantum particles
  ══════════════════════════════════════════════════════════ */
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, time = 0;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', () => { resize(); buildNeurons(); }, { passive: true });
    resize();

    /* ── Neuron network ── */
    let neurons = [], connections = [];

    function buildNeurons() {
      const n = Math.min(22, Math.floor((W * H) / 55000));
      neurons = Array.from({ length: n }, () => ({
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    Math.random() * 4 + 2.5,
        vx:   (Math.random() - 0.5) * 0.10,
        vy:   (Math.random() - 0.5) * 0.10,
        phase: Math.random() * Math.PI * 2,
        freq:  Math.random() * 0.0005 + 0.0002,
        hue:   Math.random() < 0.55 ? 190 : 270,
        axons: Array.from({ length: Math.floor(Math.random() * 3 + 2) }, () => ({
          angle: Math.random() * Math.PI * 2,
          len:   Math.random() * 100 + 50,
          curve: (Math.random() - 0.5) * 1.2,
          lit:   0,
        })),
      }));

      connections = [];
      for (let i = 0; i < neurons.length; i++) {
        for (let j = i + 1; j < neurons.length; j++) {
          const dx = neurons[i].x - neurons[j].x;
          const dy = neurons[i].y - neurons[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < 240) {
            connections.push({ a: i, b: j, activity: 0 });
          }
        }
      }
    }
    buildNeurons();

    /* ── Quantum particles ── */
    const QP_COUNT = 40;
    const qp = Array.from({ length: QP_COUNT }, () => ({
      x:  Math.random() * 2000,
      y:  Math.random() * 2000,
      r:  Math.random() * 1.2 + 0.3,
      dx: (Math.random() - 0.5) * 0.18,
      dy: (Math.random() - 0.5) * 0.18,
      a:  Math.random() * 0.12 + 0.03,
      p:  Math.random() * Math.PI * 2,
    }));

    /* ── DNA strand ── */
    function drawDNA() {
      const cx  = W * 0.88;
      const amp = 40;
      const freq = 0.013;
      const spd  = time * 0.0005;

      for (let strand = 0; strand < 2; strand++) {
        const phase = strand * Math.PI;
        const color = strand === 0 ? 'rgba(26,46,90,0.06)' : 'rgba(13,27,62,0.05)';

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1;
        for (let y = -20; y < H + 20; y += 4) {
          const x = cx + Math.sin(y * freq + spd + phase) * amp;
          y === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Rungs
      for (let y = 16; y < H; y += 28) {
        const x1 = cx + Math.sin(y * freq + spd) * amp;
        const x2 = cx + Math.sin(y * freq + spd + Math.PI) * amp;
        const pulse = 0.02 + 0.015 * Math.sin(y * 0.03 + time * 0.002);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(26,46,90,${pulse})`;
        ctx.lineWidth = 0.6;
        ctx.moveTo(x1, y); ctx.lineTo(x2, y);
        ctx.stroke();
        // base-pair dot
        const mid = (x1 + x2) / 2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(13,27,62,${pulse * 1.4})`;
        ctx.arc(mid, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* ── Neurons ── */
    function drawNeurons() {
      neurons.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -50)  n.x = W + 50;
        if (n.x > W+50) n.x = -50;
        if (n.y < -50)  n.y = H + 50;
        if (n.y > H+50) n.y = -50;

        const firing = 0.5 + 0.5 * Math.sin(time * n.freq + n.phase);
        const alpha  = 0.04 + 0.06 * firing;
        const bloom  = n.r * (1 + firing * 1.5);

        // Subtle soma glow
        const color = n.hue === 190 ? '26,46,90' : '13,27,62';
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, bloom * 3);
        grad.addColorStop(0,   `rgba(${color},${alpha * 1.2})`);
        grad.addColorStop(0.4, `rgba(${color},${alpha * 0.4})`);
        grad.addColorStop(1,   `rgba(${color},0)`);
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(n.x, n.y, bloom * 3, 0, Math.PI * 2);
        ctx.fill();

        // Soma body
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${0.12 + firing * 0.08})`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        // Axons
        n.axons.forEach(ax => {
          ax.lit = Math.max(0, ax.lit - 0.015);
          if (Math.random() < 0.003) ax.lit = 1;

          const tx = n.x + Math.cos(ax.angle) * ax.len;
          const ty = n.y + Math.sin(ax.angle) * ax.len;
          const cx1 = n.x + Math.cos(ax.angle + ax.curve) * ax.len * 0.45;
          const cy1 = n.y + Math.sin(ax.angle + ax.curve) * ax.len * 0.45;

          const axAlpha = 0.025 + 0.04 * ax.lit + 0.015 * firing;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${color},${axAlpha})`;
          ctx.lineWidth = 0.5 + ax.lit * 0.4;
          ctx.moveTo(n.x, n.y);
          ctx.quadraticCurveTo(cx1, cy1, tx, ty);
          ctx.stroke();

          // Terminal bouton
          ctx.beginPath();
          ctx.fillStyle = `rgba(${color},${axAlpha * 1.5})`;
          ctx.arc(tx, ty, 1 + ax.lit * 0.6, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }

    /* ── Synaptic connections ── */
    function drawConnections() {
      connections.forEach(c => {
        const na = neurons[c.a], nb = neurons[c.b];
        const dx = na.x - nb.x, dy = na.y - nb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 260) return;

        const fa = 0.5 + 0.5 * Math.sin(time * na.freq + na.phase);
        const fb = 0.5 + 0.5 * Math.sin(time * nb.freq + nb.phase);
        const activity = (fa + fb) * 0.5 * (1 - dist / 260);
        c.activity = c.activity * 0.92 + activity * 0.08;

        const alpha = 0.015 + c.activity * 0.035;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(26,46,90,${alpha})`;
        ctx.lineWidth = 0.3 + c.activity * 0.5;
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.stroke();
      });
    }

    /* ── Quantum particles ── */
    function drawQuantumParticles() {
      qp.forEach(p => {
        p.x += p.dx; p.y += p.dy; p.p += 0.02;
        const px = p.x % W, py = p.y % H;
        const flicker = 0.4 + 0.6 * Math.sin(p.p);

        ctx.beginPath();
        ctx.fillStyle = `rgba(26,46,90,${p.a * flicker})`;
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (let i = qp.indexOf(p) + 1; i < qp.length; i++) {
          const q  = qp[i];
          const qx = q.x % W, qy = q.y % H;
          const d  = Math.hypot(px - qx, py - qy);
          if (d < 80) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(26,46,90,${0.015 * (1 - d / 80)})`;
            ctx.lineWidth = 0.3;
            ctx.moveTo(px, py); ctx.lineTo(qx, qy);
            ctx.stroke();
          }
        }
      });
    }

    /* ── Subtle grid ── */
    function drawGrid() {
      const s = 90;
      ctx.strokeStyle = 'rgba(26,46,90,0.012)';
      ctx.lineWidth = 0.4;
      for (let x = 0; x <= W; x += s) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += s) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    /* ── Main loop ── */
    function animate() {
      time++;
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      drawDNA();
      drawConnections();
      drawNeurons();
      drawQuantumParticles();
      requestAnimationFrame(animate);
    }
    animate();
  } // end canvas

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
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          const delay = (Array.from(e.target.parentNode.children).indexOf(e.target)) * 80;
          setTimeout(() => {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }, delay);
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
      btn.innerHTML = 'Sent — Thank you! ✓';
      btn.disabled  = true;
      btn.style.opacity = '0.7';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.disabled  = false;
        btn.style.opacity = '1';
        form.reset();
      }, 3500);
    });
  }

})();
