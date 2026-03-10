"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, CalendarDays } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "AI Summary", href: "/subjects", icon: FolderOpen },
    { name: "Schedule", href: "/schedule", icon: CalendarDays },
  ];

  // Do not show bottom nav on login/register pages
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800/60 md:hidden">
      <div className="flex justify-around items-center px-2 pb-safe max-w-md mx-auto h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full px-2 py-1 space-y-1 transition-colors ${isActive ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                }`}
            >
              <div className={`relative p-1 rounded-xl transition-all ${isActive ? "bg-indigo-500/10" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "fill-indigo-500/20 stroke-[2.5px]" : "stroke-2"}`} />
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? "font-bold" : ""}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
