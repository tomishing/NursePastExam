# NursePastExam — Data Format

## 1. Source notes

Each note has a title, a definitions section with its own smaller tables, and one question table under each category heading. Only tables whose header starts with `| Year |` contain questions. Category headings look like `## 疫学 (180問)`.

| Note | Columns |
|---|---|
| `questions_answers_nurse.md`, `questions_answers_publichealth.md` | Year, Exam, Session, Q#, Question, Choices, Answer, Explanation, Image |

### Source URLs (`info.md`)

`content/info.md` has one table row per exam year with columns 実施年, 看護師, 保健師 and ページ. The 看護師 and 保健師 cells give exam rounds, such as `第103回・第103回追加`, and the ページ cell is a Markdown link to the MHLW page. The import maps each card's deck and exam to that URL and writes it to `sources` in `cards.json` for the Settings 出典・ライセンス section. Fail the import if any card's exam has no URL.

### Differences to handle

| Field | 看護師 | 保健師 |
|---|---|---|
| Session | `AM`, `PM` | `午前`, `午後` |
| Exam | `第100回`, `第103回追加` | `第98回` |
| Image names | `103addPM01.png` for 追加 | `98AM24.png` |

Normalise the session to `AM` or `PM`. Check the actual values when writing the parser, because the 看護師 note may contain other session labels.

### Parsing rules

- Obsidian may re-pad tables, so trim every cell and allow any whitespace around `|`.
- Find columns by header name, not by position.
- Split `Choices` and `Image` on `<br>`.
- Remove the leading `1. ` from each choice and check that the numbers run in order.
- `（計算問題）` in `Choices` means a calculation question with no choices.
- `図の選択肢` or an empty `Choices` means the choices are inside the image (e.g. 看護師 第100回 午後1, 第103回 午前18; 保健師 第108回 午後7). The answer is a bare number such as `3`. Store `choices` as empty and `figureChoiceCount` as the highest choice number shown in the image (set by hand in `scripts/lib/overrides.ts`), so the card can show numbered buttons. The import fails if a figure-choice row has no override, or if an override names a row whose `Choices` is not a figure-choice cell.
- Treat `<` and `>` in the text as literal characters. `<br>` is the only markup.
- Strip the count from the heading to get the category, and strip the note in brackets for the display name if needed: `公衆衛生（公衆衛生看護学概論 大項目1〜3） (59問)` → `公衆衛生`.

### Answer formats

| Example | Meaning | Parsed `answer` |
|---|---|---|
| `2：紫外線` | One choice | `{type:"choice", accepted:[[2]]}` |
| `1・4：a、b` | Both required | `{type:"choice", accepted:[[1,4]]}` |
| `3 または 4` | Either accepted | `{type:"choice", accepted:[[3],[4]]}` |
| `1.25`, `57.5kg`, `15%` | Calculation value | `{type:"value", value:"1.25"}` |
| `正答値表に記載なし` | No official answer | `{type:"none"}` |

Keep the original string as `answerText` and display it on the back. Text after `：` is display text only, because the choice numbers are what count. Fail the import if a number is outside the range of choices.

## 2. Card IDs

Format: `<deck>-<exam>-<session>-<q>`, for example `ph-98-AM-24`, `nurse-103add-AM-75`.

- `deck`: `nurse` or `ph`
- `exam`: the number, plus `add` for 追加
- `q`: the question number without padding

IDs depend only on these fields, so editing the text keeps the progress. Fail the import if two rows produce the same ID.

## 3. Generated `cards.json`

```ts
type Card = {
  id: string;
  deck: "nurse" | "ph";
  category: string;       // 疫学, 保健統計, 保健医療福祉行政論, 公衆衛生
  year: number;
  exam: string;           // 第98回
  session: "AM" | "PM";
  q: number;
  question: string;
  choices: string[];      // empty for calculation questions
  answerText: string;
  answer:
    | { type: "choice"; accepted: number[][] }
    | { type: "value"; value: string }
    | { type: "none" };
  explanation: string;
  images: string[];       // file names under /images/
  figureChoiceCount?: number; // choices drawn inside the image
  figureMissing: boolean;
  contentHash: string;
};

type CardsFile = {
  generatedAt: string;
  counts: Record<string, number>;
  sources: { year: number; nurse: string[]; ph: string[]; url: string }[]; // from info.md
  cards: Card[];
};
```

- `figureMissing` is true when `images` is empty and the question or explanation contains 図は原本 or 別冊.
- `contentHash` is a hash of question, choices, answer and explanation. It is used to detect changed cards.

## 4. Images

- Search `figures_nurse/`, `figures_publichealth/` and `tables_publichealth/`, and copy each named file to `public/images/`.
- Fail the import if a named file is missing or a name appears in both folders.
- Warn about files that no row uses.
- 第98回 午後38 lists two images, in the order given in the note.

## 5. Import checks

The import stops with the row identified if any of these fail, except where marked as a warning:

- Each category's row count matches the `(N問)` in its heading.
- Every row has all its columns.
- Question and answer are not empty.
- Year and Q# are numeric.
- IDs are unique.
- Images resolve.
- Warning: an explanation is empty.

It ends by printing counts per deck and category. Add fixture-based unit tests for every format in this document.

## 6. Browser storage (Dexie)

```ts
// progress: primary key cardId
type Progress = {
  cardId: string;
  fsrs: object;           // ts-fsrs Card state, including due date
  suspended: boolean;
  lastContentHash: string;
  updatedAt: string;      // ISO 8601, for later sync
};

// reviewLog: UUID primary key, indexed on cardId and reviewedAt. Append-only;
// undo adds an entry that marks the earlier one as undone. The undo entry sets
// undoneId, copies the undone rating, and stores in `previous` the progress it
// replaced. Undo restores the undone entry's `previous`, or deletes the progress
// record when that is null (the card was new). Only ratings from the current
// study day can be undone.
type ReviewLog = {
  id: string;             // UUID, so devices can merge logs later
  undoneId?: string;      // set on an undo entry
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  selected?: number[];    // choices tapped before revealing
  correct?: boolean;      // absent if not graded
  reviewedAt: string;     // ISO 8601
  previous: Progress | null; // progress before the rating (null if never seen), used for undo
};

// settings: key-value store: newPerDay (20), reviewsPerDay (200), desiredRetention (0.9),
// newCardOrder ("random" | "oldest" | "newest"), includeNoAnswer (false), lastExportAt
```

Export format: `{ schemaVersion, exportedAt, progress, reviewLog, settings }`. Reject a file with an unknown `schemaVersion`. The same format will be used to upload local progress when accounts arrive.
