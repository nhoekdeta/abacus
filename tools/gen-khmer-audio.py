#!/usr/bin/env python3
"""
Generate the Khmer voice-clip library for Peanick & Ponita Playground.

Why this exists: the app reads questions aloud with the browser's built-in
text-to-speech. Khmer TTS ships on most Android/iOS devices but not on
Windows/Mac desktop, so on those it is silent. This script pre-renders a small
library of Khmer audio clips (numbers, operators, and every fixed phrase) with
Google Translate TTS. js/khmer-audio.js plays them back-to-back and composes any
number from the parts, so Khmer read-aloud works on every device, offline.

Run from the repo root:   python tools/gen-khmer-audio.py
Needs:  pip install gtts   (and a network connection)

Output: audio/km/*.mp3 + audio/km/manifest.json
Re-run any time the Khmer strings in js/i18n.js change. Existing clips are
skipped unless --force is passed.
"""

import json
import os
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "audio", "km")
I18N = os.path.join(ROOT, "js", "i18n.js")
FORCE = "--force" in sys.argv

# ---------------------------------------------------------------------------
# 1. Text processing — MUST match toText()+normalize() in js/khmer-audio.js
# ---------------------------------------------------------------------------

# Keep this list identical to SYM.km in js/speech.js.
SYM_KM = [
    (r"\s*\+\s*", " បូក "),
    (r"\s*[−–-]\s*", " ដក "),
    (r"\s*×\s*", " គុណ "),
    (r"\s*÷\s*", " ចែក "),
    (r"\s*=\s*", " ស្មើ "),
    (r"\s*→\s*", " បន្ទាប់មក "),
    (r"[•·]", " "),
    (r"\?", " "),
]
EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF"
    "\U00002B00-\U00002BFF\U0000FE0F\U0000200D\U000020E3]"
)
# Dropped before matching — must match normalize() in js/khmer-audio.js.
PUNCT = re.compile(r"[។៕៖៚–—‒…!?,:;.\-«»“”]")


def to_text(html):
    """Port of toText(html, 'km') from speech.js (symbols already handled here)."""
    s = re.sub(r"<[^>]*>", " ", str(html))
    s = s.replace("&nbsp;", " ").replace("&mdash;", " ").replace("&amp;", " និង ")
    s = EMOJI.sub("", s)
    for pat, rep in SYM_KM:
        s = re.sub(pat, rep, s)
    return re.sub(r"\s+", " ", s).strip()


def normalize(s):
    """Port of normalize() from khmer-audio.js: drop punctuation, collapse space."""
    s = PUNCT.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def key(html):
    return normalize(to_text(html))


# ---------------------------------------------------------------------------
# 2. Read the Khmer strings out of js/i18n.js
# ---------------------------------------------------------------------------

def load_km_strings():
    src = open(I18N, encoding="utf-8").read()
    m = re.search(r"\n    km: \{\n(.*?)\n    \},\n", src, flags=re.S)
    if not m:
        sys.exit("Could not find the km: { ... } block in js/i18n.js")
    out = {}
    for line in m.group(1).splitlines():
        lm = re.match(r'\s*"([^"]+)":\s*"(.*)",?\s*$', line)
        if lm:
            out[lm.group(1)] = lm.group(2).encode().decode("unicode_escape") \
                if "\\u" in lm.group(2) else lm.group(2)
    return out


KM = load_km_strings()


def s(k):
    if k not in KM:
        sys.exit(f"i18n key missing from km block: {k}")
    return KM[k]


# ---------------------------------------------------------------------------
# 3. What to synthesize
# ---------------------------------------------------------------------------

# Khmer cardinal numbers 0..100 — spoken as single natural clips.
ONES = ["សូន្យ", "មួយ", "ពីរ", "បី", "បួន", "ប្រាំ",
        "ប្រាំមួយ", "ប្រាំពីរ", "ប្រាំបី", "ប្រាំបួន"]
TENS = {10: "ដប់", 20: "ម្ភៃ", 30: "សាមសិប", 40: "សែសិប", 50: "ហាសិប",
        60: "ហុកសិប", 70: "ចិតសិប", 80: "ប៉ែតសិប", 90: "កៅសិប"}


def num_word(n):
    if n <= 9:
        return ONES[n]
    if n == 100:
        return "មួយរយ"
    if n in TENS:
        return TENS[n]
    if n < 20:
        return "ដប់" + ONES[n - 10]
    t, o = divmod(n, 10)
    return TENS[t * 10] + ONES[o]


