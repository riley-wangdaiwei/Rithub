# Rithub — User Handbook

Your personal time & energy tracker. Three pages: **Tracker** (daily logging), **Report** (weekly review), **Gym** (workout log). No account, no backend — your data lives in your browser and syncs through a private GitHub Gist.

Live at https://riley-wangdaiwei.github.io/Rithub

---

## Tracker (homepage)

### Projects

Each project is a thing you're working on. The list order **is** your priority order — top means most important. Use the ↑ / ↓ arrows on each row to reorder. (The morning planning reads this order, so keep it honest.)

Each project row shows:

- **Name** — click to open the project page
- **Timer** — start/stop. Keeps running across reloads.
- **GOALS** — three lines you write yourself: DAY / WEEK / MONTH. A day goal should be a verifiable slice of the week goal.
- **Goal dots** — your check-off track record:
  - `●` = you checked it off that period · `·` = no check recorded
  - DAY row = last 7 days, WEEK = last 4 weeks, MONTH = last 3 months
  - Rightmost dot = current period. Trailing number = hits in the window.
  - There is no "missed" state — a blank is just a blank.

### Project page

- **Commits** — log what you did, one line at a time. This is your actual record; the report and planning both read from it.
- **Check-offs** — two states only: done or not. Check off a DAY/WEEK/MONTH goal here.
- **DEEP toggle** — after a timer stops, mark whether it was deep work. You can also toggle retroactively on any history row.
- **Cancel project** — shows a confirm dialog, then permanently deletes the project **and all its commits**. There is no undo. The only recovery is the Gist's version history (see Sync).

### TIMER ONLY

A standalone timer for things that aren't projects — meditation, gym, naps. Same start/stop, logged the same way.

### QUICK TODO

A fast inbox. Dump it here, sort it out later. One tap to start a per-todo stopwatch; stopping the stopwatch auto-completes the todo.

---

## Report

Pure-text weekly review. Graphs are drawn with characters, not images.

- **Energy Curve** — when during the day you actually work
- **Gap Trend** — idle gaps between sessions
- **Project Balance** — where your hours went
- **DEEP WEEK** — dot grid of deep vs shallow days
- **GOALS** — read-only, with hit rates per project
- **COPY WEEK DATA** — copies the raw week as text (for planning prompts)

---

## Gym

PPL double-progression logger. Separate from the main tracker.

- Log **weight × reps** per set. It suggests your next weight automatically.
- **Params per exercise:** INC (weight increment), REPS (target rep range), SETS (default set count), KEY (show in PROGRESS), LOAD↑ (heavier = better) / ASSIST↓ (lighter assistance = better).
- **Monthly goals** — set weight × reps targets per month.
- **EXPORT** — manual backup. Do this occasionally.
- Daily logs auto-prune after 7 days; monthly bests, goals, and settings are kept.
- Syncs through the same Gist as `gym.json` (auto-push on save + SYNC NOW button).

---

## Cloud sync

Phone ↔ computer sync via a private GitHub Gist. Set it up once per device:

1. Open Settings (gear icon) → CLOUD SYNC
2. Paste a GitHub personal access token (needs `gist` scope) and the Gist ID
3. It syncs automatically on save; SYNC NOW forces it

Rules to know:

- **Last-writer-wins** by timestamp. Don't edit on two devices at the same time.
- The token and Gist ID stay on the device — they're never synced.
- Clearing browser data on a device wipes its local copy. As long as one synced device (or the Gist) survives, you're fine.
- The Gist keeps version history — that's your only recovery path for deleted projects.

---

## Film background

The homepage background is a daily still from a film you've watched, pulled from TMDB. Faded to a watermark so text stays readable. Top-left corner shows `Title (Year) · Director`.

Setup (Settings → FILM BACKGROUND, per device for the key):

1. Get a free TMDB v3 API key at themoviedb.org and paste it in
2. Paste your film list, one title per line
3. SAVE FILM BG

How it works:

- One film per day, picked by date — same film all day, advances daily, cycles through your list
- One API lookup per day, cached until tomorrow
- If the picked film has no still on TMDB, it tries the next ones automatically
- No key / no list / no result → plain white background, nothing breaks

Sharing between devices:

- The **film list** syncs through the Gist — set it once, it follows you
- The **API key** stays per device (like the GitHub token) — paste it once on each device

---

## Data model (the 30-second version)

| What | Where |
|---|---|
| Projects, commits, todos | Browser localStorage (`rithub-v2`) + Gist |
| Gym logs | Browser localStorage (`rithub-gym-v1`) + Gist (`gym.json`) |
| Film key + list | Browser localStorage (key per-device, list via Gist) |
| Film daily cache | Browser localStorage, overwritten daily |

Nothing leaves your devices except the encrypted-in-transit Gist sync. There is no server, no analytics, no account.
