import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../src/App.tsx";
import { NursePastExamDB } from "../src/db/database.ts";
import { ALL_CARDS } from "../src/lib/filter.ts";
import { progressRepository } from "../src/repositories/index.ts";
import { useContentStore } from "../src/store/content.ts";
import { useStudyStore } from "../src/store/study.ts";
import { makeCard } from "./helpers/cards.ts";

const cards = [
  makeCard({ id: "ph-98-AM-1", q: 1, question: "問題その1" }),
  makeCard({ id: "ph-98-AM-2", q: 2, question: "問題その2" }),
  makeCard({ id: "ph-98-AM-3", q: 3, question: "問題その3", answer: { type: "none" }, answerText: "正答値表に記載なし" }),
];

beforeEach(async () => {
  const db = new NursePastExamDB();
  await Promise.all([db.progress.clear(), db.reviewLog.clear(), db.settings.clear()]);
  db.close();
  await progressRepository.saveSettings({ newCardOrder: "oldest" });
  useContentStore.setState({ status: "ready", cards, sources: [], error: null });
  useStudyStore.setState({ filter: ALL_CARDS, status: "idle", data: null, error: null });
});

afterEach(cleanup);

function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** Simulates a page reload: drop in-memory state and render again. */
function reload(path: string) {
  cleanup();
  useStudyStore.setState({ status: "idle", data: null });
  return open(path);
}

const question = () => screen.findByText(/^問題その\d$/);
const rate = (label: string) => fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));

describe("Home", () => {
  it("shows counts for the selection and a start link", async () => {
    open("/");
    const newCount = await screen.findByText("新規");
    expect(newCount.nextSibling?.textContent).toBe("2"); // the card with no official answer is left out
    expect(screen.getByRole("link", { name: "学習を始める" }).getAttribute("href")).toBe("/review");
  });
});

describe("Review", () => {
  it("reveals the answer, rates, saves and moves to the next card", async () => {
    open("/review");
    expect((await question()).textContent).toBe("問題その1");
    expect(screen.queryByRole("group", { name: "評価" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^2\./ }));
    fireEvent.click(screen.getByRole("button", { name: "答えを見る" }));
    expect(screen.getByText(/選んだ答え：正解/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^正解（次回 10分/ })).toBeTruthy();

    rate("正解");
    await waitFor(() => expect(screen.getByText("問題その2")).toBeTruthy());
    expect(screen.queryByRole("group", { name: "評価" })).toBeNull();

    const saved = await progressRepository.getAllProgress();
    expect(saved.map((p) => p.cardId)).toEqual(["ph-98-AM-1"]);
    const [log] = await progressRepository.getReviewLogs();
    expect(log).toMatchObject({ cardId: "ph-98-AM-1", rating: 3, selected: [2], correct: true });
  });

  it("works with the keyboard alone", async () => {
    open("/review");
    await question();
    fireEvent.keyDown(window, { key: "4" }); // ignored before revealing
    expect(await progressRepository.getAllProgress()).toEqual([]);
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByRole("group", { name: "評価" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "4" });
    await waitFor(() => expect(screen.getByText("問題その2")).toBeTruthy());
    expect((await progressRepository.getProgress("ph-98-AM-1"))?.fsrs.state).toBe(2);
  });

  it("keeps progress after a reload mid-session", async () => {
    open("/review");
    await question();
    fireEvent.click(screen.getByRole("button", { name: "答えを見る" }));
    rate("簡単");
    await waitFor(() => expect(screen.getByText("問題その2")).toBeTruthy());

    reload("/review");
    expect((await question()).textContent).toBe("問題その2");
    reload("/");
    const newCount = await screen.findByText("新規");
    expect(newCount.nextSibling?.textContent).toBe("1");
  });

  it("undo brings the card back and reverts its progress", async () => {
    open("/review");
    await question();
    fireEvent.click(screen.getByRole("button", { name: "答えを見る" }));
    rate("簡単");
    await waitFor(() => expect(screen.getByText("問題その2")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    await waitFor(() => expect(screen.getByText("問題その1")).toBeTruthy());
    expect(screen.getByText("直前の評価を取り消しました。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "答えを見る" })).toBeTruthy();
    expect(await progressRepository.getProgress("ph-98-AM-1")).toBeUndefined();
    expect(await progressRepository.getReviewLogs()).toHaveLength(2);
  });

  it("suspends a card and can restore it", async () => {
    open("/review");
    await question();
    fireEvent.click(screen.getByRole("button", { name: "保留" }));
    await waitFor(() => expect(screen.getByText("問題その2")).toBeTruthy());
    expect((await progressRepository.getProgress("ph-98-AM-1"))?.suspended).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "保留を取り消す" }));
    await waitFor(() => expect(screen.getByText("問題その1")).toBeTruthy());
    expect((await progressRepository.getProgress("ph-98-AM-1"))?.suspended).toBe(false);
  });

  it("shows a summary when the queue is empty", async () => {
    open("/review");
    for (const expected of ["問題その1", "問題その2"]) {
      await waitFor(() => expect(screen.getByText(expected)).toBeTruthy());
      fireEvent.click(screen.getByRole("button", { name: /^1\./ }));
      fireEvent.click(screen.getByRole("button", { name: "答えを見る" }));
      await act(async () => rate("簡単"));
    }
    expect(await screen.findByText("おつかれさまでした")).toBeTruthy();
    expect(screen.getByText("2問")).toBeTruthy();
    expect(screen.getByText("0 / 2")).toBeTruthy();
  });
});
