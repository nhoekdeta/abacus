/* Soroban-style abacus widget.
   Each rod: 1 heaven bead (=5) above the beam, 4 earth beads (=1 each) below.
   Heaven bead counts when pushed DOWN to the beam; earth beads count when pushed UP. */
window.Abacus = (function () {

  const PLACE_LABELS = ["1", "10", "100", "1,000", "10,000", "100,000", "1,000,000"];

  class Abacus {
    constructor(mount, opts = {}) {
      this.mount = mount;
      this.columns = opts.columns || 5;
      this.onChange = opts.onChange || function () {};
      this.locked = !!opts.locked;
      this.showRodValues = "showRodValues" in opts ? opts.showRodValues : !this.locked;
      this.showPlaces = !!opts.showPlaces;
      this.compact = !!opts.compact;
      this.large = !!opts.large;
      // rods[i]: index 0 is the RIGHT-most (ones)
      this.rods = Array.from({ length: this.columns }, () => ({ heaven: false, earth: 0 }));
      this.render();
    }

    _geo() {
      const cs = getComputedStyle(this.el);
      const px = (v, d) => { const n = parseFloat(cs.getPropertyValue(v)); return isNaN(n) ? d : n; };
      const beadH = px("--bead-h", 26);
      const gap = px("--gap", 7);
      const unit = beadH + gap;
      const beamH = 12;
      const beamY = beadH + unit;                 // heaven bead: rest at top, travels one unit to the beam
      const earthTop = beamY + beamH + 4;         // top-most "up" (active) earth-bead position
      const trackH = earthTop + 4 * unit + beadH + 8;  // 4 earth beads at rest + travel room + slack
      return { beadH, gap, unit, beamH, beamY, earthTop, trackH };
    }

    render() {
      this.mount.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "abacus-scroll";

      const el = document.createElement("div");
      el.className = "abacus" + (this.locked ? " locked" : "") +
        (this.compact ? " compact" : "") + (this.large ? " large" : "");
      this.el = el;
      this._beads = [];

      for (let disp = 0; disp < this.columns; disp++) {
        const idx = this.columns - 1 - disp;
        const rod = document.createElement("div");
        rod.className = "rod";

        if (this.showPlaces) {
          const hint = document.createElement("div");
          hint.className = "place-hint";
          hint.textContent = idx < PLACE_LABELS.length ? PLACE_LABELS[idx] : "";
          rod.appendChild(hint);
        }

        const track = document.createElement("div");
        track.className = "rod-track";
        track.dataset.idx = idx;

        const beam = document.createElement("div");
        beam.className = "beam";
        track.appendChild(beam);

        const hb = document.createElement("div");
        hb.className = "bead heaven";
        hb.dataset.idx = idx;
        hb.dataset.kind = "heaven";
        track.appendChild(hb);

        const eBeads = [];
        for (let j = 1; j <= 4; j++) {
          const b = document.createElement("div");
          b.className = "bead earth";
          b.dataset.idx = idx;
          b.dataset.kind = "earth";
          b.dataset.j = j;
          track.appendChild(b);
          eBeads.push(b);
        }
        rod.appendChild(track);

        let rvEl = null;
        if (this.showRodValues) {
          rvEl = document.createElement("div");
          rvEl.className = "rod-value";
          rvEl.textContent = "0";
          rod.appendChild(rvEl);
        }

        this._beads.push({ track, heaven: hb, earth: eBeads, rvEl, idx });
        el.appendChild(rod);
      }

      el.addEventListener("click", (e) => this._onClick(e));
      wrap.appendChild(el);
      this.mount.appendChild(wrap);
      requestAnimationFrame(() => this._layout());
    }

    _layout() {
      const g = this._geo();
      for (const r of this._beads) {
        const st = this.rods[r.idx];
        r.track.style.height = g.trackH + "px";

        const beam = r.track.querySelector(".beam");
        beam.style.top = g.beamY + "px";
        beam.style.height = g.beamH + "px";

        r.heaven.style.top = (st.heaven ? (g.beamY - g.beadH - 1) : 1) + "px";

        // earth: beads 1..k pushed UP to the beam; the rest rest at the BOTTOM (stack shifted down one unit)
        const k = st.earth;
        r.earth.forEach((b, i) => {
          const j = i + 1;
          b.style.top = (j <= k)
            ? (g.earthTop + (j - 1) * g.unit) + "px"
            : (g.earthTop + j * g.unit) + "px";
        });

        if (r.rvEl) r.rvEl.textContent = String((st.heaven ? 5 : 0) + st.earth);
      }
    }

    _onClick(e) {
      if (this.locked) return;
      const b = e.target.closest(".bead");
      if (!b) return;
      const idx = +b.dataset.idx;
      const st = this.rods[idx];
      if (b.dataset.kind === "heaven") {
        st.heaven = !st.heaven;
      } else {
        const j = +b.dataset.j;
        st.earth = (j <= st.earth) ? j - 1 : j;
      }
      if (window.Sound) Sound.bead();
      this._layout();
      this.onChange(this.getValue());
    }

    getValue() {
      let total = 0, mult = 1;
      for (let i = 0; i < this.columns; i++) {
        total += ((this.rods[i].heaven ? 5 : 0) + this.rods[i].earth) * mult;
        mult *= 10;
      }
      return total;
    }

    setValue(n) {
      n = Math.max(0, Math.floor(n));
      for (let i = 0; i < this.columns; i++) {
        const d = n % 10;
        this.rods[i].heaven = d >= 5;
        this.rods[i].earth = d % 5;
        n = Math.floor(n / 10);
      }
      this._layout();
      this.onChange(this.getValue());
    }

    reset() { this.setValue(0); }

    setLocked(v) {
      this.locked = !!v;
      if (this.el) this.el.classList.toggle("locked", this.locked);
    }

    setColumns(n) {
      this.columns = n;
      this.rods = Array.from({ length: n }, () => ({ heaven: false, earth: 0 }));
      this.render();
    }

    /* ---- teaching highlights ----
       specs: "heaven-<rod>", "earth-<rod>", "earth-<rod>-<j>", "beam-<rod>", "rod-<rod>"
       where <rod> is the rods[] index (0 = ones). */
    clearHighlight() {
      if (this.el) this.el.querySelectorAll(".focus").forEach(e => e.classList.remove("focus"));
    }

    highlight(list) {
      this.clearHighlight();
      (list || []).forEach(spec => {
        const parts = spec.split("-");
        const kind = parts[0], idx = +parts[1], j = parts[2];
        const rec = this._beads.find(b => b.idx === idx);
        if (!rec) return;
        if (kind === "heaven") rec.heaven.classList.add("focus");
        else if (kind === "earth") {
          if (j != null) { const b = rec.earth[+j - 1]; if (b) b.classList.add("focus"); }
          else rec.earth.forEach(b => b.classList.add("focus"));
        } else if (kind === "beam") {
          const bm = rec.track.querySelector(".beam");
          if (bm) bm.classList.add("focus");
        } else if (kind === "rod") {
          rec.heaven.classList.add("focus");
          rec.earth.forEach(b => b.classList.add("focus"));
        }
      });
    }
  }

  return Abacus;
})();
