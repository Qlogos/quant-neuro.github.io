/* ============================================================
   QuantNeuro — main.js  v6 (TRUE 3-D NEURON NETWORK)
   ─────────────────────────────────────────────────────────
   Neurons live in a 3-D world box that slowly rotates on
   all three axes.  Each node is perspective-projected and
   drawn as a lit sphere (specular highlight + depth fog).
   Connections fade with Z-depth; synapse cascade pulses
   travel along the 3-D edges.

   Other layers (aurora, lattice, DNA, quantum particles,
   energy bursts) are preserved from v5.
   Cursor glow REMOVED per request.
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     CANVAS SETUP
  ══════════════════════════════════════════════════════════ */
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, time = 0;

  /* Mouse – used only for quantum-particle attraction now */
  let mouse = { x: -9999, y: -9999, active: false };
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
  window.addEventListener('mouseleave', () => { mouse.active = false; }, { passive: true });

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', () => { resize(); buildNeurons(); buildLattice(); }, { passive: true });
  resize();

  /* ══════════════════════════════════════════════════════════
     3-D NEURON NETWORK
     ──────────────────────────────────────────────────────────
     Each neuron has a world-space position (wx, wy, wz) inside
     a virtual box.  The box is slowly rotated each frame using
     a combined Rx * Ry * Rz rotation matrix.  The rotated
     coords are perspective-projected to screen, then sorted
     back-to-front (painter's algorithm) so near nodes paint
     over far ones.
  ══════════════════════════════════════════════════════════ */

  /* rotation state */
  let rotX = 0, rotY = 0, rotZ = 0;
  const ROT_SPEED_X =  0.00018;
  const ROT_SPEED_Y =  0.00025;
  const ROT_SPEED_Z =  0.00008;

  /* perspective */
  const FOCAL      = 900;
  const WORLD_HALF = 980;

  let neurons3d = [];
  let edges3d   = [];
  let cascades  = [];

  function buildNeurons() {
    const count = Math.min(34, Math.floor((W * H) / 38000));
    neurons3d = Array.from({ length: count }, () => ({
      wx: (Math.random() - 0.5) * WORLD_HALF * 2,
      wy: (Math.random() - 0.5) * WORLD_HALF * 2,
      wz: (Math.random() - 0.5) * WORLD_HALF * 2,
      baseR:  Math.random() * 10 + 14,
      phase:  Math.random() * Math.PI * 2,
      freq:   Math.random() * 0.0004 + 0.0002,
      hue:    Math.random() < 0.55 ? 0 : 1,
      fireIntensity: 0,
      axons: Array.from({ length: Math.floor(Math.random() * 3 + 2) }, () => ({
        dx: (Math.random() - 0.5),
        dy: (Math.random() - 0.5),
        dz: (Math.random() - 0.5),
        len: Math.random() * 100 + 50,
        lit: 0,
      })),
      sx: 0, sy: 0, scale: 1, depth: 0,
      _rx: 0, _ry: 0, _rz: 0,
    }));

    edges3d = [];
    const THRESH = WORLD_HALF * 1.45;
    for (let i = 0; i < neurons3d.length; i++) {
      for (let j = i + 1; j < neurons3d.length; j++) {
        const n = neurons3d[i], m = neurons3d[j];
        const d = Math.hypot(n.wx - m.wx, n.wy - m.wy, n.wz - m.wz);
        if (d < THRESH) edges3d.push({ a: i, b: j, activity: 0, pulsePos: -1 });
      }
    }
  }
  buildNeurons();

  function projectNeurons() {
    const cx = Math.cos(rotX), sx_ = Math.sin(rotX);
    const cy = Math.cos(rotY), sy_ = Math.sin(rotY);
    const cz = Math.cos(rotZ), sz_ = Math.sin(rotZ);

    neurons3d.forEach(n => {
      const x0 =  n.wx * cz - n.wy * sz_;
      const y0 =  n.wx * sz_ + n.wy * cz;
      const z0 =  n.wz;
      const x1 =  x0;
      const y1 =  y0 * cx - z0 * sx_;
      const z1 =  y0 * sx_ + z0 * cx;
      const x2 =  x1 * cy + z1 * sy_;
      const y2 =  y1;
      const z2 = -x1 * sy_ + z1 * cy;

      n.depth = z2;
      const p  = FOCAL / (FOCAL + z2 + WORLD_HALF);
      n.scale  = p;
      n.sx     = W * 0.5 + x2 * p;
      n.sy     = H * 0.5 + y2 * p;
      n._rx = x2; n._ry = y2; n._rz = z2;
    });
  }

  function triggerCascade() {
    if (!neurons3d.length) return;
    const startIdx = Math.floor(Math.random() * neurons3d.length);
    cascades.push({ origin: startIdx, time: 0, maxTime: 140,
                    visited: new Set([startIdx]), frontier: [startIdx] });
  }
  setInterval(triggerCascade, 3800);

  function updateCascades() {
    cascades.forEach(c => {
      c.time++;
      if (c.time % 14 === 0 && c.frontier.length) {
        const next = [];
        c.frontier.forEach(idx => {
          edges3d.forEach(e => {
            let nb = -1;
            if (e.a === idx && !c.visited.has(e.b)) nb = e.b;
            if (e.b === idx && !c.visited.has(e.a)) nb = e.a;
            if (nb >= 0) {
              c.visited.add(nb);
              next.push(nb);
              neurons3d[nb].fireIntensity = 1;
              e.pulsePos = 0;
            }
          });
        });
        c.frontier = next;
      }
    });
    cascades = cascades.filter(c => c.time < c.maxTime);
  }

  function drawNeurons3D() {
    rotX += ROT_SPEED_X;
    rotY += ROT_SPEED_Y;
    rotZ += ROT_SPEED_Z;

    projectNeurons();
    updateCascades();

    /* painter's sort: back to front */
    const order = neurons3d.map((_, i) => i)
      .sort((a, b) => neurons3d[a].depth - neurons3d[b].depth);

    /* edges first */
    edges3d.forEach(e => {
      const na = neurons3d[e.a], nb = neurons3d[e.b];
      if (na.sx < -200 || na.sx > W + 200 || nb.sx < -200 || nb.sx > W + 200) return;

      const fa  = 0.5 + 0.5 * Math.sin(time * na.freq + na.phase);
      const fb  = 0.5 + 0.5 * Math.sin(time * nb.freq + nb.phase);
      const fog = Math.max(0, ((na.depth + nb.depth) * 0.5 + WORLD_HALF) / (WORLD_HALF * 2));
      e.activity = e.activity * 0.93 + ((fa + fb) * 0.5 * fog) * 0.07;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(26,46,90,${(0.018 + e.activity * 0.045) * fog})`;
      ctx.lineWidth   = (0.3 + e.activity * 0.6) * (0.5 + fog * 0.5);
      ctx.moveTo(na.sx, na.sy);
      ctx.lineTo(nb.sx, nb.sy);
      ctx.stroke();

      /* traveling cascade pulse */
      if (e.pulsePos >= 0 && e.pulsePos <= 1) {
        e.pulsePos += 0.035;
        const px = na.sx + (nb.sx - na.sx) * e.pulsePos;
        const py = na.sy + (nb.sy - na.sy) * e.pulsePos;
        const pr = 7 * (0.5 + fog * 0.5);
        const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
        pg.addColorStop(0, `rgba(26,46,90,${0.22 * fog})`);
        pg.addColorStop(1, 'rgba(26,46,90,0)');
        ctx.beginPath(); ctx.fillStyle = pg;
        ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      }
      if (e.pulsePos > 1) e.pulsePos = -1;
    });

    /* nodes back to front */
    order.forEach(idx => {
      const n = neurons3d[idx];
      if (n.sx < -100 || n.sx > W + 100 || n.sy < -100 || n.sy > H + 100) return;

      n.fireIntensity *= 0.96;

      const firing  = 0.5 + 0.5 * Math.sin(time * n.freq + n.phase);
      const fire    = n.fireIntensity;
      const fog     = Math.max(0, (n.depth + WORLD_HALF) / (WORLD_HALF * 2));
      const R       = n.baseR * n.scale * (1 + firing * 0.3 + fire * 1.2);
      const col     = n.hue === 0 ? '26,46,90' : '13,27,62';

      /* outer glow */
      const glowA = (0.035 + 0.045 * firing + 0.12 * fire) * fog;
      const glow  = ctx.createRadialGradient(n.sx, n.sy, 0, n.sx, n.sy, R * 5);
      glow.addColorStop(0,   `rgba(${col},${glowA})`);
      glow.addColorStop(0.4, `rgba(${col},${glowA * 0.35})`);
      glow.addColorStop(1,   `rgba(${col},0)`);
      ctx.beginPath(); ctx.fillStyle = glow;
      ctx.arc(n.sx, n.sy, R * 5, 0, Math.PI * 2); ctx.fill();

      /* cascade expand ring */
      if (fire > 0.1) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${col},${fire * 0.10 * fog})`;
        ctx.lineWidth = 0.8;
        ctx.arc(n.sx, n.sy, R * (3 + (1 - fire) * 12), 0, Math.PI * 2);
        ctx.stroke();
      }

      /* sphere body — off-centre radial gradient mimics a point-light source */
      const bodyAlpha = (0.55 + firing * 0.20 + fire * 0.25) * (0.3 + fog * 0.7);
      const body = ctx.createRadialGradient(
        n.sx - R * 0.30, n.sy - R * 0.30, R * 0.05,
        n.sx,            n.sy,             R
      );
      body.addColorStop(0,    `rgba(255,255,255,${bodyAlpha * 0.55})`);
      body.addColorStop(0.35, `rgba(${col},${bodyAlpha * 0.90})`);
      body.addColorStop(1,    `rgba(${col},${bodyAlpha * 0.50})`);
      ctx.beginPath(); ctx.fillStyle = body;
      ctx.arc(n.sx, n.sy, R, 0, Math.PI * 2); ctx.fill();

      /* specular highlight dot */
      const sX = n.sx - R * 0.28, sY = n.sy - R * 0.28, sR = R * 0.22;
      const spec = ctx.createRadialGradient(sX, sY, 0, sX, sY, sR);
      spec.addColorStop(0, `rgba(255,255,255,${0.40 * fog * (0.6 + firing * 0.4)})`);
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.fillStyle = spec;
      ctx.arc(sX, sY, sR, 0, Math.PI * 2); ctx.fill();

      /* axon terminals */
      n.axons.forEach(ax => {
        ax.lit = Math.max(0, ax.lit - 0.015);
        if (Math.random() < 0.003 || fire > 0.5)
          ax.lit = Math.min(1, ax.lit + (fire > 0.5 ? 0.7 : 1));

        const wLen = ax.len * n.scale;
        const mag  = Math.hypot(ax.dx, ax.dy, ax.dz) || 1;
        const tx   = n.sx + (ax.dx / mag) * wLen;
        const ty   = n.sy + (ax.dy / mag) * wLen;
        const mx   = (n.sx + tx) / 2 + (ax.dy / mag) * wLen * 0.25;
        const my   = (n.sy + ty) / 2 - (ax.dx / mag) * wLen * 0.25;
        const axA  = (0.020 + 0.04 * ax.lit + 0.015 * firing + 0.05 * fire) * fog;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${col},${axA})`;
        ctx.lineWidth   = (0.4 + ax.lit * 0.5 + fire * 0.5) * n.scale;
        ctx.moveTo(n.sx, n.sy);
        ctx.quadraticCurveTo(mx, my, tx, ty);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(${col},${axA * 1.6})`;
        ctx.arc(tx, ty, (1 + ax.lit * 0.8) * n.scale, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     AURORA / NEBULA GRADIENT BLOBS
  ══════════════════════════════════════════════════════════ */
  const auroraBlobs = [
    { x: 0.15, y: 0.20, rx: 0.35, ry: 0.25, color: [26,46,90],  baseA: 0.045, speed: 0.0003,  phase: 0   },
    { x: 0.80, y: 0.70, rx: 0.30, ry: 0.28, color: [13,27,62],  baseA: 0.040, speed: 0.00025, phase: 1.5 },
    { x: 0.50, y: 0.05, rx: 0.40, ry: 0.20, color: [26,46,90],  baseA: 0.030, speed: 0.00035, phase: 3.0 },
    { x: 0.30, y: 0.85, rx: 0.35, ry: 0.22, color: [13,27,62],  baseA: 0.035, speed: 0.0002,  phase: 4.5 },
    { x: 0.65, y: 0.35, rx: 0.25, ry: 0.30, color: [20,38,78],  baseA: 0.025, speed: 0.00028, phase: 2.0 },
  ];

  function drawAurora() {
    auroraBlobs.forEach(b => {
      const drift = time * b.speed + b.phase;
      const cx    = (b.x + Math.sin(drift) * 0.08) * W;
      const cy    = (b.y + Math.cos(drift * 0.7) * 0.06) * H;
      const rx    = b.rx * W, ry = b.ry * H;
      const pulse = b.baseA + Math.sin(drift * 1.3) * 0.015;
      const grad  = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      grad.addColorStop(0,   `rgba(${b.color},${pulse})`);
      grad.addColorStop(0.5, `rgba(${b.color},${pulse * 0.4})`);
      grad.addColorStop(1,   `rgba(${b.color},0)`);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
      ctx.beginPath(); ctx.fillStyle = grad;
      ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  /* ══════════════════════════════════════════════════════════
     DEPTH ORBS
  ══════════════════════════════════════════════════════════ */
  const depthOrbs = [
    { x: 0.20, y: 0.30, r: 180, speed: 0.00015, phase: 0, alpha: 0.025 },
    { x: 0.70, y: 0.60, r: 140, speed: 0.0002,  phase: 2, alpha: 0.020 },
    { x: 0.50, y: 0.80, r: 100, speed: 0.00018, phase: 4, alpha: 0.015 },
    { x: 0.85, y: 0.15, r: 120, speed: 0.00022, phase: 1, alpha: 0.020 },
  ];

  function drawDepthOrbs() {
    depthOrbs.forEach(o => {
      const t     = time * o.speed + o.phase;
      const cx    = (o.x + Math.sin(t) * 0.05) * W;
      const cy    = (o.y + Math.cos(t * 0.8) * 0.04) * H;
      const pulse = o.alpha + Math.sin(t * 2) * 0.008;
      const grad  = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.r);
      grad.addColorStop(0,   `rgba(26,46,90,${pulse})`);
      grad.addColorStop(0.6, `rgba(26,46,90,${pulse * 0.3})`);
      grad.addColorStop(1,   'rgba(26,46,90,0)');
      ctx.beginPath(); ctx.fillStyle = grad;
      ctx.arc(cx, cy, o.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* ══════════════════════════════════════════════════════════
     SUBTLE GRID
  ══════════════════════════════════════════════════════════ */
  function drawGrid() {
    ctx.strokeStyle = 'rgba(26,46,90,0.012)';
    ctx.lineWidth   = 0.4;
    for (let x = 0; x <= W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0);  ctx.lineTo(x, H);  ctx.stroke(); }
    for (let y = 0; y <= H; y += 90) { ctx.beginPath(); ctx.moveTo(0, y);  ctx.lineTo(W, y);  ctx.stroke(); }
  }

  /* ══════════════════════════════════════════════════════════
     DNA STRANDS  (helper accepts position / speed params)
  ══════════════════════════════════════════════════════════ */
  function drawDNA(cx, amp, freq, spd, a1, a2, sp) {
    /* 2π/3 offset — same minor/major groove geometry as the separator divider */
    const PH2 = Math.PI * 2 / 3;

    /* Draw each strand segment-by-segment so opacity tracks depth in the helix.
       z = cos(helix angle): +1 = front (full opacity), -1 = back (faint).       */
    for (let strand = 0; strand < 2; strand++) {
      const ph      = strand * PH2;
      const baseCol = strand === 0 ? '26,46,90' : '13,27,62';
      const baseA   = strand === 0 ? a1 : a2;

      let prevX = cx + Math.sin((-20) * freq + spd + ph) * amp;
      for (let y = -20 + 4; y < H + 20; y += 4) {
        const x     = cx + Math.sin(y * freq + spd + ph) * amp;
        const z     = Math.cos(y * freq + spd + ph);          // helix depth
        const alpha = baseA * (0.22 + 0.78 * (z * 0.5 + 0.5)); // 0.22→1.0× baseA
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${baseCol},${alpha})`;
        ctx.lineWidth   = 1;
        ctx.moveTo(prevX, y - 4);
        ctx.lineTo(x, y);
        ctx.stroke();
        prevX = x;
      }
    }

    /* Rungs: depth-modulated so they brighten when the helix faces the viewer */
    for (let y = sp; y < H; y += sp * 2) {
      const x1 = cx + Math.sin(y * freq + spd) * amp;
      const x2 = cx + Math.sin(y * freq + spd + PH2) * amp;
      const z1 = Math.cos(y * freq + spd);
      const z2 = Math.cos(y * freq + spd + PH2);
      const rA = a1 * 0.55 * (0.30 + 0.70 * ((z1 + z2) * 0.5 * 0.5 + 0.5));
      ctx.beginPath(); ctx.strokeStyle = `rgba(26,46,90,${rA})`; ctx.lineWidth = 0.6;
      ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = `rgba(13,27,62,${rA * 1.3})`;
      ctx.arc((x1 + x2) / 2, y, 0.9, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ══════════════════════════════════════════════════════════
     FLOATING HEXAGONAL QUANTUM LATTICE
  ══════════════════════════════════════════════════════════ */
  let latticeNodes = [];
  function buildLattice() {
    latticeNodes = [];
    const sp = 180;
    const rows = Math.ceil(H / (sp * 0.866)) + 2;
    const cols = Math.ceil(W / sp) + 2;
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * sp + (r % 2 ? sp / 2 : 0);
        const y = r * sp * 0.866;
        latticeNodes.push({ x, y, bx: x, by: y, phase: Math.random() * Math.PI * 2 });
      }
    }
  }
  buildLattice();

  function drawLattice() {
    const scrollY = (window.scrollY || 0) * 0.05;
    latticeNodes.forEach(n => {
      const d = time * 0.0008 + n.phase;
      n.x = n.bx + Math.sin(d) * 8;
      n.y = n.by + Math.cos(d * 0.7) * 6 - scrollY;
    });
    for (let i = 0; i < latticeNodes.length; i++) {
      const a = latticeNodes[i];
      if (a.x < -60 || a.x > W + 60 || a.y < -60 || a.y > H + 60) continue;
      for (let j = i + 1; j < latticeNodes.length; j++) {
        const b = latticeNodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 200 && d > 20) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(26,46,90,0.008)';
          ctx.lineWidth = 0.3;
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.fillStyle = 'rgba(26,46,90,0.015)';
      ctx.arc(a.x, a.y, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ══════════════════════════════════════════════════════════
     QUANTUM PARTICLES  (trails + entanglement)
  ══════════════════════════════════════════════════════════ */
  const QP_COUNT = 55;
  const qp = Array.from({ length: QP_COUNT }, () => ({
    x: Math.random() * 2000, y: Math.random() * 2000,
    r: Math.random() * 1.8 + 0.3,
    dx: (Math.random() - 0.5) * 0.20,
    dy: (Math.random() - 0.5) * 0.20,
    a:  Math.random() * 0.15 + 0.04,
    p:  Math.random() * Math.PI * 2,
    trail: [], entangled: -1, tunnelTimer: 0,
  }));
  for (let i = 0; i < QP_COUNT - 1; i += 2) { qp[i].entangled = i + 1; qp[i+1].entangled = i; }

  function drawQuantumParticles() {
    qp.forEach((p, idx) => {
      if (mouse.active) {
        const px = p.x % W, py = p.y % H;
        const ddx = mouse.x - px, ddy = mouse.y - py;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < 250 && dist > 5) { p.dx += (ddx / dist) * 0.004; p.dy += (ddy / dist) * 0.004; }
      }
      const spd = Math.sqrt(p.dx * p.dx + p.dy * p.dy);
      if (spd > 0.4) { p.dx *= 0.4 / spd; p.dy *= 0.4 / spd; }

      p.trail.push({ x: p.x % W, y: p.y % H });
      if (p.trail.length > 12) p.trail.shift();

      p.x += p.dx; p.y += p.dy; p.p += 0.02;
      const px = ((p.x % W) + W) % W;
      const py = ((p.y % H) + H) % H;
      const fl = 0.4 + 0.6 * Math.sin(p.p);

      if (p.tunnelTimer > 0) {
        p.tunnelTimer--;
        const fg = ctx.createRadialGradient(px, py, 0, px, py, 20);
        fg.addColorStop(0, `rgba(26,46,90,${0.12 * (p.tunnelTimer / 20)})`);
        fg.addColorStop(1, 'rgba(26,46,90,0)');
        ctx.beginPath(); ctx.fillStyle = fg; ctx.arc(px, py, 20, 0, Math.PI * 2); ctx.fill();
      }
      if (Math.random() < 0.0008) p.tunnelTimer = 20;

      if (p.trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let t = 1; t < p.trail.length; t++) {
          if (Math.abs(p.trail[t].x - p.trail[t-1].x) > 100 || Math.abs(p.trail[t].y - p.trail[t-1].y) > 100)
            ctx.moveTo(p.trail[t].x, p.trail[t].y);
          else
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
        }
        ctx.strokeStyle = `rgba(26,46,90,${p.a * fl * 0.35})`;
        ctx.lineWidth = p.r * 0.5; ctx.stroke();
      }

      ctx.beginPath(); ctx.fillStyle = `rgba(26,46,90,${p.a * fl})`; ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.strokeStyle = `rgba(26,46,90,${p.a * fl * 0.2})`; ctx.lineWidth = 0.3; ctx.arc(px, py, p.r * 3, 0, Math.PI * 2); ctx.stroke();

      if (p.entangled >= 0 && p.entangled > idx) {
        const q = qp[p.entangled];
        const qx = ((q.x % W) + W) % W, qy = ((q.y % H) + H) % H;
        const d  = Math.hypot(px - qx, py - qy);
        if (d < 300 && d > 5) {
          const ea = 0.03 * (1 - d / 300) * (0.5 + 0.5 * Math.sin(time * 0.03 + idx));
          const mx = (px + qx) / 2 + Math.sin(time * 0.01 + idx) * 15;
          const my = (py + qy) / 2 + Math.cos(time * 0.01 + idx) * 15;
          ctx.save(); ctx.setLineDash([3, 6]);
          ctx.beginPath(); ctx.strokeStyle = `rgba(26,46,90,${ea})`; ctx.lineWidth = 0.5;
          ctx.moveTo(px, py); ctx.quadraticCurveTo(mx, my, qx, qy); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();
          ctx.beginPath(); ctx.fillStyle = `rgba(26,46,90,${ea * 2})`; ctx.arc(mx, my, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }

      for (let i = idx + 1; i < qp.length; i++) {
        const q = qp[i];
        const qx = ((q.x % W) + W) % W, qy = ((q.y % H) + H) % H;
        const d  = Math.hypot(px - qx, py - qy);
        if (d < 90) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(26,46,90,${0.02 * (1 - d / 90)})`;
          ctx.lineWidth = 0.3;
          ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     ENERGY BURSTS
  ══════════════════════════════════════════════════════════ */
  let energyBursts = [];

  function drawEnergyBursts() {
    if (energyBursts.length < 3 && Math.random() < 0.004) {
      const angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.25;
      energyBursts.push({ x: Math.random() * W, y: Math.random() * H * 0.5,
                          vx: Math.cos(angle) * 2.5, vy: Math.sin(angle) * 2.5,
                          life: 1, trail: [] });
    }
    energyBursts.forEach(b => {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 25) b.trail.shift();
      b.x += b.vx; b.y += b.vy; b.life -= 0.008;
      for (let t = 1; t < b.trail.length; t++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(26,46,90,${(t / b.trail.length) * 0.04 * b.life})`;
        ctx.lineWidth   = (t / b.trail.length) * 1.5;
        ctx.moveTo(b.trail[t-1].x, b.trail[t-1].y);
        ctx.lineTo(b.trail[t].x,   b.trail[t].y);
        ctx.stroke();
      }
      const hg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 10);
      hg.addColorStop(0, `rgba(26,46,90,${0.08 * b.life})`); hg.addColorStop(1, 'rgba(26,46,90,0)');
      ctx.beginPath(); ctx.fillStyle = hg; ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill();
    });
    energyBursts = energyBursts.filter(b => b.life > 0);
  }

  /* ══════════════════════════════════════════════════════════
     MAIN LOOP
  ══════════════════════════════════════════════════════════ */
  function animate() {
    time++;
    ctx.clearRect(0, 0, W, H);

    drawAurora();
    drawDepthOrbs();
    drawGrid();
    drawLattice();
    drawDNA(W * 0.88, 40, 0.013, -time * 0.0005,  0.200, 0.050, 14);
    drawDNA(W * 0.10, 30, 0.011, -time * 0.00035, 0.200, 0.028, 17);
    drawNeurons3D();
    drawQuantumParticles();
    drawEnergyBursts();
    /* cursor glow intentionally removed */

    requestAnimationFrame(animate);
  }
  animate();

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
      btn.innerHTML = 'Sent — Thank you! ✓';
      btn.disabled  = true;
      btn.style.opacity = '0.7';
      setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; btn.style.opacity = '1'; form.reset(); }, 3500);
    });
  }

})();
