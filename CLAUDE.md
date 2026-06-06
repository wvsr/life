# Life — App Philosophy & Contributor Guide

## What this app is

A personal daily tracker for one person. It records five things per day:

1. **Office** — did I go to office?
2. **Work satisfaction** — was it a good work day?
3. **Studied** — did I study something from the plan?
4. **PMO** — how many times masturbated, and did I use a support/pillow?
5. **Expenses** — what I spent money on (amount + description)

That's it. Nothing else. The app exists to create a daily habit of honest self-logging.

---

## Design philosophy

**Stupidly simple.** Every screen should feel obvious. If someone has to think for more than a second about what to tap, it's too complex.

**Fast over fancy.** The user opens this app every day. Speed and reliability matter more than aesthetics. A 16ms transition is better than a 400ms animation.

**No friction.** Daily entry should take under 30 seconds. No login, no confirmation dialogs, no "are you sure?". Trust the user.

**Dark, minimal.** Background `#0d0d0d`, surface `#141414`, Inter font, very little color (green for positive, red for negative). Don't add colors, gradients, or decorative elements.

**One screen at a time.** Two views: Today and History. That's the app. Don't add tabs, modals, sheets, or navigation stacks.

---

## What NOT to do

- Do not add categories, tags, or labels to expenses
- Do not add streaks, badges, or gamification
- Do not add push notifications or reminders
- Do not add export, backup, or sharing features
- Do not add settings or configuration screens
- Do not add charts to the Today view
- Do not add a "summary" or "insights" section
- Do not add comments to code that explain what the code does
- Do not create README files, only update CLAUDE.md
- Do not split a 100-line component into 5 components just to "be clean"

---

## Tech stack

| Concern         | Choice                   | Why                                      |
|-----------------|--------------------------|------------------------------------------|
| Framework       | Vite + React 18          | Fast dev, standard, no server needed     |
| Animations      | Framer Motion            | Spring physics, AnimatePresence for exits|
| Database        | Turso (libSQL)           | Cloud SQLite, browser-compatible via HTTP|
| PWA             | vite-plugin-pwa          | Auto service worker, offline capable     |
| Styling         | Single global CSS file   | Small enough, no CSS-in-JS overhead      |
| State           | React useState/useCallback| No Redux, no Zustand — overkill here    |

---

## Data model

### Turso: `daily_logs` table

```sql
date        TEXT PRIMARY KEY   -- "2026-06-06"
office      INTEGER            -- NULL=unset, 1=yes, 0=no
satisfied   INTEGER            -- NULL=unset, 1=yes, 0=no
studied     INTEGER            -- NULL=unset, 1=yes, 0=no
pmo_count   INTEGER            -- NULL=unset, 0=none, N=count
pmo_support INTEGER            -- NULL=unset, 1=yes, 0=no
updated_at  TEXT
```

### Turso: `expenses` table

```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
date       TEXT NOT NULL       -- "2026-06-06"
amount     REAL NOT NULL       -- in Taka (৳)
note       TEXT NOT NULL DEFAULT ''
created_at TEXT
```

### React state shape

```javascript
days:     { [dateStr]: DayRow }
expenses: { [dateStr]: Expense[] }
```

All reads and writes are optimistic — update local state first, sync to Turso in background. If Turso fails, show a non-blocking error banner.

---

## UI patterns

**Toggle rows**: YES / NO pills. Tapping the already-selected pill deselects (goes back to null). Framer `whileTap` on all interactive elements.

**PMO section**: Separate card. Counter stepper (−/count/+), number flips with slide animation. "With support?" row slides in below when count > 0 (AnimatePresence height animation).

**Expense form**: Amount input + description input + add button, all on one line. Enter key moves focus from amount to description, Enter from description submits. Expenses animate in/out in the list above.

**Contribution chart**: 16 weeks of daily cells. Score = (office==yes) + (satisfied==yes) + (studied==yes), max 3. Colors from dark green (low) to bright green (high). Tap a cell to see a small preview card.

**History accordion**: Each day is a card. Tapping rotates a + into × and reveals the full day detail (Framer height animation).

---

## Adding new tracked items

If you ever add a new daily metric:

1. Add the column to `daily_logs` in `db.js` (`initDB`)
2. Add the field to `emptyDay()` in `App.jsx`
3. Add a `ToggleRow` or similar input in `TodayView.jsx`
4. Add it to `FIELD_META` in `HistoryView.jsx` so it shows in the accordion
5. Consider whether it affects the contribution chart score in `ContributionChart.jsx`

---

## Environment variables

```
VITE_TURSO_URL=https://life-samiwasimul.aws-ap-northeast-1.turso.io
VITE_TURSO_TOKEN=<jwt token>
```

These live in `.env` which is gitignored. Never commit them.

---

## Running locally

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # production build
npm run preview    # serve production build locally (needed to test PWA/SW)
```

To use as a PWA on iPhone: build + preview (or deploy), then open in Safari and "Add to Home Screen".
