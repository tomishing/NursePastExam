import { describe, expect, it } from "vitest";
import { cardLabel, choiceNumbers, correctChoices, grade, selectionSize, toggleChoice } from "../src/lib/card.ts";
import { ALL_CARDS, filterCards, filterOptions } from "../src/lib/filter.ts";
import { makeCard } from "./helpers/cards.ts";

describe("cardLabel", () => {
  it("shows deck, exam, session and question number", () => {
    expect(cardLabel(makeCard({ session: "PM", q: 38 }))).toBe("保健師 第98回 午後 問38");
    expect(cardLabel(makeCard({ deck: "nurse", exam: "第103回追加" }))).toBe("看護師 第103回追加 午前 問24");
  });
});

describe("choices", () => {
  it("uses the figure choice count when the choices are in the image", () => {
    expect(choiceNumbers(makeCard({ choices: [], figureChoiceCount: 4 }))).toEqual([1, 2, 3, 4]);
    expect(choiceNumbers(makeCard({ choices: [], answer: { type: "value", value: "1.25" } }))).toEqual([]);
  });

  it("collects every accepted choice", () => {
    expect(correctChoices(makeCard({ answer: { type: "choice", accepted: [[3], [4]] } }))).toEqual(new Set([3, 4]));
    expect(correctChoices(makeCard({ answer: { type: "none" } }))).toEqual(new Set());
  });

  it("allows one selection normally and two for select-two questions", () => {
    expect(selectionSize(makeCard())).toBe(1);
    expect(selectionSize(makeCard({ answer: { type: "choice", accepted: [[1, 4]] } }))).toBe(2);
    expect(selectionSize(makeCard({ answer: { type: "choice", accepted: [[3], [4]] } }))).toBe(1);
  });

  it("toggles selections", () => {
    expect(toggleChoice([], 2, 1)).toEqual([2]);
    expect(toggleChoice([2], 3, 1)).toEqual([3]);
    expect(toggleChoice([2], 2, 1)).toEqual([]);
    expect(toggleChoice([4], 1, 2)).toEqual([1, 4]);
    expect(toggleChoice([1, 4], 2, 2)).toEqual([1, 4]);
  });
});

describe("grade", () => {
  it("grades a single answer", () => {
    const card = makeCard();
    expect(grade(card, [2])).toBe(true);
    expect(grade(card, [1])).toBe(false);
  });

  it("requires both choices for select-two questions", () => {
    const card = makeCard({ answer: { type: "choice", accepted: [[1, 4]] } });
    expect(grade(card, [4, 1])).toBe(true);
    expect(grade(card, [1])).toBe(false);
    expect(grade(card, [1, 3])).toBe(false);
  });

  it("accepts any alternative for または", () => {
    const card = makeCard({ answer: { type: "choice", accepted: [[3], [4]] } });
    expect(grade(card, [3])).toBe(true);
    expect(grade(card, [4])).toBe(true);
    expect(grade(card, [2])).toBe(false);
  });

  it("does not grade without a selection, calculations or cards with no official answer", () => {
    expect(grade(makeCard(), [])).toBeUndefined();
    expect(grade(makeCard({ answer: { type: "value", value: "1.25" } }), [1])).toBeUndefined();
    expect(grade(makeCard({ answer: { type: "none" } }), [1])).toBeUndefined();
  });
});

describe("filterCards", () => {
  const cards = [
    makeCard({ id: "a", deck: "nurse", category: "公衆衛生", year: 2010 }),
    makeCard({ id: "b", deck: "ph", category: "疫学", year: 2015 }),
    makeCard({ id: "c", deck: "ph", category: "保健統計", year: 2020 }),
  ];
  const ids = (filter: typeof ALL_CARDS) => filterCards(cards, filter).map((c) => c.id);

  it("filters by deck, category and year range", () => {
    expect(ids(ALL_CARDS)).toEqual(["a", "b", "c"]);
    expect(ids({ ...ALL_CARDS, deck: "ph" })).toEqual(["b", "c"]);
    expect(ids({ ...ALL_CARDS, category: "疫学" })).toEqual(["b"]);
    expect(ids({ ...ALL_CARDS, yearFrom: 2012, yearTo: 2018 })).toEqual(["b"]);
  });

  it("lists the categories and years of the chosen deck", () => {
    expect(filterOptions(cards, "ph")).toEqual({ categories: ["疫学", "保健統計"], years: [2015, 2020] });
  });
});
