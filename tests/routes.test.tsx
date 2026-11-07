import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../src/App.tsx";

afterEach(cleanup);

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("routes", () => {
  it.each([
    ["/", "ホーム"],
    ["/review", "学習"],
    ["/browse", "一覧"],
    ["/stats", "統計"],
    ["/settings", "設定"],
  ])("%s shows the %s page", (path, title) => {
    renderAt(path);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
  });

  it("redirects unknown paths to Home", () => {
    renderAt("/no-such-page");
    expect(screen.getByRole("heading", { level: 1, name: "ホーム" })).toBeTruthy();
  });

  it("shows the main navigation", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "メインメニュー" });
    expect(nav.querySelectorAll("a")).toHaveLength(5);
  });
});
