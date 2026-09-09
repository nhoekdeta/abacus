/* Game catalog + session runner for Peanick & Ponita. */
window.Games = (function () {

  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[R(0, arr.length - 1)];
  const shuffle = (arr) => {
    arr = arr.slice();
    for (let i = arr.length - 1; i > 0; i--) { const j = R(0, i);[arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  };
  // clamp-index into a per-level array: lvl(2, [a,b,c,d]) -> b
  const lvl = (level, arr) => arr[Math.max(0, Math.min(level, arr.length) - 1)];

  const OBJS = ["🍎", "🐤", "⭐", "🎈", "🍓", "🐞", "🌸", "🐟", "🍪", "🚗", "🦆", "🌵", "🐶", "🌼"];

  function objRow(n, e) { return `<span class="objects">${e.repeat(n)}</span>`; }

  function distractors(correct, lo, hi, count) {
    const set = new Set([correct]);
    let guard = 0;
    while (set.size < count && guard++ < 300) {
      let v = correct + R(-3, 3);
      if (v < lo || v > hi || v === correct) v = R(lo, hi);
      set.add(v);
    }
    return shuffle([...set]);
  }

  const MAX_LEVEL = 6;

  /* ---------------- game definitions ----------------
     makeRound(s) receives: { age, round, total, level }   (level 1..MAX_LEVEL)      */
  const DEFS = [
    {
      id: "count", title: "Count the Things", emoji: "🍎", age: "3-5", rounds: 5,
      blurb: "Count and pick the number",
      makeRound(s) {
        const hi = lvl(s.level, [5, 7, 9, 12, 15, 18]);
        const n = R(1, hi);
        const e = pick(OBJS);
        return {
          prompt: `${t("game.count.q")}${objRow(n, e)}`,
          input: "choices",
          choices: distractors(n, 0, hi + 3, 4).map(v => ({ label: String(v), correct: v === n })),
        };
      },
    },
    {
      id: "match", title: "How Many?", emoji: "🔢", age: "3-5", rounds: 5,
      blurb: "Match the number to the group",
      makeRound(s) {
        const hi = lvl(s.level, [5, 6, 8, 10, 12, 15]);
        const n = R(1, hi);
        const e = pick(OBJS);
        return {
          prompt: `${t("game.match.q")} <span class="big">${n}</span>`,
          input: "choices",
          choices: distractors(n, 1, hi + 2, 4).map(v => ({
            html: `<span class="obj">${e.repeat(v)}</span>`, correct: v === n,
          })),
        };
      },
    },
    {
      id: "countAbacus", title: "Slide to Count", emoji: "🧮", age: "3-5", rounds: 5,
      blurb: "Move beads to match",
      abacus: { columns: 1, showPlaces: false },
      makeRound(s) {
        const hi = lvl(s.level, [3, 4, 5, 6, 8, 9]);
        const n = R(1, hi);
        const e = pick(OBJS);
        return {
          prompt: `${t("game.countAbacus.q")}${objRow(n, e)}`,
          input: "abacus", target: n,
          onStart: (rt) => rt.abacus.reset(),
        };
      },
    },
    {
      id: "bubblePop", title: "Bubble Pop", emoji: "🫧", age: "3-5", rounds: 6,
      blurb: "Pop the right bubbles",
      makeRound(s) {
        const L = s.level;
        if (L <= 2) {
          const hi = lvl(L, [6, 9]);
          const target = R(1, hi);
          const pool = new Set([target]);
          while (pool.size < 6) pool.add(R(1, Math.max(hi + 2, 9)));
          return {
            prompt: t("game.bubblePop.qTarget", { n: target }),
            input: "bubbles", mode: "target", target,
            bubbles: shuffle([...pool]),
          };
        }
        if (L <= 4) {
          const goal = lvl(L, [10, 10, 12, 15]);
          const a = R(1, goal - 1), b = goal - a;
          const pool = new Set([a, b]);
          let guard = 0;
          while (pool.size < 6 && guard++ < 200) {
            const v = R(1, goal - 1);
            if (v !== a && v !== b) pool.add(v);
          }
          return {
            prompt: t("game.bubblePop.qSum", { n: goal }),
            input: "bubbles", mode: "sum", sum: goal, pair: [a, b],
            bubbles: shuffle([...pool]),
          };
        }
        const step = pick([1, 2, 5, 10]);
        const seq = [0, 1, 2, 3].map(i => step + i * step);
        const pool = new Set(seq);
        let guard = 0;
        while (pool.size < 7 && guard++ < 200) pool.add(R(1, seq[seq.length - 1] + step));
        return {
          prompt: t("game.bubblePop.qOrder", { a: seq[0], b: seq[seq.length - 1] }),
          input: "bubbles", mode: "order", sequence: seq,
          bubbles: shuffle([...pool]),
        };
      },
    },
    {
      id: "numberLine", title: "Number Line Jump", emoji: "🐸", age: "3-5", rounds: 6,
      blurb: "Hop to the answer",
      makeRound(s) {
        const max = lvl(s.level, [10, 10, 15, 20, 20, 20]);
        const canSub = s.level >= 4;
        const jump = R(1, lvl(s.level, [3, 4, 5, 5, 6, 8]));
        let start, op, target;
        if (canSub && Math.random() < 0.4) {
          start = R(jump, max); op = "−"; target = start - jump;
        } else {
          start = R(0, max - jump); op = "+"; target = start + jump;
        }
        return {
          prompt: t("game.numberLine.q", { a: start, op, b: jump }),
          input: "numberline", min: 0, max, start, target,
        };
      },
    },
    {
      id: "build", title: "Build the Number", emoji: "🏗️", age: "6-8", rounds: 6,
      blurb: "Set the beads to the number",
      abacus: { columns: 2, showPlaces: true },
      makeRound(s) {
        const hi = lvl(s.level, [30, 99, 99, 499, 999, 999]);
        const loBias = s.level >= 4 ? 100 : 1;
        const n = R(loBias, hi);
        return {
          prompt: `${t("game.build.q")} <span class="big">${n}</span>`,
          input: "abacus", target: n,
          onStart: (rt) => rt.abacus.reset(),
        };
      },
    },
    {
      id: "makeTen", title: "Make Ten", emoji: "🤝", age: "6-8", rounds: 6,
      blurb: "Find the pair that adds up",
      makeRound(s) {
        const goal = lvl(s.level, [10, 10, 10, 20, 20, 100]);
        let a;
        if (goal === 100) { a = R(1, 9) * 10; }
        else { a = R(1, goal - 1); }
        const b = goal - a;
        const opts = new Set([b]);
        let guard = 0;
        while (opts.size < 4 && guard++ < 200) {
          let v = goal === 100 ? R(1, 9) * 10 : R(1, goal - 1);
          opts.add(v);
        }
        return {
          prompt: `<span class="big">${a} + ? = ${goal}</span>`,
          input: "choices",
          choices: shuffle([...opts]).map(v => ({ label: String(v), correct: v === b })),
        };
      },
    },
    {
      id: "read", title: "Read the Abacus", emoji: "👀", age: "6-8", rounds: 6,
      blurb: "What number is shown?",
      abacus: { columns: 2, showPlaces: true, locked: true, compact: true },
      makeRound(s) {
        const hi = lvl(s.level, [50, 99, 99, 499, 999, 999]);
        const n = R(1, hi);
        return {
          prompt: t("game.read.q"),
          input: "keypad", target: n,
          onStart: (rt) => { rt.abacus.setLocked(false); rt.abacus.setValue(n); rt.abacus.setLocked(true); },
        };
      },
    },
    {
      id: "addsub", title: "Add & Subtract", emoji: "➕", age: "6-8", rounds: 6,
      blurb: "Solve it, use beads to help",
      abacus: { columns: 3, showPlaces: true, compact: true },
      makeRound(s) {
        const cap = lvl(s.level, [10, 20, 30, 50, 100, 100]);
        let a, b, op, ans;
        if (Math.random() < 0.5) {
          op = "+"; a = R(1, Math.max(2, cap - 2)); b = R(1, cap - a); ans = a + b;
        } else {
          op = "−"; a = R(2, cap); b = R(1, a - 1); ans = a - b;
        }
        return {
          prompt: `<span class="big">${a} ${op} ${b} = ?</span>`,
          input: "keypad", target: ans, onStart: (rt) => rt.abacus.reset(),
        };
      },
    },
    {
      id: "skipCount", title: "Skip Counting", emoji: "🪜", age: "6-8", rounds: 6,
      blurb: "Fill the missing number",
      makeRound(s) {
        const step = pick(lvl(s.level, [[2, 5, 10], [2, 5, 10], [2, 3, 5, 10], [3, 4, 5], [3, 4, 6, 7], [4, 6, 7, 8, 9]]));
        const back = s.level >= 5 && Math.random() < 0.35;
        const dir = back ? -1 : 1;
        const startBase = R(0, 4);
        const first = back ? startBase * step + step * 5 : startBase * step;
        const seq = [0, 1, 2, 3, 4].map(i => first + dir * i * step);
        const blank = R(1, 3);
        const shown = seq.map((v, i) => i === blank ? `<span class="blank">?</span>` : v).join(" ,&nbsp; ");
        return {
          prompt: `<span class="seq">${shown}</span>`,
          say: t("say.skipCount", { step }) + " " + seq.map((v, i) => i === blank ? "" : v).join(", "),
          input: "choices",
          choices: shuffle([...new Set([seq[blank], seq[blank] + step, seq[blank] - step, seq[blank] + dir * step * 2])])
            .slice(0, 4).map(v => ({ label: String(v), correct: v === seq[blank] })),
        };
      },
    },
    {
      id: "bigbuild", title: "Big Numbers", emoji: "🌟", age: "9-12", rounds: 6,
      blurb: "Build large numbers",
      abacus: { columns: 3, showPlaces: true },
      makeRound(s) {
        const digits = lvl(s.level, [3, 3, 4, 4, 5, 6]);
        const lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1;
        const n = R(lo, hi);
        return {
          prompt: `${t("game.bigbuild.q")} <span class="big">${n.toLocaleString("en-US")}</span>`,
          input: "abacus", target: n, onStart: (rt) => rt.abacus.reset(),
        };
      },
    },
    {
      id: "times", title: "Times Tables", emoji: "✖️", age: "9-12", rounds: 8,
      blurb: "Multiplication practice",
      abacus: { columns: 3, showPlaces: true, compact: true },
      makeRound(s) {
        const range = lvl(s.level, [[2, 5], [2, 9], [2, 12], [3, 12], [6, 12], [7, 12]]);
        const a = R(range[0], range[1]), b = R(2, 12);
        return {
          prompt: `<span class="big">${a} × ${b} = ?</span>`,
          input: "keypad", target: a * b, onStart: (rt) => rt.abacus.reset(),
        };
      },
    },
    {
      id: "abacusRace", title: "Abacus Race", emoji: "🏁", age: "9-12", rounds: 6,
      blurb: "Two steps, beat the clock",
      abacus: { columns: 3, showPlaces: true },
      combo: true,
      makeRound(s) {
        const cap = lvl(s.level, [20, 30, 50, 80, 100, 150]);
        const roundTime = lvl(s.level, [22, 20, 18, 16, 14, 12]);
        let a = R(4, cap), b, c, ans;
        const useSub = Math.random() < 0.5;
        b = R(1, Math.max(1, Math.min(a - 2, Math.floor(cap / 2))));
        const mid = useSub ? a - b : a + b;
        c = R(1, Math.max(1, Math.min(mid - 1, Math.floor(cap / 2))));
        const addC = Math.random() < 0.5 && mid + c <= cap * 1.5;
        ans = addC ? mid + c : mid - c;
        const expr = `${a} ${useSub ? "−" : "+"} ${b} ${addC ? "+" : "−"} ${c}`;
        return {
          prompt: `<span class="big">${expr} = ?</span>`,
          input: "abacus", target: ans, roundTime,
          onStart: (rt) => rt.abacus.reset(),
        };
      },
    },
    {
      id: "speed", title: "Speed Drill", emoji: "⚡", age: "9-12", timed: true, duration: 60,
      blurb: "How many in 60 seconds?",
      makeRound(s) {
        const t = R(0, 2); let a, b, op, ans;
        const cap = lvl(s.level, [15, 20, 25, 30, 40, 50]);
        if (t === 0) { op = "+"; a = R(2, cap); b = R(2, cap); ans = a + b; }
        else if (t === 1) { op = "−"; a = R(5, cap + 10); b = R(1, a - 1); ans = a - b; }
        else { op = "×"; a = R(2, lvl(s.level, [5, 7, 9, 10, 12, 12])); b = R(2, 9); ans = a * b; }
        return { prompt: `<span class="big">${a} ${op} ${b}</span>`, input: "keypad", target: ans };
      },
    },
  ];

  const byId = {};
  DEFS.forEach(d => byId[d.id] = d);

  /* ---------------- session runner ---------------- */
  class GameSession {
    constructor(def, els, opts) {
      this.def = def;
      this.els = els;
      this.age = opts.age || "6-8";
      this.onDone = opts.onDone || function () {};
      this.level = Math.max(1, Math.min(MAX_LEVEL, opts.level || 1));
      this.startLevel = this.level;
      this.round = 0;
      this.total = def.timed ? Infinity : (def.rounds || 5);
      this.correct = 0;
      this.stars = 0;
      this.combo = 0;
      this.bestCombo = 0;
      this.goodStreak = 0;
      this.badStreak = 0;
      this.firstTry = true;
      this.answered = false;
      this.leveledThisRound = false;
      this.answerStr = "";
      this.abacus = null;
    }

    _react(kind) { if (this.els.onReact) this.els.onReact(kind); }

    start() {
      const e = this.els;
      if (this.def.abacus) {
        e.abacusMount.hidden = false;
        this.abacus = new Abacus(e.abacusMount, {
          columns: this.def.abacus.columns,
          showPlaces: this.def.abacus.showPlaces,
          locked: this.def.abacus.locked,
          compact: this.def.abacus.compact,
          onChange: () => {
            if (e.readoutValue) { e.readoutValue.textContent = this.abacus.getValue(); pulse(e.readoutValue); }
          },
        });
        const showReadout = this.def.input !== "keypad" && !this.def.abacus.locked;
        e.readout.hidden = !showReadout;
      } else {
        e.abacusMount.hidden = true;
        e.readout.hidden = true;
      }

      e.btnReset.hidden = !(this.def.abacus && !this.def.abacus.locked);
      e.btnReset.onclick = () => { if (this.abacus && !this.abacus.locked) { this.abacus.reset(); Sound.click(); } };
      e.btnCheck.onclick = () => this._check();
      e.btnNext.onclick = () => this._next();

      if (this.def.timed) {
        this.timeLeft = this.def.duration;
        this._timer = setInterval(() => {
          this.timeLeft--;
          this._renderTimer();
          if (this.timeLeft <= 0) this._finish();
        }, 1000);
      }
      this._next();
    }

    destroy() { clearInterval(this._timer); clearInterval(this._roundTimer); }

    _ensureColumns(target) {
      if (!this.abacus || target == null) return;
      const need = Math.max(this.def.abacus.columns, String(Math.floor(target)).length);
      if (need !== this.abacus.columns) {
        const wasLocked = this.abacus.locked;
        this.abacus.setColumns(need);
        this.abacus.setLocked(wasLocked);
      }
    }

    _next() {
      clearInterval(this._roundTimer);
      if (!this.def.timed && this.round >= this.total) return this._finish();
      this.round++;
      this.firstTry = true;
      this.answered = false;
      this.leveledThisRound = false;
      this.answerStr = "";

      this.cur = this.def.makeRound({ age: this.age, round: this.round, total: this.total, level: this.level });

      this._ensureColumns(this.cur.target);

      this._renderPrompt();

      if (this.cur.onStart) this.cur.onStart({ abacus: this.abacus });
      if (this.abacus && this.els.readoutValue) this.els.readoutValue.textContent = this.abacus.getValue();

      this._renderControls();
      this.els.feedback.hidden = true;
      this.els.btnNext.hidden = true;
      this.els.btnCheck.hidden = (this.cur.input === "choices" || this.cur.input === "numberline" || this.cur.input === "bubbles");
      this._updateScore();
      this._react("think");

      if (this.cur.roundTime) this._startRoundTimer(this.cur.roundTime);
    }

    _renderPrompt() {
      const e = this.els;
      let meta;
      if (this.def.timed) {
        meta = `⏱ ${this.timeLeft}s &nbsp;·&nbsp; ✓ ${this.correct}`;
      } else {
        const dots = Array.from({ length: this.total }, (_, i) =>
          `<i class="${i < this.round - 1 ? "done" : i === this.round - 1 ? "now" : ""}"></i>`).join("");
        meta = `<span class="dots">${dots}</span><span class="lvl">${t("play.level", { n: this.level })}</span>`;
      }
      const combo = (this.def.combo && this.combo >= 2) ? `<span class="combo">🔥 x${this.combo}</span>` : "";
      e.prompt.hidden = false;
      e.prompt.innerHTML =
        `<div class="round-counter">${meta}${combo}</div>` +
        (this.cur.roundTime ? `<div class="timer-bar round"><div class="timer-fill" id="rfill"></div></div>` : "") +
        this.cur.prompt +
        `<button class="say-btn" aria-label="${t("say.replay")}">🔊</button>`;
      if (this.round > 1) pulse(e.prompt, "change");

      this._toSpeak = this.cur.say || this.cur.prompt;
      const sb = e.prompt.querySelector(".say-btn");
      if (sb) sb.onclick = () => { pulse(sb, "ring"); Speech.speakHtml(this._toSpeak, I18N.getLang()); };
      Speech.speakHtml(this._toSpeak, I18N.getLang());
    }

    _startRoundTimer(secs) {
      this._roundLeft = secs;
      this._roundTotal = secs;
      const paint = () => {
        const f = document.getElementById("rfill");
        if (f) f.style.width = Math.max(0, (this._roundLeft / this._roundTotal) * 100) + "%";
      };
      paint();
      this._roundTimer = setInterval(() => {
        this._roundLeft--;
        paint();
        if (this._roundLeft <= 3 && this._roundLeft > 0) Sound.tick();
        if (this._roundLeft <= 0) {
          clearInterval(this._roundTimer);
          if (!this.answered) this._timeUp();
        }
      }, 1000);
    }

    _timeUp() {
      this.answered = true;
      this.combo = 0;
      this._registerWrong();
      Sound.wrong();
      this._react("sad");
      this._say("bad", t("fb.timeUp", { n: this.cur.target }));
      this.els.btnCheck.hidden = true;
      this.els.btnNext.hidden = false;
      this.els.btnNext.textContent = (this.round >= this.total) ? t("play.finish") : t("play.next");
    }

    _renderControls() {
      const c = this.els.controls;
      const cur = this.cur;
      if (cur.input === "abacus") { c.hidden = true; c.innerHTML = ""; return; }
      c.hidden = false;

      let html = "";
      if (this.def.timed) html += `<div class="timer-bar"><div class="timer-fill" id="tfill"></div></div>`;

      if (cur.input === "choices") {
        html += `<div class="choice-grid">` + cur.choices.map((ch, i) =>
          `<button class="choice" data-i="${i}">${ch.html || ch.label}</button>`).join("") + `</div>`;
      } else if (cur.input === "numberline") {
        const ticks = [];
        for (let v = cur.min; v <= cur.max; v++) {
          const cls = "tick" + (v === cur.start ? " start" : "");
          const flag = v === cur.start ? `<span class="tick-flag">${this.els.buddy || "🐸"}</span>` : "";
          ticks.push(`<button class="${cls}" data-v="${v}">${flag}<span class="tick-dot"></span><span class="tick-num">${v}</span></button>`);
        }
        html += `<div class="numline"><div class="numline-track">${ticks.join("")}</div></div>`;
      } else if (cur.input === "bubbles") {
        this._bub = { sum: 0, seq: 0, popped: 0, done: false };
        const lanes = cur.bubbles.length;
        html += `<div class="bubble-field">` +
          (cur.mode === "sum" ? `<div class="bubble-tally" id="btally">${t("game.bubblePop.sumSoFar", { n: 0 })}</div>` : "") +
          cur.bubbles.map((n, i) => {
            const left = 4 + (i * (92 / lanes)) + R(0, 6);
            const dur = R(8, 14);
            const delay = -(Math.random() * dur).toFixed(1);
            const hue = (i * 61 + R(0, 25)) % 360;
            return `<button class="bubble" data-i="${i}" style="left:${left}%;--dur:${dur}s;--delay:${delay}s;--hue:${hue}">${n}</button>`;
          }).join("") + `</div>`;
      } else if (cur.input === "keypad") {
        html += `<div class="answer-box" id="ansbox">&nbsp;</div>`;
        html += `<div class="keypad">` +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join("") +
          `<button data-k="back">⌫</button><button data-k="0">0</button><button data-k="clr">C</button>` +
          `</div>`;
      }
      c.innerHTML = html;
      this._renderTimer();

      if (cur.input === "choices") {
        c.querySelectorAll(".choice").forEach(btn =>
          btn.onclick = () => this._pickChoice(+btn.dataset.i, btn));
      } else if (cur.input === "numberline") {
        c.querySelectorAll(".tick").forEach(btn =>
          btn.onclick = () => this._pickTick(+btn.dataset.v, btn));
        const startBtn = c.querySelector(".tick.start");
        if (startBtn) startBtn.scrollIntoView({ inline: "center", block: "nearest" });
      } else if (cur.input === "bubbles") {
        c.querySelectorAll(".bubble").forEach(btn =>
          btn.onclick = () => this._popBubble(+btn.dataset.i, btn));
      } else if (cur.input === "keypad") {
        this.ansbox = c.querySelector("#ansbox");
        c.querySelectorAll(".keypad button").forEach(btn =>
          btn.onclick = () => this._key(btn.dataset.k));
      }
    }

    _popBubble(i, btn) {
      if (this.answered || this._bub.done || btn.classList.contains("gone")) return;
      const cur = this.cur;
      const val = cur.bubbles[i];

      if (cur.mode === "target") {
        if (val === cur.target) { this._popFx(btn, true); this._bub.done = true; this._correct(); }
        else { this._popFx(btn, false); this._miss(t("fb.tryAgain")); }
        return;
      }

      if (cur.mode === "order") {
        if (val === cur.sequence[this._bub.seq]) {
          this._bub.seq++;
          this._popFx(btn, true);
          if (this._bub.seq >= cur.sequence.length) { this._bub.done = true; this._correct(); }
          else { Sound.click(); }
        } else { this._popFx(btn, false); this._miss(t("game.bubblePop.wrongOrder")); }
        return;
      }

      // sum mode
      this._bub.sum += val;
      this._popFx(btn, this._bub.sum <= cur.sum);
      const tally = this.els.controls.querySelector("#btally");
      if (tally) { tally.innerHTML = t("game.bubblePop.sumSoFar", { n: this._bub.sum }); pulse(tally, "change"); }
      if (this._bub.sum === cur.sum) { this._bub.done = true; this._correct(); }
      else if (this._bub.sum > cur.sum) {
        this._miss(t("game.bubblePop.tooMuch"));
        this._bub.sum = 0;
        setTimeout(() => { if (!this.answered) this._renderControls(); }, 550);
      } else { Sound.click(); }
    }

    _popFx(btn, good) {
      if (good) {
        btn.classList.add("gone");
        Sound.star();
        const f = this.els.controls.querySelector(".bubble-field");
        if (f) {
          const r = btn.getBoundingClientRect(), fr = f.getBoundingClientRect();
          for (let k = 0; k < 6; k++) {
            const s = document.createElement("i");
            s.className = "bubble-spark";
            s.style.left = (r.left - fr.left + r.width / 2) + "px";
            s.style.top = (r.top - fr.top + r.height / 2) + "px";
            s.style.setProperty("--a", (k / 6 * 360) + "deg");
            f.appendChild(s);
            setTimeout(() => s.remove(), 600);
          }
        }
      } else {
        btn.classList.remove("flash"); void btn.offsetWidth; btn.classList.add("flash");
        Sound.wrong();
      }
    }

    _key(k) {
      if (this.answered) return;
      this.els.feedback.hidden = true;
      if (k === "clr") this.answerStr = "";
      else if (k === "back") this.answerStr = this.answerStr.slice(0, -1);
      else if (this.answerStr.length < 7) this.answerStr += k;
      this.ansbox.textContent = this.answerStr || " ";
      Sound.click();
    }

    _pickChoice(i, btn) {
      if (this.answered) return;
      const ch = this.cur.choices[i];
      if (ch.correct) { btn.classList.add("pick-good"); this._correct(); }
      else {
        btn.classList.add("pick-bad"); btn.disabled = true;
        this._miss(t("fb.tryAgain"));
      }
    }

    _pickTick(v, btn) {
      if (this.answered) return;
      if (v === this.cur.target) { btn.classList.add("hit"); this._correct(); }
      else {
        btn.classList.add("miss"); btn.disabled = true;
        this._miss(t("fb.notThere"));
      }
    }

    _check() {
      if (this.answered) return;
      let val;
      if (this.cur.input === "abacus") val = this.abacus.getValue();
      else {
        if (this.answerStr === "") return;
        val = parseInt(this.answerStr, 10);
      }
      const ok = val === this.cur.target;

      if (this.def.timed) {
        this.answered = true;
        if (ok) { this.correct++; Sound.good(); this._react("happy"); this._say("good", t("fb.correct")); }
        else { Sound.wrong(); this._react("sad"); this._say("bad", t("fb.wrongAns", { n: this.cur.target })); }
        this._updateScore();
        setTimeout(() => { if (this.timeLeft > 0) this._next(); }, ok ? 280 : 650);
        return;
      }

      if (ok) this._correct();
      else this._miss(t(this.def.combo ? "fb.checkBeads" : "fb.notQuite"));
    }

    _miss(msg) {
      this.firstTry = false;
      if (!this.leveledThisRound && !this.def._fixedLevel) {
        this.badStreak++;
        this.goodStreak = 0;
        if (this.badStreak >= 2 && this.level > 1) {
          this.level--;
          this.leveledThisRound = true;
          this.badStreak = 0;
          this._levelToast(false);
        }
      }
      this.combo = 0;
      Sound.wrong();
      this._react("sad");
      this._say("bad", msg);
      Speech.speak(t("say.tryAgain"), I18N.getLang());
    }

    _registerWrong() {
      // used by time-up: same streak bookkeeping without a retry
      this.firstTry = false;
      this.badStreak++;
      this.goodStreak = 0;
      if (this.badStreak >= 2 && this.level > 1 && !this.leveledThisRound && !this.def._fixedLevel) {
        this.level--; this.leveledThisRound = true; this.badStreak = 0; this._levelToast(false);
      }
    }

    _correct() {
      this.answered = true;
      clearInterval(this._roundTimer);
      this.correct++;
      this.badStreak = 0;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      Sound.good();

      let gained = this.firstTry ? 2 : 1;
      if (this.def.combo && this.combo >= 3) gained += 1;      // combo bonus
      this.stars += gained;
      Sound.star();
      this._react("happy");

      if (this.firstTry && !this.leveledThisRound && !this.def._fixedLevel) {
        this.goodStreak++;
        if (this.goodStreak >= 2 && this.level < MAX_LEVEL) {
          this.level++; this.goodStreak = 0; this.leveledThisRound = true;
          this._levelToast(true);
        }
      }

      const parts = [t(this.firstTry ? "fb.perfect" : "fb.gotIt"), t("fb.plus", { n: gained })];
      if (this.def.combo && this.combo >= 2) parts.push(`🔥 x${this.combo}`);
      this._say("good", parts.join("  "));
      Speech.speak(t("say.correct"), I18N.getLang());
      this._updateScore();
      this.els.btnCheck.hidden = true;
      this.els.btnNext.hidden = false;
      this.els.btnNext.textContent = (this.round >= this.total) ? t("play.finish") : t("play.next");
    }

    _levelToast(up) {
      const t = document.getElementById("level-toast");
      if (!t) return;
      t.textContent = up ? window.t("toast.levelUp", { n: this.level }) : window.t("toast.level", { n: this.level });
      t.className = "level-toast show " + (up ? "up" : "down");
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => { t.className = "level-toast"; }, 1600);
      if (up) Sound.win();
    }

    _say(type, msg) {
      const f = this.els.feedback;
      f.hidden = false;
      f.className = "feedback " + type;
      f.textContent = msg;
      // retrigger slide-in animation
      f.style.animation = "none"; f.offsetHeight; f.style.animation = "";
    }

    _updateScore() {
      const txt = this.def.timed ? `✓ ${this.correct}` : `⭐ ${this.stars}`;
      if (this.els.score.textContent !== txt) pulse(this.els.score);
      this.els.score.textContent = txt;
    }

    _renderTimer() {
      const fill = document.getElementById("tfill");
      if (fill) fill.style.width = Math.max(0, (this.timeLeft / this.def.duration) * 100) + "%";
      const rc = this.els.prompt.querySelector(".round-counter");
      if (rc && this.def.timed) rc.innerHTML = `⏱ ${this.timeLeft}s &nbsp;·&nbsp; ✓ ${this.correct}`;
      if (this.def.timed && this.timeLeft <= 5 && this.timeLeft > 0) Sound.tick();
    }

    _finish() {
      clearInterval(this._timer);
      clearInterval(this._roundTimer);
      let bonus = 0;
      if (!this.def.timed && this.correct === this.total) { bonus = 3; this.stars += 3; }
      if (this.def.timed) this.stars = Math.floor(this.correct / 2);
      Sound.win();
      this.onDone({
        gameId: this.def.id,
        stars: this.stars,
        correct: this.correct,
        total: this.def.timed ? null : this.total,
        bonus,
        timed: !!this.def.timed,
        level: this.level,
        startLevel: this.startLevel,
        bestCombo: this.bestCombo,
      });
    }
  }

  return {
    list: DEFS,
    get: (id) => byId[id],
    Session: GameSession,
    MAX_LEVEL,
  };
})();
