/* Read-aloud narration for pre-readers. Uses the browser's built-in
   speechSynthesis (no audio files). Khmer needs a Khmer TTS voice on the
   device (most Android tablets have one via Google); otherwise it stays quiet
   for Khmer and English narration still works. */
window.Speech = (function () {

  const synth = ("speechSynthesis" in window) ? window.speechSynthesis : null;
  let enabled = true;
  let voices = [];

  function loadVoices() { voices = synth ? (synth.getVoices() || []) : []; }
  if (synth) {
    loadVoices();
    try { synth.addEventListener("voiceschanged", loadVoices); } catch (e) { synth.onvoiceschanged = loadVoices; }
  }

  function pickVoice(lang) {
    if (!voices.length) loadVoices();
    const want = lang === "km" ? ["km-kh", "km"] : ["en-us", "en-gb", "en-au", "en"];
    for (const w of want) {
      const v = voices.find(v => (v.lang || "").toLowerCase().replace("_", "-").startsWith(w));
      if (v) return v;
    }
    return null;
  }

  function available(lang) {
    if (!synth) return false;
    if (lang === "km") return !!pickVoice("km");
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
    if (lang === "km" && !v) return; // don't read Khmer with a non-Khmer voice
    const words = fromHtml ? toText(text, lang) : String(text).replace(EMOJI, "").trim();
    if (!words) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(words);
      if (v) { u.voice = v; u.lang = v.lang; }
      else { u.lang = lang === "km" ? "km-KH" : "en-US"; }
      u.rate = 0.9;
      u.pitch = 1.05;
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
  };
})();
