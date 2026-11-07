import { NavLink, Outlet } from "react-router";

const navItems = [
  { to: "/", label: "ホーム" },
  { to: "/review", label: "学習" },
  { to: "/browse", label: "一覧" },
  { to: "/stats", label: "統計" },
  { to: "/settings", label: "設定" },
] as const;

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <Outlet />
      </main>
      <nav
        aria-label="メインメニュー"
        className="sticky bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-3xl">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex min-h-11 items-center justify-center px-2 py-3 text-sm ${
                    isActive ? "font-bold text-teal-700" : "text-slate-600"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
