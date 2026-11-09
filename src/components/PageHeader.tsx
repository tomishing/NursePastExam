import type { ReactNode } from "react";

/** The title row at the top of each page, with an optional subtitle and actions on the right. */
export default function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {subtitle && <p className="eyebrow">{subtitle}</p>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
    </header>
  );
}
