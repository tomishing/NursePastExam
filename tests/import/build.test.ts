// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCards, type ImageIndex, type NoteInput } from "../../scripts/lib/build.ts";

const fixture = (name: string) => readFileSync(new URL(`../fixtures/import/${name}`, import.meta.url), "utf8");

const notes: NoteInput[] = [
  { deck: "nurse", file: "nurse.md", text: fixture("nurse.md") },
  { deck: "ph", file: "publichealth.md", text: fixture("publichealth.md") },
];
const info = { file: "info.md", text: fixture("info.md") };
const images: ImageIndex = new Map([
  ["100PM01.png", ["figures_nurse"]],
  ["100PM51.png", ["tables_publichealth"]],
  ["98PM38.png", ["tables_publichealth"]],
  ["98PM38_2.png", ["tables_publichealth"]],
]);
const figureChoiceCounts = { "nurse-100-PM-1": 4 };

function build(changes: Partial<Parameters<typeof buildCards>[0]> = {}) {
  return buildCards({ notes, info, images, figureChoiceCounts, ...changes });
}

describe("buildCards with the fixture notes", () => {
  const result = build();
  const card = (id: string) => result.file.cards.find((c) => c.id === id);

  it("imports every row without errors", () => {
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(["nurse.md:24 (nurse-115-AM-32): Explanation is empty"]);
    expect(result.file.counts).toEqual({
      nurse: 5,
      "nurse/疫学": 3,
      "nurse/公衆衛生": 2,
      ph: 5,
      "ph/保健統計": 3,
      "ph/公衆衛生": 2,
    });
  });

  it("parses every answer format", () => {
    expect(card("nurse-100-AM-5")?.answer).toEqual({ type: "choice", accepted: [[2]] });
    expect(card("nurse-103add-AM-75")?.answer).toEqual({ type: "choice", accepted: [[1, 4]] });
    expect(card("nurse-108-AM-33")?.answer).toEqual({ type: "choice", accepted: [[3], [4]] });
    expect(card("nurse-115-AM-32")?.answer).toEqual({ type: "none" });
    expect(card("ph-100-PM-51")?.answer).toEqual({ type: "value", value: "1.25" });
    expect(card("ph-110-AM-40")?.answer).toEqual({ type: "value", value: "57.5kg" });
    expect(card("ph-108-AM-40")?.answer).toEqual({ type: "value", value: "15%" });
    expect(card("nurse-100-PM-1")).toMatchObject({ choices: [], figureChoiceCount: 4, answer: { accepted: [[3]] } });
  });

  it("reads padded tables and reordered columns", () => {
    expect(card("nurse-103add-AM-75")).toMatchObject({ year: 2014, exam: "第103回追加", question: "2つ選べ。" });
    expect(card("ph-107-AM-30")).toMatchObject({ year: 2021, session: "AM", q: 30, category: "公衆衛生" });
  });

  it("keeps images in note order and copies each once", () => {
    expect(card("ph-98-PM-38")?.images).toEqual(["98PM38.png", "98PM38_2.png"]);
    expect(result.usedImages).toEqual(["100PM01.png", "100PM51.png", "98PM38.png", "98PM38_2.png"]);
  });

  it("keeps literal angle brackets and flags missing figures", () => {
    expect(card("nurse-108-AM-33")?.question).toBe("<UNICEF>の説明で正しいのはどれか。");
    expect(card("ph-107-AM-30")?.figureMissing).toBe(true);
    expect(card("ph-98-PM-38")?.figureMissing).toBe(false);
  });

  it("includes the source URL table", () => {
    expect(result.file.sources).toContainEqual({
      year: 2014,
      nurse: ["第103回", "第103回追加"],
      ph: ["第100回"],
      url: "https://example.mhlw.test/2014",
    });
  });
});

describe("buildCards failures", () => {
  const replaceIn = (deck: "nurse" | "ph", from: string, to: string) =>
    notes.map((note) => (note.deck === deck ? { ...note, text: note.text.replace(from, to) } : note));

  it("fails when a heading count does not match", () => {
    const { errors } = build({ notes: replaceIn("nurse", "## 疫学 (3問)", "## 疫学 (4問)") });
    expect(errors).toEqual(['nurse.md:11: heading "疫学 (4問)" says 4 questions, but its table has 3 rows']);
  });

  it("fails on duplicate IDs", () => {
    const { errors } = build({ notes: replaceIn("nurse", "| 2026 | 第115回 | AM      | 32  |", "| 2019 | 第108回 | AM      | 33  |") });
    expect(errors).toEqual(["nurse.md:24 (nurse-108-AM-33): duplicate card ID, also produced by nurse.md:23"]);
  });

  it("fails on a missing image", () => {
    const missing = new Map(images);
    missing.delete("98PM38_2.png");
    expect(build({ images: missing }).errors).toEqual([
      'publichealth.md:11 (ph-98-PM-38): image "98PM38_2.png" not found in any image folder',
    ]);
  });

  it("fails on an image found in two folders", () => {
    const twice = new Map(images).set("100PM51.png", ["figures_publichealth", "tables_publichealth"]);
    expect(build({ images: twice }).errors).toEqual([
      'publichealth.md:9 (ph-100-PM-51): image "100PM51.png" is in more than one folder: figures_publichealth, tables_publichealth',
    ]);
  });

  it("warns about an unused image", () => {
    const extra = new Map(images).set("unused.png", ["figures_nurse"]);
    expect(build({ images: extra }).warnings).toContain('image "unused.png" is not used by any row');
  });

  it("fails when an exam round has no source URL", () => {
    const { errors } = build({ info: { file: "info.md", text: info.text.replace("第103回・第103回追加", "第103回") } });
    expect(errors).toEqual(["info.md: no source URL for nurse 第103回追加"]);
  });

  it("fails when an override names a card that does not exist", () => {
    const { errors } = build({ figureChoiceCounts: { ...figureChoiceCounts, "ph-1-AM-1": 4 } });
    expect(errors).toEqual(["scripts/lib/overrides.ts: figureChoiceCount is set for ph-1-AM-1, but no row produces that ID"]);
  });

  it("reports an override on a row that is not a figure-choice row only once", () => {
    const { errors } = build({ figureChoiceCounts: { ...figureChoiceCounts, "ph-100-PM-51": 4 } });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^publichealth\.md:9 \(ph-100-PM-51\): has a figureChoiceCount override/);
  });
});
