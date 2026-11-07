# NursePastExam — Development Plan

Give Claude Code one phase at a time, and run and check each phase before moving on.

## Before starting

1. Create the GitHub repository. See [[AppDev_GitHub]].
2. Clone it to `~/dev/NursePastExam`.
3. Copy `CLAUDE.md`, `specification.md`, `data_format.md` and this file into the repository root.
4. Add `public/data/`, `public/images/` and `.env` to `.gitignore`.

## Phases

### Phase 1 — Scaffold

> "Set up the project from CLAUDE.md: Vite, React, TypeScript, Tailwind, React Router, Zustand, Dexie and Vitest, with the folder structure, npm scripts and `.env.example`, plus empty pages for each route."

**Check:** `npm run dev` shows all the routes, and `npm test` runs.

### Phase 2 — Import script

> "Build `scripts/import-notes.ts` following data_format.md, with unit tests using fixtures for every answer format and for padded tables."

**Check:** the import reports 330 看護師 and 750 保健師 cards, or the current header counts. Any failure names the row, and problems are fixed in the notes rather than worked around in code.

### Phase 3 — Card display

> "Build CardFront and CardBack, and a simple page to step through all cards with filters, following section 2 of specification.md."

**Check by eye:** `ph-100-PM-51` (calculation), `ph-98-PM-38` (two images), `ph-107-AM-30` (large 別冊 image), `ph-97-PM-50`, and a card containing `<UNICEF>`. Also check a `3 または 4` card and a card with no official answer.

### Phase 4 — Scheduling and storage

> "Define the ProgressRepository and ContentRepository interfaces, implement them with Dexie and the bundled JSON, and build the ts-fsrs wrapper, with queue building and daily limits following section 4 of specification.md and section 6 of data_format.md. Add unit tests using a fake clock."

**Check:** the tests cover the queue order, the daily limits, the 04:00 rollover and undo.

### Phase 5 — Review flow

> "Build Home and Review with deck and filter selection, reveal, rating, keyboard shortcuts, undo, suspend and the session summary."

**Check:** complete a real session, reload midway, and confirm that nothing is lost.

### Phase 6 — Browse, Stats, Settings

> "Build Browse with search and filters, Stats, and Settings with export and import following specification.md."

**Check:** export, clear the browser data, import, and confirm that progress returns.

### Phase 7 — Polish and test

> "Make the layout work on phones, enlarge images on tap, lazy-load images, make the app an installable offline PWA, and add a Playwright test of the review flow. Then go through the acceptance criteria in specification.md and report each one's result."

**Check:** use it on a real phone over the local network.

**Stage 1 ends here.** Running locally or on a private network is enough for personal use.

## Later stages

These are outlined in section 9 of `specification.md`. Plan each in detail when it starts, and do not build them during stage 1.

- **Stage 2 — Sync:** hosting, login, a backend, and upload of existing local progress.
- **Stage 3 — Students and teachers:** roles, classes, content served by API, a privacy policy, and install instructions for iOS and Android. Finish the content review first.

## Updating content

1. Edit the notes in `content/`.
2. Run `npm run import`.
3. Rebuild or refresh the app. Progress is kept because card IDs do not change.
