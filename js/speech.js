/* Read-aloud narration for pre-readers.

   English uses the browser's built-in speechSynthesis (on essentially every
   device). Khmer prefers the recorded clip library in khmer-audio.js — that
   works on every device, offline — and only falls back to speechSynthesis
   when a phrase isn't covered by clips. Where neither works (desktop with no
   Khmer voice), Khmer narration is silent and Settings explains why. */
window.Speech = (function () {

  const KA = () => (window.KhmerAudio && window.KhmerAudio.isReady() ? window.KhmerAudio : null);

  const synth = ("speechSynthesis" in window) ? window.speechSynthesis : null;
  let enabled = true;
  let voices = [];

  // Khmer engine status: "unknown" until we've tried, then "ok" or "missing".
  let kmStatus = "unknown";

  function loadVoices() { voices = synth ? (synth.getVoices() || []) : []; }
  if (synth) {
    loadVoices();
    try { synth.addEventListener("voiceschanged", loadVoices); } catch (e) { synth.onvoiceschanged = loadVoices; }
  }

  function isKmVoice(v) {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    const name = (v.name || "").toLowerCase();
    return lang.startsWith("km") || lang.startsWith("khm") ||
           name.includes("khmer") || name.includes("cambodia");
  }

  function pickVoice(lang) {
    if (!voices.length) loadVoices();
    if (lang === "km") return voices.find(isKmVoice) || null;
    const want = ["en-us", "en-gb", "en-au", "en"];
    for (const w of want) {
      const v = voices.find(v => (v.lang || "").toLowerCase().replace("_", "-").startsWith(w));
      if (v) return v;
    }
    return null;
  }

  // Optimistic: assume Khmer can work until an attempt proves otherwise.
  function available(lang) {
    if (!synth) return false;
    if (lang === "km") return kmStatus !== "missing";
    return true; // English is essentially always present
  }

  const SYM = {
    en: [[/\s*\+\s*/g, " plus "], [/\s*[−–-]\s*/g, " minus "], [/\s*×\s*/g, " times "],
         [/\s*÷\s*/g, " divided by "], [/\s*=\s*/g, " equals "], [/\s*→\s*/g, " then "],
         [/[•·]/g, " "], [/\?/g, " "]],
    km: [[/\s*\+\s*/g, " បូក "], [/\s*[−–-]\s*/g, " ដក "], [/\s*×\s*/g, " គុណ "],
         [/\s*÷\s*/g, " ចែក "], [/\s*=\s*/g, " ស្មើ "], [/\s*→\s*/g, " បន្ទាប់មក "],
         [/[•·]/g, " "], [/\?/g, " "]],
  };
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;

  function toText(html, lang) {
    let s = String(html).replace(/<[^>]*>/g, " ");
    s = s.replace(/&nbsp;/g, " ").replace(/&mdash;/g, " ").replace(/&amp;/g, lang === "km" ? " និង " : " and ");
    s = s.replace(EMOJI, "");
    for (const [re, rep] of (SYM[lang] || SYM.en)) s = s.replace(re, rep);
    return s.replace(/\s+/g, " ").trim();
  }

  function say(text, lang, fromHtml) {
    if (!enabled) return;
    lang = lang || (window.I18N ? I18N.getLang() : "en");
    const isKm = lang === "km";

    const words = fromHtml ? toText(text, lang) : String(text).replace(EMOJI, "").trim();
    if (!words) return;

    // Khmer: recorded clips first (works everywhere, offline).
    if (isKm && KA()) {
      if (synth) { try { synth.cancel(); } catch (e) {} }
      if (KA().speak(words)) return;
      if (typeof console !== "undefined") console.warn("[KhmerAudio] no clips for:", words);
    }

    if (!synth) return;
    const v = pickVoice(lang);

    // Khmer with no voice and a previous attempt already proved it's silent
    // here — don't mangle it with an English voice.
    if (isKm && !v && kmStatus === "missing") return;

    try {
      if (KA()) KA().stop();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(words);
      if (v) {
        u.voice = v; u.lang = v.lang;
        if (isKm) kmStatus = "ok";
      } else {
        u.lang = isKm ? "km-KH" : "en-US";
      }
      u.rate = 0.9;
      u.pitch = 1.05;

      if (isKm && v) {
        kmStatus = "ok";
      } else if (isKm) {
        // No real Khmer voice enumerated. We still try (Android / iOS / ChromeOS
        // often speak km-KH anyway), but desktop Chrome "completes" instantly
        // with NO audio — start and end fire within a few ms. So we time it:
        // a genuine utterance of a real phrase takes hundreds of ms or more.
        let startedAt = 0, settled = false;
        const mark = (s) => { settled = true; kmStatus = s; };
        u.addEventListener("start", () => { startedAt = (performance && performance.now) ? performance.now() : Date.now(); });
        u.addEventListener("end", () => {
          if (settled) return;
          const ms = startedAt ? (((performance && performance.now) ? performance.now() : Date.now()) - startedAt) : 0;
          mark((words.length >= 4 && ms < 300) ? "missing" : "ok");
        });
        u.addEventListener("error", (e) => {
          const err = (e && e.error) || "";
          if (err === "interrupted" || err === "canceled" || err === "not-allowed") return;
          mark("missing");
        });
        // Engine did nothing at all — no start, no end, no error.
        setTimeout(() => { if (!settled && kmStatus === "unknown") kmStatus = "missing"; }, 2500);
      }

      synth.speak(u);
    } catch (e) {}
  }

  return {
    speak: (t, lang) => say(t, lang, false),
    speakHtml: (html, lang) => say(html, lang, true),
    /* Speak several HTML fragments in order (e.g. a lesson step + its finger
       hint) without the second one cutting off the first. */
    speakSeq(parts, lang) {
      if (!enabled) return;
      lang = lang || (window.I18N ? I18N.getLang() : "en");
      const items = parts.map((p) => toText(p, lang)).filter(Boolean);
      if (!items.length) return;
      if (lang === "km" && KA()) {
        if (synth) { try { synth.cancel(); } catch (e) {} }
        if (KA().speakSeq(items)) return;
      }
      if (!synth) return;
      const v = pickVoice(lang);
      if (lang === "km" && !v && kmStatus === "missing") return;
      try {
        if (KA()) KA().stop();
        synth.cancel();
        for (const it of items) {
          const u = new SpeechSynthesisUtterance(it);
          if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang === "km" ? "km-KH" : "en-US"; }
          u.rate = 0.9; u.pitch = 1.05;
          synth.speak(u);
        }
      } catch (e) {}
    },
    stop() {
      try { synth && synth.cancel(); } catch (e) {}
      try { if (KA()) KA().stop(); } catch (e) {}
    },
    setEnabled(v) { enabled = !!v; if (!v) this.stop(); },
    isEnabled: () => enabled,
    supported: () => !!(synth || KA()),
    available,
    /* "clips"  — recorded Khmer library is loaded (works everywhere)
       "voice"  — a real Khmer TTS voice is installed
       "trying" — no clips, no enumerated voice, no failure yet
       "missing"— proven silent here */
    kmState() {
      if (KA()) return "clips";
      if (synth && pickVoice("km")) return "voice";
      if (!synth) return "missing";
      return kmStatus === "missing" ? "missing" : "trying";
    },
  };
})();
