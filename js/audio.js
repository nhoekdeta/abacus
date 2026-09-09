/* Simple WebAudio sound effects — no asset files needed. */
window.Sound = (function () {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, when, gain) {
    const c = ac();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (when || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    setEnabled(v) { enabled = v; },
    isEnabled() { return enabled; },
    unlock() { ac(); },
    click() { tone(180 + Math.random() * 40, 0.06, "triangle", 0, 0.12); },
    bead() { tone(320 + Math.random() * 120, 0.05, "square", 0, 0.06); },
    good() { tone(660, 0.12, "sine", 0); tone(880, 0.14, "sine", 0.1); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, "sine", i * 0.09, 0.16));
    },
    wrong() { tone(200, 0.16, "sawtooth", 0, 0.12); tone(160, 0.18, "sawtooth", 0.12, 0.1); },
    star() { tone(1200, 0.08, "triangle", 0, 0.14); tone(1600, 0.1, "triangle", 0.07, 0.12); },
    tick() { tone(900, 0.03, "square", 0, 0.05); },
    nom() { tone(160, 0.07, "sawtooth", 0, 0.12); tone(140, 0.07, "sawtooth", 0.09, 0.12); tone(180, 0.06, "sawtooth", 0.18, 0.1); },
    purr() { tone(90, 0.28, "sawtooth", 0, 0.08); tone(96, 0.24, "sawtooth", 0.12, 0.06); },
    heart() { tone(520, 0.1, "sine", 0, 0.12); tone(700, 0.12, "sine", 0.08, 0.1); tone(900, 0.14, "sine", 0.16, 0.09); },
  };
})();
