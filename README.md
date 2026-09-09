# Peanick & Ponita Playground  ·  ពាណិជ និង ពនិតា ទីលានលេង 🧮

A friendly abacus + number-game web app for kids aged 3–12. Pure HTML/CSS/JS —
no build step, no dependencies, works offline.

## Run it

**Easiest:** double-click **`Start Peanick and Ponita Playground.bat`** (Windows). It starts a
local server and opens the app in your browser. Keep that window open while
playing; close it to stop. (macOS / Linux / Git Bash: run `./start.sh`.)

Manually, if you prefer:

```
cd D:\ai\abacus
python -m http.server 8777
```

Then open **http://localhost:8777** in a browser. (Serve it over HTTP — don't
just double-click `index.html` — because of the service worker and module files.) On a phone/tablet on the same
Wi-Fi, use your computer's IP (e.g. `http://192.168.1.20:8777`) and "Add to Home
Screen" to install it like an app.

Any static host works too (GitHub Pages, Netlify, Cloudflare Pages, etc.) — just
upload the folder.

## What's inside

**Players** — each child gets a profile (name, buddy, age band). The age band
sets the free-play abacus size and orders the game menu. Stars, levels and best
scores are saved per player in the browser (`localStorage`).

**Adaptive difficulty** — every game has 6 levels. Two right in a row (first
try) bumps the kid up a level; two misses in a row eases them back down. The
level is remembered per game and shown on the menu tile and during play. Their
animal buddy reacts on screen to right and wrong answers.

**My Buddy** — a pet the child raises by doing math. Hunger and cleanliness both
drop over real time. **Feed** it and **Play** with it by answering quick number
questions; tap it to **pat** it; use **Bath** for a 5-step spa — scrub the dirt
spots off (counting), rinse the foam away, brush 5 times (counting), blow it dry,
then pick a sparkly "makeup" look that stays on the pet. Spend earned treats in
**Buddy's Closet** on 7 accessories. It grows a size every 6 feeds (Level 1→5).
The pet is the child's chosen avatar; state (hunger, happiness, cleanliness,
style, wardrobe) is saved per player. A menu banner shows its mood at a glance,
and it looks visibly grubby with dirt spots when it needs a bath.

**Learn the Abacus** — five guided lessons for kids who've never used one:
what the beam and each bead mean, then hands-on finger technique (thumb pushes
beads up 👍, index finger pushes them down ☝️), the 5-bead, and making 10.
Beads glow to show where to move; the child must reach the target to advance.
Progress is ticked off per lesson.

**Languages** — English and Khmer (ខ្មែរ). Toggle on the player-picker screen
or in Settings; the choice is remembered. All UI, game prompts, feedback and
lessons are translated. Digits stay as 0–9 everywhere. (Add a language by
extending `STR` in `js/i18n.js` and `I18N.LANGS`.)

**Read aloud** (`js/speech.js`) — for pre-readers, every question, lesson step
and pet prompt is spoken, with a 🔊 button to hear it again, plus a spoken
"Correct!" / "Try again". Uses the browser's built-in text-to-speech (no audio
files). English narration works everywhere; Khmer needs a Khmer TTS voice on the
device (built in on most Android tablets) — where it's missing, Khmer narration
stays silent and Settings says so. Toggle it in Settings.

**Motion** — screen, tile and card entrances, springy buttons, hover lift,
bead physics, mascot idle bob, pop on the score/value chips, bouncy modals.
Everything respects `prefers-reduced-motion`.

**Interactive background** (`js/bgfx.js`) — a canvas of friendly floaters
(stars, bubbles, bees, flowers…) drifting behind the app. Moving the mouse or a
finger pushes them away; tapping empty space makes a sparkle burst, and tapping
a floater pops it. It sits behind the UI so it never blocks a button, and it
turns itself off for `prefers-reduced-motion` and when the tab is hidden.

**Free play**
- **Abacus** — a real soroban: 1 heaven bead (=5) per rod, 4 earth beads (=1).
  Tap beads to move them; the value updates live. Rod size follows the player's age.

**Games**

| Game | Age | Skill |
|------|-----|-------|
| Bubble Pop | 3–5 | Pop the target number, or bubbles that make 10, or a sequence in order — tap the rising bubbles |
| Count the Things | 3–5 | Counting, number recognition |
| How Many? | 3–5 | Matching a numeral to a quantity |
| Slide to Count | 3–5 | Setting the abacus to a count (1 rod) |
| Number Line Jump | 3–5 | +/− intuition — hop along a number line |
| Build the Number | 6–8 | Place value on the abacus (grows with level) |
| Make Ten | 6–8 | Number bonds to 10 / 20 / 100 |
| Read the Abacus | 6–8 | Reading a value off the beads |
| Add & Subtract | 6–8 | ± within 10 → 100, abacus as scratch |
| Skip Counting | 6–8 | Fill the blank counting by 2s…9s (and backwards) |
| Big Numbers | 9–12 | 3–6 digit place value |
| Times Tables | 9–12 | ×2 to ×12 |
| Abacus Race | 9–12 | Two-step sums on the abacus against a per-question clock, combo streaks |
| Speed Drill | 9–12 | 60-second mixed +/−/× |

Correct on the first try = 2 ⭐, after a retry = 1 ⭐, all-correct round = +3 ⭐
bonus, Abacus Race combo of 3+ = extra ⭐ each.

## Project layout

```
index.html                 app shell / screens
css/styles.css             all styling (theme-aware, mobile-friendly)
js/i18n.js                 English + Khmer strings, t("key", {vals})
js/speech.js               read-aloud narration (browser TTS, en + km)
js/bgfx.js                 interactive canvas background (floaters kids can poke)
js/audio.js                WebAudio sound effects (generated, no files)
js/storage.js              players + progress + language in localStorage
js/abacus.js               the soroban widget (+ teaching highlights)
js/games.js                game catalog + the round/scoring runner
js/lessons.js              the "Learn the Abacus" guided lessons
js/pet.js                  "My Buddy" — the pet care mini-game
js/app.js                  screens, profiles, lessons, pet, wiring
manifest.webmanifest + sw.js + icons/   PWA / offline
```

## Tweaking

- **Add a game**: add an entry to `DEFS` in `js/games.js`. `makeRound(s)` gets
  `{ age, round, total, level }` and returns `{ prompt, input, ... }` where
  `input` is `"choices"`, `"keypad"`, `"abacus"`, or `"numberline"`. Optional:
  `roundTime` (per-question countdown), `combo: true`. The runner handles scoring,
  levels and the mascot.
- **Tune the difficulty curve**: each game scales off `s.level` via the
  `lvl(level, [...])` helper — edit those per-level arrays.
- **Level-up / level-down feel**: the streak thresholds are in `GameSession`
  (`goodStreak >= 2`, `badStreak >= 2`).
- **Add / edit a lesson**: `LIST` in `js/lessons.js`. A step is
  `{ say, cols, places, set, want, focus:["earth-0",...], finger:"thumb" }` —
  `want` is the value the child must build to move on. Text lives in `js/i18n.js`.
- **Translations**: `js/i18n.js`. Missing keys fall back to English, so a partial
  translation is safe to ship.
- **Change abacus columns per age**: `AGE_COLUMNS` in `js/app.js` (game abaci
  auto-grow to fit the target number).
- The service worker is disabled on `localhost` so edits show up on reload. Bump
  `CACHE` in `sw.js` when you deploy a new version.
