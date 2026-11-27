"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: number };
export type NavGroup = { title?: string; items: NavItem[] };

export function Nav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  return (
    <nav className="space-y-5">
      {groups.map((g, i) => (
        <div key={i}>
          {g.title && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-100/70">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${
                      active ? "bg-white/15 font-medium text-white" : "text-brand-50 hover:bg-white/10"
                    }`}
                  >
                    {it.label}
                    {!!it.badge && (
                      <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">{it.badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
