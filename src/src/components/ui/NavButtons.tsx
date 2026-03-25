"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const SCREENS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/attack", label: "Attack" },
  { href: "/spells", label: "Spells" },
  { href: "/saves", label: "Saves" },
  { href: "/actions", label: "Actions" },
  { href: "/bag", label: "Bag" },
  { href: "/journal", label: "Journal" },
  { href: "/map", label: "Map" },
];

interface NavButtonsProps {
  currentScreen?: string;
}

export default function NavButtons({ currentScreen }: NavButtonsProps = {}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (currentScreen) {
      return href === `/${currentScreen.toLowerCase()}`;
    }
    return pathname === href;
  };

  return (
    <nav
      className="flex items-center gap-2 overflow-x-auto rounded-lg border border-dark-border bg-dark-surface/80 p-2 shadow-inner-dark backdrop-blur-sm md:flex-wrap md:overflow-x-visible"
      role="navigation"
      aria-label="Main navigation"
    >
      {SCREENS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          aria-current={isActive(s.href) ? "page" : undefined}
          className={`min-h-[44px] shrink-0 rounded px-4 py-2.5 font-serif text-sm transition-colors ${
            isActive(s.href)
              ? "bg-gold-dark text-parchment shadow-gold-glow"
              : "text-parchment/70 hover:bg-dark-border hover:text-parchment"
          }`}
        >
          {s.label}
        </Link>
      ))}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="ml-auto min-h-[44px] shrink-0 rounded px-4 py-2.5 font-serif text-sm text-crimson transition-colors hover:bg-dark-border hover:text-crimson-light"
        aria-label="Logout"
      >
        Logout
      </button>
    </nav>
  );
}
