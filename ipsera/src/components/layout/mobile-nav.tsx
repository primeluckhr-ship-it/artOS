"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";

const PRIMARY_ITEMS = NAV_ITEMS.filter((item) =>
  ["/dashboard", "/tasks", "/goals", "/reflection", "/settings"].includes(
    item.href
  )
);

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur md:hidden">
      {PRIMARY_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
