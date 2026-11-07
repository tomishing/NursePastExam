# NursePastExam — Specification

## 1. Overview

An Anki-like web app for practising past 看護師国家試験 and 保健師国家試験 questions. Its content comes from two notes in `content/`.

| Deck | Source | Cards | Categories |
|---|---|---|---|
| 看護師 | `questions_answers_nurse.md` | 330 | 疫学 (6), 公衆衛生 (324) |
| 保健師 | `questions_answers_publichealth.md` | 750 | 疫学 (180), 保健統計 (175), 保健医療福祉行政論 (336), 公衆衛生 (59) |

Counts are as of 2026-11-06 and change when the notes change.

**In scope for version 1:** one user (the owner), study on desktop and phone browsers, installable as a PWA, progress stored on the device, and backup by file.

**Not in version 1, planned later (section 9):** accounts, sync, and teacher features.

**Not planned:** native apps and App Store or Google Play releases. iOS and Android users install the PWA from the browser.

**Out of scope for now:** editing cards in the app and AI features.

## 2. Card

**Front**
- Question text, including any case text
- Numbered choices, or 「計算問題」 for calculation questions
- Figure or table images, tappable to enlarge
- A small label: deck, 第N回, session and Q#

**Back**
- Everything on the front
- The answer, with the correct choices highlighted
- The explanation
- The notice: 「解説は公式のものではありません。統計は出題当時の値で、法令は改正されている場合があります。」
- Rating buttons

**Special cases**

| Case | Behaviour |
|---|---|
| No official answer (正答値表に記載なし) | Show that text on the back. Excluded from review by default, with a setting to include. Always visible in Browse. |
| Several accepted answers (`3 または 4`) | Highlight every accepted choice and show 「いずれも正解」. |
| Select-two questions | Highlight both choices. |
| Calculation questions | Show the value as written, such as `1.25` or `57.5kg`. |
| The question needs a figure, but no image exists | Show 「図は原本を参照してください」 on the front. |

## 3. Study flow

1. On Home, choose a deck and optional filters: category and year range.
2. Home shows counts of new, learning and due cards for that selection.
3. Start a session. The card front appears.
4. Press **答えを見る** or the Space key. The back appears.
5. Rate the card **もう一度 / 難しい / 正解 / 簡単**, or press keys 1–4. Each button shows its next interval.
6. Repeat until the queue is empty, then show a session summary.

**Choosing an answer**
- The user can tap choices on the front before revealing. Tapping is optional, and revealing without choosing still works.
- For select-two questions, both choices must match. For `3 または 4`, any accepted answer counts as correct.
- The back marks the selection 正解 or 不正解 and highlights the correct choices.
- Calculation questions and cards with no official answer are not graded.
- **The user still rates recall.** The result is shown beside the rating buttons and never sets the rating, because a lucky guess is not recall. The result is stored in the review log.

**Other behaviour**
- **Undo** reverts the last rating.
- **Suspend** removes a card from review, and it can be restored in Browse.
- Leaving mid-session loses nothing, because each rating is saved immediately.

## 4. Scheduling

- FSRS through `ts-fsrs`, using default parameters. Desired retention defaults to 0.9.
- The new-card limit defaults to 20 per day, and the review limit defaults to 200 per day. Both can be changed in Settings.
- Order: learning cards, then due reviews, then new cards.
- New cards come in random order by default, with oldest-first or newest-first as options.
- The day rolls over at 04:00 local time.

## 5. Screens

| Route | Screen | Contents |
|---|---|---|
| `/` | Home | Deck and filter selection, counts, start button |
| `/review` | Review | Card front and back, rating, undo, suspend, progress |
| `/browse` | Browse | Search and filter all cards, view a card, restore suspended cards |
| `/stats` | Stats | Reviews per day, retention, progress by deck and category |
| `/settings` | Settings | Daily limits, retention, new-card order, no-answer setting, export and import |

The layout is mobile-first and has no horizontal page scrolling. Wide images scroll or zoom inside their own container. The 別冊 images are especially large.

## 6. Data and persistence

- Card content ships with the app as `public/data/cards.json`. See `data_format.md`.
- Progress is stored in IndexedDB: one state record per card, and a log of reviews.
- Settings can export all progress to a JSON file and import it back. Importing replaces current progress after a confirmation.
- Because browser storage can be cleared, Home shows a reminder if the last export is more than 30 days old.
- Cards removed from the notes keep their progress but no longer appear. Cards whose text changed keep their progress.

### Attribution

The exam content is MHLW material used under PDL1.0 (see README "Sources and licence"). The app must:

- Show a 出典・ライセンス section in Settings, reachable without network access. It must state the source (厚生労働省ホームページ, with the URL of each exam round's 問題および正答 page), that the repository owner extracted and edited the content, and that the app is not an official MHLW publication.
- State that the explanations were written with Claude and are not official, in addition to the notice on the card back.
- Not use MHLW symbol marks or logos, which PDL1.0 excludes.

The URL for each round is in `content/info.md`, and the import reads it. See `data_format.md`.

## 7. Non-functional requirements

- Works in current Chrome, Safari and Firefox, on desktop and phone.
- The first screen loads in under 2 seconds locally, and images load lazily.
- Keyboard use covers the whole review flow, and buttons have accessible labels.
- Text uses a Japanese font stack and at least 16px on phones.

## 8. Acceptance criteria

- [ ] The import produces one card for each table row in both notes, and the counts match the note headers.
- [ ] Every image named in the notes resolves, and 第98回 午後38 shows two images.
- [ ] `<UNICEF>` and similar text appears literally on the card.
- [ ] The answer is hidden until it is revealed.
- [ ] Selected choices are graded correctly for one-answer, select-two and `または` questions, and do not change the rating options.
- [ ] Ratings persist after a reload, and undo restores the previous state.
- [ ] Re-running the import after a note edit keeps all progress.
- [ ] Export followed by import into a clean browser restores progress.
- [ ] Cards without an official answer stay out of review by default.
- [ ] The review flow works on a phone-sized screen and by keyboard alone.
- [ ] Settings shows the 出典・ライセンス section offline, with a source URL for every exam round in the cards.

## 9. Future stages

| Stage | Users | Adds | Requires first |
|---|---|---|---|
| 1 (now) | Owner only | Everything in this document, as a PWA | Nothing |
| 2 | Owner on several devices | Hosting, login, progress sync | Stage 1 in regular use |
| 3 | Students and teachers | Roles, classes, teacher progress view, content served by API, privacy policy | Content review (section 10) |

**What version 1 does to prepare**
- Progress and content are accessed through repository interfaces, so a server can replace IndexedDB and the bundled JSON.
- The review log is append-only with UUIDs, which makes merging between devices straightforward.
- Each progress record has an `updatedAt`.
- Card IDs are stable across imports, and export files carry a schema version, so a user's local progress can be uploaded when accounts arrive.
- The UI is mobile-first and touch-friendly, and works offline as an installed PWA.

**Decisions for later stages**
- Backend: likely FastAPI and PostgreSQL, as in the other projects. Decide at stage 2.
- Student data: study records are personal data, so stage 3 needs a privacy policy, retention rules and a decision on what teachers can see.
- Installation: Android browsers can offer an install prompt, while iOS users add the app through Safari's Add to Home Screen, so stage 3 needs short instructions for each. Check how reliably iOS keeps stored data, because progress should sync to the server once accounts exist.

## 10. Open questions

1. **Content review (blocks stage 3).** The notes contain Claude-written explanations that have not been fully reviewed. Review them before students rely on them. The OCR-derived questions and answers for 保健師 第96・97回 were checked by the owner on 2026-11-07.
