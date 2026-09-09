/* Read-aloud narration for pre-readers. Uses the browser's built-in
   speechSynthesis (no audio files).

   English TTS is on essentially every device. Khmer TTS is not always
   installed: it ships on most Android tablets (Google TTS), on iOS/iPadOS
   after the "Khmer" voice is downloaded in Settings, and on ChromeOS, but
   is usually absent on Windows/desktop Chrome. So for Khmer we:
     1. use a real Khmer voice if one is enumerated;
     2. otherwise still attempt with lang "km-KH" — Android / iOS / ChromeOS
        resolve by language even when getVoices() is incomplete;
     3. if that first attempt reports the language is unavailable, go quiet
        for Khmer and let the Settings screen explain how to add the voice. */
window.Speech = (function () {

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
    if (!enabled || !synth) return;
    lang = lang || (window.I18N ? I18N.getLang() : "en");

    const v = pickVoice(lang);
    const isKm = lang === "km";

    // Khmer with no voice, and a previous attempt already told us it's not
    // supported here — stay silent rather than mangle it with an English voice.
    if (isKm && !v && kmStatus === "missing") return;

    const words = fromHtml ? toText(text, lang) : String(text).replace(EMOJI, "").trim();
    if (!words) return;

    try {
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
    stop() { try { synth && synth.cancel(); } catch (e) {} },
    setEnabled(v) { enabled = !!v; if (!v) this.stop(); },
    isEnabled: () => enabled,
    supported: () => !!synth,
    available,
    /* "voice" (a real Khmer voice is installed), "trying" (no enumerated voice
       yet, but we haven't hit a failure), or "missing" (proven unavailable). */
    kmState() {
      if (!synth) return "missing";
      if (pickVoice("km")) return "voice";
      return kmStatus === "missing" ? "missing" : "trying";
    },
  };
})();
