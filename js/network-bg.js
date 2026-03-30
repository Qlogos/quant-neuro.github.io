/**
 * network-bg.js — self-contained animated network background
 *
 * Usage:
 *   import { NetworkBackground } from './network-bg.js';
 *   const bg = new NetworkBackground(document.querySelector('.network-bg'), { nodeCount: 100 });
 *   // later: bg.destroy();
 *
 * Or without modules (classic <script>):
 *   <script src="network-bg.js"></script>
 *   const bg = new NetworkBackground(el);
 */

(function (root, factory) {
  // UMD: works as ES module, CommonJS, or plain <script>
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    const exp = factory();
    root.NetworkBackground = exp.NetworkBackground;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---- default palette & tuning knobs ---- */
  const DEFAULTS = {
    /* node / edge counts & distances */
    nodeCount: 30,
    connectDist: 300,

    /* pulse behaviour */
    fireSpeed: 4,
    fireChance: 0.0001,
    cascadeChance: 0.15,

    /* node interaction */
    repelStrength: 0.028,            // mild repulsion scaling

    /* colours — all in [r, g, b] so consumers can theme easily */
    clearColor: [255, 253, 230],       // trail‑fade fill (matches background)
    clearAlpha: 1.0,                   // no trails; full clear each frame

    nodeColor: [10, 10, 15],           // base node rgb
    nodeGlowColor: [10, 10, 15],       // outer glow rgb
    edgeColor: [10, 10, 15],
    pulseColor: [10, 10, 15],
    pulseHaloColor: [15, 15, 20],

    /* motion */
    speed: 0.4,                        // max per‑axis velocity
    nodeRadiusMin: 4,
    nodeRadiusMax: 8,
  };

  /* ---- helpers ---- */
  function rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  /* ---- Node ---- */
  class Node {
    constructor(W, H, opts) {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * opts.speed;
      this.vy = (Math.random() - 0.5) * opts.speed;
      this.radius = opts.nodeRadiusMin + Math.random() * (opts.nodeRadiusMax - opts.nodeRadiusMin);
      this.energy = 0;
      this._lastFireAt = 0; // timestamp for 1 Hz hard cap
    }
    update(W, H) {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0) { this.x = 0; this.vx *= -1; }
      if (this.x > W) { this.x = W; this.vx *= -1; }
      if (this.y < 0) { this.y = 0; this.vy *= -1; }
      if (this.y > H) { this.y = H; this.vy *= -1; }
      this.energy *= 0.94;
    }
    draw(ctx, opts) {
      const glow = this.energy;
      const r = this.radius + glow * 4;
      if (glow > 0.05) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(opts.nodeGlowColor, glow * 0.15);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      const base = 0.16 + glow * 0.6; // overall more transparent nodes
      ctx.fillStyle = rgba([
        opts.nodeColor[0] + glow * 115,
        opts.nodeColor[1] + glow * 55,
        opts.nodeColor[2]
      ], base);
      ctx.fill();
    }
  }

  /* ---- Pulse ---- */
  class Pulse {
    constructor(from, to) {
      this.from = from;
      this.to = to;
      this.t = 0;
      this.alive = true;
    }
    update(fireSpeed) {
      const dx = this.to.x - this.from.x;
      const dy = this.to.y - this.from.y;
      this.t += fireSpeed / Math.sqrt(dx * dx + dy * dy);
      if (this.t >= 1) {
        this.to.energy = Math.min(1, this.to.energy + 0.6);
        this.alive = false;
      }
    }
    draw(ctx, opts) {
      const x = this.from.x + (this.to.x - this.from.x) * this.t;
      const y = this.from.y + (this.to.y - this.from.y) * this.t;

      // moving pulse trail (explicit, independent of clearAlpha)
      ctx.beginPath();
      ctx.moveTo(this.from.x, this.from.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = rgba(opts.pulseColor, Math.max(0, 0.25 - this.t * 0.2));
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // pulse head + halo
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = rgba(opts.pulseColor, 0.9 - this.t * 0.4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = rgba(opts.pulseHaloColor, 0.2 - this.t * 0.15);
      ctx.fill();
    }
  }

  /* ---- Main controller ---- */
  class NetworkBackground {
    /**
     * @param {HTMLElement} container  — element with class "network-bg"
     * @param {object}      [options] — override any key from DEFAULTS
     */
    constructor(container, options) {
      this.opts = Object.assign({}, DEFAULTS, options);
      this.container = container;

      /* create canvas */
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'network-bg__canvas';
      this.container.prepend(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      this.W = 0;
      this.H = 0;
      this.nodes = [];
      this.pulses = [];
      this._raf = null;

      /* bind methods */
      this._onResize = this._resize.bind(this);
      this._frame = this._loop.bind(this);

      /* kick off */
      this._resize();
      this._initNodes();
      window.addEventListener('resize', this._onResize);
      this._raf = requestAnimationFrame(this._frame);
    }

    /* ---- internals ---- */
    _resize() {
      this.W = this.canvas.width = this.container.offsetWidth;
      this.H = this.canvas.height = this.container.offsetHeight;
    }

    _initNodes() {
      this.nodes = Array.from(
        { length: this.opts.nodeCount },
        () => new Node(this.W, this.H, this.opts)
      );
    }

    _neighbors(node) {
      const out = [];
      const d2max = this.opts.connectDist * this.opts.connectDist;
      for (const other of this.nodes) {
        if (other === node) continue;
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        if (dx * dx + dy * dy < d2max) out.push(other);
      }
      return out;
    }

    _loop() {
      const { ctx, W, H, nodes, opts } = this;

      /* trail fade */
      ctx.fillStyle = rgba(opts.clearColor, opts.clearAlpha);
      ctx.fillRect(0, 0, W, H);

      /* edges */
      const cd2 = opts.connectDist * opts.connectDist;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < cd2) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / opts.connectDist) * 0.5; // even lighter edges
            const boost = (a.energy + b.energy) * 0.14;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = rgba(opts.edgeColor, alpha + boost);
            ctx.lineWidth = 0.2 + boost * 1.2;
            ctx.stroke();
          }
        }
      }

      /* soft size-dependent repulsion */
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 === 0) continue;
          const d = Math.sqrt(d2);
          const influence = (a.radius + b.radius) * 0.5;
          const minDist = influence * 6; // larger nodes push further apart
          if (d < minDist) {
            const force = (1 - d / minDist) * opts.repelStrength;
            const fx = (dx / d) * force;
            const fy = (dy / d) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      /* spawn pulses */
      const now = Date.now();
      for (const node of nodes) {
        const canFire = now - node._lastFireAt >= 1000;
        if (canFire && (Math.random() < opts.fireChance ||
            (node.energy > 0.4 && Math.random() < opts.cascadeChance))) {
          const nb = this._neighbors(node);
          if (nb.length) {
            this.pulses.push(new Pulse(node, nb[Math.floor(Math.random() * nb.length)]));
            node.energy = Math.min(1, node.energy + 0.3);
            node._lastFireAt = now;
          }
        }
      }

      /* update & draw */
      for (const n of nodes) { n.update(W, H); n.draw(ctx, opts); }
      for (const p of this.pulses) { p.update(opts.fireSpeed); p.draw(ctx, opts); }
      this.pulses = this.pulses.filter(p => p.alive);

      this._raf = requestAnimationFrame(this._frame);
    }

    /* ---- public API ---- */

    /** Tear down: stop animation, remove canvas, detach listeners. */
    destroy() {
      cancelAnimationFrame(this._raf);
      window.removeEventListener('resize', this._onResize);
      this.canvas.remove();
      this.nodes = [];
      this.pulses = [];
    }
  }

  return { NetworkBackground };
});
