/* Guided "Learn the Abacus" lessons — finger technique + what each bead means.
   Reuses the play screen. Each step shows an instruction, a focused abacus, and
   (for "do" steps) waits until the child reaches the target value. */
window.Lessons = (function () {

  const LIST = [
    {
      id: "L1", icon: "👋", title: "L1.title", steps: [
        { say: "L1.s1", cols: 3 },
        { say: "L1.s2", cols: 3, focus: ["beam-0", "beam-1", "beam-2"] },
        { say: "L1.s3", cols: 3, focus: ["earth-0"] },
        { say: "L1.s4", cols: 3, focus: ["heaven-0"] },
        { say: "L1.s5", cols: 3, want: 1, focus: ["earth-0"], finger: "thumb" },
      ],
    },
    {
      id: "L2", icon: "👍", title: "L2.title", steps: [
        { say: "L2.s1", cols: 1, finger: "thumb", focus: ["earth-0"] },
        { say: "L2.s2", cols: 1, set: 0, want: 1, finger: "thumb", focus: ["earth-0"] },
        { say: "L2.s3", cols: 1, set: 1, want: 2, finger: "thumb", focus: ["earth-0"] },
        { say: "L2.s4", cols: 1, set: 2, want: 3, finger: "thumb", focus: ["earth-0"] },
        { say: "L2.s5", cols: 1, set: 3, want: 4, finger: "thumb", focus: ["earth-0"] },
        { say: "L2.s6", cols: 1, set: 4 },
      ],
    },
    {
      id: "L3", icon: "☝️", title: "L3.title", steps: [
        { say: "L3.s1", cols: 1, set: 4, finger: "index", focus: ["earth-0"] },
        { say: "L3.s2", cols: 1, set: 4, want: 2, finger: "index", focus: ["earth-0"] },
        { say: "L3.s3", cols: 1, set: 2, want: 0, finger: "index", focus: ["earth-0"] },
        { say: "L3.s4", cols: 1, set: 0 },
      ],
    },
    {
      id: "L4", icon: "🖐️", title: "L4.title", steps: [
        { say: "L4.s1", cols: 1, set: 0, focus: ["heaven-0"] },
        { say: "L4.s2", cols: 1, set: 0, want: 5, finger: "index", focus: ["heaven-0"] },
        { say: "L4.s3", cols: 1, set: 5, want: 6, finger: "thumb", focus: ["earth-0"] },
        { say: "L4.s4", cols: 1, set: 6, want: 8, finger: "thumb", focus: ["earth-0"] },
        { say: "L4.s5", cols: 1, set: 8, want: 9, finger: "thumb", focus: ["earth-0"] },
        { say: "L4.s6", cols: 1, set: 9, want: 0 },
      ],
    },
    {
      id: "L5", icon: "🔟", title: "L5.title", steps: [
        { say: "L5.s1", cols: 2, places: true, set: 9 },
        { say: "L5.s2", cols: 2, places: true, set: 9, focus: ["rod-1"] },
        { say: "L5.s3", cols: 2, places: true, set: 9, want: 10, finger: "thumb", focus: ["earth-1"] },
        { say: "L5.s4", cols: 2, places: true, set: 10, want: 15, finger: "thumb", focus: ["earth-0"] },
        { say: "L5.s5", cols: 2, places: true, set: 15 },
      ],
    },
  ];

  const byId = {};
  LIST.forEach(l => byId[l.id] = l);

  class LessonSession {
    constructor(lesson, els, opts) {
      this.lesson = lesson;
      this.els = els;
      this.onDone = opts.onDone || function () {};
      this.i = 0;
      this.abacus = null;
      this.passed = false;
    }

    start() {
      const e = this.els;
      e.btnCheck.hidden = true;
      e.readout.hidden = false;
      e.btnReset.hidden = false;
      e.btnReset.textContent = t("lesson.startOver");
      e.btnReset.onclick = () => { this.i = 0; this._render(); Sound.click(); };
      e.btnNext.onclick = () => this._next();
      this._render();
    }

    destroy() { /* nothing async */ }

    _render() {
      const e = this.els;
      const step = this.lesson.steps[this.i];
      this.passed = step.want == null;

      // fresh abacus for this step
      e.abacusMount.hidden = false;
      e.abacusMount.innerHTML = "";
      this.abacus = new Abacus(e.abacusMount, {
        columns: step.cols,
        showPlaces: !!step.places,
        showRodValues: true,
        large: step.cols <= 2,
        onChange: (v) => {
          e.readoutValue.textContent = v;
          pulse(e.readoutValue);
          if (step.want != null && !this.passed && v === step.want) this._pass();
        },
      });
      this.abacus.setValue(step.set || 0);
      this.abacus.highlight(step.focus || []);
      e.readoutValue.textContent = this.abacus.getValue();

      // finger hint
      if (step.finger) { e.finger.hidden = false; e.finger.innerHTML = t("finger." + step.finger); }
      else e.finger.hidden = true;

      // instruction
      e.prompt.hidden = false;
      const n = this.lesson.steps.length;
      e.prompt.innerHTML =
        `<div class="round-counter"><span class="lvl">${this.i + 1} / ${n}</span></div>` +
        `<div class="lesson-say">${t(step.say)}</div>` +
        (step.want != null ? `<div class="lesson-try">${t("lesson.try")}</div>` : "") +
        `<button class="say-btn" aria-label="${t("say.replay")}">🔊</button>`;
      if (this.i > 0) pulse(e.prompt, "change");

      const lines = [t(step.say)];
      if (step.finger) lines.push(t("finger." + step.finger));
      const sb = e.prompt.querySelector(".say-btn");
      if (sb) sb.onclick = () => { pulse(sb, "ring"); Speech.speakSeq(lines, I18N.getLang()); };
      Speech.speakSeq(lines, I18N.getLang());

      // feedback + next
      e.feedback.hidden = true;
      this._react("think");
      e.btnNext.hidden = !this.passed;
      e.btnNext.textContent = (this.i >= n - 1) ? t("play.finish") : t("play.next");
    }

    _pass() {
      this.passed = true;
      Sound.good(); Sound.star();
      this._react("happy");
      const f = this.els.feedback;
      f.hidden = false;
      f.className = "feedback good";
      f.textContent = t("lesson.great");
      Speech.speak(t("say.great"), I18N.getLang());
      const n = this.lesson.steps.length;
      this.els.btnNext.hidden = false;
      this.els.btnNext.textContent = (this.i >= n - 1) ? t("play.finish") : t("play.next");
    }

    _react(k) { if (this.els.onReact) this.els.onReact(k); }

    _next() {
      if (this.i >= this.lesson.steps.length - 1) { this.onDone(this.lesson.id); return; }
      this.i++;
      this._render();
    }
  }

  return { list: LIST, get: (id) => byId[id], Session: LessonSession };
})();
