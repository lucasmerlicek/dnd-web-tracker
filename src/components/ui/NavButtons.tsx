"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback } from "react";
import { useCursorNavigation } from "@/hooks/useCursorNavigation";
import CursorIndicator from "@/components/ui/CursorIndicator";

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
  const router = useRouter();

  const isActive = (href: string) => {
    if (currentScreen) {
      return href === `/${currentScreen.toLowerCase()}`;
    }
    return pathname === href;
  };

  const onActivate = useCallback(
    (index: number) => {
      router.push(SCREENS[index].href);
    },
    [router]
  );

  const { containerProps, getItemProps, isActive: isCursorActive } = useCursorNavigation({
    itemCount: SCREENS.length,
    columns: SCREENS.length,
    onActivate,
  });

  return (
    <nav
      {...containerProps}
      className="sticky top-0 z-50 flex items-center gap-1 border border-ff12-border bg-ff12-panel/70 px-3 py-2 backdrop-blur-sm"
      role="navigation"
      aria-label="Main navigation"
    >
      {SCREENS.map((s, index) => {
        const itemProps = getItemProps(index);
        return (
          <Link
            key={s.href}
            href={s.href}
            id={itemProps.id}
            role={itemProps.role}
            aria-selected={itemProps["aria-selected"]}
            onMouseEnter={itemProps.onMouseEnter}
            onClick={itemProps.onClick}
            aria-current={isActive(s.href) ? "page" : undefined}
            className={`flex min-h-[44px] shrink-0 items-center gap-1 rounded px-3 py-2 text-sm transition-colors ${
              isActive(s.href)
                ? "bg-ff12-panel-light/50 text-ff12-text-bright"
                : "text-ff12-text-dim hover:text-ff12-text"
            } ${isCursorActive(index) ? "bg-white/10" : ""}`}
          >
            <CursorIndicator visible={isCursorActive(index)} />
            {s.label}
          </Link>
        );
      })}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="ml-auto min-h-[44px] shrink-0 rounded px-4 py-2 text-sm text-ff12-danger transition-colors hover:bg-ff12-panel-light"
        aria-label="Logout"
      >
        Logout
      </button>
    </nav>
  );
}
