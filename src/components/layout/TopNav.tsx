"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, LogOut, Home, FolderOpen, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "AI Summary", href: "/subjects", icon: FolderOpen },
    { name: "Schedules", href: "/schedule", icon: CalendarDays },
  ];

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <header className="hidden md:block border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center h-16">

        {/* Logo */}
        <div className="flex items-center gap-3 w-1/4">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h1 className="text-xl font-bold tracking-tight text-white hidden lg:block">
            AI Workspace
          </h1>
        </div>

        {/* Center Nav Links */}
        <nav className="flex-1 flex justify-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-semibold h-10 ${isActive
                    ? "bg-indigo-600 shadow-md shadow-indigo-900/20 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-70"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="flex justify-end w-1/4">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-900 rounded-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Logout</span>
          </Button>
        </div>

      </div>
    </header>
  );
}
