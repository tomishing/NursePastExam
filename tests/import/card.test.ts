// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cardId, parseChoiceAnswer, parseChoices, parseRow, splitBr } from "../../scripts/lib/card.ts";
import type { QuestionColumn } from "../../scripts/lib/table.ts";

function row(overrides: Partial<Record<QuestionColumn, string>> = {}): Record<QuestionColumn, string> {
  return {
    Year: "2012",
    Exam: "第98回",
    Session: "午前",
    "Q#": "24",
    Question: "正しいのはどれか。",
    Choices: "1. a<br>2. b<br>3. c<br>4. d",
    Answer: "2：b",
    Explanation: "解説。",
    Image: "",
    ...overrides,
  };
}

const ctx = { deck: "ph" as const, category: "疫学", where: "ph.md:10" };

describe("cardId", () => {
  it("formats IDs without padding", () => {
    expect(cardId("ph", 98, false, "AM", 24)).toBe("ph-98-AM-24");
    expect(cardId("nurse", 103, true, "AM", 75)).toBe("nurse-103add-AM-75");
  });
});

describe("splitBr", () => {
  it("splits on <br> and drops empty parts", () => {
    expect(splitBr("98PM38.png<br>98PM38_2.png")).toEqual(["98PM38.png", "98PM38_2.png"]);
    expect(splitBr("")).toEqual([]);
  });
});

describe("parseChoices", () => {
  it("strips the leading numbers", () => {
    expect(parseChoices("1. 検診<br>2. 予防接種")).toEqual({ kind: "numbered", choices: ["検診", "予防接種"] });
  });

  it("recognises calculation and figure-choice cells", () => {
    expect(parseChoices("（計算問題）").kind).toBe("calculation");
    expect(parseChoices("図の選択肢").kind).toBe("figure");
    expect(parseChoices("").kind).toBe("figure");
  });

  it("rejects numbers that are out of order", () => {
    expect(parseChoices("1. a<br>3. b")).toEqual({ kind: "error", message: 'choice 2 should start with "2. " but is "3. b"' });
  });

  it("keeps literal angle brackets in choices", () => {
    expect(parseChoices("1. <UNICEF><br>2. BMI<18.5")).toEqual({ kind: "numbered", choices: ["<UNICEF>", "BMI<18.5"] });
  });
});

describe("parseChoiceAnswer", () => {
  it.each([
    ["2：紫外線", [[2]]],
    ["1・4：a、b", [[1, 4]]],
    ["3 または 4", [[3], [4]]],
    ["3", [[3]]],
  ])("%s", (text, accepted) => {
    expect(parseChoiceAnswer(text, 5)).toEqual({ type: "choice", accepted });
  });

  it("rejects a number outside the choices", () => {
    expect(parseChoiceAnswer("2・0：2", 5)).toBe('answer "2・0：2" refers to choice 0, but there are 5 choices');
    expect(parseChoiceAnswer("6", 5)).toMatch(/refers to choice 6/);
  });

  it("rejects text it cannot parse", () => {
    expect(parseChoiceAnswer("二", 5)).toMatch(/^cannot parse answer "二"/);
  });

  it("rejects a repeated choice", () => {
    expect(parseChoiceAnswer("2・2", 5)).toMatch(/repeats a choice/);
  });
});

