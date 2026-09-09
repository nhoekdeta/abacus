/* Recorded Khmer read-aloud.

   The browser's speech engine only speaks Khmer on devices that ship a Khmer
   TTS voice (most Android/iOS, not desktop). This module plays a small library
   of pre-recorded Khmer clips instead — numbers, math words, and every fixed
   phrase — stitched together on the fly, so Khmer narration works everywhere
   and offline. Clips + audio/km/manifest.json are built by tools/gen-khmer-audio.py.

   speech.js calls this first for Khmer; if a phrase isn't covered it returns
   false and speech.js falls back to the device voice. */
window.KhmerAudio = (function () {

  const BASE = "audio/km/";
  let M = null;
  let ready = false;

  fetch(BASE + "manifest.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { if (j && j.numbers) { M = j; ready = true; warmCache(); } })
    .catch(() => {});

  // Pull every clip into the browser / service-worker cache so later plays are
  // instant and work offline. Best effort, paced, only when online.
  function warmCache() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const files = [];
    [M.numbers, M.places, M.ops, M.phrases].forEach((grp) => {
      for (const k in grp) if (files.indexOf(grp[k]) < 0) files.push(grp[k]);
    });
    let i = 0;
    (function next() {
      if (i >= files.length) return;
      fetch(BASE + files[i++]).catch(() => {}).then(() => setTimeout(next, 90));
    })();
  }

  // Must mirror normalize() in tools/gen-khmer-audio.py.
  const PUNCT = /[។៕៖៚–—‒…!?,:;.\-«»“”]/g;
  function normalize(s) {
    return String(s).replace(PUNCT, " ").replace(/\s+/g, " ").trim();
  }

  // A whole non-negative integer -> ordered list of clip files (native clip for
  // 0..100, otherwise composed from place words + the 0..100 clips).
  function numberClips(str) {
    let n = parseInt(String(str).replace(/[,\s]/g, ""), 10);
    if (!isFinite(n) || n < 0) return null;
    if (n <= 100) return M.numbers[n] ? [M.numbers[n]] : null;
    const out = [];
    const places = [[1000000, "1000000"], [100000, "100000"], [10000, "10000"], [1000, "1000"], [100, "100"]];
    for (const [val, key] of places) {
      const d = Math.floor(n / val);
      if (d >= 1) {
        if (!M.numbers[d] || !M.places[key]) return null;
        out.push(M.numbers[d], M.places[key]);
        n -= d * val;
      }
    }
    if (n > 0) {
      if (!M.numbers[n]) return null;
      out.push(M.numbers[n]);
    }
    return out;
  }

  function tokenClip(tok) {
    if (M.phrases[tok]) return [M.phrases[tok]];
    if (M.ops[tok]) return [M.ops[tok]];
    return null;
  }

  /* Resolve a (already tag/emoji/symbol-stripped) Khmer utterance to a clip
     list, or null meaning "not covered — use the device voice instead". */
  function plan(text) {
    if (!ready) return null;
    // join digit-group separators ("12,345" -> "12345") before normalize()
    // strips the comma and splits it into two numbers.
    const s = normalize(String(text).replace(/(\d),(?=\d)/g, "$1"));
    if (!s) return null;
    if (M.phrases[s]) return [M.phrases[s]];

    const clips = [];
    const segs = s.split(/(\d[\d,]*)/);
    for (let seg of segs) {
      if (!seg) continue;
      if (/^\d[\d,]*$/.test(seg)) {
        const c = numberClips(seg);
        if (!c) return null;
        clips.push.apply(clips, c);
        continue;
      }
      seg = seg.trim();
      if (!seg) continue;
      let c = tokenClip(seg);
      if (!c) {
        // several space-separated phrase/op tokens in one run
        c = [];
        let ok = true;
        const ws = seg.split(" ");
        for (let i = 0; i < ws.length; i++) {
          if (!ws[i]) continue;
          const t = tokenClip(ws[i]);
          if (!t) { ok = false; break; }
          c.push.apply(c, t);
        }
        if (!ok || !c.length) return null;
      }
      clips.push.apply(clips, c);
    }
    return clips.length ? clips : null;
  }

  // --- playback ---------------------------------------------------------
  let gen = 0;
  let queue = [];
  let cur = null;

  function stop() {
    gen++;
    queue = [];
    if (cur) { try { cur.pause(); cur.src = ""; } catch (e) {} cur = null; }
  }

  function play(clips) {
    stop();
    const mine = gen;
    queue = clips.slice();
    const step = () => {
      if (mine !== gen) return;
      const f = queue.shift();
      if (!f) { cur = null; return; }
      const a = new Audio(BASE + f);
      cur = a;
      const go = () => { if (mine === gen) setTimeout(step, 65); };
      a.addEventListener("ended", go, { once: true });
      a.addEventListener("error", go, { once: true });
      const p = a.play();
      if (p && p.catch) p.catch(go);
    };
    step();
  }

  return {
    isReady: () => ready,
    plan: plan,
    play: play,
    stop: stop,
    /* Speak one utterance from clips. Returns false if not covered. */
    speak(text) {
      const c = plan(text);
      if (!c) return false;
      play(c);
      return true;
    },
    /* Speak several utterances back-to-back. Returns false (playing nothing)
       unless every part is covered. */
    speakSeq(parts) {
      if (!ready) return false;
      const all = [];
      for (let i = 0; i < parts.length; i++) {
        const c = plan(parts[i]);
        if (!c) return false;
        all.push.apply(all, c);
      }
      if (!all.length) return false;
      play(all);
      return true;
    },
  };
})();
