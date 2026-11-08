// Card content types, shared by the import script and the app (see data_format.md section 3).

export type Deck = "nurse" | "ph";
export type Session = "AM" | "PM";

export type Answer =
  | { type: "choice"; accepted: number[][] } // each inner array is one accepted set of choices
  | { type: "value"; value: string } // calculation question, shown as written
  | { type: "none" }; // 正答値表に記載なし

export type Card = {
  id: string; // `<deck>-<exam>-<session>-<q>`, e.g. ph-98-AM-24, nurse-103add-AM-75
  deck: Deck;
  category: string; // 疫学, 保健統計, 保健医療福祉行政論, 公衆衛生
  year: number;
  exam: string; // 第98回, 第103回追加
  session: Session;
  q: number;
  question: string;
  choices: string[]; // empty for calculation and figure-choice questions
  answerText: string;
  answer: Answer;
  explanation: string;
  images: string[]; // file names under /images/
  figureChoiceCount?: number; // choices drawn inside the image
  figureMissing: boolean;
  contentHash: string;
};

export type SourceEntry = {
  year: number;
  nurse: string[]; // exam rounds, e.g. ["第103回", "第103回追加"]
  ph: string[];
  url: string; // MHLW page with that year's questions and answers
};

export type CardsFile = {
  generatedAt: string;
  counts: Record<string, number>; // "nurse", "ph", and "<deck>/<category>"
  sources: SourceEntry[];
  cards: Card[];
};
