/* Practice worksheets — UCMAS-style abacus arithmetic drills.

   NOT a copy of any workbook: every problem is generated fresh here. Covers the
   same skills — addition/subtraction "strings" done on the abacus, 5- and
   10-complement ("little / big friend") practice, and multiplication /
   division progressions — across 10 levels.

   Two ways to work, chosen on the setup screen:
     • Worksheet   — a page of problems, solve them all, then check the page
     • One-by-one  — one problem at a time with the abacus (reuses the game runner)
*/
window.Worksheets = (function () {

  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[R(0, arr.length - 1)];
  const clampLvl = (n) => Math.max(1, Math.min(10, n | 0));

  /* ---- number-string generator (add / subtract on the abacus) ----------
     Produces { terms: [+a, -b, ...], answer } where the running total never
     goes below 0 and never exceeds `cap`. `force` biases toward rows that
     need a 5-complement ("five") or 10-complement ("ten"). */
  function makeString({ rows, cap, allowSub, force }) {
    const step = cap <= 9 ? 9 : cap <= 99 ? 19 : Math.floor(cap / 4);
    for (let attempt = 0; attempt < 600; attempt++) {
      const terms = [];
      let total = 0;
      let crossed = 0;
      let ok = true;
      for (let i = 0; i < rows; i++) {
        const first = i === 0;
        const canSub = allowSub && !first && total > 0;
        const sub = canSub && Math.random() < 0.4;
        let mag;
        if (sub) {
          mag = R(1, Math.min(total, step));
          total -= mag;
          terms.push(-mag);
        } else {
          const room = cap - total;
          if (room <= 0) { ok = false; break; }
          const ones = total % 10;
          const nudge = force && crossed < 1 && (rows - i) <= 2 && ones >= 1;
          if (nudge && force === "five" && ones <= 4 && room >= 5 - ones) {
            mag = R(5 - ones, Math.min(4, 9 - ones, room));
          } else if (nudge && force === "ten" && room >= 10 - ones) {
            mag = R(10 - ones, Math.min(9, room));
          } else {
            mag = R(1, Math.min(room, step));
          }
          if (!(mag >= 1)) mag = 1;
          if (force) {
            if (force === "five" && ones >= 1 && ones <= 4 && mag <= 4 && ones + mag >= 5) crossed++;
            if (force === "ten" && mag <= 9 && ones + mag >= 10) crossed++;
          }
          total += mag;
          terms.push(mag);
        }
      }
      if (!ok || total < 0 || total > cap || terms.length < rows) continue;
      if (force && crossed < 1) continue;
      return { terms, answer: total };
    }
    // fallback: a valid string that still exercises the skill
    if (force === "ten") return { terms: [8, 5], answer: 13 };
    if (force === "five") return { terms: [3, 4], answer: 7 };
    const n = R(2, Math.min(cap, 8));
    return { terms: [n, 1], answer: n + 1 };
  }

  function stringHtml(terms) {
    return `<span class="ws-col">` + terms.map((v, i) => {
      const sign = v < 0 ? "−" : (i === 0 ? "" : "+");
      return `<span class="ws-term">${sign}${Math.abs(v)}</span>`;
    }).join("") + `</span>`;
  }

  // Symbols only — speech.js says them in the current language.
  function stringSpeak(terms) {
    return terms.map((v, i) => (v < 0 ? " − " : (i === 0 ? "" : " + ")) + Math.abs(v)).join("");
  }

  /* ---- the worksheet types ---- */
  const TYPES = [
    {
      id: "addsub", icon: "➕", age: "6-8",
      make(level) {
        const L = clampLvl(level);
        const rows = L <= 2 ? 3 : L <= 4 ? R(3, 4) : L <= 8 ? R(4, 6) : R(5, 7);
        const cap = L <= 4 ? 9 : L <= 8 ? 99 : 999;
        const allowSub = L >= 3;
        const s = makeString({ rows, cap, allowSub });
        return {
          html: stringHtml(s.terms),
          speak: stringSpeak(s.terms),
          answer: s.answer,
          layout: "column",
        };
      },
    },
    {
      id: "friends", icon: "🤝", age: "6-8",
      make(level) {
        const L = clampLvl(level);
        const rows = L <= 4 ? 3 : L <= 7 ? R(3, 4) : R(4, 5);
        const mode = L <= 4 ? "five" : (L <= 7 ? "ten" : pick(["five", "ten"]));
        const cap = mode === "ten" ? (L <= 9 ? 18 : 99) : 9;
        const s = makeString({ rows, cap, allowSub: L >= 6, force: mode });
        return {
          html: stringHtml(s.terms),
          speak: stringSpeak(s.terms),
          answer: s.answer,
          layout: "column",
          tag: mode,
        };
      },
    },
    {
      id: "multiply", icon: "✖️", age: "9-12",
      make(level) {
        const L = clampLvl(level);
        let a, b;
        if (L <= 2) { a = R(2, 5); b = R(2, 5); }
        else if (L <= 4) { a = R(2, 9); b = R(2, 9); }
        else if (L <= 6) { a = R(11, 99); b = R(2, 9); }
        else if (L <= 8) { a = R(11, 99); b = R(11, 99); }
        else { a = R(101, 999); b = R(2, 9); }
        return {
          html: `<span class="ws-expr">${a} × ${b}</span>`,
          speak: `${a} × ${b}`,
          answer: a * b,
          layout: "row",
        };
      },
    },
    {
      id: "divide", icon: "➗", age: "9-12",
      make(level) {
        const L = clampLvl(level);
        let b, q;
        if (L <= 2) { b = R(2, 5); q = R(2, 5); }
        else if (L <= 4) { b = R(2, 9); q = R(2, 9); }
        else if (L <= 6) { b = R(2, 9); q = R(11, 50); }
        else if (L <= 8) { b = R(3, 12); q = R(11, 60); }
        else { b = R(11, 25); q = R(11, 40); }
        return {
          html: `<span class="ws-expr">${b * q} ÷ ${b}</span>`,
          speak: `${b * q} ÷ ${b}`,
          answer: q,
          layout: "row",
        };
      },
    },
  ];
  const byId = {};
  TYPES.forEach((t) => (byId[t.id] = t));

  /* ---- turn a typed-in homework problem into the same shape a generator
     returns. `raw` is either:
       { op: "string", terms: [4, -3, 5] }
       { op: "×"|"÷", a: 12, b: 4 }
     Returns null if it doesn't make sense (e.g. non-exact division). */
  function problemFromInput(raw) {
    if (!raw) return null;
    if (raw.op === "string") {
      const terms = (raw.terms || []).filter((n) => Number.isFinite(n));
      if (terms.length < 2) return null;
      const answer = terms.reduce((a, b) => a + b, 0);
      if (answer < 0) return null;
      return { html: stringHtml(terms), speak: stringSpeak(terms), answer, layout: "column" };
    }
    const a = Number(raw.a), b = Number(raw.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (raw.op === "×") {
      return { html: `<span class="ws-expr">${a} × ${b}</span>`, speak: `${a} × ${b}`, answer: a * b, layout: "row" };
    }
    if (raw.op === "÷") {
      if (b === 0 || a % b !== 0) return null;
      return { html: `<span class="ws-expr">${a} ÷ ${b}</span>`, speak: `${a} ÷ ${b}`, answer: a / b, layout: "row" };
    }
    return null;
  }

  // Parse a free-typed string like "4 +3 -2 +5" / "4,3,-2,5" / "12 x 4" / "36/6".
  function parseTyped(text) {
    const s = String(text).trim().replace(/[×xX*]/g, "×").replace(/[÷/]/g, "÷");
    let m = s.match(/^(-?\d+)\s*([×÷])\s*(-?\d+)$/);
    if (m) return { op: m[2], a: +m[1], b: +m[3] };
    const parts = s.match(/[+-]?\s*\d+/g);
    if (!parts) return null;
    const terms = parts.map((p) => +p.replace(/\s+/g, ""));
    if (terms.length < 2) return null;
    return { op: "string", terms };
  }

  function buildSheet(typeId, level, count) {
    const type = byId[typeId];
    if (!type) return [];
    const out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < count && guard++ < count * 40) {
      const p = type.make(level);
      const key = p.html;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }

  /* ================= worksheet-page runner ================= */
  class WorksheetSession {
    constructor(els, opts) {
      this.els = els;
      this.typeId = opts.typeId;
      this.level = clampLvl(opts.level);
      this.count = opts.count || 10;
      this.onDone = opts.onDone || function () {};
      this.onExit = opts.onExit || function () {};
      this.title = opts.title || null;
      this.problems = opts.problems && opts.problems.length
        ? opts.problems
        : buildSheet(this.typeId, this.level, this.count);
      this.count = this.problems.length;
      this.answers = this.problems.map(() => "");
      this.active = 0;
      this.checked = false;
    }

    start() {
      const e = this.els;
      e.abacusMount.hidden = true;
      e.readout.hidden = true;
      e.finger.hidden = true;
      e.prompt.hidden = false;
      e.prompt.innerHTML =
        `<div class="ws-instruction">${t("ws.solveEach")}` +
        `<button class="say-btn" aria-label="${t("say.replay")}">🔊</button></div>`;
      const sb = e.prompt.querySelector(".say-btn");
      if (sb) sb.onclick = () => { pulse(sb, "ring"); this._speakActive(); };

      e.controls.hidden = false;
      e.btnReset.hidden = true;
      e.btnCheck.hidden = false;
      e.btnCheck.textContent = t("ws.checkPage");
      e.btnNext.hidden = true;
      e.btnNext.textContent = this.typeId === "_homework" ? t("play.finish") : t("ws.newSheet");
      e.btnCheck.onclick = () => this._check();
      e.btnNext.onclick = () => this.onDone(this._score());

      this._render();
      this._speakActive();
    }

    destroy() {}

    _render() {
      const type = byId[this.typeId];
      const wide = type ? type.age === "9-12" : this.problems.some((p) => p.layout === "row");
      const grid = this.problems.map((p, i) => {
        const val = this.answers[i];
        let state = "";
        if (this.checked) state = (parseInt(val, 10) === p.answer) ? " is-right" : " is-wrong";
        const activeCls = i === this.active && !this.checked ? " is-active" : "";
        const solution = this.checked && state === " is-wrong"
          ? `<span class="ws-sol">${p.answer}</span>` : "";
        return `<button class="ws-item ws-${p.layout}${state}${activeCls}" data-i="${i}" ${this.checked ? "disabled" : ""}>
            <span class="ws-num">${i + 1}</span>
            <span class="ws-body">${p.html}</span>
            <span class="ws-eq">=</span>
            <span class="ws-ans">${val || "?"}</span>
            ${solution}
          </button>`;
      }).join("");

      const keypad = this.checked ? "" : `
        <div class="ws-keypad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join("")}
          <button data-k="back">⌫</button><button data-k="0">0</button><button data-k="clr">C</button>
        </div>`;

      this.els.controls.innerHTML = `<div class="ws-grid ${wide ? "ws-grid-wide" : ""}">${grid}</div>${keypad}`;

      this.els.controls.querySelectorAll(".ws-item").forEach((btn) =>
        btn.onclick = () => { this.active = +btn.dataset.i; this._render(); this._speakActive(); });
      this.els.controls.querySelectorAll(".ws-keypad button").forEach((btn) =>
        btn.onclick = () => this._key(btn.dataset.k));

      this._updateScore();
    }

    _key(k) {
      const i = this.active;
      let v = this.answers[i];
      if (k === "clr") v = "";
      else if (k === "back") v = v.slice(0, -1);
      else if (v.length < 6) v = (v + k).replace(/^0+(?=\d)/, "");
      this.answers[i] = v;
      Sound.click();
      // update just the active cell without a full re-render
      const cell = this.els.controls.querySelector(`.ws-item[data-i="${i}"] .ws-ans`);
      if (cell) cell.textContent = v || "?";
      this._updateScore();
    }

    _speakActive() {
      const p = this.problems[this.active];
      if (!p || !Speech || !Speech.isEnabled()) return;
      Speech.speak(p.speak, I18N.getLang());
    }

    _score() {
      let correct = 0;
      this.problems.forEach((p, i) => { if (parseInt(this.answers[i], 10) === p.answer) correct++; });
      return { correct, total: this.problems.length, typeId: this.typeId, level: this.level };
    }

    _updateScore() {
      const done = this.answers.filter((a) => a !== "").length;
      this.els.score.textContent = this.checked
        ? `✓ ${this._score().correct}/${this.problems.length}`
        : `${done}/${this.problems.length}`;
    }

    _check() {
      const blank = this.answers.filter((a) => a === "").length;
      if (blank && !this._confirmedBlank) {
        this._confirmedBlank = true;
        this.els.feedback.hidden = false;
        this.els.feedback.className = "feedback";
        this.els.feedback.textContent = t("ws.blankLeft", { n: blank });
        setTimeout(() => { this.els.feedback.hidden = true; }, 2200);
        return;
      }
      this.checked = true;
      const s = this._score();
      this._render();
      this.els.btnCheck.hidden = true;
      this.els.btnNext.hidden = false;
      this.els.feedback.hidden = false;
      const all = s.correct === s.total;
      this.els.feedback.className = "feedback " + (all ? "good" : "");
      this.els.feedback.innerHTML = all
        ? t("ws.allRight")
        : t("ws.pageScore", { c: s.correct, t: s.total });
      if (Speech && Speech.isEnabled()) {
        Speech.speak(t(all ? "say.great" : (s.correct >= s.total / 2 ? "say.correct" : "say.tryAgain")), I18N.getLang());
      }
      if (all) Sound.star(); else Sound.good();
      this.onExit.done = true;
    }
  }

  /* Build a synthetic game def so "one-by-one" mode reuses Games.Session
     (abacus + keypad + feedback + mascot + speech). */
  function gameDef(typeId, level, count) {
    const type = byId[typeId];
    const lvl = clampLvl(level);
    return {
      id: "ws_" + typeId,
      title: t("wsType." + typeId + ".title"),
      emoji: type.icon,
      age: type.age,
      rounds: count,
      blurb: "",
      _fixedLevel: true,
      abacus: { columns: 3, showPlaces: true, compact: true },
      makeRound() {
        const p = type.make(lvl);
        return { prompt: `<span class="big ws-oneup">${p.html}</span>`, say: p.speak, input: "keypad", target: p.answer };
      },
    };
  }

  /* one-at-a-time runner for a fixed list of problems (homework) */
  function gameDefFromList(problems, title) {
    let i = -1;
    return {
      id: "ws_hw",
      title: title || t("ws.homeworkTitle"),
      emoji: "📝",
      age: "6-8",
      rounds: problems.length,
      blurb: "",
      _fixedLevel: true,
      _hideLevel: true,
      abacus: { columns: 3, showPlaces: true, compact: true },
      makeRound() {
        i = Math.min(i + 1, problems.length - 1);
        const p = problems[i];
        return { prompt: `<span class="big ws-oneup">${p.html}</span>`, say: p.speak, input: "keypad", target: p.answer };
      },
    };
  }

  return {
    TYPES,
    get: (id) => byId[id],
    buildSheet,
    Session: WorksheetSession,
    gameDef,
    gameDefFromList,
    problemFromInput,
    parseTyped,
  };
})();