PLACES = {
    "100": ("p_roy", "រយ"),
    "1000": ("p_poan", "ពាន់"),
    "10000": ("p_meun", "ម៉ឺន"),
    "100000": ("p_saen", "សែន"),
    "1000000": ("p_lean", "លាន"),
}

OPS = {
    "បូក": "op_plus", "ដក": "op_minus", "គុណ": "op_times",
    "ចែក": "op_divide", "ស្មើ": "op_equals", "បន្ទាប់មក": "op_then",
}

# Fixed phrases. Whole-utterance clips (spoken exactly as-is) plus the fixed
# fragments of number templates (the parts between the {slots}).
PHRASE_SOURCES = [
    # feedback / encouragement
    s("say.correct"), s("say.great"), s("say.tryAgain"),
    s("lesson.try"), s("finger.thumb"), s("finger.index"),
    # lesson steps (whole sentences)
    *[s(f"L{L}.s{i}") for L in range(1, 6) for i in range(1, 7) if f"L{L}.s{i}" in KM],
    # game — static prompts
    s("game.count.q"), s("game.countAbacus.q"), s("game.read.q"),
    # game — template fragments (Khmer around the number slots)
    s("game.match.q"), s("game.build.q"), s("game.bigbuild.q"),
    "ចាក់ពពុះលេខ",                       # bubblePop.qTarget
    "ចាក់ពពុះដែលបូកបញ្ចូលគ្នាបាន",        # bubblePop.qSum
    "ចាក់តាមលំដាប់",                      # bubblePop.qOrder
    "ចាប់ផ្តើមនៅ", "លោត", "តើអ្នកឈប់នៅលេខណា",  # numberLine.q
    "រាប់លោតម្តង", "តើលេខមួយណាដែលបាត់",   # say.skipCount
    # pet
    s("pet.qCount"), s("pet.feedHeading"), s("pet.playHeading"),
    s("pet.bathScrub"), s("pet.bathRinse"), s("pet.bathDry"),
    s("pet.bathStyle"), s("pet.bathDone"),
    s("pet.yum"), s("pet.playWin"), s("pet.grew"), s("pet.missed"),
    s("pet.patted"), s("pet.moodFull"), s("pet.moodDirty"),
    s("pet.moodStarving"), s("pet.moodHungry"), s("pet.moodLonely"),
    s("pet.moodLoved"), s("pet.moodHappy"), s("pet.moodPat"),
]


# ---------------------------------------------------------------------------
# 4. Synthesize
# ---------------------------------------------------------------------------

def main():
    from gtts import gTTS

    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = []  # (filename, text_to_speak)

    for n in range(0, 101):
        jobs.append((f"n{n}.mp3", num_word(n)))
    for _, (fn, word) in PLACES.items():
        jobs.append((f"{fn}.mp3", word))
    for word, fn in OPS.items():
        jobs.append((f"{fn}.mp3", word))

    phrases = {}
    seen = set()
    idx = 0
    for raw in PHRASE_SOURCES:
        k = key(raw)
        if not k or k in seen:
            continue
        seen.add(k)
        idx += 1
        fn = f"ph_{idx:03d}.mp3"
        phrases[k] = fn
        # speak the readable form (symbols already Khmer words via to_text)
        jobs.append((fn, to_text(raw)))

    made = skipped = 0
    for fn, text in jobs:
        path = os.path.join(OUT_DIR, fn)
        if os.path.exists(path) and not FORCE:
            skipped += 1
            continue
        for attempt in range(4):
            try:
                gTTS(text, lang="km").save(path)
                made += 1
                print(f"  {fn}  {text}")
                break
            except Exception as e:  # noqa: BLE001 - network flakiness
                if attempt == 3:
                    sys.exit(f"failed on {fn!r} ({text!r}): {e}")
                time.sleep(2 + attempt * 2)
        time.sleep(0.4)  # be gentle with the endpoint

    manifest = {
        "numbers": {str(n): f"n{n}.mp3" for n in range(0, 101)},
        "places": {k: f"{v[0]}.mp3" for k, v in PLACES.items()},
        "ops": {word: f"{fn}.mp3" for word, fn in OPS.items()},
        "phrases": phrases,
    }
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    print(f"\n{made} clips generated, {skipped} already present.")
    print(f"{len(phrases)} phrases. manifest.json written to audio/km/")


if __name__ == "__main__":
    main()
