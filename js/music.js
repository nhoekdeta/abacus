/* Kid-friendly background music — procedural WebAudio, no asset files.
   Each screen gets its own looping melody + soft bassline.
   Music.play("home" | "menu" | "game")  ·  Music.stop()  ·  Music.setEnabled(v) */
window.Music = (function () {
  let ctx = null;
  let enabled = true;
  let cur = null;        // active track state
  let desired = null;    // last requested track name (played once unlocked / re-enabled)

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12); // MIDI note -> Hz, 0 = rest

  /* [midi, beats] pairs. melody + bass each loop the same number of beats. */
  const TRACKS = {
    // gentle, welcoming waltz-ish tune
    home: {
      tempo: 96, melWave: "triangle", bassWave: "sine", vol: 0.05,
      melody: [
        [76, 1], [74, 1], [72, 2],  [74, 1], [76, 1], [79, 2],
        [77, 1], [76, 1], [74, 2],  [72, 1], [74, 1], [72, 2],
        [72, 1], [74, 1], [76, 1], [77, 1],  [79, 2], [76, 2],
        [74, 1], [72, 1], [74, 2],  [72, 4],
      ],
      bass: [
        [48, 2], [55, 2],  [45, 2], [52, 2],
        [50, 2], [57, 2],  [43, 2], [48, 2],
        [48, 2], [52, 2],  [45, 2], [50, 2],
        [43, 2], [47, 2],  [48, 4],
      ],
    },
    // bouncy, playful menu loop
    menu: {
      tempo: 124, melWave: "triangle", bassWave: "sine", vol: 0.045,
      melody: [
        [79, 0.5], [81, 0.5], [83, 1], [79, 1], [76, 1],
        [77, 0.5], [79, 0.5], [81, 1], [77, 1], [74, 1],
        [76, 0.5], [77, 0.5], [79, 1], [81, 0.5], [83, 0.5], [84, 1],
        [83, 1], [81, 1], [79, 2],
      ],
      bass: [
        [52, 1], [52, 1], [47, 1], [47, 1],
        [50, 1], [50, 1], [45, 1], [45, 1],
        [48, 1], [48, 1], [52, 1], [52, 1],
        [47, 1], [43, 1], [48, 2],
      ],
    },
    // upbeat, driving tune for gameplay
    game: {
      tempo: 138, melWave: "square", bassWave: "triangle", vol: 0.035,
      melody: [
        [74, 0.5], [76, 0.5], [78, 0.5], [81, 0.5], [78, 0.5], [74, 0.5], [76, 1],
        [73, 0.5], [74, 0.5], [76, 0.5], [78, 0.5], [76, 0.5], [73, 0.5], [74, 1],
        [81, 0.5], [81, 0.5], [78, 0.5], [76, 0.5], [74, 0.5], [76, 0.5], [78, 1],
        [74, 0.5], [78, 0.5], [81, 0.5], [85, 0.5], [83, 1], [81, 1],
      ],
      bass: [
        [50, 0.5], [50, 0.5], [50, 0.5], [50, 0.5], [45, 0.5], [45, 0.5], [45, 0.5], [45, 0.5],
        [43, 0.5], [43, 0.5], [43, 0.5], [43, 0.5], [45, 0.5], [45, 0.5], [45, 0.5], [45, 0.5],
        [50, 0.5], [50, 0.5], [50, 0.5], [50, 0.5], [45, 0.5], [45, 0.5], [45, 0.5], [45, 0.5],
        [43, 0.5], [43, 0.5], [47, 0.5], [47, 0.5], [50, 0.5], [50, 0.5], [50, 1],
      ],
    },
  };

  function note(master, freq, when, dur, type, gain) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  function startTrack(name) {
    const c = ac();
    if (!c) return;
    const spec = TRACKS[name];
    if (!spec) return;

    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, c.currentTime);
    master.gain.exponentialRampToValueAtTime(spec.vol, c.currentTime + 0.9);
    master.connect(c.destination);

    const spb = 60 / spec.tempo;
    const st = {
      name, spec, master,
      melI: 0, melT: c.currentTime + 0.15,
      bassI: 0, bassT: c.currentTime + 0.15,
      timer: null,
    };

    function pump() {
      if (!ctx) return;
      const horizon = ctx.currentTime + 0.35;
      while (st.melT < horizon) {
        const [m, b] = spec.melody[st.melI];
        const d = b * spb;
        if (m > 0) note(master, mtof(m), st.melT, d * 0.92, spec.melWave, 0.9);
        st.melT += d;
        st.melI = (st.melI + 1) % spec.melody.length;
      }
      while (st.bassT < horizon) {
        const [m, b] = spec.bass[st.bassI];
        const d = b * spb;
        if (m > 0) note(master, mtof(m), st.bassT, d * 0.95, spec.bassWave, 0.5);
        st.bassT += d;
        st.bassI = (st.bassI + 1) % spec.bass.length;
      }
    }

    pump();
    st.timer = setInterval(pump, 40);
    cur = st;
  }

  function stopTrack(st, fade) {
    if (!st) return;
    clearInterval(st.timer);
    try {
      const t0 = ctx.currentTime;
      st.master.gain.cancelScheduledValues(t0);
      st.master.gain.setValueAtTime(Math.max(0.0001, st.master.gain.value), t0);
      st.master.gain.exponentialRampToValueAtTime(0.0001, t0 + (fade || 0.4));
      setTimeout(() => { try { st.master.disconnect(); } catch (e) {} }, (fade || 0.4) * 1000 + 200);
    } catch (e) {
      try { st.master.disconnect(); } catch (e2) {}
    }
  }

  return {
    setEnabled(v) {
      enabled = !!v;
      if (!enabled) { stopTrack(cur, 0.3); cur = null; }
      else if (desired) this.play(desired);
    },
    isEnabled() { return enabled; },
    isPlaying() { return !!cur; },

    play(name) {
      if (!TRACKS[name]) return;
      desired = name;
      if (!enabled) return;
      if (cur && cur.name === name) return;
      const c = ac();
      if (!c || c.state === "suspended") return; // will start on next unlock()
      stopTrack(cur, 0.35);
      cur = null;
      startTrack(name);
    },

    stop() { desired = null; stopTrack(cur, 0.3); cur = null; },

    // call on a user gesture — resumes audio and starts pending track
    unlock() {
      const c = ac();
      if (c && enabled && desired && (!cur || cur.name !== desired)) {
        if (c.state === "suspended") { c.resume().then(() => this.play(desired)); }
        else this.play(desired);
      }
    },
  };
})();
