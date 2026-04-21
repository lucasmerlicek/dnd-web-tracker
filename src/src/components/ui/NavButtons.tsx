"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo } from "react";

const BASE_SCREENS = [
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
  hasFamiliars?: boolean;
}

export default function NavButtons({ currentScreen, hasFamiliars }: NavButtonsProps = {}) {
  const pathname = usePathname();

  const screens = useMemo(() => {
    if (hasFamiliars) {
      return [...BASE_SCREENS, { href: "/familiars", label: "Familiars" }];
    }
    return BASE_SCREENS;
  }, [hasFamiliars]);

  const isActive = (href: string) => {
    if (currentScreen) {
      return href === `/${currentScreen.toLowerCase()}`;
    }
    return pathname === href;
  };

  return (
    <nav
      className="flex items-center gap-2 overflow-x-auto rounded-lg border border-parchment-dark/15 bg-dark-bg/70 p-2 backdrop-blur-sm md:flex-wrap md:overflow-x-visible"
      role="navigation"
      aria-label="Main navigation"
    >
      {screens.map((s) => {
        const isFamiliars = s.href === "/familiars";
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={isActive(s.href) ? "page" : undefined}
            className={`min-h-[44px] shrink-0 rounded px-4 py-2.5 font-serif text-sm transition-colors ${
              isFamiliars
                ? isActive(s.href)
                  ? "bg-blue-900/30 text-blue-300"
                  : "text-blue-400 hover:text-blue-300"
                : isActive(s.href)
                  ? "bg-parchment-dark/30 text-parchment shadow-gold-glow"
                  : "text-parchment/60 hover:bg-parchment-dark/15 hover:text-parchment"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
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
