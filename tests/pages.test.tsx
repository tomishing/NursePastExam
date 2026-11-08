import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../src/App.tsx";
import { NursePastExamDB } from "../src/db/database.ts";
import { parseBackup } from "../src/lib/backup.ts";
import { ALL_CARDS } from "../src/lib/filter.ts";
import { progressRepository } from "../src/repositories/index.ts";
import { useContentStore } from "../src/store/content.ts";
import { reviewService, useStudyStore } from "../src/store/study.ts";
import { DEFAULT_SETTINGS } from "../src/types/progress.ts";
import { makeCard } from "./helpers/cards.ts";

const cards = [
  makeCard({ id: "ph-98-AM-1", q: 1, question: "結核について正しいのはどれか。" }),
  makeCard({ id: "ph-98-AM-2", q: 2, question: "麻疹について正しいのはどれか。" }),
  makeCard({ id: "nurse-100-AM-3", deck: "nurse", category: "公衆衛生", q: 3, question: "結核の感染経路はどれか。" }),
];

async function clearStorage() {
  const db = new NursePastExamDB();
  await Promise.all([db.progress.clear(), db.reviewLog.clear(), db.settings.clear()]);
  db.close();
}

beforeEach(async () => {
  await clearStorage();
  useContentStore.setState({ status: "ready", cards, sources: [{ year: 2012, nurse: ["第101回"], ph: ["第98回"], url: "https://example.test/2012" }], error: null });
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

describe("export and import", () => {
  it("restores progress into a clean browser", async () => {
    await reviewService.rate(cards[0]!, 4);
    await reviewService.rate(cards[1]!, 1, { selected: [2], correct: true });
    await reviewService.setSuspended(cards[2]!, true);
    const before = { progress: await progressRepository.getAllProgress(), logs: await progressRepository.getReviewLogs() };

    const backup = await useStudyStore.getState().exportBackup();
    const text = JSON.stringify(backup);
    expect((await progressRepository.getSettings()).lastExportAt).toBe(backup.exportedAt);

    await clearStorage(); // as if the browser data were cleared
    expect(await progressRepository.getAllProgress()).toEqual([]);

    await useStudyStore.getState().importBackup(parseBackup(text));
    expect(await progressRepository.getAllProgress()).toEqual(before.progress);
    expect(await progressRepository.getReviewLogs()).toEqual(before.logs);
    expect((await progressRepository.getSettings()).lastExportAt).toBe(backup.exportedAt);
  });
});

describe("Settings", () => {
  it("saves study settings", async () => {
    open("/settings");
    fireEvent.change(await screen.findByLabelText(/新規カードの順番/), { target: { value: "newest" } });
    fireEvent.click(screen.getByLabelText(/正答が公表されていない問題/));
    const input = screen.getByLabelText(/1日の新規カード/);
    fireEvent.change(input, { target: { value: "35" } });
    fireEvent.blur(input);
    await waitFor(async () =>
      expect(await progressRepository.getSettings()).toEqual({ ...DEFAULT_SETTINGS, newCardOrder: "newest", includeNoAnswer: true, newPerDay: 35 }),
    );
  });

  it("does not save an invalid number", async () => {
    open("/settings");
    const input = await screen.findByLabelText(/1日の新規カード/);
    fireEvent.change(input, { target: { value: "-3" } });
    fireEvent.blur(input);
    await new Promise((r) => setTimeout(r, 50));
    expect((await progressRepository.getSettings()).newPerDay).toBe(20);
  });

  it("asks before replacing progress, and rejects unknown versions", async () => {
    await reviewService.rate(cards[0]!, 3);
    open("/settings");
    const input = (await screen.findByTestId("backup-file")) as HTMLInputElement;

    const bad = new File([JSON.stringify({ schemaVersion: 99, progress: [], reviewLog: [], settings: {} })], "b.json");
    fireEvent.change(input, { target: { files: [bad] } });
    expect(await screen.findByText(/対応していないバージョンです/)).toBeTruthy();

    const empty = new File([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), progress: [], reviewLog: [], settings: {} })], "e.json");
    fireEvent.change(input, { target: { files: [empty] } });
    expect(await screen.findByText("現在の学習記録をすべて置き換えますか？")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(await progressRepository.getAllProgress()).toHaveLength(1);

    fireEvent.change(input, { target: { files: [empty] } });
    fireEvent.click(await screen.findByRole("button", { name: "置き換える" }));
    await waitFor(async () => expect(await progressRepository.getAllProgress()).toEqual([]));
  });

  it("shows the sources offline from cards.json", async () => {
    open("/settings");
    expect(await screen.findByText("出典・ライセンス")).toBeTruthy();
    expect(screen.getByRole("link", { name: "厚生労働省" }).getAttribute("href")).toBe("https://example.test/2012");
  });
});

describe("Home backup reminder", () => {
  it("appears once there is progress that has never been exported", async () => {
    open("/");
    await screen.findByText("学習を始める");
    expect(screen.queryByText(/バックアップしていません/)).toBeNull();
    cleanup();
    await reviewService.rate(cards[0]!, 3);
    useStudyStore.setState({ data: null, status: "idle" });
    open("/");
    expect(await screen.findByText(/まだバックアップしていません/)).toBeTruthy();
  });
});

describe("Browse", () => {
  it("searches, opens a card and restores a suspended card", async () => {
    await reviewService.setSuspended(cards[2]!, true);
    open("/browse");
    expect(await screen.findByText("3件")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/キーワード/), { target: { value: "結核" } });
    expect(await screen.findByText("2件")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("状態"), { target: { value: "suspended" } });
    expect(await screen.findByText("1件")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /結核の感染経路/ }));

    fireEvent.click(await screen.findByRole("button", { name: "保留を解除" }));
    await waitFor(async () => expect((await progressRepository.getProgress("nurse-100-AM-3"))?.suspended).toBe(false));
    expect(await screen.findByRole("button", { name: "保留にする" })).toBeTruthy();
    expect(screen.getByText("絞り込み条件の対象外")).toBeTruthy(); // stays open after leaving the filter
    fireEvent.click(screen.getByRole("button", { name: "一覧に戻る" }));
    expect(await screen.findByText("0件")).toBeTruthy();
  });
});
