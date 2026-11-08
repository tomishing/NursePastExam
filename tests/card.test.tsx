import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CardBack from "../src/components/CardBack.tsx";
import CardFront from "../src/components/CardFront.tsx";
import { FIGURE_MISSING_TEXT, NOTICE } from "../src/lib/card.ts";
import { makeCard } from "./helpers/cards.ts";

afterEach(cleanup);

const choiceButtons = () => screen.queryAllByRole("button").filter((b) => /^\d+\./.test(b.textContent ?? ""));

describe("CardFront", () => {
  it("shows the label, question and numbered choices but not the answer", () => {
    render(<CardFront card={makeCard({ session: "PM", q: 38 })} selected={[]} onSelect={() => {}} />);
    expect(screen.getByText("保健師 第98回 午後 問38")).toBeTruthy();
    expect(screen.getByText("正しいのはどれか。")).toBeTruthy();
    expect(choiceButtons().map((b) => b.textContent)).toEqual(["1.検診", "2.予防接種", "3.治療", "4.リハビリ"]);
    expect(screen.queryByText("2：予防接種")).toBeNull();
    expect(screen.queryByText("正解")).toBeNull();
  });

  it("renders angle brackets as literal text", () => {
    const { container } = render(
      <CardFront card={makeCard({ question: "<UNICEF>について正しいのはどれか。", choices: ["<b>太字</b>", "b"] })} selected={[]} />,
    );
    expect(screen.getByText("<UNICEF>について正しいのはどれか。")).toBeTruthy();
    expect(screen.getByText("<b>太字</b>")).toBeTruthy();
    expect(container.querySelector("unicef, b")).toBeNull();
  });

  it("reports taps on choices", () => {
    const onSelect = vi.fn();
    render(<CardFront card={makeCard()} selected={[]} onSelect={onSelect} />);
    fireEvent.click(choiceButtons()[2]!);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("shows 計算問題 instead of choices for calculation questions", () => {
    render(<CardFront card={makeCard({ choices: [], answer: { type: "value", value: "1.25" }, answerText: "1.25" })} selected={[]} />);
    expect(screen.getByText("計算問題")).toBeTruthy();
    expect(choiceButtons()).toHaveLength(0);
  });

  it("shows numbered buttons when the choices are in the figure", () => {
    render(<CardFront card={makeCard({ choices: [], figureChoiceCount: 4, images: ["100PM01.png"] })} selected={[]} />);
    expect(choiceButtons().map((b) => b.textContent)).toEqual(["1.", "2.", "3.", "4."]);
  });

  it("shows every image in order and the missing-figure notice", () => {
    render(<CardFront card={makeCard({ images: ["98PM38.png", "98PM38_2.png"] })} selected={[]} />);
    const images = screen.getAllByRole("img");
    expect(images.map((img) => img.getAttribute("src"))).toEqual(["/images/98PM38.png", "/images/98PM38_2.png"]);
    cleanup();
    render(<CardFront card={makeCard({ figureMissing: true })} selected={[]} />);
    expect(screen.getByText(FIGURE_MISSING_TEXT)).toBeTruthy();
  });

  it("enlarges an image when tapped and closes it again", () => {
    render(<CardFront card={makeCard({ images: ["107AM30.png"] })} selected={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /拡大/ }));
    const dialog = screen.getByRole("dialog", { name: "図の拡大表示" });
    expect(document.body.style.overflow).toBe("hidden");

    // Opens fitted to the screen; 原寸 switches to full size and back.
    const toggle = within(dialog).getByRole("button", { name: "原寸" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(within(dialog).getByRole("button", { name: "画面に合わせる" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("dialog")).toBeTruthy(); // the toggle does not close the viewer

    fireEvent.click(within(dialog).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("CardBack", () => {
  it("shows the answer, explanation and notice, and marks the correct choice", () => {
    render(<CardBack card={makeCard()} selected={[]} />);
    expect(screen.getByText("2：予防接種")).toBeTruthy();
    expect(screen.getByText("発症前の予防。")).toBeTruthy();
    expect(screen.getByText(NOTICE)).toBeTruthy();
    expect(choiceButtons()[1]?.textContent).toContain("正解");
    expect(screen.queryByText(/あなたの解答/)).toBeNull();
  });

  it("marks the selection correct or incorrect", () => {
    render(<CardBack card={makeCard()} selected={[2]} />);
    expect(screen.getByText("あなたの解答：正解")).toBeTruthy();
    cleanup();
    render(<CardBack card={makeCard()} selected={[1]} />);
    expect(screen.getByText("あなたの解答：不正解")).toBeTruthy();
  });

  it("highlights every accepted answer for または", () => {
    const card = makeCard({ answerText: "3 または 4", answer: { type: "choice", accepted: [[3], [4]] } });
    render(<CardBack card={card} selected={[]} />);
    expect(screen.getByText("いずれも正解")).toBeTruthy();
    expect(choiceButtons().filter((b) => b.textContent?.includes("正解")).map((b) => b.textContent?.[0])).toEqual(["3", "4"]);
  });

  it("highlights both choices for select-two questions", () => {
    const card = makeCard({ answerText: "1・4：検診、リハビリ", answer: { type: "choice", accepted: [[1, 4]] } });
    render(<CardBack card={card} selected={[1, 4]} />);
    expect(choiceButtons().filter((b) => b.textContent?.includes("正解")).map((b) => b.textContent?.[0])).toEqual(["1", "4"]);
    expect(screen.queryByText("いずれも正解")).toBeNull();
    expect(screen.getByText("あなたの解答：正解")).toBeTruthy();
  });

  it("shows calculation values as written, ungraded", () => {
    render(<CardBack card={makeCard({ choices: [], answerText: "57.5kg", answer: { type: "value", value: "57.5kg" } })} selected={[]} />);
    expect(screen.getByText("57.5kg")).toBeTruthy();
    expect(screen.queryByText(/あなたの解答/)).toBeNull();
  });

  it("shows 正答値表に記載なし for cards without an official answer", () => {
    render(<CardBack card={makeCard({ answerText: "正答値表に記載なし", answer: { type: "none" } })} selected={[1]} />);
    expect(screen.getByText("正答値表に記載なし")).toBeTruthy();
    expect(screen.queryByText(/あなたの解答/)).toBeNull();
    expect(screen.queryByText("正解")).toBeNull();
  });
});
