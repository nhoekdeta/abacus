/* "My Buddy" — a pet the child cares for by answering number questions.
   Feed it (solve a problem → earn a treat → feed), play with it, dress it up.
   It gets hungry over real time and grows as it's fed. */
window.Pet = (function () {

  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[R(0, arr.length - 1)];
  const shuffle = (arr) => {
    arr = arr.slice();
    for (let i = arr.length - 1; i > 0; i--) { const j = R(0, i);[arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  };
  const TREATS = ["🍎", "🍓", "🍪", "🥕", "🍌", "🫐"];

  const ACCESSORIES = [
    { id: "bow", emoji: "🎀", price: 3, pos: "ear" },
    { id: "flower", emoji: "🌷", price: 4, pos: "ear" },
    { id: "hat", emoji: "🎩", price: 5, pos: "top" },
    { id: "glasses", emoji: "🕶️", price: 5, pos: "face" },
    { id: "scarf", emoji: "🧣", price: 6, pos: "neck" },
    { id: "phones", emoji: "🎧", price: 7, pos: "top" },
    { id: "crown", emoji: "👑", price: 10, pos: "top" },
  ];
  const accById = {};
  ACCESSORIES.forEach(a => accById[a.id] = a);

  const FEED_HUNGER = 20, FEED_HAPPY = 9, PLAY_HAPPY = 8, PAT_HAPPY = 3;
  const GROW_EVERY = 6;   // feeds per size level

  function distract(correct, lo, hi) {
    const set = new Set([correct]);
    let g = 0;
    while (set.size < 4 && g++ < 200) {
      let v = correct + R(-3, 3);
      if (v < lo || v > hi || v === correct) v = R(lo, hi);
      set.add(v);
    }
    return shuffle([...set]);
  }

  function makeQuestion(age, size) {
    const lvl = Math.min(size, 4);
    if (age === "3-5") {
      const n = R(1, Math.min(4 + lvl, 9));
      const e = pick(TREATS);
      return {
        q: `${t("pet.qCount")}<div class="pet-q-objs">${e.repeat(n)}</div>`,
        choices: distract(n, 0, 12).map(v => ({ label: v, correct: v === n })),
      };
    }
    if (age === "6-8") {
      let a, b, op, ans;
      if (Math.random() < 0.5) { op = "+"; a = R(2, 8 + lvl * 2); b = R(1, 9); ans = a + b; }
      else { op = "−"; a = R(4, 12 + lvl * 2); b = R(1, a - 1); ans = a - b; }
      return {
        q: `<div class="pet-q-sum">${a} ${op} ${b}</div>`,
        choices: distract(ans, 0, ans + 8).map(v => ({ label: v, correct: v === ans })),
      };
    }
    const a = R(2, 8 + lvl), b = R(2, 9);
    return {
      q: `<div class="pet-q-sum">${a} × ${b}</div>`,
      choices: distract(a * b, 2, a * b + 12).map(v => ({ label: v, correct: v === a * b })),
    };
  }

  /* ---------------- controller ---------------- */
  class PetScreen {
    constructor(mount, opts) {
      this.mount = mount;
      this.buddy = opts.buddy || "🐼";
      this.age = opts.age || "6-8";
      this.onStar = opts.onStar || function () {};
      this.onChange = opts.onChange || function () {};
      this.onExit = opts.onExit || function () {};
      this.pet = Store.getPet();
      this.view = "home";     // home | feed | play | shop
      this._applyElapsed();
    }

    size() { return Math.min(5, 1 + Math.floor(this.pet.fedTotal / GROW_EVERY)); }

    _applyElapsed() {
      const now = Date.now();
      const hrs = (now - (this.pet.lastSeen || now)) / 3.6e6;
      if (hrs > 0.4) {
        this.pet.hunger = Math.min(100, this.pet.hunger + Math.min(45, Math.round(hrs * 7)));
        this.pet.happiness = Math.max(0, this.pet.happiness - Math.min(30, Math.round(hrs * 3)));
        this.pet.cleanliness = Math.max(0, (this.pet.cleanliness ?? 80) - Math.min(50, Math.round(hrs * 5)));
        this._missed = hrs > 3;
      }
      this.pet.lastSeen = now;
      Store.savePet(this.pet);
    }

    _save() { this.pet.lastSeen = Date.now(); Store.savePet(this.pet); this.onChange(this.pet); }

    mood() {
      const p = this.pet;
      if (this._justFull) return { key: "pet.moodFull", face: "🥰" };
      if (p.hunger >= 72) return { key: "pet.moodStarving", face: "😿" };
      if ((p.cleanliness ?? 80) <= 28) return { key: "pet.moodDirty", face: "😖" };
      if (p.hunger >= 45) return { key: "pet.moodHungry", face: "😣" };
      if (p.happiness <= 22) return { key: "pet.moodLonely", face: "🥺" };
      if (p.happiness >= 85) return { key: "pet.moodLoved", face: "😍" };
      return pick([{ key: "pet.moodHappy", face: "😊" }, { key: "pet.moodPat", face: "🙂" }]);
    }

    /* ---------- render ---------- */
    render() {
      if (this.view === "feed") return this._renderQuiz("feed");
      if (this.view === "play") return this._renderQuiz("play");
      if (this.view === "shop") return this._renderShop();
      if (this.view === "bath") return this._renderBath();
      this._renderHome();
    }

    _petAvatar(extraClass, opts) {
      opts = opts || {};
      const worn = this.pet.wearing ? accById[this.pet.wearing] : null;
      const acc = worn ? `<span class="pet-acc pet-acc-${worn.pos}">${worn.emoji}</span>` : "";
      const style = this.pet.style ? ` style-${this.pet.style}` : "";
      const s = this.size();
      let dirt = "";
      if (opts.dirty && (this.pet.cleanliness ?? 80) < 36) {
        const n = (this.pet.cleanliness ?? 80) < 18 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          dirt += `<span class="pet-dirt" style="left:${25 + i * 24}%;top:${28 + (i % 2) * 30}%"></span>`;
        }
      }
      return `<div class="pet-avatar ${extraClass || ""}${style}" id="pet-avatar" style="--psize:${(1 + (s - 1) * 0.13).toFixed(2)}">
                <div class="pet-shadow"></div>
                <span class="pet-emoji" id="pet-emoji">${this.buddy}</span>
                ${acc}${dirt}
              </div>`;
    }

    _bar(cls, icon, val, invert) {
      const pct = invert ? 100 - val : val;
      return `<div class="pet-bar">
        <span class="pet-bar-ico">${icon}</span>
        <div class="pet-bar-track"><div class="pet-bar-fill ${cls}" style="width:${Math.max(4, pct)}%"></div></div>
      </div>`;
    }

    _renderHome() {
      const m = this.mood();
      this.mount.innerHTML = `
        <div class="pet-room">
          <div class="pet-bubble" id="pet-bubble">${t(m.key)} <span class="pet-bubble-face">${m.face}</span></div>
          ${this._petAvatar("idle", { dirty: true })}
          <div class="pet-name">${t("pet.level", { n: this.size() })}</div>
          <div class="pet-meters">
            ${this._bar("hunger", "🍽️", this.pet.hunger, true)}
            ${this._bar("happy", "❤️", this.pet.happiness, false)}
            ${this._bar("clean", "🫧", this.pet.cleanliness ?? 80, false)}
          </div>
          <div class="pet-actions four">
            <button class="pet-btn" data-act="feed"><span>🍎</span>${t("pet.feed")}</button>
            <button class="pet-btn" data-act="play"><span>🎾</span>${t("pet.play")}</button>
            <button class="pet-btn" data-act="bath"><span>🛁</span>${t("pet.bath")}</button>
            <button class="pet-btn" data-act="shop"><span>🎀</span>${t("pet.dress")}</button>
          </div>
        </div>`;
      this._floatLayer();

      this.mount.querySelector("#pet-avatar").onclick = () => this._pat();
      this.mount.querySelectorAll(".pet-btn").forEach(b =>
        b.onclick = () => { Sound.click(); this.view = b.dataset.act; this.render(); });

      if (this._missed) { this._missed = false; this._say(t("pet.missed"), "😢"); }
      this._justFull = false;
      if (window.Speech) Speech.speak(t(m.key), I18N.getLang());
    }

    _renderQuiz(kind) {
      const heading = kind === "feed" ? t("pet.feedHeading") : t("pet.playHeading");
      const q = makeQuestion(this.age, this.size());
      this._q = q;
      this.mount.innerHTML = `
        <div class="pet-room pet-quiz">
          <button class="pet-back" data-back>◀</button>
          <div class="pet-quiz-pet">${this._petAvatar(kind === "play" ? "play" : "")}</div>
          <div class="pet-quiz-head">${heading}
            <button class="say-btn" aria-label="${t("say.replay")}">🔊</button>
          </div>
          <div class="pet-q">${q.q}</div>
          <div class="pet-choices">
            ${q.choices.map((c, i) => `<button class="pet-choice" data-i="${i}">${c.label}</button>`).join("")}
          </div>
          <div class="pet-feedback" id="pet-fb" hidden></div>
        </div>`;
      this._floatLayer();
      this.mount.querySelector("[data-back]").onclick = () => { Sound.click(); Speech.stop(); this.view = "home"; this.render(); };
      this.mount.querySelectorAll(".pet-choice").forEach(btn =>
        btn.onclick = () => this._answer(+btn.dataset.i, btn, kind));
      const line = heading + ". " + q.q;
      const sb = this.mount.querySelector(".say-btn");
      if (sb) sb.onclick = () => { pulse(sb, "ring"); Speech.speakHtml(line, I18N.getLang()); };
      if (window.Speech) Speech.speakHtml(line, I18N.getLang());
    }

    _answer(i, btn, kind) {
      if (this._locked) return;
      const c = this._q.choices[i];
      const fb = this.mount.querySelector("#pet-fb");
      if (!c.correct) {
        btn.classList.add("bad"); btn.disabled = true;
        Sound.wrong();
        this._emojiClass("sad");
        fb.hidden = false; fb.className = "pet-feedback bad"; fb.textContent = t("fb.tryAgain");
        if (window.Speech) Speech.speak(t("say.tryAgain"), I18N.getLang());
        return;
      }
      if (window.Speech) Speech.speak(t("say.correct"), I18N.getLang());
      this._locked = true;
      btn.classList.add("good");
      this.onStar(1);
      this.pet.treats++;

      if (kind === "feed") {
        const wasFull = this.pet.hunger <= 4;
        this.pet.hunger = Math.max(0, this.pet.hunger - FEED_HUNGER);
        this.pet.happiness = Math.min(100, this.pet.happiness + (wasFull ? 4 : FEED_HAPPY));
        const grew = this._recordFeed();
        Sound.nom();
        this._emojiClass("eat");
        this._hearts(wasFull ? 2 : 4);
        fb.hidden = false; fb.className = "pet-feedback good";
        fb.textContent = wasFull ? t("pet.moodFull") : t("pet.yum");
        if (wasFull || this.pet.hunger <= 4) this._justFull = true;
        setTimeout(() => { this._locked = false; if (grew) this._grow(); else this._backHomeOrNext(kind); }, 900);
      } else {
        this.pet.happiness = Math.min(100, this.pet.happiness + PLAY_HAPPY);
        Sound.heart();
        this._emojiClass("happy");
        this._hearts(3);
        this._ball();
        fb.hidden = false; fb.className = "pet-feedback good"; fb.textContent = t("pet.playWin");
        setTimeout(() => { this._locked = false; this._backHomeOrNext(kind); }, 900);
      }
      this._save();
    }

    _backHomeOrNext(kind) {
      // offer another round or go home, via a tiny inline choice
      const room = this.mount.querySelector(".pet-room");
      if (!room) return;
      const bar = document.createElement("div");
      bar.className = "pet-next";
      bar.innerHTML =
        `<button class="pet-btn small" data-more>➕ ${kind === "feed" ? t("pet.feed") : t("pet.play")}</button>` +
        `<button class="pet-btn small ghost" data-home>🏠</button>`;
      room.appendChild(bar);
      bar.querySelector("[data-more]").onclick = () => { Sound.click(); this.render(); };
      bar.querySelector("[data-home]").onclick = () => { Sound.click(); this.view = "home"; this.render(); };
    }

    _recordFeed() {
      const before = this.size();
      this.pet.fedTotal++;
      return this.size() > before;
    }

    _grow() {
      this._emojiClass("grow");
      Sound.win();
      this._say(t("pet.grew"), "🎉");
      this._hearts(8);
      setTimeout(() => this._backHomeOrNext("feed"), 400);
    }

    _pat() {
      const now = Date.now();
      if (this._patCd && now - this._patCd < 3500) { this._emojiClass("wiggle"); return; }
      this._patCd = now;
      this.pet.happiness = Math.min(100, this.pet.happiness + PAT_HAPPY);
      Sound.purr();
      this._emojiClass("wiggle");
      this._hearts(2);
      this._save();
      // nudge the bubble
      const m = this.mood();
      this._say(t("pet.patted"), "💕");
      const bar = this.mount.querySelector(".pet-bar-fill.happy");
      if (bar) bar.style.width = Math.max(4, this.pet.happiness) + "%";
    }

    _emojiClass(cls) {
      const e = this.mount.querySelector("#pet-emoji");
      if (!e) return;
      const all = ["fx-eat", "fx-happy", "fx-sad", "fx-wiggle", "fx-grow", "fx-play"];
      e.classList.remove(...all);
      void e.offsetWidth;
      e.classList.add("fx-" + cls);
      clearTimeout(this._fxT);
      this._fxT = setTimeout(() => e.classList.remove(...all), 1000);
    }

    _say(text, face) {
      let b = this.mount.querySelector("#pet-bubble");
      if (!b) {
        const room = this.mount.querySelector(".pet-room");
        if (!room) return;
        b = document.createElement("div");
        b.className = "pet-bubble"; b.id = "pet-bubble";
        room.prepend(b);
      }
      b.innerHTML = `${text} <span class="pet-bubble-face">${face || ""}</span>`;
      pulse(b, "say");
    }

    _floatLayer() {
      if (this.mount.querySelector(".pet-floats")) return;
      const f = document.createElement("div");
      f.className = "pet-floats";
      this.mount.querySelector(".pet-room").appendChild(f);
    }

    _hearts(n) {
      const layer = this.mount.querySelector(".pet-floats");
      if (!layer) return;
      for (let i = 0; i < n; i++) {
        const h = document.createElement("i");
        h.textContent = pick(["❤️", "💕", "💖", "✨"]);
        h.style.left = (38 + Math.random() * 24) + "%";
        h.style.animationDelay = (Math.random() * 0.25) + "s";
        h.style.setProperty("--dx", (Math.random() * 60 - 30) + "px");
        layer.appendChild(h);
        setTimeout(() => h.remove(), 1400);
      }
    }

    _ball() {
      const layer = this.mount.querySelector(".pet-floats");
      if (!layer) return;
      const b = document.createElement("i");
      b.className = "pet-ball"; b.textContent = "🎾";
      layer.appendChild(b);
      setTimeout(() => b.remove(), 1100);
    }

    /* ============ BATH TIME ============ */
    _renderBath() {
      if (!this._bath) this._bath = { step: 0, spots: null, rinse: 0, brush: 0, wet: 100, dist: 0 };
      const b = this._bath;
      if (b.step === 4) return this._bathStyle();

      const STEP = ["scrub", "rinse", "brush", "dry"][b.step];
      const tool = ["🧽", "🚿", "🪮", "🌬️"][b.step];
      const titleKey = ["pet.bathScrub", "pet.bathRinse", "pet.bathBrush", "pet.bathDry"][b.step];
      const title = b.step === 2 ? t("pet.bathBrush", { n: 5 }) : t(titleKey);

      if (!b.spots && b.step === 0) {
        const n = R(3, 5);
        b.spots = Array.from({ length: n }, (_, i) => ({
          x: 20 + Math.random() * 58, y: 20 + Math.random() * 56, hits: 2, id: i,
        }));
      }

      const dots = [0, 1, 2, 3, 4].map(i =>
        `<i class="${i < b.step ? "done" : i === b.step ? "now" : ""}"></i>`).join("");

      const spotsHtml = b.step === 0
        ? b.spots.map(s => `<span class="bath-spot" data-id="${s.id}" style="left:${s.x}%;top:${s.y}%"></span>`).join("")
        : "";
      const foam = b.step === 1 ? `<div class="bath-foam" id="bath-foam" style="opacity:${1 - b.rinse / 100}"></div>` : "";
      const wet = (b.step === 1 || b.step === 3) ? `<div class="bath-wet" id="bath-wet"></div>` : "";

      this.mount.innerHTML = `
        <div class="pet-room pet-bath">
          <button class="pet-back" data-back>◀</button>
          <div class="bath-dots">${dots}</div>
          <div class="bath-title" id="bath-title">${title}
            <button class="say-btn" aria-label="${t("say.replay")}">🔊</button>
          </div>
          <div class="bath-stage step-${STEP}" id="bath-stage">
            <div class="pet-tub"></div>
            <div class="bath-petwrap">${this._petAvatar("bathpet")}</div>
            ${wet}${foam}${spotsHtml}
            <div class="bath-tool" id="bath-tool">${tool}</div>
          </div>
          <div class="bath-hint" id="bath-hint">${this._bathHint()}</div>
          <div class="pet-floats"></div>
        </div>`;

      this.mount.querySelector("[data-back]").onclick = () => { Sound.click(); Speech.stop(); this.view = "home"; this._bath = null; this.render(); };
      const sb = this.mount.querySelector(".say-btn");
      if (sb) sb.onclick = () => { pulse(sb, "ring"); Speech.speak(title, I18N.getLang()); };
      if (window.Speech) Speech.speak(title, I18N.getLang());

      this._wireBath();
    }

    _bathHint() {
      const b = this._bath;
      if (b.step === 0) return t("pet.spotsLeft", { n: b.spots.filter(s => s.hits > 0).length });
      if (b.step === 2) return `${b.brush} / 5`;
      return "";
    }

    _wireBath() {
      const stage = this.mount.querySelector("#bath-stage");
      const tool = this.mount.querySelector("#bath-tool");
      if (!stage) return;
      const b = this._bath;
      let down = false;

      const loc = (e) => {
        const r = stage.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100,
                 cx: e.clientX - r.left, cy: e.clientY - r.top };
      };
      const moveTool = (p) => { tool.style.left = p.cx + "px"; tool.style.top = p.cy + "px"; };

      stage.addEventListener("pointerdown", (e) => {
        down = true; b.dist = 0; b.lx = e.clientX; b.ly = e.clientY;
        try { stage.setPointerCapture(e.pointerId); } catch (x) {}
        moveTool(loc(e)); this._bathAt(loc(e), true);
      });
      stage.addEventListener("pointermove", (e) => {
        const p = loc(e); moveTool(p);
        if (down) {
          b.dist += Math.hypot(e.clientX - (b.lx || e.clientX), e.clientY - (b.ly || e.clientY));
          b.lx = e.clientX; b.ly = e.clientY;
          this._bathAt(p, false);
        }
      });
      const stop = () => { down = false; };
      stage.addEventListener("pointerup", stop);
      stage.addEventListener("pointercancel", stop);
      stage.addEventListener("pointerleave", stop);
    }

    _bathFx(cls, text, cx, cy) {
      const layer = this.mount.querySelector("#bath-stage");
      if (!layer) return;
      const i = document.createElement("i");
      i.className = "bath-fx " + cls;
      i.textContent = text;
      i.style.left = cx + "px"; i.style.top = cy + "px";
      layer.appendChild(i);
      setTimeout(() => i.remove(), 750);
    }

    _bathAt(p, isDown) {
      const b = this._bath;
      if (b._locking) return;

      if (b.step === 0) {                       // SCRUB
        let changed = false;
        for (const s of b.spots) {
          if (s.hits <= 0) continue;
          if (Math.hypot(s.x - p.x, s.y - p.y) < 13) {
            s.hits--;
            changed = true;
            this._bathFx("bub", pick(["🫧", "✨", "💫"]), p.cx + R(-10, 10), p.cy + R(-10, 10));
            if (s.hits <= 0) {
              const el = this.mount.querySelector(`.bath-spot[data-id="${s.id}"]`);
              if (el) { el.classList.add("gone"); }
              Sound.star();
            }
          }
        }
        if (changed) {
          Sound.bead();
          const hint = this.mount.querySelector("#bath-hint");
          if (hint) hint.textContent = this._bathHint();
          if (b.spots.every(s => s.hits <= 0)) this._bathNext();
        }
        return;
      }

      if (b.step === 1) {                       // RINSE
        b.rinse = Math.min(100, b.rinse + (isDown ? 6 : 3));
        const foam = this.mount.querySelector("#bath-foam");
        if (foam) foam.style.opacity = 1 - b.rinse / 100;
        this._bathFx("drop", "💧", p.cx + R(-8, 8), p.cy);
        if (b.rinse % 12 < 4) Sound.tick();
        if (b.rinse >= 100) this._bathNext();
        return;
      }

      if (b.step === 2) {                       // BRUSH
        this._bathFx("spark", "✨", p.cx, p.cy);
        if (b.dist > 80) {
          b.dist = 0; b.brush++;
          Sound.bead();
          this._emojiClass("wiggle");
          const hint = this.mount.querySelector("#bath-hint");
          if (hint) hint.textContent = this._bathHint();
          if (b.brush >= 5) this._bathNext();
        }
        return;
      }

      if (b.step === 3) {                       // DRY
        b.wet = Math.max(0, b.wet - (isDown ? 9 : 5));
        this._bathFx("fly", "💦", p.cx + R(-14, 14), p.cy + R(-14, 14));
        if (b.wet % 15 < 5) Sound.tick();
        if (b.wet <= 0) this._bathNext();
        return;
      }
    }

    _bathNext() {
      const b = this._bath;
      b._locking = true;
      Sound.good();
      const pe = this.mount.querySelector("#pet-emoji");
      if (pe) { pe.classList.remove("fx-happy"); void pe.offsetWidth; pe.classList.add("fx-happy"); }
      setTimeout(() => { b._locking = false; b.step++; this._renderBath(); }, 550);
    }

    _bathStyle() {
      const STYLES = [
        { id: "rosy", emoji: "😊", label: "💗" },
        { id: "sparkle", emoji: "🤩", label: "✨" },
        { id: "glow", emoji: "😎", label: "🌟" },
        { id: "rainbow", emoji: "🥰", label: "🌈" },
      ];
      this.mount.innerHTML = `
        <div class="pet-room pet-bath">
          <div class="bath-dots">${[0, 1, 2, 3, 4].map(i => `<i class="${i < 4 ? "done" : "now"}"></i>`).join("")}</div>
          <div class="bath-title">${t("pet.bathStyle")}
            <button class="say-btn" aria-label="${t("say.replay")}">🔊</button>
          </div>
          <div class="bath-stage">
            <div class="bath-petwrap">${this._petAvatar("bathpet clean")}</div>
            <div class="pet-floats"></div>
          </div>
          <div class="bath-styles">
            ${STYLES.map(s => `<button class="bath-style-btn" data-s="${s.id}">${s.label}</button>`).join("")}
          </div>
        </div>`;
      const line = t("pet.bathStyle");
      const sb = this.mount.querySelector(".say-btn");
      if (sb) sb.onclick = () => { pulse(sb, "ring"); Speech.speak(line, I18N.getLang()); };
      if (window.Speech) Speech.speak(line, I18N.getLang());

      this.mount.querySelectorAll(".bath-style-btn").forEach(btn => btn.onclick = () => {
        this.pet.style = btn.dataset.s;
        Sound.star();
        this._bathFinish();
      });
    }

    _bathFinish() {
      this.pet.cleanliness = 100;
      this.pet.happiness = Math.min(100, this.pet.happiness + 18);
      this.pet.treats += 1;
      this.onStar(3);
      this._save();
      Sound.win();
      const pe = this.mount.querySelector("#pet-emoji");
      if (pe) { pe.classList.remove("fx-grow"); void pe.offsetWidth; pe.classList.add("fx-grow"); }
      this._hearts(10);
      this._say(t("pet.bathDone"), "✨");
      if (window.Speech) Speech.speak(t("pet.bathDone"), I18N.getLang());
      setTimeout(() => { this._bath = null; this.view = "home"; this.render(); }, 1500);
    }

    /* ---------- shop ---------- */
    _renderShop() {
      this.mount.innerHTML = `
        <div class="pet-room pet-shop">
          <button class="pet-back" data-back>◀</button>
          <div class="pet-quiz-head">${t("pet.shopTitle")}</div>
          <div class="pet-shop-preview">${this._petAvatar()}</div>
          <div class="pet-treatline">🍎 ${this.pet.treats}</div>
          <div class="pet-shop-grid">
            ${ACCESSORIES.map(a => {
              const owned = this.pet.accessories.includes(a.id);
              const worn = this.pet.wearing === a.id;
              const afford = this.pet.treats >= a.price;
              let btn;
              if (worn) btn = `<button class="pet-shop-btn worn" data-take="${a.id}">${t("pet.takeOff")}</button>`;
              else if (owned) btn = `<button class="pet-shop-btn" data-wear="${a.id}">${t("pet.wear")}</button>`;
              else btn = `<button class="pet-shop-btn ${afford ? "" : "locked"}" data-buy="${a.id}" ${afford ? "" : "disabled"}>🍎 ${a.price}</button>`;
              return `<div class="pet-shop-item ${worn ? "is-worn" : ""}">
                        <span class="pet-shop-emoji">${a.emoji}</span>${btn}
                      </div>`;
            }).join("")}
          </div>
        </div>`;
      this.mount.querySelector("[data-back]").onclick = () => { Sound.click(); this.view = "home"; this.render(); };
      this.mount.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
        const a = accById[b.dataset.buy];
        if (this.pet.treats < a.price) return;
        this.pet.treats -= a.price;
        this.pet.accessories.push(a.id);
        this.pet.wearing = a.id;
        Sound.star(); this._save(); this.render();
      });
      this.mount.querySelectorAll("[data-wear]").forEach(b => b.onclick = () => {
        this.pet.wearing = b.dataset.wear; Sound.click(); this._save(); this.render();
      });
      this.mount.querySelectorAll("[data-take]").forEach(b => b.onclick = () => {
        this.pet.wearing = null; Sound.click(); this._save(); this.render();
      });
    }

    destroy() { this._save(); this.onExit(this.pet); }
  }

  /* summary of pet state for the menu banner */
  function status() {
    const pet = Store.getPet();
    if (!pet) return null;
    const now = Date.now();
    const hrs = (now - (pet.lastSeen || now)) / 3.6e6;
    const bump = hrs > 0.4;
    const hunger = Math.min(100, pet.hunger + (bump ? Math.min(45, Math.round(hrs * 7)) : 0));
    const clean = Math.max(0, (pet.cleanliness ?? 80) - (bump ? Math.min(50, Math.round(hrs * 5)) : 0));
    let key = "menu.buddyHappy";
    if (hunger >= 55) key = "menu.buddyHungry";
    else if (clean <= 28) key = "menu.buddyDirty";
    else if (pet.happiness <= 25) key = "menu.buddyLonely";
    return { hunger, happiness: pet.happiness, clean, key, size: Math.min(5, 1 + Math.floor(pet.fedTotal / GROW_EVERY)) };
  }

  return { Screen: PetScreen, status };
})();
