# CLAUDE.md — NursePastExam

## Purpose

An Anki-like web app for practising past questions from the Japanese national nurse exam (看護師国家試験) and public health nurse exam (保健師国家試験). The questions cover only epidemiology and public health (疫学, 保健統計, 保健医療福祉行政論, 公衆衛生), not the whole exams. The front of a card shows the question, choices and any figure or table. The back shows the answer and an explanation. The user rates their recall, and a spaced-repetition scheduler decides when the card returns.

Version 1 is for one user (the owner), with no accounts and no server-side data. Progress stays on the device. Later it will open to students and teachers and be installable on iOS and Android as a PWA, not through the App Store or Google Play, so version 1 must not block that. See "Future stages" in `specification.md`.

**Read before starting any phase:**
- `specification.md`: features, screens and acceptance criteria
- `data_format.md`: source notes, import rules and the card schema
- `development_plan.md`: the phases, built one at a time

## Locations

| What | Path |
|---|---|
| App repository | `~/dev/NursePastExam` |
| These planning docs | `~/notes/projects/appDev/nursePastExams/` (copy `CLAUDE.md` and the other docs into the repository root) |
| Source notes | `content/questions_answers_nurse.md`, `content/questions_answers_publichealth.md` |
| Source images | `content/figures_nurse/`, `content/figures_publichealth/`, `content/tables_publichealth/` |
| Source URLs | `content/info.md`: MHLW page for each exam round, used for attribution (PDL1.0) |

`content/` in the repository root is tracked in git and contains all the data needed to build the app. The source notes are hand-edited and are the source of truth. **The app and the import script only read `content/` and never write to it.** Fix content errors in the notes, then re-run the import.

## Tech stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS**
- **React Router v8** (declarative mode: `BrowserRouter` and `Routes`, imported from `react-router`)
- **Zustand** for UI and session state
- **Dexie** (IndexedDB) for progress
- **ts-fsrs** for scheduling
- **Vitest** for unit tests, **Playwright** for the main review flow
- **Node + TypeScript script** for the import (`scripts/import-notes.ts`)

No backend, database or Docker in version 1. The output is a static site, and it is a PWA from the start. It is installed on iOS and Android from the browser. There are no native apps or store releases.

## Project structure

```
NursePastExam/
├── content/                # source notes and images (read-only input)
├── scripts/
│   ├── import-notes.ts     # notes + images -> public/data, public/images (file access only)
│   └── lib/                # pure parsing (table, card, sources, build) and overrides.ts
├── public/
│   ├── data/cards.json     # generated
│   └── images/             # generated
├── src/
│   ├── components/         # CardFront, CardBack, RatingButtons, DeckFilter
│   ├── pages/              # Home, Review, Browse, Stats, Settings
│   ├── db/                 # Dexie implementation of the repositories
│   ├── lib/                # pure helpers: card labels, grading, filters
│   ├── repositories/       # ProgressRepository and ContentRepository interfaces, JSON content
│   ├── scheduler/          # ts-fsrs wrapper and queue building
│   ├── store/              # Zustand stores
│   ├── types/              # Card and progress types
│   └── App.tsx
├── tests/
├── .env.example            # CONTENT_DIR for the import script (defaults to ./content)
├── CLAUDE.md
├── specification.md
├── data_format.md
└── development_plan.md
```

## Commands

Set these up in Phase 1:

- `npm run dev`: dev server
- `npm run import`: rebuild `public/data` and `public/images` from the notes
- `npm test`: unit tests
- `npm run test:e2e`: Playwright, run against the production build (`build` + `vite preview` on port 4173) so the service worker is real
- `npm run build`: static build, including the service worker that precaches the app, `cards.json` and every image
- `npx pwa-assets-generator`: regenerate the icons in `public/` from `public/favicon.svg` (only when the icon changes)

## Rules

- **Never render exam text as HTML.** Questions contain literal angle brackets such as `<UNICEF>` and `<認知症高齢者グループホーム>`. Render it as plain React text, and do not use `dangerouslySetInnerHTML`.
- **Card IDs must stay stable.** Progress is keyed by card ID, so re-importing must not lose it. See `data_format.md`.
- **Fail the import loudly.** A malformed row, a missing image or an unparseable answer stops the import with the row identified. Do not skip it silently.
- **Keep the warning on the card back.** Explanations are written by Claude and are not official. Statistics are as of the exam year, and laws may have changed.
- **All progress access goes through `ProgressRepository`, and all card loading through `ContentRepository`.** Components and the scheduler never call Dexie or fetch `cards.json` directly, so a server-backed version can replace them later.
- **Keep the review log append-only, with UUIDs**, so it can be synced later.
- **Do not build for later stages yet:** no login, API or roles until their stage starts. Do not add Capacitor or other native wrappers. Only follow these rules.
- **Keep it working as an installed PWA:** it must study offline after the first load. Use touch targets of at least 44px and safe-area insets. Do not depend on hover or on keyboard shortcuts as the only way to do something.
- The UI is in Japanese, and code and comments are in English.
- Build one phase at a time, then run and check it before moving on.
