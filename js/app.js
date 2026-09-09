/* Peanick & Ponita — app shell: screens, profiles, free-play abacus, lessons, games. */
(function () {

  const AVATARS = ["🐢", "🦊", "🐼", "🦁", "🐸", "🦄", "🐙", "🐝", "🐧", "🦕", "🐰", "🐨", "🐬", "🦉"];
  const AGES = [
    { id: "3-5", label: "3–5" },
    { id: "6-8", label: "6–8" },
    { id: "9-12", label: "9–12" },
  ];
  const AGE_COLUMNS = { "3-5": 3, "6-8": 5, "9-12": 7 };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const t = window.t;

  const screens = {
    home: $("#screen-home"),
    menu: $("#screen-menu"),
    play: $("#screen-play"),
    pet: $("#screen-pet"),
  };

  let session = null;      // active GameSession
  let lesson = null;       // active LessonSession
  let petScreen = null;    // active PetScreen
  let freeAbacus = null;   // free-play Abacus

  function show(name) {
    Object.values(screens).forEach(s => s.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    window.scrollTo(0, 0);
  }

  /* ========================= i18n plumbing ========================= */
  function applyI18n() {
    document.documentElement.lang = I18N.getLang();
    document.title = t("app.name");
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    const lt = $("#lang-toggle");
    if (lt) {
      const cur = I18N.LANGS.find(l => l.id === I18N.getLang());
      const other = I18N.LANGS.find(l => l.id !== I18N.getLang());
      lt.textContent = "🌐 " + (other ? other.label : cur.label);
    }
  }

  function setLang(l) {
    Speech.stop();
    I18N.setLang(l);
    Store.setLang(l);
    applyI18n();
    renderHome();
    if (Store.getActive() && screens.menu.classList.contains("is-active")) openMenu();
  }

  $("#lang-toggle").onclick = () => {
    const next = I18N.LANGS.find(l => l.id !== I18N.getLang());
    if (next) { setLang(next.id); Sound.click(); }
  };

  /* ============================ HOME ============================ */
  function renderHome() {
    const list = $("#profile-list");
    const players = Store.players();
    list.innerHTML = "";
    if (!players.length) {
      list.innerHTML = `<p class="tagline" style="grid-column:1/-1">${t("home.addFirst")}</p>`;
    }
    players.forEach((p, idx) => {
      const card = document.createElement("button");
      card.className = "profile-card";
      card.style.setProperty("--i", idx);
      card.innerHTML =
        `<span class="avatar">${p.avatar}</span>` +
        `<span class="pname">${escapeHtml(p.name)}</span>` +
        `<span class="pmeta">${t("common.age")} ${p.age} • ⭐ ${p.stars || 0}</span>`;
      card.onclick = () => { Sound.unlock(); Store.setActive(p.id); openMenu(); };
      list.appendChild(card);
    });
  }

  $("#add-profile").onclick = () => openProfileModal(null);

  /* ======================= PROFILE MODAL ======================= */
  function openProfileModal(existing) {
    const editing = !!existing;
    let name = existing ? existing.name : "";
    let avatar = existing ? existing.avatar : AVATARS[0];
    let age = existing ? existing.age : "6-8";

    const body = `
      <h3>${editing ? t("profile.edit") : t("profile.new")}</h3>
      <div class="field">
        <label>${t("profile.name")}</label>
        <input type="text" id="f-name" maxlength="14" placeholder="${t("profile.namePlaceholder")}" value="${escapeHtml(name)}" />
      </div>
      <div class="field">
        <label>${t("profile.pickBuddy")}</label>
        <div class="pick-row" id="f-avatars">
          ${AVATARS.map(a => `<button data-a="${a}" class="${a === avatar ? "sel" : ""}">${a}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>${t("common.age")}</label>
        <div class="pick-row ages" id="f-ages">
          ${AGES.map(a => `<button data-age="${a.id}" class="${a.id === age ? "sel" : ""}">${a.label}</button>`).join("")}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-soft" id="f-cancel">${t("common.cancel")}</button>
        <button class="btn btn-primary" id="f-save">${editing ? t("common.save") : t("common.create")}</button>
      </div>
      ${editing ? `<button class="link-danger" id="f-delete">${t("profile.delete")}</button>` : ""}
    `;
    openModal(body);

    $("#f-avatars").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      avatar = b.dataset.a;
      $$("#f-avatars button").forEach(x => x.classList.toggle("sel", x === b));
    };
    $("#f-ages").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      age = b.dataset.age;
      $$("#f-ages button").forEach(x => x.classList.toggle("sel", x === b));
    };
    $("#f-cancel").onclick = closeModal;
    $("#f-save").onclick = () => {
      const nm = $("#f-name").value.trim() || t("common.player");
      if (editing) Store.updatePlayer(existing.id, { name: nm, avatar, age });
      else Store.addPlayer({ name: nm, avatar, age });
      closeModal();
      renderHome();
      if (Store.getActive()) openMenu();
    };
    if (editing) $("#f-delete").onclick = () => {
      Store.removePlayer(existing.id);
      closeModal();
      renderHome();
      Music.play("home");
      show("home");
    };
    setTimeout(() => $("#f-name").focus(), 50);
  }

  /* ============================ MENU ============================ */
  function openMenu() {
    const p = Store.getActive();
    if (!p) { show("home"); return; }
    $("#menu-avatar").textContent = p.avatar;
    $("#menu-name").textContent = p.name;
    const starsEl = $("#menu-stars");
    const starTxt = `⭐ ${p.stars || 0}`;
    if (starsEl.textContent && starsEl.textContent !== starTxt) pulse(starsEl);
    starsEl.textContent = starTxt;
    applyI18n();

    // pet banner
    renderPetBanner();

    // lessons
    const lgrid = $("#lesson-grid");
    lgrid.innerHTML = "";
    Lessons.list.forEach((les, i) => {
      const done = Store.isLessonDone(les.id);
      const btn = document.createElement("button");
      btn.className = "tile tile-lesson" + (done ? " is-done" : "");
      btn.style.setProperty("--i", i);
      btn.innerHTML =
        (done ? `<span class="tile-level">${t("menu.lessonDone")}</span>` : "") +
        `<span class="tile-emoji">${les.icon}</span>` +
        `<span class="tile-label">${t(les.title)}</span>`;
      btn.onclick = () => startLesson(les.id);
      lgrid.appendChild(btn);
    });

    // games
    const grid = $("#game-grid");
    grid.innerHTML = "";
    const ordered = [...Games.list].sort((a, b) => rank(a, p.age) - rank(b, p.age));
    ordered.forEach((def, i) => {
      const level = Store.getLevel(def.id);
      const played = (p.plays && p.plays[def.id]) || 0;
      const btn = document.createElement("button");
      btn.className = "tile";
      btn.dataset.age = def.age;
      btn.style.setProperty("--i", i);
      const badge = played ? `<span class="tile-level">${t("menu.level", { n: level })}</span>` : "";
      btn.innerHTML =
        badge +
        `<span class="tile-emoji">${def.emoji}</span>` +
        `<span class="tile-label">${t("game." + def.id + ".title")}</span>` +
        `<span class="tile-sub">${t("game." + def.id + ".blurb")}</span>`;
      btn.onclick = () => startGame(def.id);
      grid.appendChild(btn);
    });

    Music.play("menu");
    show("menu");
  }
  function rank(def, age) { return def.age === age ? 0 : (def.age < age ? 1 : 2); }

  /* ---- pet banner on the menu ---- */
  function renderPetBanner() {
    const p = Store.getActive();
    const el = $("#pet-banner");
    if (!p) { el.hidden = true; return; }
    el.hidden = false;
    const st = Pet.status() || { hunger: 35, happiness: 55, key: "menu.buddyHappy", size: 1 };
    el.className = "pet-banner" + (st.hunger >= 55 ? " is-hungry" : "");
    el.innerHTML =
      `<span class="pet-banner-face">${p.avatar}</span>` +
      `<span class="pet-banner-txt">` +
        `<b>${t("pet.title")}</b> ${t(st.key)}` +
        `<span class="pet-banner-bars">` +
          `<span class="pb"><i>🍽️</i><em style="width:${Math.max(4, 100 - st.hunger)}%"></em></span>` +
          `<span class="pb"><i>❤️</i><em class="h" style="width:${Math.max(4, st.happiness)}%"></em></span>` +
        `</span>` +
      `</span>` +
      `<span class="pet-banner-go">▶</span>`;
    el.onclick = () => { Sound.click(); openPet(); };
  }

  $("#menu-settings").onclick = openSettings;
  function openSettings() {
    const p = Store.getActive();
    const body = `
      <h3>${t("settings.title")}</h3>
      <div class="field">
        <label>${t("settings.language")}</label>
        <div class="pick-row" id="s-langs">
          ${I18N.LANGS.map(l => `<button data-l="${l.id}" class="${l.id === I18N.getLang() ? "sel" : ""}">${l.label}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>${t("settings.sound")}</label>
        <div class="pick-row">
          <button id="snd-on" class="${Store.soundOn() ? "sel" : ""}">${t("settings.on")}</button>
          <button id="snd-off" class="${!Store.soundOn() ? "sel" : ""}">${t("settings.off")}</button>
        </div>
      </div>
      <div class="field">
        <label>${t("settings.music")}</label>
        <div class="pick-row">
          <button id="mus-on" class="${Store.musicOn() ? "sel" : ""}">${t("settings.musicOn")}</button>
          <button id="mus-off" class="${!Store.musicOn() ? "sel" : ""}">${t("settings.musicOff")}</button>
        </div>
      </div>
      <div class="field">
        <label>${t("settings.speech")}</label>
        <div class="pick-row">
          <button id="spk-on" class="${Store.speechOn() ? "sel" : ""}">${t("settings.speechOn")}</button>
          <button id="spk-off" class="${!Store.speechOn() ? "sel" : ""}">${t("settings.speechOff")}</button>
        </div>
        ${(!Speech.supported() || (I18N.getLang() === "km" && !Speech.available("km")))
          ? `<p class="field-note">${t("settings.speechNA")}</p>` : ""}
      </div>
      <div class="modal-actions">
        <button class="btn btn-soft" id="s-close">${t("common.close")}</button>
        <button class="btn btn-primary" id="s-edit">${t("settings.editPlayer")}</button>
      </div>
      <button class="link-danger" id="s-switch">${t("settings.switchPlayer")}</button>
    `;
    openModal(body);
    $("#s-langs").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      setLang(b.dataset.l);
      openSettings();   // re-render the modal in the new language
    };
    $("#snd-on").onclick = () => { Store.setSound(true); Sound.setEnabled(true); Sound.good(); refreshSound(); };
    $("#snd-off").onclick = () => { Store.setSound(false); Sound.setEnabled(false); refreshSound(); };
    function refreshSound() {
      $("#snd-on").classList.toggle("sel", Store.soundOn());
      $("#snd-off").classList.toggle("sel", !Store.soundOn());
    }
    $("#mus-on").onclick = () => { Store.setMusic(true); Music.setEnabled(true); refreshMusic(); };
    $("#mus-off").onclick = () => { Store.setMusic(false); Music.setEnabled(false); refreshMusic(); };
    function refreshMusic() {
      $("#mus-on").classList.toggle("sel", Store.musicOn());
      $("#mus-off").classList.toggle("sel", !Store.musicOn());
    }
    $("#spk-on").onclick = () => {
      Store.setSpeech(true); Speech.setEnabled(true);
      Speech.speak(t("say.correct"), I18N.getLang());
      refreshSpeech();
    };
    $("#spk-off").onclick = () => { Store.setSpeech(false); Speech.setEnabled(false); refreshSpeech(); };
    function refreshSpeech() {
      $("#spk-on").classList.toggle("sel", Store.speechOn());
      $("#spk-off").classList.toggle("sel", !Store.speechOn());
    }
    $("#s-close").onclick = closeModal;
    $("#s-edit").onclick = () => { closeModal(); openProfileModal(p); };
    $("#s-switch").onclick = () => { closeModal(); Music.play("home"); show("home"); renderHome(); };
  }

  /* ==================== PLAY: elements bundle ==================== */
  const playEls = {
    prompt: $("#prompt"),
    finger: $("#finger-hint"),
    abacusMount: $("#abacus-mount"),
    readout: $("#readout"),
    readoutValue: $("#readout-value"),
    controls: $("#game-controls"),
    feedback: $("#feedback"),
    btnCheck: $("#btn-check"),
    btnNext: $("#btn-next"),
    btnReset: $("#btn-reset"),
    score: $("#play-score"),
  };

  const mascotEl = $("#mascot");
  const mascotFace = $("#mascot-face");
  function reactMascot(kind) {
    if (mascotEl.hidden) return;
    mascotEl.classList.remove("r-happy", "r-sad", "r-think");
    void mascotEl.offsetWidth;
    mascotEl.classList.add("r-" + kind);
  }
  playEls.onReact = reactMascot;

  function closePet() {
    Speech.stop();
    if (petScreen) { petScreen.destroy(); petScreen = null; }
  }

  function openPet() {
    closePet();
    const p = Store.getActive();
    if (!p) { show("home"); return; }
    $("#pet-screen-title").textContent = t("pet.title");
    const treatsEl = $("#pet-treats");

    petScreen = new Pet.Screen($("#pet-stage"), {
      buddy: p.avatar,
      age: p.age,
      onStar: (n) => { Store.addStars(n); },
      onChange: (pet) => {
        const txt = `🍎 ${pet.treats}`;
        if (treatsEl.textContent !== txt) pulse(treatsEl);
        treatsEl.textContent = txt;
      },
    });
    const pet = Store.getPet();
    treatsEl.textContent = `🍎 ${pet ? pet.treats : 0}`;
    petScreen.render();
    Music.play("menu");
    show("pet");
  }

  function resetPlayScreen() {
    Speech.stop();
    if (session) { session.destroy(); session = null; }
    if (lesson) { lesson.destroy(); lesson = null; }
    closePet();
    freeAbacus = null;
    playEls.abacusMount.innerHTML = "";
    playEls.controls.innerHTML = "";
    playEls.prompt.hidden = true;
    playEls.finger.hidden = true;
    playEls.controls.hidden = true;
    playEls.feedback.hidden = true;
    playEls.readout.hidden = true;
    playEls.btnCheck.hidden = true;
    playEls.btnNext.hidden = true;
    playEls.btnReset.hidden = true;
    playEls.btnReset.textContent = t("play.reset");
    playEls.btnCheck.textContent = t("play.check");
    playEls.btnNext.textContent = t("play.next");
    mascotEl.hidden = true;
    $("#level-toast").className = "level-toast";
  }

  /* ---- free-play abacus ---- */
  function openAbacus() {
    resetPlayScreen();
    const p = Store.getActive();
    $("#play-title").textContent = t("menu.abacus");
    playEls.score.textContent = `⭐ ${p ? p.stars || 0 : 0}`;
    playEls.abacusMount.hidden = false;
    playEls.readout.hidden = false;
    playEls.btnReset.hidden = false;

    freeAbacus = new Abacus(playEls.abacusMount, {
      columns: AGE_COLUMNS[p ? p.age : "6-8"],
      showPlaces: true,
      showRodValues: true,
      large: true,
      onChange: (v) => { playEls.readoutValue.textContent = v; pulse(playEls.readoutValue); },
    });
    playEls.btnReset.onclick = () => { freeAbacus.reset(); Sound.click(); };
    Music.play("menu");
    show("play");
  }

  /* ---- lessons ---- */
  function startLesson(id) {
    const les = Lessons.get(id);
    if (!les) return;
    resetPlayScreen();
    const p = Store.getActive();
    $("#play-title").textContent = t(les.title);
    playEls.score.textContent = les.icon;

    const buddy = p ? p.avatar : "🐢";
    mascotFace.textContent = buddy;
    mascotEl.hidden = false;
    mascotEl.className = "mascot";

    lesson = new Lessons.Session(les, playEls, { onDone: () => finishLesson(les) });
    Music.play("menu");
    show("play");
    lesson.start();
  }

  function finishLesson(les) {
    if (lesson) { lesson.destroy(); lesson = null; }
    Store.markLessonDone(les.id);
    mascotEl.hidden = true;
    const p = Store.getActive();
    const body = `
      <div class="summary-buddy">${p ? p.avatar : "🎉"}</div>
      <h3>${t("lesson.doneTitle")}</h3>
      <div class="summary-stars"><span>${les.icon}</span></div>
      <p>${t(les.title)}</p>
      <div class="modal-actions">
        <button class="btn btn-soft" id="ls-menu">${t("lesson.more")}</button>
        <button class="btn btn-primary" id="ls-games">${t("lesson.toGames")}</button>
      </div>
    `;
    openModal(body);
    burstConfetti();
    $("#ls-menu").onclick = () => { closeModal(); openMenu(); };
    $("#ls-games").onclick = () => { closeModal(); openMenu(); };
  }

  /* ---- run a game ---- */
  function startGame(id) {
    const def = Games.get(id);
    if (!def) return;
    resetPlayScreen();
    const p = Store.getActive();
    $("#play-title").textContent = t("game." + def.id + ".title");
    playEls.score.textContent = def.timed ? "✓ 0" : "⭐ 0";

    const buddy = p ? p.avatar : "🐢";
    mascotFace.textContent = buddy;
    mascotEl.hidden = false;
    mascotEl.className = "mascot";
    playEls.buddy = buddy;

    session = new Games.Session(def, playEls, {
      age: p ? p.age : "6-8",
      level: Store.getLevel(def.id),
      onDone: (res) => finishGame(def, res),
    });
    Music.play("game");
    show("play");
    session.start();
  }

  function finishGame(def, res) {
    if (session) { session.destroy(); session = null; }
    mascotEl.hidden = true;
    const earned = res.stars;
    Store.addStars(earned);
    Store.recordScore(def.id, res.correct);
    if (res.level) Store.setLevel(def.id, res.level);

    const p = Store.getActive();
    const buddy = p ? p.avatar : "🎉";
    const lines = [];
    if (res.timed) lines.push(`<p>${t("sum.timed", { n: res.correct })}</p>`);
    else {
      lines.push(`<p>${t("sum.score", { c: res.correct, t: res.total })}</p>`);
      if (res.bonus) lines.push(`<p>${t("sum.bonus", { n: res.bonus })}</p>`);
    }
    if (def.combo && res.bestCombo >= 3) lines.push(`<p>${t("sum.combo", { n: res.bestCombo })}</p>`);
    if (res.level > res.startLevel) lines.push(`<p>${t("sum.levelUp", { n: res.level })}</p>`);
    else if (res.level < res.startLevel) lines.push(`<p class="tagline">${t("sum.levelDown", { n: res.level })}</p>`);
    else if (res.level) lines.push(`<p class="tagline">${t("sum.levelSame", { n: res.level })}</p>`);

    const body = `
      <div class="summary-buddy">${buddy}</div>
      <h3>${t("sum.nice")}</h3>
      <div class="summary-stars"><span>＋${earned}</span> ⭐</div>
      ${lines.join("")}
      <p class="tagline">${t("sum.total", { n: p ? p.stars : earned })}</p>
      <div class="modal-actions">
        <button class="btn btn-soft" id="sum-menu">${t("sum.menu")}</button>
        <button class="btn btn-primary" id="sum-again">${t("sum.again")}</button>
      </div>
    `;
    openModal(body);
    burstConfetti();
    $("#sum-menu").onclick = () => { closeModal(); openMenu(); };
    $("#sum-again").onclick = () => { closeModal(); startGame(def.id); };
  }

  /* ===================== nav buttons ===================== */
  $$("[data-go]").forEach(b => b.onclick = () => {
    const dest = b.dataset.go;
    if (dest === "home") { resetPlayScreen(); renderHome(); Music.play("home"); show("home"); }
    else if (dest === "menu") { resetPlayScreen(); openMenu(); }
  });
  $$("[data-play]").forEach(b => b.onclick = () => {
    if (b.dataset.play === "abacus") openAbacus();
  });

  /* ===================== modal helpers ===================== */
  const modalRoot = $("#modal-root");
  function openModal(html) {
    $("#modal-body").innerHTML = html;
    modalRoot.hidden = false;
  }
  function closeModal() { modalRoot.hidden = true; $("#modal-body").innerHTML = ""; }
  modalRoot.onclick = (e) => { if (e.target === modalRoot) closeModal(); };

  /* ===================== confetti ===================== */
  const COLORS = ["#ffcf3f", "#ff7a59", "#3ddc84", "#6ac2ff", "#9d7bff", "#ff6b6b"];
  function burstConfetti() {
    const root = $("#confetti");
    root.innerHTML = "";
    for (let i = 0; i < 70; i++) {
      const c = document.createElement("i");
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = COLORS[i % COLORS.length];
      c.style.animationDuration = (1.6 + Math.random() * 1.6) + "s";
      c.style.animationDelay = (Math.random() * 0.4) + "s";
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      root.appendChild(c);
    }
    setTimeout(() => { root.innerHTML = ""; }, 3600);
  }

  /* ===================== misc ===================== */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (freeAbacus) freeAbacus._layout();
      if (session && session.abacus) session.abacus._layout();
      if (lesson && lesson.abacus) lesson.abacus._layout();
    }, 150);
  });

  window.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

  // audio can only start after a user gesture — keep nudging Music until it's playing
  function musicUnlock() {
    Music.unlock();
    if (Music.isPlaying() || !Store.musicOn()) detach();
  }
  function detach() {
    window.removeEventListener("pointerdown", musicUnlock);
    window.removeEventListener("keydown", musicUnlock);
  }
  window.addEventListener("pointerdown", musicUnlock);
  window.addEventListener("keydown", musicUnlock);

  /* ===================== boot ===================== */
  I18N.setLang(Store.lang());
  applyI18n();
  Sound.setEnabled(Store.soundOn());
  Music.setEnabled(Store.musicOn());
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !isLocalHost) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  Speech.setEnabled(Store.speechOn());
  try { BgFx.init(); } catch (e) {}
  renderHome();
  const active = Store.getActive();
  if (active) openMenu(); else { Music.play("home"); show("home"); }

})();
