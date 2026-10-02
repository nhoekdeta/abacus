/* "Say the Number" — shows a random 1–100 number; the child says it out loud,
   then taps to reveal the word and hear it read aloud. */
window.SayIt = (function () {

  const EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const EN_TENS = { 2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety" };

  // Khmer words — mirror num_word() in tools/gen-khmer-audio.py.
  const KM_ONES = ["សូន្យ", "មួយ", "ពីរ", "បី", "បួន", "ប្រាំ", "ប្រាំមួយ", "ប្រាំពីរ", "ប្រាំបី", "ប្រាំបួន"];
  const KM_TENS = { 1: "ដប់", 2: "ម្ភៃ", 3: "សាមសិប", 4: "សែសិប", 5: "ហាសិប", 6: "ហុកសិប", 7: "ចិតសិប", 8: "ប៉ែតសិប", 9: "កៅសិប" };

  function words(n, lang) {
    if (lang === "km") {
      if (n === 100) return "មួយរយ";
      const tn = Math.floor(n / 10), o = n % 10;
      return tn ? KM_TENS[tn] + (o ? KM_ONES[o] : "") : KM_ONES[o];
    }
    if (n === 100) return "one hundred";
    if (n < 20) return EN_ONES[n];
    const o = n % 10;
    return EN_TENS[Math.floor(n / 10)] + (o ? "-" + EN_ONES[o] : "");
  }

  const pickNext = (prev) => {
    let n;
    do { n = 1 + Math.floor(Math.random() * 100); } while (n === prev);
    return n;
  };

  class Session {
    constructor(els, opts) {
      this.els = els;
      this.opts = opts || {};
      this.n = 0;
      this.revealed = false;
    }

    start() {
      this.els.btnNext.onclick = () => { Sound.click(); this.next(); };
      this.next();
    }

    next() {
      Speech.stop();
      this.n = pickNext(this.n);
      this.revealed = false;
      const { prompt, controls, btnNext } = this.els;
      prompt.hidden = false;
      prompt.innerHTML = `${t("say.sayIt")}<span class="big say-num">${this.n}</span>`;
      controls.hidden = false;
      controls.innerHTML = `<button class="btn btn-primary say-reveal" id="say-reveal">${t("say.show")}</button>`;
      btnNext.hidden = true;
      this.els.feedback.hidden = true;
      document.getElementById("say-reveal").onclick = () => this.reveal();
    }

    reveal() {
      if (this.revealed) return;
      this.revealed = true;
      Sound.good && Sound.good();
      const lang = I18N.getLang();
      const { controls, btnNext } = this.els;
      controls.innerHTML =
        `<div class="say-word">${words(this.n, lang)}</div>` +
        `<button class="btn btn-soft say-again" id="say-again">${t("say.again")}</button>`;
      document.getElementById("say-again").onclick = () => this.speak();
      btnNext.hidden = false;
      this.speak();
    }

    speak() {
      const lang = I18N.getLang();
      // Khmer plays the recorded number clips (keyed on digits); English speaks the words.
      Speech.speak(lang === "km" ? String(this.n) : words(this.n, "en"), lang);
    }

    destroy() {
      Speech.stop();
      this.els.btnNext.onclick = null;
      this.els.controls.innerHTML = "";
    }
  }

  return { Session, words };
})();
