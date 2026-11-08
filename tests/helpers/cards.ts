import type { Card } from "../../src/types/card.ts";

/** A minimal card for component and helper tests; override what each test needs. */
export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "ph-98-AM-24",
    deck: "ph",
    category: "疫学",
    year: 2012,
    exam: "第98回",
    session: "AM",
    q: 24,
    question: "正しいのはどれか。",
    choices: ["検診", "予防接種", "治療", "リハビリ"],
    answerText: "2：予防接種",
    answer: { type: "choice", accepted: [[2]] },
    explanation: "発症前の予防。",
    images: [],
    figureMissing: false,
    contentHash: "0123456789abcdef",
    ...overrides,
  };
}
