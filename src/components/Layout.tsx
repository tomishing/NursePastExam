import { NavLink, Outlet } from "react-router";
import NavIcon, { type NavIconName } from "./NavIcon.tsx";

const navItems: { to: string; label: string; icon: NavIconName }[] = [
  { to: "/", label: "ホーム", icon: "home" },
  { to: "/review", label: "学習", icon: "study" },
  { to: "/browse", label: "一覧", icon: "list" },
  { to: "/stats", label: "統計", icon: "stats" },
  { to: "/settings", label: "設定", icon: "settings" },
];

export default function Layout() {
  return (
    <div className="min-h-dvh pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Bottom padding keeps content clear of the fixed tab bar. */}
      <main className="mx-auto w-full max-w-3xl px-4 pt-5 pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+1.5rem)]">
        <Outlet />
      </main>
      <nav aria-label="メインメニュー" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex h-(--nav-height) max-w-3xl px-1">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] ${
                    isActive
                      ? "font-bold text-ink [--icon-fill:var(--icon-fill-active)]"
                      : "font-medium text-ink-3 [--icon-fill:var(--surface-muted)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <NavIcon name={item.icon} className={`size-7 ${isActive ? "animate-hop" : ""}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
