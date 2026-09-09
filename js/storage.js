/* Local persistence for players + progress. All in localStorage. */
window.Store = (function () {
  const KEY = "beadbuddies.v1";

  const DEFAULT = { players: [], activeId: null, sound: true, music: true, speech: true, lang: "en" };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT };
      const data = JSON.parse(raw);
      return { ...DEFAULT, ...data };
    } catch (e) {
      return { ...DEFAULT };
    }
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function uid() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  return {
    all() { return state; },
    players() { return state.players; },
    getActive() { return state.players.find(p => p.id === state.activeId) || null; },
    setActive(id) { state.activeId = id; save(); },

    soundOn() { return state.sound !== false; },
    setSound(v) { state.sound = !!v; save(); },

    musicOn() { return state.music !== false; },
    setMusic(v) { state.music = !!v; save(); },

    lang() { return state.lang || "en"; },
    setLang(l) { state.lang = l; save(); },

    speechOn() { return state.speech !== false; },
    setSpeech(v) { state.speech = !!v; save(); },

    addPlayer({ name, avatar, age }) {
      const p = {
        id: uid(),
        name: name || "Player",
        avatar: avatar || "🐢",
        age: age || "6-8",
        stars: 0,
        best: {},        // gameId -> best score
        plays: {},       // gameId -> times played
        levels: {},      // gameId -> current adaptive level (1..MAX)
        lessonsDone: {},
        pet: null,       // { hunger, happiness, treats, fedTotal, accessories, wearing, lastSeen }
        created: Date.now(),
      };
      state.players.push(p);
      state.activeId = p.id;
      save();
      return p;
    },

    updatePlayer(id, patch) {
      const p = state.players.find(x => x.id === id);
      if (!p) return;
      Object.assign(p, patch);
      save();
    },

    removePlayer(id) {
      state.players = state.players.filter(p => p.id !== id);
      if (state.activeId === id) state.activeId = state.players[0] ? state.players[0].id : null;
      save();
    },

    addStars(n) {
      const p = this.getActive();
      if (!p) return 0;
      p.stars = Math.max(0, (p.stars || 0) + n);
      save();
      return p.stars;
    },

    recordScore(gameId, score) {
      const p = this.getActive();
      if (!p) return;
      p.best = p.best || {};
      p.plays = p.plays || {};
      p.plays[gameId] = (p.plays[gameId] || 0) + 1;
      if (score != null && score > (p.best[gameId] || 0)) p.best[gameId] = score;
      save();
    },

    isLessonDone(id) {
      const p = this.getActive();
      return !!(p && p.lessonsDone && p.lessonsDone[id]);
    },

    markLessonDone(id) {
      const p = this.getActive();
      if (!p) return;
      p.lessonsDone = p.lessonsDone || {};
      p.lessonsDone[id] = true;
      save();
    },

    getPet() {
      const p = this.getActive();
      if (!p) return null;
      if (!p.pet) {
        p.pet = { hunger: 35, happiness: 55, cleanliness: 80, treats: 0, fedTotal: 0, accessories: [], wearing: null, style: null, lastSeen: Date.now() };
        save();
      }
      if (p.pet.cleanliness == null) p.pet.cleanliness = 80;
      return p.pet;
    },

    savePet(pet) {
      const p = this.getActive();
      if (!p) return;
      p.pet = pet;
      save();
    },

    getLevel(gameId) {
      const p = this.getActive();
      return (p && p.levels && p.levels[gameId]) || 1;
    },

    setLevel(gameId, level) {
      const p = this.getActive();
      if (!p) return;
      p.levels = p.levels || {};
      p.levels[gameId] = level;
      save();
    },
  };
})();