describe("parseRow", () => {
  it("builds a card from a normal row", () => {
    const { card, errors, warnings } = parseRow(row(), ctx, {});
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(card).toMatchObject({
      id: "ph-98-AM-24",
      deck: "ph",
      category: "疫学",
      year: 2012,
      exam: "第98回",
      session: "AM",
      q: 24,
      choices: ["a", "b", "c", "d"],
      answerText: "2：b",
      answer: { type: "choice", accepted: [[2]] },
      images: [],
      figureMissing: false,
    });
    expect(card?.contentHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it.each([
    ["AM", "AM"],
    ["PM", "PM"],
    ["午前", "AM"],
    ["午後", "PM"],
  ])("normalises session %s to %s", (session, expected) => {
    expect(parseRow(row({ Session: session }), ctx, {}).card?.session).toBe(expected);
  });

  it("reports bad fields with the row location", () => {
    const { card, errors } = parseRow(row({ Session: "夜", Year: "H24" }), ctx, {});
    expect(card).toBeNull();
    expect(errors).toEqual([
      'ph.md:10: Year "H24" is not a 4-digit number',
      'ph.md:10: Session "夜" should be AM, PM, 午前 or 午後',
    ]);
  });

  it("parses calculation values as written", () => {
    for (const value of ["1.25", "57.5kg", "15%"]) {
      const { card } = parseRow(row({ Choices: "（計算問題）", Answer: value }), ctx, {});
      expect(card?.answer).toEqual({ type: "value", value });
      expect(card?.choices).toEqual([]);
    }
  });

  it("parses 正答値表に記載なし as no official answer", () => {
    expect(parseRow(row({ Answer: "正答値表に記載なし" }), ctx, {}).card?.answer).toEqual({ type: "none" });
  });

  it("uses the override for figure-choice questions", () => {
    const { card } = parseRow(row({ Choices: "図の選択肢", Answer: "3" }), ctx, { "ph-98-AM-24": 4 });
    expect(card?.figureChoiceCount).toBe(4);
    expect(card?.answer).toEqual({ type: "choice", accepted: [[3]] });
  });

  it("fails a figure-choice question without an override", () => {
    const { errors } = parseRow(row({ Choices: "図の選択肢", Answer: "3" }), ctx, {});
    expect(errors).toEqual([
      "ph.md:10 (ph-98-AM-24): choices are in the figure (図の選択肢), but scripts/lib/overrides.ts has no figureChoiceCount for it",
    ]);
  });

  it("fails an override on a row whose choices are not in a figure", () => {
    const { errors } = parseRow(row({ Choices: "（計算問題）", Answer: "3" }), ctx, { "ph-98-AM-24": 4 });
    expect(errors[0]).toMatch(/has a figureChoiceCount override, so Choices should be 図の選択肢 or empty/);
  });

  it("fails an empty question or answer, and warns about an empty explanation", () => {
    const { errors } = parseRow(row({ Question: "", Answer: "" }), ctx, {});
    expect(errors).toEqual(["ph.md:10 (ph-98-AM-24): Question is empty", "ph.md:10 (ph-98-AM-24): Answer is empty"]);
    expect(parseRow(row({ Explanation: "" }), ctx, {}).warnings).toEqual(["ph.md:10 (ph-98-AM-24): Explanation is empty"]);
  });

  it("keeps literal angle brackets in the question", () => {
    expect(parseRow(row({ Question: "<UNICEF>の説明で正しいのはどれか。" }), ctx, {}).card?.question).toBe(
      "<UNICEF>の説明で正しいのはどれか。",
    );
  });

  it("marks a missing figure only when there is no image", () => {
    expect(parseRow(row({ Question: "別冊No.1の図を見て答えよ。" }), ctx, {}).card?.figureMissing).toBe(true);
    expect(parseRow(row({ Explanation: "図は原本を参照。" }), ctx, {}).card?.figureMissing).toBe(true);
    expect(parseRow(row({ Question: "別冊の図", Image: "98AM24.png" }), ctx, {}).card?.figureMissing).toBe(false);
  });

  it("keeps the ID but changes the hash when the text changes", () => {
    const before = parseRow(row(), ctx, {}).card;
    const after = parseRow(row({ Explanation: "改訂した解説。" }), ctx, {}).card;
    expect(after?.id).toBe(before?.id);
    expect(after?.contentHash).not.toBe(before?.contentHash);
    expect(parseRow(row(), ctx, {}).card?.contentHash).toBe(before?.contentHash);
  });
});
