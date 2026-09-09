/* Interactive background — friendly floaters kids can push around and pop.
   Canvas layer behind the app; listens on window so it never blocks the UI. */
window.BgFx = (function () {

  const EMOJI = ["⭐", "🫧", "🌸", "🍃", "✨", "🐝", "🌼", "🍄", "🐞", "☁️"];
  const SPARK = ["✨", "⭐", "💫", "🌟"];

  let canvas, ctx, W = 0, H = 0, dpr = 1, raf = 0, started = false;
  let floaters = [], bursts = [];
  const pointer = { x: -9999, y: -9999, has: false };

  function reduced() {
    try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeFloater(atTop) {
    const r = rand(13, 30);
    return {
      x: rand(0, W),
      y: atTop ? -r : rand(0, H),
      vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25),
      r, hue: rand(0, 360),
      emoji: Math.random() < 0.6 ? EMOJI[(Math.random() * EMOJI.length) | 0] : null,
      phase: rand(0, Math.PI * 2), wob: rand(0.3, 0.9), pop: 0, spin: rand(-0.02, 0.02), rot: 0,
    };
  }

  function populate() {
    const n = Math.max(6, Math.min(13, Math.round(W * H / 120000)));
    floaters = [];
    for (let i = 0; i < n; i++) floaters.push(makeFloater(false));
  }

  function spawnBurst(x, y) {
    const parts = [];
    const n = 10 + (Math.random() * 6 | 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      const sp = rand(2, 6);
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, r: rand(2, 5), hue: rand(0, 360) });
    }
    bursts.push({ parts, life: 1, emoji: SPARK[(Math.random() * SPARK.length) | 0], x, y, ring: 0 });
    if (bursts.length > 8) bursts.shift();
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    for (const f of floaters) {
      f.phase += 0.01 * f.wob;
      f.vx += Math.cos(f.phase) * 0.006;
      f.vy += Math.sin(f.phase * 1.3) * 0.006;

      if (pointer.has) {
        const dx = f.x - pointer.x, dy = f.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        const R = 130;
        if (d2 < R * R) {
          const d = Math.max(10, Math.sqrt(d2));
          const force = (1 - d / R) * 0.85;
          f.vx += (dx / d) * force;
          f.vy += (dy / d) * force;
        }
      }

      f.vx *= 0.955; f.vy *= 0.955;
      const sp = Math.hypot(f.vx, f.vy);
      if (sp > 2.4) { f.vx *= 2.4 / sp; f.vy *= 2.4 / sp; }
      f.x += f.vx; f.y += f.vy;
      f.rot += f.spin;

      const m = f.r + 24;
      if (f.x < -m) f.x = W + m; else if (f.x > W + m) f.x = -m;
      if (f.y < -m) f.y = H + m; else if (f.y > H + m) f.y = -m;

      if (f.pop > 0) f.pop = Math.max(0, f.pop - 0.045);
      drawFloater(f);
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= 0.022; b.ring += 6;
      for (const p of b.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.vx *= 0.98; }
      drawBurst(b);
      if (b.life <= 0) bursts.splice(i, 1);
    }

    raf = requestAnimationFrame(step);
  }

  function drawFloater(f) {
    const scale = 1 + f.pop * 0.7;
    const r = f.r * scale;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.5 - f.pop * 0.35);
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 2);
    g.addColorStop(0, `hsla(${f.hue},85%,72%,.45)`);
    g.addColorStop(1, `hsla(${f.hue},85%,72%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(f.x, f.y, r * 2, 0, 7); ctx.fill();

    if (f.emoji) {
      ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.font = `${r * 1.7}px "Segoe UI Emoji","Noto Color Emoji",serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(f.emoji, 0, 0);
    } else {
      ctx.fillStyle = `hsla(${f.hue},88%,74%,.8)`;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath(); ctx.arc(f.x - r * 0.32, f.y - r * 0.32, r * 0.26, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function drawBurst(b) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, b.life);
    for (const p of b.parts) {
      ctx.fillStyle = `hsl(${p.hue},90%,68%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = Math.max(0, b.life * 0.5);
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.ring, 0, 7); ctx.stroke();
    ctx.restore();
  }

  const SKIP = "button,a,input,select,textarea,label,.tile,.choice,.pet-btn,.pet-choice," +
    ".pet-shop-item,.keypad,.bead,.bubble,.bubble-field,.modal-card,.pet-banner,.lang-toggle," +
    ".pet-back,.tick,.prompt,.abacus,.abacus-scroll,.readout,.numline,.game-controls,.feedback," +
    ".pet-room,.mascot,.bar,.profile-card,.round-counter";

  function onDown(e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true;
    if (e.target && e.target.closest && e.target.closest(SKIP)) return;

    let hit = null, hd = 1e9;
    for (const f of floaters) {
      const d = Math.hypot(f.x - e.clientX, f.y - e.clientY);
      if (d < f.r + 30 && d < hd) { hd = d; hit = f; }
    }
    if (hit) {
      hit.pop = 1;
      const a = Math.atan2(hit.y - e.clientY, hit.x - e.clientX);
      hit.vx += Math.cos(a) * 5; hit.vy += Math.sin(a) * 5 - 2;
      hit.spin += rand(-0.15, 0.15);
      spawnBurst(hit.x, hit.y);
      if (window.Sound && Sound.isEnabled()) Sound.tick();
    } else {
      spawnBurst(e.clientX, e.clientY);
    }
  }
  function onMove(e) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true; }
  function onLeave() { pointer.has = false; }

  return {
    init() {
      if (started || reduced()) return;
      started = true;
      canvas = document.createElement("canvas");
      canvas.className = "bg-canvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.insertBefore(canvas, document.body.firstChild);
      ctx = canvas.getContext("2d");
      resize(); populate();
      window.addEventListener("resize", () => { resize(); populate(); });
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerout", (e) => { if (!e.relatedTarget) onLeave(); }, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
        else if (!raf) step();
      });
      step();
    },
  };
})();
