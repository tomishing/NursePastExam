// @vitest-environment node
import { describe, expect, it } from "vitest";
import { categoryFromHeading, readQuestionTables, splitRow } from "../../scripts/lib/table.ts";

const HEADER = "| Year | Exam | Session | Q# | Question | Choices | Answer | Explanation | Image |";
const SEP = "|---|---|---|---|---|---|---|---|---|";
const ROW = "| 2012 | 第98回 | 午前 | 24 | 問い | 1. a<br>2. b | 1：a | 解説 | |";

describe("splitRow", () => {
  it("trims cells and allows any whitespace around pipes", () => {
    expect(splitRow("|  2012  |第98回|   午前 | 24|")).toEqual(["2012", "第98回", "午前", "24"]);
  });

  it("keeps empty cells", () => {
    expect(splitRow("| a | | c |")).toEqual(["a", "", "c"]);
  });
});

describe("categoryFromHeading", () => {
  it.each([
    ["疫学 (180問)", "疫学"],
    ["保健医療福祉行政論 (336問)", "保健医療福祉行政論"],
    ["公衆衛生（公衆衛生看護学概論 大項目1〜3） (59問)", "公衆衛生"],
  ])("%s -> %s", (heading, category) => {
    expect(categoryFromHeading(heading)).toBe(category);
  });
});

describe("readQuestionTables", () => {
  it("reads rows under a counted heading and ignores other tables", () => {
    const text = ["## 定義", "| 項目 | キーワード |", "|---|---|", "| a | b |", "", "## 疫学 (1問)", HEADER, SEP, ROW].join("\n");
    const { sections, errors } = readQuestionTables(text, "n.md");
    expect(errors).toEqual([]);
    const epi = sections.find((s) => s.expected === 1);
    expect(epi?.rows).toHaveLength(1);
    expect(epi?.rows[0]?.line).toBe(9);
    expect(epi?.rows[0]?.cells["Q#"]).toBe("24");
  });

  it("finds columns by name, not position", () => {
    const text = [
      "## 疫学 (1問)",
      "| Year | Q# | Image | Exam | Answer | Session | Question | Choices | Explanation |",
      SEP,
      "| 2012 | 24 | | 第98回 | 1 | 午前 | 問い | 1. a | 解説 |",
    ].join("\n");
    const row = readQuestionTables(text, "n.md").sections[0]?.rows[0];
    expect(row?.cells.Year).toBe("2012");
    expect(row?.cells["Q#"]).toBe("24");
    expect(row?.cells.Session).toBe("午前");
  });

  it("only reads tables whose header starts with Year", () => {
    const text = ["## 疫学 (1問)", "| Q# | Year | Exam | Session | Question | Choices | Answer | Explanation | Image |", SEP].join("\n");
    expect(readQuestionTables(text, "n.md").sections[0]?.rows).toEqual([]);
  });

  it("reports a row with the wrong number of cells", () => {
    const text = ["## 疫学 (1問)", HEADER, SEP, "| 2012 | 第98回 | 午前 |"].join("\n");
    expect(readQuestionTables(text, "n.md").errors).toEqual(["n.md:4: row has 3 cells, expected 9"]);
  });

  it("reports a missing column", () => {
    const text = ["## 疫学 (1問)", "| Year | Exam | Session | Q# | Question | Choices | Answer | Image |", "|---|---|---|---|---|---|---|---|"].join("\n");
    expect(readQuestionTables(text, "n.md").errors).toEqual(["n.md:2: table header is missing columns: Explanation"]);
  });

  it("reports a question table that is not under a counted heading", () => {
    const text = ["## 疫学", HEADER, SEP, ROW].join("\n");
    expect(readQuestionTables(text, "n.md").errors[0]).toMatch(/^n\.md:2: question table is not under/);
  });
});
